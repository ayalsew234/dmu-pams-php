<?php
require_once __DIR__ . '/bootstrap.php';

$user = api_require_roles(['system_admin', 'property_admin', 'storekeeper']);
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    try {
        $assets = $pdo->query(
            'SELECT id, name, category, campus, department, building, room, custodian, serial,
                    `condition`, status, stock_status, storage_location, tagged_at, cost, acq_date,
                    purchase_order_id, goods_receipt_note_id
             FROM assets
             ORDER BY stock_status, storage_location, name'
        )->fetchAll();
        $vouchers = $pdo->query(
            'SELECT siv.id, siv.recipient_name, siv.recipient_department, siv.purpose, siv.issue_date,
                    u.full_name AS issued_by,
                    COUNT(item.asset_id) AS item_count
             FROM stock_issue_vouchers siv
             LEFT JOIN users u ON u.id = siv.issued_by
             LEFT JOIN stock_issue_voucher_items item ON item.voucher_id = siv.id
             GROUP BY siv.id, siv.recipient_name, siv.recipient_department, siv.purpose, siv.issue_date, u.full_name
             ORDER BY siv.created_at DESC'
        )->fetchAll();
        $items = $pdo->query(
            'SELECT voucher_id, asset_id, asset_name, serial, condition_at_issue
             FROM stock_issue_voucher_items
             ORDER BY voucher_id, asset_id'
        )->fetchAll();
        $itemsByVoucher = [];
        foreach ($items as $item) {
            $itemsByVoucher[$item['voucher_id']][] = $item;
        }
        foreach ($vouchers as &$voucher) {
            $voucher['items'] = $itemsByVoucher[$voucher['id']] ?? [];
        }
        unset($voucher);
        $custodians = $pdo->query(
            "SELECT id, full_name, department
             FROM users
             WHERE role = 'asset_custodian' AND is_active = 1
             ORDER BY full_name"
        )->fetchAll();

        api_response([
            'success' => true,
            'data' => ['assets' => $assets, 'vouchers' => $vouchers, 'custodians' => $custodians],
        ]);
    } catch (Throwable $e) {
        api_handle_error($e);
    }
}

api_require_method('POST');

try {
    $input = api_request_data();
    $action = api_required_string($input, 'action', 'Warehouse action');
    if ($action === 'mark-tagged') {
        $assetId = api_required_string($input, 'assetId', 'Asset');
        $tagUpdate = $pdo->prepare('UPDATE assets SET tagged_at = CURRENT_TIMESTAMP WHERE id = ?');
        $tagUpdate->execute([$assetId]);
        if ($tagUpdate->rowCount() === 0) {
            $exists = $pdo->prepare('SELECT 1 FROM assets WHERE id = ?');
            $exists->execute([$assetId]);
            if (!$exists->fetchColumn()) {
                throw new InvalidArgumentException('The selected asset does not exist.');
            }
        }
        api_audit('asset_barcode_tag_applied', "Marked barcode tag applied to asset $assetId.");
        api_response(['success' => true, 'message' => "Asset $assetId marked as physically tagged."]);
    }

    $assetIds = $input['assetIds'] ?? null;
    if (!is_array($assetIds) || count($assetIds) < 1 || count($assetIds) > 100) {
        throw new InvalidArgumentException('Select between 1 and 100 stock items.');
    }
    $assetIds = array_values(array_unique(array_map(
        static function ($assetId): string {
            if (!is_string($assetId) || trim($assetId) === '') {
                throw new InvalidArgumentException('Every selected item must have a valid asset tag.');
            }
            return trim($assetId);
        },
        $assetIds
    )));
    if (count($assetIds) < 1) {
        throw new InvalidArgumentException('Select at least one stock item.');
    }

    $pdo->beginTransaction();
    $assetStatement = $pdo->prepare(
        'SELECT id, name, serial, `condition`, stock_status, storage_location
         FROM assets WHERE id = ? FOR UPDATE'
    );
    $selectedAssets = [];
    foreach ($assetIds as $assetId) {
        $assetStatement->execute([$assetId]);
        $asset = $assetStatement->fetch();
        if (!$asset) {
            throw new InvalidArgumentException("Asset $assetId was not found.");
        }
        $selectedAssets[] = $asset;
    }

    if ($action === 'allocate') {
        $location = api_required_string($input, 'storageLocation', 'Temporary storage location');
        $update = $pdo->prepare(
            "UPDATE assets SET stock_status = 'Temporary Storage', storage_location = ?
             WHERE id = ? AND stock_status IN ('In Stock', 'Temporary Storage')"
        );
        foreach ($selectedAssets as $asset) {
            if (!in_array($asset['stock_status'], ['In Stock', 'Temporary Storage'], true)) {
                throw new InvalidArgumentException("Asset {$asset['id']} is already issued and cannot be allocated to storage.");
            }
            $update->execute([$location, $asset['id']]);
        }
        api_audit('stock_temporarily_allocated', 'Allocated ' . count($selectedAssets) . " asset(s) to temporary storage: $location.");
        $pdo->commit();
        api_response(['success' => true, 'message' => count($selectedAssets) . ' asset(s) allocated to temporary storage.']);
    }

    if ($action === 'release') {
        $update = $pdo->prepare(
            "UPDATE assets SET stock_status = 'In Stock', storage_location = NULL
             WHERE id = ? AND stock_status = 'Temporary Storage'"
        );
        $releasedCount = 0;
        foreach ($selectedAssets as $asset) {
            if ($asset['stock_status'] !== 'Temporary Storage') {
                throw new InvalidArgumentException("Asset {$asset['id']} is not in temporary storage.");
            }
            $update->execute([$asset['id']]);
            $releasedCount++;
        }
        api_audit('stock_released_from_temporary_storage', 'Released ' . $releasedCount . ' asset(s) to available stock.');
        $pdo->commit();
        api_response(['success' => true, 'message' => "$releasedCount asset(s) released to available stock."]);
    }

    if ($action === 'issue') {
        $recipientName = api_required_string($input, 'recipientName', 'Receiving staff member');
        $recipientDepartment = api_required_string($input, 'recipientDepartment', 'Receiving department');
        $recipientUserId = filter_var($input['recipientUserId'] ?? null, FILTER_VALIDATE_INT);
        if ($recipientUserId !== false && $recipientUserId !== null) {
            if ($recipientUserId < 1) {
                throw new InvalidArgumentException('Select a valid staff account.');
            }
            $recipient = $pdo->prepare(
                "SELECT full_name, department
                 FROM users
                 WHERE id = ? AND role = 'asset_custodian' AND is_active = 1"
            );
            $recipient->execute([$recipientUserId]);
            $recipientAccount = $recipient->fetch();
            if (!$recipientAccount) {
                throw new InvalidArgumentException('The selected staff account is unavailable.');
            }
            $recipientName = $recipientAccount['full_name'];
            $recipientDepartment = $recipientAccount['department'];
        }
        $purpose = api_optional_string($input, 'purpose') ?: null;
        foreach ($selectedAssets as $asset) {
            if (!in_array($asset['stock_status'], ['In Stock', 'Temporary Storage'], true)) {
                throw new InvalidArgumentException("Asset {$asset['id']} has already been issued.");
            }
        }

        $voucherId = 'SIV-' . date('Y') . '-' . strtoupper(bin2hex(random_bytes(3)));
        $voucherInsert = $pdo->prepare(
            'INSERT INTO stock_issue_vouchers
                (id, recipient_name, recipient_department, purpose, issue_date, issued_by)
             VALUES (?, ?, ?, ?, ?, ?)'
        );
        $voucherInsert->execute([
            $voucherId,
            $recipientName,
            $recipientDepartment,
            $purpose,
            date('Y-m-d'),
            $user['id'],
        ]);

        $itemInsert = $pdo->prepare(
            'INSERT INTO stock_issue_voucher_items
                (voucher_id, asset_id, asset_name, serial, condition_at_issue)
             VALUES (?, ?, ?, ?, ?)'
        );
        $assetUpdate = $pdo->prepare(
            "UPDATE assets
             SET stock_status = 'Issued', storage_location = NULL, custodian_user_id = ?, custodian = ?, department = ?
             WHERE id = ? AND stock_status IN ('In Stock', 'Temporary Storage')"
        );
        foreach ($selectedAssets as $asset) {
            $itemInsert->execute([
                $voucherId,
                $asset['id'],
                $asset['name'],
                $asset['serial'],
                $asset['condition'],
            ]);
            $assetUpdate->execute([$recipientUserId ?: null, $recipientName, $recipientDepartment, $asset['id']]);
            if ($assetUpdate->rowCount() !== 1) {
                throw new InvalidArgumentException("Asset {$asset['id']} is no longer available to issue.");
            }
        }

        api_audit('stock_issue_voucher_created', "Issued " . count($selectedAssets) . " asset(s) on SIV $voucherId to $recipientName ($recipientDepartment).");
        $pdo->commit();
        api_response([
            'success' => true,
            'message' => count($selectedAssets) . ' asset(s) issued successfully.',
            'voucherId' => $voucherId,
            'assetIds' => $assetIds,
        ], 201);
    }

    throw new InvalidArgumentException('Select a valid warehouse action.');
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    if ($e instanceof PDOException && (string)$e->getCode() === '23000') {
        api_response(['success' => false, 'error' => 'One or more selected assets have already been issued. Reload stock and try again.'], 409);
    }
    api_handle_error($e);
}
