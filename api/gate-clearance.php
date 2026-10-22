<?php
require_once __DIR__ . '/bootstrap.php';

$user = api_require_roles(['system_admin', 'property_admin', 'gate_security']);
$method = $_SERVER['REQUEST_METHOD'] ?? '';

if ($method === 'GET') {
    try {
        $gatePass = $_GET['gatePass'] ?? '';
        if (!is_string($gatePass) || trim($gatePass) === '') {
            throw new InvalidArgumentException('A gate-pass voucher number is required.');
        }

        $transferStmt = $pdo->prepare('SELECT * FROM transfers WHERE gate_pass = ? LIMIT 1');
        $transferStmt->execute([trim($gatePass)]);
        $transfer = $transferStmt->fetch();
        if (!$transfer) {
            api_response(['success' => false, 'error' => 'Gate pass was not found.'], 404);
        }

        $eventStmt = $pdo->prepare(
            'SELECT event_type, driver_name, gate_officer, event_at
             FROM gate_transit_events WHERE transfer_id = ? ORDER BY event_at, id'
        );
        $eventStmt->execute([$transfer['id']]);
        $transfer['events'] = $eventStmt->fetchAll();
        api_response(['success' => true, 'data' => $transfer]);
    } catch (Throwable $e) {
        api_handle_error($e);
    }
}

api_require_method('POST');

try {
    $input = api_request_data();
    $transferId = api_required_string($input, 'transferId', 'Transfer');
    $eventType = api_required_string($input, 'eventType', 'Transit event');
    if (!in_array($eventType, ['Check-out', 'Check-in'], true)) {
        throw new InvalidArgumentException('Transit event must be Check-out or Check-in.');
    }
    $driverName = api_required_string($input, 'driverName', 'Driver name');
    $gateOfficer = api_required_string($input, 'gateOfficer', 'Gate officer name');

    $pdo->beginTransaction();
    $transferStmt = $pdo->prepare('SELECT status FROM transfers WHERE id = ? FOR UPDATE');
    $transferStmt->execute([$transferId]);
    $transfer = $transferStmt->fetch();
    if (!$transfer) {
        throw new InvalidArgumentException('The selected transfer does not exist.');
    }
    if ($transfer['status'] !== 'Approved') {
        throw new InvalidArgumentException('Transit clearance is allowed only for approved transfers.');
    }

    $eventsStmt = $pdo->prepare('SELECT event_type FROM gate_transit_events WHERE transfer_id = ?');
    $eventsStmt->execute([$transferId]);
    $events = $eventsStmt->fetchAll(PDO::FETCH_COLUMN);
    if ($eventType === 'Check-out' && in_array('Check-out', $events, true)) {
        throw new InvalidArgumentException('This transfer has already been checked out.');
    }
    if ($eventType === 'Check-in' && !in_array('Check-out', $events, true)) {
        throw new InvalidArgumentException('Record check-out before recording check-in.');
    }
    if ($eventType === 'Check-in' && in_array('Check-in', $events, true)) {
        throw new InvalidArgumentException('This transfer has already been checked in.');
    }

    $insert = $pdo->prepare(
        'INSERT INTO gate_transit_events (transfer_id, event_type, driver_name, gate_officer)
         VALUES (?, ?, ?, ?)'
    );
    $insert->execute([$transferId, $eventType, $driverName, $gateOfficer]);
    $pdo->commit();

    api_audit('gate_transit_recorded', "$eventType recorded for transfer $transferId by $gateOfficer.");
    api_response(['success' => true, 'message' => "$eventType recorded for gate transit."]);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    api_handle_error($e);
}
