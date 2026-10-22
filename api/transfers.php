<?php
require_once __DIR__ . '/bootstrap.php';

$user = api_require_auth();
$method = $_SERVER['REQUEST_METHOD'] ?? '';
if ($method === 'GET') {
    try {
        $gatePassInput = $_GET['gatePass'] ?? '';
        if (!is_string($gatePassInput)) {
            throw new InvalidArgumentException('Gate pass must be a single voucher number.');
        }
        $gatePass = trim($gatePassInput);
        if ($gatePass !== '') {
            api_require_roles(['system_admin', 'property_admin', 'gate_security']);
            $stmt = $pdo->prepare('SELECT * FROM transfers WHERE gate_pass = ? LIMIT 1');
            $stmt->execute([$gatePass]);
            $transfer = $stmt->fetch();
            if (!$transfer) {
                api_response(['success' => false, 'error' => 'Gate pass was not found.'], 404);
            }
            api_response(['success' => true, 'data' => $transfer]);
        }

        if (in_array($user['role'], ['system_admin', 'property_admin'], true)) {
            $stmt = $pdo->query('SELECT * FROM transfers ORDER BY created_at DESC');
        } elseif ($user['role'] === 'department_head') {
            $stmt = $pdo->prepare(
                'SELECT * FROM transfers WHERE from_dept = ? OR to_dept = ? ORDER BY created_at DESC'
            );
            $stmt->execute([$user['department'], $user['department']]);
        } else {
            api_response(['success' => false, 'error' => 'Your account cannot view transfer requests.'], 403);
        }
        api_response(['success' => true, 'data' => $stmt->fetchAll()]);
    } catch (Throwable $e) {
        api_handle_error($e);
    }
}

if ($method === 'PATCH') {
    try {
        $user = api_require_roles(['system_admin', 'property_admin', 'department_head']);
        $input = api_request_data();
        $transferId = api_required_string($input, 'transferId', 'Transfer');
        $status = api_required_string($input, 'status', 'Decision');
        if (!in_array($status, ['Approved', 'Rejected'], true)) {
            throw new InvalidArgumentException('Transfer decision must be Approved or Rejected.');
        }

        $pdo->beginTransaction();
        $transferStmt = $pdo->prepare(
            'SELECT asset_id, from_campus, from_dept, to_campus, to_dept, status
             FROM transfers WHERE id = ? FOR UPDATE'
        );
        $transferStmt->execute([$transferId]);
        $transfer = $transferStmt->fetch();
        if (!$transfer) {
            throw new InvalidArgumentException('The selected transfer does not exist.');
        }
        if ($transfer['status'] !== 'Pending') {
            throw new InvalidArgumentException('Only pending transfer requests can be decided.');
        }
        if ($user['role'] === 'department_head' && $transfer['from_dept'] !== $user['department']) {
            api_response(['success' => false, 'error' => 'Department Heads may decide only requests from their own department.'], 403);
        }

        if ($status === 'Approved') {
            $assetStmt = $pdo->prepare('SELECT campus, department FROM assets WHERE id = ? FOR UPDATE');
            $assetStmt->execute([$transfer['asset_id']]);
            $asset = $assetStmt->fetch();
            if (!$asset || $asset['campus'] !== $transfer['from_campus'] || $asset['department'] !== $transfer['from_dept']) {
                throw new InvalidArgumentException('The asset location changed after this request was submitted. Review the request before approval.');
            }
        }

        $updateTransfer = $pdo->prepare('UPDATE transfers SET status = ? WHERE id = ?');
        $updateTransfer->execute([$status, $transferId]);
        if ($status === 'Approved') {
            $updateAsset = $pdo->prepare('UPDATE assets SET campus = ?, department = ? WHERE id = ?');
            $updateAsset->execute([$transfer['to_campus'], $transfer['to_dept'], $transfer['asset_id']]);
        }
        $pdo->commit();

        api_audit('transfer_decision', "Transfer $transferId was $status.");
        api_response([
            'success' => true,
            'message' => $status === 'Approved'
                ? 'Transfer approved and asset location updated.'
                : 'Transfer request rejected.',
        ]);
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
    $assetId = api_required_string($input, 'assetId', 'Asset');
    $toCampus = api_required_string($input, 'toCampus', 'Destination campus');
    $toDepartment = api_required_string($input, 'toDept', 'Destination department');
    $requestedBy = api_optional_string($input, 'requestedBy', 'Department Head / Dean') ?: 'Department Head / Dean';

    $assetStmt = $pdo->prepare('SELECT id, name, campus, department FROM assets WHERE id = ?');
    $assetStmt->execute([$assetId]);
    $asset = $assetStmt->fetch();
    if (!$asset) {
        throw new InvalidArgumentException('The selected asset does not exist.');
    }
    if ($user['role'] === 'department_head' && $asset['department'] !== $user['department']) {
        api_response(['success' => false, 'error' => 'Department Heads may request transfers only for their own department assets.'], 403);
    }
    if ($asset['campus'] === $toCampus && $asset['department'] === $toDepartment) {
        throw new InvalidArgumentException('The destination must differ from the asset’s current location.');
    }

    $id = 'TR-' . date('Y') . '-' . api_next_id($pdo, 'transfers');
    $gatePass = 'GP-' . random_int(10000, 99999);
    $stmt = $pdo->prepare(
        'INSERT INTO transfers (id, asset_id, asset_name, from_campus, to_campus, from_dept, to_dept, transfer_date, requested_by, status, gate_pass)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        $id,
        $asset['id'],
        $asset['name'],
        $asset['campus'],
        $toCampus,
        $asset['department'],
        $toDepartment,
        date('Y-m-d'),
        $requestedBy,
        'Pending',
        $gatePass,
    ]);

    api_audit('transfer_requested', "Created transfer $id for asset {$asset['id']}.");
    api_response(['success' => true, 'message' => 'Transfer order generated.', 'id' => $id, 'gatePass' => $gatePass], 201);
} catch (Throwable $e) {
    api_handle_error($e);
}
