<?php
require_once __DIR__ . '/bootstrap.php';

$user = api_require_roles(['disposal_committee']);
$method = $_SERVER['REQUEST_METHOD'] ?? '';

if ($method === 'GET') {
    try {
        $cases = $pdo->query(
            'SELECT disposal.id, disposal.asset_id, disposal.status AS case_status,
                    disposal.inspection_findings, disposal.inspected_at,
                    disposal.inspected_by_name AS inspector_name, disposal.disposition,
                    disposal.decision_notes, disposal.decided_at, disposal.certificate_no,
                    disposal.certificate_issued_at, disposal.decided_by_name AS signer_name,
                    asset.name AS asset_name, asset.category, asset.campus, asset.department,
                    asset.building, asset.room, asset.custodian, asset.serial, asset.`condition`,
                    asset.cost, asset.acq_date, asset.status AS asset_status
             FROM asset_disposal_cases disposal
             INNER JOIN assets asset ON asset.id = disposal.asset_id
             ORDER BY FIELD(disposal.status, \'Requested\', \'Inspected\', \'Approved\', \'Rejected\'),
                      disposal.created_at DESC'
        )->fetchAll();
        api_response(['success' => true, 'data' => $cases]);
    } catch (Throwable $e) {
        api_handle_error($e);
    }
}

if ($method === 'POST') {
    try {
        $input = api_request_data();
        $caseId = filter_var($input['caseId'] ?? null, FILTER_VALIDATE_INT);
        $findings = api_required_string($input, 'inspectionFindings', 'Inspection findings');
        if ($caseId === false || $caseId === null || $caseId < 1) {
            throw new InvalidArgumentException('Select a valid disposal request.');
        }
        if (strlen($findings) > 10000) {
            throw new InvalidArgumentException('Inspection findings must be 10,000 characters or fewer.');
        }

        $pdo->beginTransaction();
        $case = $pdo->prepare('SELECT status FROM asset_disposal_cases WHERE id = ? FOR UPDATE');
        $case->execute([$caseId]);
        $current = $case->fetch();
        if (!$current) {
            throw new InvalidArgumentException('The selected disposal request does not exist.');
        }
        if ($current['status'] !== 'Requested') {
            throw new InvalidArgumentException('Only requests awaiting inspection can be inspected.');
        }
        $update = $pdo->prepare(
            "UPDATE asset_disposal_cases
             SET status = 'Inspected', inspection_findings = ?, inspected_by = ?,
                 inspected_by_name = ?, inspected_at = CURRENT_TIMESTAMP
             WHERE id = ?"
        );
        $update->execute([$findings, $user['id'], $user['full_name'], $caseId]);
        api_audit('disposal_inspection_recorded', "Disposal request #$caseId inspected by {$user['full_name']}.");
        $pdo->commit();

        api_response(['success' => true, 'message' => 'Disposal inspection recorded.']);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        api_handle_error($e);
    }
}

if ($method === 'PATCH') {
    try {
        $input = api_request_data();
        $caseId = filter_var($input['caseId'] ?? null, FILTER_VALIDATE_INT);
        $decision = api_required_string($input, 'decision', 'Committee decision');
        $disposition = api_required_string($input, 'disposition', 'Disposal method');
        $notes = api_required_string($input, 'decisionNotes', 'Decision notes');
        if ($caseId === false || $caseId === null || $caseId < 1) {
            throw new InvalidArgumentException('Select a valid disposal request.');
        }
        if (!in_array($decision, ['Approved', 'Rejected'], true)) {
            throw new InvalidArgumentException('Committee decision must be Approved or Rejected.');
        }
        if (!in_array($disposition, ['Scrap', 'Auction', 'Donation'], true)) {
            throw new InvalidArgumentException('Select Scrap, Auction, or Donation as the disposal method.');
        }
        if (strlen($notes) > 5000) {
            throw new InvalidArgumentException('Decision notes must be 5,000 characters or fewer.');
        }
        if ($decision === 'Approved' && ($input['confirmSignature'] ?? null) !== true) {
            throw new InvalidArgumentException('Confirm that you authorize this disposal and issue the signed certificate.');
        }

        $pdo->beginTransaction();
        $case = $pdo->prepare(
            'SELECT disposal.status, disposal.asset_id, asset.name AS asset_name
             FROM asset_disposal_cases disposal
             INNER JOIN assets asset ON asset.id = disposal.asset_id
             WHERE disposal.id = ? FOR UPDATE'
        );
        $case->execute([$caseId]);
        $current = $case->fetch();
        if (!$current) {
            throw new InvalidArgumentException('The selected disposal request does not exist.');
        }
        if ($current['status'] !== 'Inspected') {
            throw new InvalidArgumentException('Only inspected requests can receive a committee decision.');
        }

        $certificateNo = $decision === 'Approved'
            ? 'DMU-DISP-' . date('Y') . '-' . strtoupper(bin2hex(random_bytes(4)))
            : null;
        $update = $pdo->prepare(
            'UPDATE asset_disposal_cases
             SET status = ?, disposition = ?, decision_notes = ?, decided_by = ?, decided_by_name = ?,
                 decided_at = CURRENT_TIMESTAMP, certificate_no = ?,
                 certificate_issued_at = ' . ($decision === 'Approved' ? 'CURRENT_TIMESTAMP' : 'NULL') . '
             WHERE id = ?'
        );
        $update->execute([$decision, $disposition, $notes, $user['id'], $user['full_name'], $certificateNo, $caseId]);
        api_audit(
            'disposal_committee_decision',
            "Committee $decision disposal request #$caseId for asset {$current['asset_id']} via $disposition."
        );
        $pdo->commit();

        api_response([
            'success' => true,
            'message' => $decision === 'Approved'
                ? 'Disposal approved and signed certificate issued.'
                : 'Disposal request rejected and decision recorded.',
            'certificateNo' => $certificateNo,
        ]);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        api_handle_error($e);
    }
}

api_require_method('GET');
