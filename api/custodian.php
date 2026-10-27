<?php
require_once __DIR__ . '/bootstrap.php';

$user = api_require_roles(['asset_custodian']);
$method = $_SERVER['REQUEST_METHOD'] ?? '';

if ($method === 'GET') {
    try {
        $assets = $pdo->prepare(
            'SELECT assets.id, assets.name, assets.category, assets.campus, assets.department,
                    assets.building, assets.room, assets.custodian, assets.custodian_user_id, assets.serial, assets.`condition`,
                    assets.status, assets.stock_status, assets.tagged_at, assets.cost, assets.acq_date,
                    acknowledgement.acknowledged_at
             FROM assets
             LEFT JOIN asset_acknowledgements AS acknowledgement
               ON acknowledgement.asset_id = assets.id AND acknowledgement.user_id = ?
             WHERE (assets.custodian_user_id = ?
                    OR (assets.custodian_user_id IS NULL AND assets.custodian = ?))
               AND assets.department = ?
             ORDER BY assets.name, assets.id'
        );
        $assets->execute([$user['id'], $user['id'], $user['full_name'], $user['department']]);

        $incidents = $pdo->prepare(
            'SELECT incidents.id, incidents.asset_id, assets.name AS asset_name, incidents.incident_type,
                    incidents.description, incidents.status, incidents.reported_at
             FROM asset_incidents AS incidents
             INNER JOIN assets ON assets.id = incidents.asset_id
             WHERE incidents.reporter_user_id = ?
             ORDER BY incidents.reported_at DESC'
        );
        $incidents->execute([$user['id']]);
        api_response([
            'success' => true,
            'data' => ['assets' => $assets->fetchAll(), 'incidents' => $incidents->fetchAll()],
        ]);
    } catch (Throwable $e) {
        api_handle_error($e);
    }
}

api_require_method('POST');

try {
    $input = api_request_data();
    $action = api_required_string($input, 'action', 'Action');
    $assetId = api_required_string($input, 'assetId', 'Asset');
    $asset = $pdo->prepare(
        'SELECT id FROM assets
         WHERE id = ? AND (custodian_user_id = ?
             OR (custodian_user_id IS NULL AND custodian = ?)) AND department = ?'
    );
    $asset->execute([$assetId, $user['id'], $user['full_name'], $user['department']]);
    if (!$asset->fetchColumn()) {
        api_response(['success' => false, 'error' => 'The selected asset is not assigned to your account.'], 403);
    }

    if ($action === 'acknowledge') {
        $acknowledge = $pdo->prepare(
            'INSERT INTO asset_acknowledgements (asset_id, user_id, signed_name, acknowledged_at)
             VALUES (?, ?, ?, CURRENT_TIMESTAMP)
             ON DUPLICATE KEY UPDATE signed_name = VALUES(signed_name), acknowledged_at = CURRENT_TIMESTAMP'
        );
        $acknowledge->execute([$assetId, $user['id'], $user['full_name']]);
        api_audit('asset_assignment_acknowledged', "Asset $assetId acknowledged by {$user['full_name']}.");
        api_response(['success' => true, 'message' => 'Asset assignment acknowledged electronically.']);
    }

    if ($action === 'incident') {
        $incidentType = api_required_string($input, 'incidentType', 'Incident type');
        if (!in_array($incidentType, ['Loss', 'Damage', 'Theft'], true)) {
            throw new InvalidArgumentException('Incident type must be Loss, Damage, or Theft.');
        }
        $description = api_required_string($input, 'description', 'Incident details');
        if (strlen($description) > 5000) {
            throw new InvalidArgumentException('Incident details must be 5,000 characters or fewer.');
        }
        $insert = $pdo->prepare(
            'INSERT INTO asset_incidents (asset_id, reporter_user_id, incident_type, description)
             VALUES (?, ?, ?, ?)'
        );
        $insert->execute([$assetId, $user['id'], $incidentType, $description]);
        $incidentId = (int)$pdo->lastInsertId();
        api_audit('asset_incident_reported', "Reported $incidentType incident $incidentId for asset $assetId.");
        api_response(['success' => true, 'message' => 'Asset incident report submitted.', 'id' => $incidentId], 201);
    }

    api_response(['success' => false, 'error' => 'The requested action is not supported.'], 400);
} catch (Throwable $e) {
    api_handle_error($e);
}
