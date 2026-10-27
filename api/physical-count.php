<?php
require_once __DIR__ . '/bootstrap.php';

$user = api_require_roles(['system_admin', 'property_admin', 'internal_auditor']);
$method = $_SERVER['REQUEST_METHOD'] ?? '';

if ($method === 'GET') {
    try {
        $sessionStmt = $pdo->query(
            "SELECT id, status, started_at FROM physical_count_sessions WHERE status = 'Active' ORDER BY id DESC LIMIT 1"
        );
        $session = $sessionStmt->fetch();
        if (!$session) {
            api_response(['success' => true, 'data' => null]);
        }

        $itemStmt = $pdo->prepare(
            'SELECT asset_id, asset_name, campus, building, room, is_verified
             FROM physical_count_items WHERE session_id = ? ORDER BY asset_id'
        );
        $itemStmt->execute([$session['id']]);
        $session['items'] = $itemStmt->fetchAll();
        foreach ($session['items'] as &$item) {
            $item['is_verified'] = $item['is_verified'] === null ? null : (bool)$item['is_verified'];
        }
        unset($item);

        api_response(['success' => true, 'data' => $session]);
    } catch (Throwable $e) {
        api_handle_error($e);
    }
}

if ($method === 'PATCH') {
    try {
        $input = api_request_data();
        $sessionId = filter_var($input['sessionId'] ?? null, FILTER_VALIDATE_INT);
        if ($sessionId === false || $sessionId === null || $sessionId < 1) {
            throw new InvalidArgumentException('A valid physical count session is required.');
        }
        $assetId = api_required_string($input, 'assetId', 'Asset');
        if (!array_key_exists('isVerified', $input) || !is_bool($input['isVerified'])) {
            throw new InvalidArgumentException('Verification status must be true or false.');
        }

        $stmt = $pdo->prepare(
            "UPDATE physical_count_items AS item
             INNER JOIN physical_count_sessions AS session ON session.id = item.session_id
             SET item.is_verified = ?, item.verified_at = IF(?, CURRENT_TIMESTAMP, NULL)
             WHERE item.session_id = ? AND item.asset_id = ? AND session.status = 'Active'"
        );
        $verified = $input['isVerified'] ? 1 : 0;
        $stmt->execute([$verified, $verified, $sessionId, $assetId]);
        if ($stmt->rowCount() === 0) {
            $exists = $pdo->prepare(
                "SELECT 1 FROM physical_count_items AS item
                 INNER JOIN physical_count_sessions AS session ON session.id = item.session_id
                 WHERE item.session_id = ? AND item.asset_id = ? AND session.status = 'Active'"
            );
            $exists->execute([$sessionId, $assetId]);
            if (!$exists->fetchColumn()) {
                throw new InvalidArgumentException('The active session or selected asset was not found.');
            }
        }

        api_audit('physical_count_item_updated', "Physical count session $sessionId item $assetId verification set to " . ($verified ? 'present' : 'not present') . '.');
        api_response(['success' => true, 'message' => 'Physical count result saved.']);
    } catch (Throwable $e) {
        api_handle_error($e);
    }
}

api_require_method('POST');

try {
    $pdo->beginTransaction();
    $pdo->exec(
        "UPDATE physical_count_sessions
         SET status = 'Completed', completed_at = CURRENT_TIMESTAMP
         WHERE status = 'Active'"
    );
    $pdo->exec("INSERT INTO physical_count_sessions (status) VALUES ('Active')");
    $sessionId = (int)$pdo->lastInsertId();

    $assets = $pdo->query('SELECT id, name, campus, building, room FROM assets ORDER BY id')->fetchAll();
    $itemStmt = $pdo->prepare(
        'INSERT INTO physical_count_items (session_id, asset_id, asset_name, campus, building, room)
         VALUES (?, ?, ?, ?, ?, ?)'
    );
    foreach ($assets as $asset) {
        $itemStmt->execute([
            $sessionId,
            $asset['id'],
            $asset['name'],
            $asset['campus'],
            $asset['building'],
            $asset['room'],
        ]);
    }
    $pdo->commit();

    api_audit('physical_count_started', "Started physical count session $sessionId.");
    $session = [
        'id' => $sessionId,
        'status' => 'Active',
        'started_at' => date('Y-m-d H:i:s'),
        'items' => array_map(static function (array $asset): array {
            return [
                'asset_id' => $asset['id'],
                'asset_name' => $asset['name'],
                'campus' => $asset['campus'],
                'building' => $asset['building'],
                'room' => $asset['room'],
                'is_verified' => null,
            ];
        }, $assets),
    ];

    api_response(['success' => true, 'message' => 'Physical count session started.', 'data' => $session], 201);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    api_handle_error($e);
}
