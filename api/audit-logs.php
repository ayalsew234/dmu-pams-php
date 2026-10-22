<?php
require_once __DIR__ . '/bootstrap.php';

$user = api_require_roles(['system_admin', 'property_admin']);
api_require_method('GET');

try {
    $stmt = $pdo->query(
        'SELECT log.id, log.action, log.details, log.created_at, user.username, user.full_name
         FROM system_audit_logs AS log
         LEFT JOIN users AS user ON user.id = log.user_id
         ORDER BY log.created_at DESC, log.id DESC
         LIMIT 500'
    );
    api_response(['success' => true, 'data' => $stmt->fetchAll()]);
} catch (Throwable $e) {
    api_handle_error($e);
}
