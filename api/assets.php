<?php
require_once __DIR__ . '/bootstrap.php';

$user = api_require_auth();
$method = $_SERVER['REQUEST_METHOD'] ?? '';
if ($method === 'GET') {
    try {
        if ($user['role'] === 'gate_security') {
            api_response(['success' => false, 'error' => 'Your account cannot view the asset registry.'], 403);
        }
        if ($user['role'] === 'department_head') {
            $stmt = $pdo->prepare('SELECT * FROM assets WHERE department = ? ORDER BY created_at DESC');
            $stmt->execute([$user['department']]);
        } else {
            $stmt = $pdo->query('SELECT * FROM assets ORDER BY created_at DESC');
        }
        api_response(['success' => true, 'data' => $stmt->fetchAll()]);
    } catch (Throwable $e) {
        api_handle_error($e);
    }
}

if ($method === 'PATCH') {
    try {
        api_require_roles(['system_admin', 'property_admin']);
        $input = api_request_data();
        $id = api_required_string($input, 'assetId', 'Asset');
        $stmt = $pdo->prepare("UPDATE assets SET status = 'Pending Disposal' WHERE id = ?");
        $stmt->execute([$id]);
        if ($stmt->rowCount() === 0) {
            $exists = $pdo->prepare('SELECT 1 FROM assets WHERE id = ?');
            $exists->execute([$id]);
            if (!$exists->fetchColumn()) {
                throw new InvalidArgumentException('The selected asset does not exist.');
            }
        }
        api_audit('asset_disposal_flagged', "Asset $id flagged for disposal review.");
        api_response(['success' => true, 'message' => 'Asset flagged for disposal review.']);
    } catch (Throwable $e) {
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
