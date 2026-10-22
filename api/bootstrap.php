<?php
require_once __DIR__ . '/../config/database.php';

if (session_status() !== PHP_SESSION_ACTIVE) {
    ini_set('session.use_strict_mode', '1');
    session_set_cookie_params([
        'httponly' => true,
        'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'samesite' => 'Lax',
        'path' => '/',
    ]);
    session_start();
}

function api_current_user(): ?array
{
    global $pdo;
    static $currentUser = null;
    static $resolved = false;
    if ($resolved) {
        return $currentUser;
    }
    $resolved = true;
    $userId = $_SESSION['user_id'] ?? null;
    if (!$userId) {
        return null;
    }

    $stmt = $pdo->prepare(
        'SELECT id, username, full_name, role, department, is_active FROM users WHERE id = ? LIMIT 1'
    );
    $stmt->execute([$userId]);
    $user = $stmt->fetch();
    if (!$user || !(bool)$user['is_active']) {
        $_SESSION = [];
        session_destroy();
        return null;
    }
    $currentUser = $user;
    return $currentUser;
}

function api_require_auth(): array
{
    $user = api_current_user();
    if (!$user) {
        api_response(['success' => false, 'error' => 'Sign in is required.'], 401);
    }
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
        $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
        if (!is_string($token) || !hash_equals((string)($_SESSION['csrf_token'] ?? ''), $token)) {
            api_response(['success' => false, 'error' => 'Your security token expired. Reload and try again.'], 403);
        }
    }
    return $user;
}

function api_require_roles(array $roles): array
{
    $user = api_require_auth();
    if (!in_array($user['role'], $roles, true)) {
        api_response(['success' => false, 'error' => 'Your account is not permitted to perform this action.'], 403);
    }
    return $user;
}

function api_audit(string $action, string $details = ''): void
{
    global $pdo;
    $userId = $_SESSION['user_id'] ?? null;
    $stmt = $pdo->prepare('INSERT INTO system_audit_logs (user_id, action, details) VALUES (?, ?, ?)');
    $stmt->execute([$userId, $action, $details !== '' ? $details : null]);
}

function api_response(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

function api_require_method(string $expected): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== $expected) {
        header('Allow: ' . $expected);
        api_response(['success' => false, 'error' => 'Method not allowed.'], 405);
    }
}

function api_request_data(): array
{
    $body = file_get_contents('php://input');
    if ($body === false || trim($body) === '') {
        return $_POST;
    }

    $data = json_decode($body, true);
    if (!is_array($data)) {
        throw new InvalidArgumentException('Request body must contain a valid JSON object.');
    }

    return $data;
}

function api_required_string(array $data, string $key, string $label): string
{
    $value = trim((string)($data[$key] ?? ''));
    if ($value === '') {
        throw new InvalidArgumentException("$label is required.");
    }

    return $value;
}

function api_optional_string(array $data, string $key, string $default = ''): string
{
    return trim((string)($data[$key] ?? $default));
}

function api_cost(array $data, string $key = 'cost'): float
{
    $value = $data[$key] ?? 0;
    if (!is_numeric($value) || !is_finite((float)$value) || (float)$value < 0) {
        throw new InvalidArgumentException('Cost must be a valid non-negative number.');
    }

    return (float)$value;
}

function api_date(array $data, string $key, string $label): string
{
    $value = trim((string)($data[$key] ?? ''));
    if ($value === '') {
        return date('Y-m-d');
    }

    $date = DateTime::createFromFormat('!Y-m-d', $value);
    if (!$date || $date->format('Y-m-d') !== $value) {
        throw new InvalidArgumentException("$label must be a valid date.");
    }

    return $value;
}

function api_next_id(PDO $pdo, string $table): string
{
    $stmt = $pdo->query("SELECT id FROM `$table`");
    $max = 0;
    foreach ($stmt->fetchAll(PDO::FETCH_COLUMN) as $existingId) {
        if (preg_match('/(\d+)$/', (string)$existingId, $matches)) {
            $max = max($max, (int)$matches[1]);
        }
    }

    return str_pad((string)($max + 1), 3, '0', STR_PAD_LEFT);
}

function api_handle_error(Throwable $error): void
{
    if ($error instanceof InvalidArgumentException) {
        api_response(['success' => false, 'error' => $error->getMessage()], 400);
    }

    error_log('PAMS API error: ' . $error->getMessage());
    api_response(['success' => false, 'error' => 'The request could not be completed. Check the submitted data and database configuration.'], 500);
}
