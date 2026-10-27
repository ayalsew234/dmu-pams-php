<?php
require_once __DIR__ . '/bootstrap.php';

$user = api_require_roles(['internal_auditor']);
$method = $_SERVER['REQUEST_METHOD'] ?? '';

if ($method === 'GET') {
    try {
        $overview = $pdo->query(
            'SELECT COUNT(*) AS asset_count, COALESCE(SUM(cost), 0) AS registered_value,
                    COALESCE(SUM(CASE WHEN status = \'Pending Disposal\' THEN 1 ELSE 0 END), 0) AS pending_disposal_count,
                    COALESCE(SUM(CASE WHEN stock_status = \'In Stock\' THEN 1 ELSE 0 END), 0) AS in_stock_count
             FROM assets'
        )->fetch();

        $byCampus = $pdo->query(
            'SELECT campus AS label, COUNT(*) AS asset_count, COALESCE(SUM(cost), 0) AS registered_value
             FROM assets GROUP BY campus ORDER BY campus'
        )->fetchAll();
        $byDepartment = $pdo->query(
            'SELECT department AS label, COUNT(*) AS asset_count, COALESCE(SUM(cost), 0) AS registered_value
             FROM assets GROUP BY department ORDER BY department'
        )->fetchAll();
        $receiptAssetReconciliation = $pdo->query(
            'SELECT gr.id AS receipt_id, gr.purchase_order_id, gr.quantity_received,
                    COUNT(asset.id) AS registered_asset_count,
                    gr.quantity_received - COUNT(asset.id) AS quantity_difference,
                    ROUND((gr.quantity_received - COUNT(asset.id)) * po.unit_cost, 2) AS value_difference,
                    po.item_name, v.name AS vendor_name
             FROM goods_receipt_notes gr
             INNER JOIN purchase_orders po ON po.id = gr.purchase_order_id
             INNER JOIN vendors v ON v.id = po.vendor_id
             LEFT JOIN assets asset ON asset.goods_receipt_note_id = gr.id
             GROUP BY gr.id, gr.purchase_order_id, gr.quantity_received, gr.created_at, po.unit_cost, po.item_name, v.name
             ORDER BY gr.created_at DESC'
        )->fetchAll();
        $invoiceDiscrepancies = $pdo->query(
            "SELECT gr.id AS receipt_id, gr.purchase_order_id, gr.invoice_number, gr.invoice_amount,
                    gr.invoice_difference, po.item_name, v.name AS vendor_name, gr.received_date
             FROM goods_receipt_notes gr
             INNER JOIN purchase_orders po ON po.id = gr.purchase_order_id
             INNER JOIN vendors v ON v.id = po.vendor_id
             WHERE gr.invoice_status = 'Discrepant'
             ORDER BY gr.created_at DESC"
        )->fetchAll();
        $incidents = $pdo->query(
            "SELECT incident.id, incident.asset_id, asset.name AS asset_name, incident.incident_type,
                    incident.description, incident.status, incident.reported_at, reporter.full_name AS reporter
             FROM asset_incidents incident
             INNER JOIN assets asset ON asset.id = incident.asset_id
             INNER JOIN users reporter ON reporter.id = incident.reporter_user_id
             WHERE incident.status <> 'Resolved'
             ORDER BY incident.reported_at DESC"
        )->fetchAll();
        $inspections = $pdo->query(
            'SELECT inspection.id, inspection.title, inspection.inspection_type, inspection.risk_level,
                    inspection.asset_id, asset.name AS asset_name, inspection.findings, inspection.status,
                    inspection.created_at, inspector.full_name AS inspector
             FROM compliance_inspections inspection
             LEFT JOIN assets asset ON asset.id = inspection.asset_id
             LEFT JOIN users inspector ON inspector.id = inspection.inspected_by
             ORDER BY inspection.created_at DESC, inspection.id DESC
             LIMIT 250'
        )->fetchAll();
        $countSummary = $pdo->query(
            "SELECT count_session.id, count_session.status, count_session.started_at, count_session.completed_at,
                    COUNT(count_item.asset_id) AS expected_count,
                    COALESCE(SUM(CASE WHEN count_item.is_verified = 1 THEN 1 ELSE 0 END), 0) AS verified_count,
                    COALESCE(SUM(CASE WHEN count_item.is_verified = 0 THEN 1 ELSE 0 END), 0) AS missing_count,
                    COALESCE(SUM(CASE WHEN count_item.is_verified IS NULL THEN 1 ELSE 0 END), 0) AS pending_count
             FROM physical_count_sessions count_session
             LEFT JOIN physical_count_items count_item ON count_item.session_id = count_session.id
             GROUP BY count_session.id, count_session.status, count_session.started_at, count_session.completed_at
             ORDER BY count_session.id DESC
             LIMIT 1"
        )->fetch();

        api_response([
            'success' => true,
            'data' => [
                'overview' => $overview,
                'valuationByCampus' => $byCampus,
                'valuationByDepartment' => $byDepartment,
                'receiptAssetReconciliation' => $receiptAssetReconciliation,
                'invoiceDiscrepancies' => $invoiceDiscrepancies,
                'openIncidents' => $incidents,
                'inspections' => $inspections,
                'latestPhysicalCount' => $countSummary ?: null,
            ],
        ]);
    } catch (Throwable $e) {
        api_handle_error($e);
    }
}

if ($method === 'POST') {
    try {
        $input = api_request_data();
        $title = api_required_string($input, 'title', 'Inspection title');
        $inspectionType = api_required_string($input, 'inspectionType', 'Inspection type');
        $riskLevel = api_required_string($input, 'riskLevel', 'Risk level');
        $findings = api_required_string($input, 'findings', 'Inspection findings');
        $assetId = api_optional_string($input, 'assetId') ?: null;

        if (!in_array($inspectionType, ['Anti-Fraud', 'Asset Compliance', 'Financial Review', 'Other'], true)) {
            throw new InvalidArgumentException('Select a valid inspection type.');
        }
        if (!in_array($riskLevel, ['Low', 'Medium', 'High'], true)) {
            throw new InvalidArgumentException('Select a valid risk level.');
        }
        if (strlen($title) > 255 || strlen($findings) > 10000) {
            throw new InvalidArgumentException('Inspection title or findings exceed the allowed length.');
        }
        if ($assetId !== null) {
            $asset = $pdo->prepare('SELECT 1 FROM assets WHERE id = ?');
            $asset->execute([$assetId]);
            if (!$asset->fetchColumn()) {
                throw new InvalidArgumentException('The selected asset does not exist.');
            }
        }

        $insert = $pdo->prepare(
            'INSERT INTO compliance_inspections
                (title, inspection_type, risk_level, asset_id, findings, inspected_by)
             VALUES (?, ?, ?, ?, ?, ?)'
        );
        $insert->execute([$title, $inspectionType, $riskLevel, $assetId, $findings, $user['id']]);
        $inspectionId = (int)$pdo->lastInsertId();
        api_audit('compliance_inspection_created', "Created $riskLevel $inspectionType inspection #$inspectionId.");
        api_response(['success' => true, 'message' => 'Compliance inspection finding recorded.', 'id' => $inspectionId], 201);
    } catch (Throwable $e) {
        api_handle_error($e);
    }
}

if ($method === 'PATCH') {
    try {
        $input = api_request_data();
        $inspectionId = filter_var($input['inspectionId'] ?? null, FILTER_VALIDATE_INT);
        $status = api_required_string($input, 'status', 'Inspection status');
        if ($inspectionId === false || $inspectionId === null || $inspectionId < 1) {
            throw new InvalidArgumentException('Select a valid inspection record.');
        }
        if (!in_array($status, ['Open', 'Under Review', 'Closed'], true)) {
            throw new InvalidArgumentException('Select a valid inspection status.');
        }
        $update = $pdo->prepare('UPDATE compliance_inspections SET status = ? WHERE id = ?');
        $update->execute([$status, $inspectionId]);
        if ($update->rowCount() === 0) {
            $exists = $pdo->prepare('SELECT 1 FROM compliance_inspections WHERE id = ?');
            $exists->execute([$inspectionId]);
            if (!$exists->fetchColumn()) {
                throw new InvalidArgumentException('The selected inspection record does not exist.');
            }
        }
        api_audit('compliance_inspection_status_updated', "Updated inspection #$inspectionId to $status.");
        api_response(['success' => true, 'message' => 'Inspection status updated.']);
    } catch (Throwable $e) {
        api_handle_error($e);
    }
}

api_require_method('GET');
