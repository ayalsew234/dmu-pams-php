<?php
require_once __DIR__ . '/bootstrap.php';

$user = api_require_roles(['system_admin', 'property_admin', 'internal_auditor']);
api_require_method('GET');

try {
    $search = substr(trim((string)($_GET['q'] ?? '')), 0, 200);
    $sort = (string)($_GET['sort'] ?? 'recent');
    $sortOrders = [
        'recent' => 'log.created_at DESC, log.id DESC',
        'oldest' => 'log.created_at ASC, log.id ASC',
        'action-asc' => 'log.action ASC, log.created_at DESC, log.id DESC',
        'action-desc' => 'log.action DESC, log.created_at DESC, log.id DESC',
        'user-asc' => 'COALESCE(user.full_name, user.username, \'System\') ASC, log.created_at DESC, log.id DESC',
        'user-desc' => 'COALESCE(user.full_name, user.username, \'System\') DESC, log.created_at DESC, log.id DESC',
    ];
    if (!isset($sortOrders[$sort])) {
        $sort = 'recent';
    }

    $page = filter_var($_GET['page'] ?? 1, FILTER_VALIDATE_INT);
    $page = max(1, min(1000000, $page === false ? 1 : $page));
    $where = '';
    $searchParams = [];
    if ($search !== '') {
        $where = " WHERE (log.action LIKE ? OR COALESCE(log.details, '') LIKE ?
                    OR COALESCE(user.username, '') LIKE ? OR COALESCE(user.full_name, '') LIKE ?
                    OR CAST(log.created_at AS CHAR) LIKE ?)";
        $pattern = '%' . $search . '%';
        $searchParams = array_fill(0, 5, $pattern);
    }

    $from = ' FROM system_audit_logs AS log LEFT JOIN users AS user ON user.id = log.user_id';
    $count = $pdo->prepare('SELECT COUNT(*)' . $from . $where);
    $count->execute($searchParams);
    $total = (int)$count->fetchColumn();
    $pageSize = 10;
    $pageCount = max(1, (int)ceil($total / $pageSize));
    $page = min($page, $pageCount);
    $offset = ($page - 1) * $pageSize;

    $stmt = $pdo->prepare(
        'SELECT log.id, log.action, log.details, log.created_at, user.username, user.full_name'
        . $from . $where
        . ' ORDER BY ' . $sortOrders[$sort]
        . " LIMIT $pageSize OFFSET $offset"
    );
    $stmt->execute($searchParams);
    api_response([
        'success' => true,
        'data' => [
            'logs' => $stmt->fetchAll(),
            'page' => $page,
            'pageSize' => $pageSize,
            'pageCount' => $pageCount,
            'total' => $total,
        ],
    ]);
} catch (Throwable $e) {
    api_handle_error($e);
}

