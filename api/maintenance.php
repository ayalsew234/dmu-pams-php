<?php
require_once __DIR__ . '/bootstrap.php';

$user = api_require_auth();
$method = $_SERVER['REQUEST_METHOD'] ?? '';
if ($method === 'GET') {
    try {
        if (in_array($user['role'], ['system_admin', 'property_admin', 'technician'], true)) {
            $stmt = $pdo->query('SELECT * FROM maintenance ORDER BY created_at DESC');
        } elseif ($user['role'] === 'department_head') {
            $stmt = $pdo->prepare(
                'SELECT maintenance.* FROM maintenance
                 INNER JOIN assets ON assets.id = maintenance.asset_id
                 WHERE assets.department = ? ORDER BY maintenance.created_at DESC'
            );
            $stmt->execute([$user['department']]);
        } elseif ($user['role'] === 'asset_custodian') {
            $stmt = $pdo->prepare(
                'SELECT maintenance.* FROM maintenance
                 INNER JOIN assets ON assets.id = maintenance.asset_id
                 WHERE (assets.custodian_user_id = ?
                    OR (assets.custodian_user_id IS NULL AND assets.custodian = ?))
                   AND assets.department = ?
                 ORDER BY maintenance.created_at DESC'
            );
            $stmt->execute([$user['id'], $user['full_name'], $user['department']]);
        } else {
            api_response(['success' => false, 'error' => 'Your account cannot view maintenance tickets.'], 403);
        }
        api_response(['success' => true, 'data' => $stmt->fetchAll()]);
    } catch (Throwable $e) {
        api_handle_error($e);
    }
}

if ($method === 'PATCH') {
    try {
        api_require_roles(['technician']);
        $input = api_request_data();
        $maintenanceId = api_required_string($input, 'maintenanceId', 'Maintenance work order');
        $status = api_required_string($input, 'status', 'Status');
        if (!in_array($status, ['Pending', 'In Progress', 'Completed', 'Cancelled'], true)) {
            throw new InvalidArgumentException('Maintenance status is not valid.');
        }
        $actualCost = api_cost($input, 'actualCost');
        $diagnosis = api_optional_string($input, 'diagnosis');
        $spareParts = api_optional_string($input, 'spareParts');

        $pdo->beginTransaction();
        $ticketStmt = $pdo->prepare('SELECT asset_id, status FROM maintenance WHERE id = ? FOR UPDATE');
        $ticketStmt->execute([$maintenanceId]);
        $ticket = $ticketStmt->fetch();
        if (!$ticket) {
            throw new InvalidArgumentException('The selected maintenance work order does not exist.');
        }
        if (in_array($ticket['status'], ['Completed', 'Cancelled'], true)) {
            throw new InvalidArgumentException('Completed or cancelled work orders cannot be changed.');
        }
        $allowedStatuses = $ticket['status'] === 'Pending'
            ? ['Pending', 'In Progress', 'Cancelled']
            : ['In Progress', 'Completed', 'Cancelled'];
        if (!in_array($status, $allowedStatuses, true)) {
            throw new InvalidArgumentException('Work orders must move from Pending to In Progress before completion.');
        }

        $updateTicket = $pdo->prepare(
            'UPDATE maintenance SET status = ?, diagnosis = ?, actual_cost = ?, spare_parts = ? WHERE id = ?'
        );
        $updateTicket->execute([$status, $diagnosis, $actualCost, $spareParts, $maintenanceId]);
        if ($status === 'Completed') {
            $openTickets = $pdo->prepare(
                "SELECT COUNT(*) FROM maintenance
                 WHERE asset_id = ? AND status IN ('Pending', 'In Progress')"
            );
            $openTickets->execute([$ticket['asset_id']]);
            if ((int)$openTickets->fetchColumn() === 0) {
                $updateAsset = $pdo->prepare("UPDATE assets SET status = 'Active' WHERE id = ?");
                $updateAsset->execute([$ticket['asset_id']]);
            }
        }
        $pdo->commit();

        api_audit('maintenance_workorder_updated', "Updated work order $maintenanceId to $status.");
        api_response(['success' => true, 'message' => 'Maintenance work order updated.']);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        api_handle_error($e);
    }
}

api_require_method('POST');

try {
    $user = api_require_roles(['system_admin', 'property_admin', 'department_head', 'asset_custodian', 'technician']);
    $input = api_request_data();
    $assetId = api_required_string($input, 'assetId', 'Asset');
    $issue = api_required_string($input, 'issue', 'Issue description');
    $priority = api_optional_string($input, 'priority', 'Medium');
    if (!in_array($priority, ['Low', 'Medium', 'Urgent'], true)) {
        throw new InvalidArgumentException('Priority is not valid.');
    }
    $estimatedCost = $user['role'] === 'asset_custodian' ? 0.0 : api_cost($input, 'estimatedCost');
    $technician = $user['role'] === 'asset_custodian'
        ? 'Internal Workshop'
        : (api_optional_string($input, 'technician', 'Internal Workshop') ?: 'Internal Workshop');
    $spareParts = $user['role'] === 'asset_custodian' ? '' : api_optional_string($input, 'spareParts');
    $reportedBy = api_optional_string($input, 'reportedBy', 'Department Head / Dean') ?: 'Department Head / Dean';

    $pdo->beginTransaction();
    $assetStmt = $pdo->prepare('SELECT id, name, custodian, custodian_user_id, department FROM assets WHERE id = ? FOR UPDATE');
    $assetStmt->execute([$assetId]);
    $asset = $assetStmt->fetch();
    if (!$asset) {
        throw new InvalidArgumentException('The selected asset does not exist.');
    }
    if ($user['role'] === 'department_head') {
        if ($asset['department'] !== $user['department']) {
            api_response(['success' => false, 'error' => 'Department Heads may submit tickets only for their own department assets.'], 403);
        }
    } elseif ($user['role'] === 'asset_custodian'
        && (($asset['custodian_user_id'] != $user['id']
                && !($asset['custodian_user_id'] === null && $asset['custodian'] === $user['full_name']))
            || $asset['department'] !== $user['department'])) {
        api_response(['success' => false, 'error' => 'You may submit tickets only for assets assigned to your account.'], 403);
    }

    $id = 'MNT-' . date('Y') . '-' . api_next_id($pdo, 'maintenance');
    $stmt = $pdo->prepare(
        'INSERT INTO maintenance (id, asset_id, asset_name, priority, issue, reported_by, report_date, status, estimated_cost, technician, spare_parts)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        $id,
        $asset['id'],
        $asset['name'],
        $priority,
        $issue,
        $user['full_name'],
        date('Y-m-d'),
        'Pending',
        $estimatedCost,
        $technician,
        $spareParts,
    ]);

    $updateAsset = $pdo->prepare("UPDATE assets SET status = 'Under Maintenance', `condition` = 'Damaged' WHERE id = ?");
    $updateAsset->execute([$assetId]);
    $pdo->commit();

    api_audit('maintenance_ticket_created', "Created work order $id for asset $assetId.");
    api_response(['success' => true, 'message' => 'Maintenance ticket logged successfully.', 'id' => $id], 201);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    api_handle_error($e);
}