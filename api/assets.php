<?php
require_once __DIR__ . '/bootstrap.php';

$user = api_require_auth();
$method = $_SERVER['REQUEST_METHOD'] ?? '';
if ($method === 'GET') {
    try {
        api_require_roles(['system_admin', 'property_admin', 'department_head', 'internal_auditor', 'technician']);
        if ($user['role'] === 'department_head') {
            $stmt = $pdo->prepare(
                "SELECT asset.*,
                        (SELECT disposal.status FROM asset_disposal_cases disposal
                         WHERE disposal.asset_id = asset.id ORDER BY disposal.id DESC LIMIT 1) AS disposal_case_status
                 FROM assets asset WHERE asset.department = ? ORDER BY asset.created_at DESC"
            );
            $stmt->execute([$user['department']]);
        } else {
            $stmt = $pdo->query(
                "SELECT asset.*,
                        (SELECT disposal.status FROM asset_disposal_cases disposal
                         WHERE disposal.asset_id = asset.id ORDER BY disposal.id DESC LIMIT 1) AS disposal_case_status
                 FROM assets asset ORDER BY asset.created_at DESC"
            );
        }
        api_response(['success' => true, 'data' => $stmt->fetchAll()]);
    } catch (Throwable $e) {
        api_handle_error($e);
    }
}

if ($method === 'DELETE') {
    try {
        $actor = api_require_roles(['system_admin']);
        $input = api_request_data();
        $id = api_required_string($input, 'assetId', 'Asset');

        $pdo->beginTransaction();
        $asset = $pdo->prepare('SELECT id, name FROM assets WHERE id = ? FOR UPDATE');
        $asset->execute([$id]);
        $current = $asset->fetch();
        if (!$current) {
            throw new InvalidArgumentException('The selected asset does not exist.');
        }

        $linkedRecords = [
            'transfers' => 'transfers',
            'maintenance' => 'maintenance tickets',
            'stock_issue_voucher_items' => 'stock issue records',
            'asset_acknowledgements' => 'custodian acknowledgements',
            'asset_incidents' => 'incident reports',
            'asset_disposal_cases' => 'disposal review records',
            'compliance_inspections' => 'compliance inspections',
            'physical_count_items' => 'physical count records',
        ];
        $references = [];
        foreach ($linkedRecords as $table => $label) {
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM `$table` WHERE asset_id = ?");
            $stmt->execute([$id]);
            if ((int)$stmt->fetchColumn() > 0) {
                $references[] = $label;
            }
        }

        if ($references) {
            $pdo->rollBack();
            api_response([
                'success' => false,
                'error' => 'This asset cannot be deleted because it has linked records: '
                    . implode(', ', $references) . '.',
            ], 409);
        }

        api_audit('asset_deleted', "Deleted asset $id ({$current['name']}).");
        $delete = $pdo->prepare('DELETE FROM assets WHERE id = ?');
        $delete->execute([$id]);
        $pdo->commit();
        api_response(['success' => true, 'message' => 'Asset deleted successfully.']);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        if ($e instanceof PDOException && ($e->errorInfo[0] ?? $e->getCode()) === '23000') {
            api_response([
                'success' => false,
                'error' => 'This asset cannot be deleted because it has linked records.',
            ], 409);
        }
        api_handle_error($e);
    }
}

if ($method === 'PATCH') {
    try {
        $input = api_request_data();
        $isReviewFlagAction = ($input['action'] ?? '') === 'review-flag';
        $actor = api_require_roles($isReviewFlagAction
            ? ['system_admin', 'property_admin', 'internal_auditor']
            : ['system_admin', 'property_admin']);
        if (array_key_exists('action', $input) && !$isReviewFlagAction) {
            throw new InvalidArgumentException('The requested asset action is not supported.');
        }
        $id = api_required_string($input, 'assetId', 'Asset');

        if ($isReviewFlagAction) {
            if (!array_key_exists('flagged', $input) || !is_bool($input['flagged'])) {
                throw new InvalidArgumentException('Review flag status must be true or false.');
            }

            $flagged = $input['flagged'];
            $pdo->beginTransaction();
            $asset = $pdo->prepare('SELECT review_flagged_at FROM assets WHERE id = ? FOR UPDATE');
            $asset->execute([$id]);
            $current = $asset->fetch();
            if (!$current) {
                throw new InvalidArgumentException('The selected asset does not exist.');
            }

            $currentlyFlagged = $current['review_flagged_at'] !== null;
            if ($currentlyFlagged !== $flagged) {
                if ($flagged) {
                    $stmt = $pdo->prepare(
                        'UPDATE assets SET review_flagged_at = CURRENT_TIMESTAMP, review_flagged_by = ? WHERE id = ?'
                    );
                    $stmt->execute([$actor['id'], $id]);
                } else {
                    $stmt = $pdo->prepare(
                        'UPDATE assets SET review_flagged_at = NULL, review_flagged_by = NULL WHERE id = ?'
                    );
                    $stmt->execute([$id]);
                }

                api_audit(
                    $flagged ? 'asset_review_flagged' : 'asset_review_unflagged',
                    $flagged ? "Asset $id flagged for review." : "Asset $id cleared from review."
                );
            }

            $pdo->commit();
            api_response([
                'success' => true,
                'message' => $flagged ? 'Asset flagged for review.' : 'Asset review flag cleared.',
            ]);
        }

        $pdo->beginTransaction();
        $asset = $pdo->prepare('SELECT status FROM assets WHERE id = ? FOR UPDATE');
        $asset->execute([$id]);
        $current = $asset->fetch();
        if (!$current) {
            throw new InvalidArgumentException('The selected asset does not exist.');
        }
        if ($current['status'] !== 'Pending Disposal') {
            $stmt = $pdo->prepare("UPDATE assets SET status = 'Pending Disposal' WHERE id = ?");
            $stmt->execute([$id]);
        }
        $case = $pdo->prepare(
            "SELECT id FROM asset_disposal_cases
             WHERE asset_id = ? AND status <> 'Rejected'
             LIMIT 1 FOR UPDATE"
        );
        $case->execute([$id]);
        if (!$case->fetchColumn()) {
            $insertCase = $pdo->prepare(
                "INSERT INTO asset_disposal_cases (asset_id, status) VALUES (?, 'Requested')"
            );
            $insertCase->execute([$id]);
        }
        api_audit('asset_disposal_flagged', "Asset $id submitted for Disposal Committee review.");
        $pdo->commit();
        api_response(['success' => true, 'message' => 'Asset submitted for Disposal Committee review.']);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        api_handle_error($e);
    }
}

api_require_method('POST');

try {
    $user = api_require_roles(['system_admin', 'property_admin', 'department_head']);
    $input = api_request_data();
    $name = api_required_string($input, 'name', 'Asset name');
    $category = api_required_string($input, 'category', 'Category');
    $campus = api_required_string($input, 'campus', 'Campus');
    $department = $user['role'] === 'department_head'
        ? $user['department']
        : api_required_string($input, 'department', 'Department');
    if ($department === null || $department === '') {
        throw new InvalidArgumentException('Your account must be assigned to a department before registering assets.');
    }
    $building = api_optional_string($input, 'building');
    $room = api_optional_string($input, 'room');
    $custodian = api_optional_string($input, 'custodian', 'Unassigned');
    $cost = api_cost($input);
    $acquisitionDate = api_date($input, 'acqDate', 'Acquisition date');
    $condition = api_optional_string($input, 'condition', 'New');
    $allowedConditions = ['New', 'Good', 'Fair', 'Damaged', 'Obsolete'];
    if (!in_array($condition, $allowedConditions, true)) {
        throw new InvalidArgumentException('Condition is not valid.');
    }

    $id = 'DMU-AST-' . date('Y') . '-' . api_next_id($pdo, 'assets');
    $stmt = $pdo->prepare(
        'INSERT INTO assets (id, name, category, campus, department, building, room, custodian, cost, acq_date, `condition`, status, serial)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        $id,
        $name,
        $category,
        $campus,
        $department,
        $building,
        $room,
        $custodian,
        $cost,
        $acquisitionDate,
        $condition,
        'Active',
        api_optional_string($input, 'serial', 'N/A') ?: 'N/A',
    ]);

    api_audit('asset_registered', "Registered asset $id.");
    api_response(['success' => true, 'message' => 'Asset registered successfully.', 'id' => $id], 201);
} catch (Throwable $e) {
    api_handle_error($e);
}
