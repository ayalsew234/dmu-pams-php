<?php
require_once __DIR__ . '/bootstrap.php';

$method = $_SERVER['REQUEST_METHOD'] ?? '';
$action = $_GET['action'] ?? '';

try {
    if ($method === 'GET' && $action === 'status') {
        $count = (int)$pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
        if (!isset($_SESSION['csrf_token'])) {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        }
        api_response([
            'success' => true,
            'data' => [
                'setupRequired' => $count === 0,
                'user' => api_current_user(),
                'csrfToken' => $_SESSION['csrf_token'],
            ],
        ]);
    }

    if ($method === 'POST') {
        $input = api_request_data();
        $csrfToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
        if (!is_string($csrfToken) || !hash_equals((string)($_SESSION['csrf_token'] ?? ''), $csrfToken)) {
            api_response(['success' => false, 'error' => 'Reload the page and try again.'], 403);
        }

        if ($action === 'setup') {
            if (!in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true)) {
                api_response(['success' => false, 'error' => 'Initial administrator setup is available only from this computer.'], 403);
            }
            $username = api_required_string($input, 'username', 'Username');
            $fullName = api_required_string($input, 'fullName', 'Full name');
            $password = (string)($input['password'] ?? '');
            if (strlen($password) < 12) {
                throw new InvalidArgumentException('The administrator password must be at least 12 characters.');
            }
            $pdo->beginTransaction();
            $pdo->query('SELECT id FROM users LIMIT 1 FOR UPDATE');
            if ((int)$pdo->query('SELECT COUNT(*) FROM users')->fetchColumn() !== 0) {
                throw new InvalidArgumentException('Initial setup is already complete. Sign in instead.');
            }
            $insert = $pdo->prepare(
                'INSERT INTO users (username, full_name, password_hash, role)
                 VALUES (?, ?, ?, ?)'
            );
            $insert->execute([$username, $fullName, password_hash($password, PASSWORD_DEFAULT), 'system_admin']);
            $userId = (int)$pdo->lastInsertId();
            $pdo->commit();

            session_regenerate_id(true);
            $_SESSION['user_id'] = $userId;
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
            api_audit('initial_admin_created', "Initial administrator account $username created.");
            api_response(['success' => true, 'message' => 'Administrator account created.'], 201);
        }

        if ($action === 'login') {
            $username = api_required_string($input, 'username', 'Username');
            $password = (string)($input['password'] ?? '');
            $stmt = $pdo->prepare(
                'SELECT id, password_hash, is_active FROM users WHERE username = ? LIMIT 1'
            );
            $stmt->execute([$username]);
            $account = $stmt->fetch();
            if (!$account || !(bool)$account['is_active'] || !password_verify($password, $account['password_hash'])) {
                api_audit('login_failed', "Failed login for username $username.");
                api_response(['success' => false, 'error' => 'Username or password is incorrect.'], 401);
            }

            session_regenerate_id(true);
            $_SESSION['user_id'] = (int)$account['id'];
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
            api_audit('login', "User $username signed in.");
            api_response(['success' => true, 'message' => 'Signed in successfully.']);
        }

        if ($action === 'logout') {
            $user = api_require_auth();
            api_audit('logout', 'User signed out.');
            $_SESSION = [];
            if (ini_get('session.use_cookies')) {
                $params = session_get_cookie_params();
                setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'] ?? '', $params['secure'], $params['httponly']);
            }
            session_destroy();
            api_response(['success' => true, 'message' => 'Signed out.']);
        }

        if ($action === 'users') {
            api_require_roles(['system_admin']);
            $fullName = api_required_string($input, 'fullName', 'Full name');
            $username = api_required_string($input, 'username', 'Username');
            $role = api_required_string($input, 'role', 'Role');
            $password = (string)($input['password'] ?? '');
            $department = api_optional_string($input, 'department');
            $roles = ['system_admin', 'property_admin', 'department_head', 'technician', 'gate_security'];
            if (!in_array($role, $roles, true)) {
                throw new InvalidArgumentException('Select a valid system role.');
            }
            if ($role === 'department_head' && $department === '') {
                throw new InvalidArgumentException('Department is required for Department Head accounts.');
            }
            if (strlen($password) < 12) {
                throw new InvalidArgumentException('Password must be at least 12 characters.');
            }
            $insert = $pdo->prepare(
                'INSERT INTO users (username, full_name, password_hash, role, department)
                 VALUES (?, ?, ?, ?, ?)'
            );
            $insert->execute([
                $username,
                $fullName,
                password_hash($password, PASSWORD_DEFAULT),
                $role,
                $role === 'department_head' ? $department : null,
            ]);
            api_audit('user_created', "Created account $username with role $role.");
            api_response(['success' => true, 'message' => 'User account created.'], 201);
        }

        if ($action === 'user-status') {
            $admin = api_require_roles(['system_admin']);
            $userId = filter_var($input['userId'] ?? null, FILTER_VALIDATE_INT);
            if (!$userId || $userId < 1 || !array_key_exists('isActive', $input) || !is_bool($input['isActive'])) {
                throw new InvalidArgumentException('A valid account and active status are required.');
            }
            if ((int)$admin['id'] === $userId && !$input['isActive']) {
                throw new InvalidArgumentException('You cannot disable your own account.');
            }
            $target = $pdo->prepare('SELECT role FROM users WHERE id = ?');
            $target->execute([$userId]);
            $targetRole = $target->fetchColumn();
            if (!$targetRole) {
                throw new InvalidArgumentException('The selected account does not exist.');
            }
            if ($targetRole === 'system_admin' && !$input['isActive']) {
                $activeAdmins = (int)$pdo->query(
                    "SELECT COUNT(*) FROM users WHERE role = 'system_admin' AND is_active = 1"
                )->fetchColumn();
                if ($activeAdmins <= 1) {
                    throw new InvalidArgumentException('The last active System Administrator cannot be disabled.');
                }
            }
            $update = $pdo->prepare('UPDATE users SET is_active = ? WHERE id = ?');
            $update->execute([$input['isActive'] ? 1 : 0, $userId]);
            api_audit('user_status_changed', "Changed account ID $userId active status.");
            api_response(['success' => true, 'message' => 'User account status updated.']);
        }

        if ($action === 'user-update') {
            $admin = api_require_roles(['system_admin']);
            $userId = filter_var($input['userId'] ?? null, FILTER_VALIDATE_INT);
            if (!$userId || $userId < 1) {
                throw new InvalidArgumentException('Select a valid user account.');
            }
            $fullName = api_required_string($input, 'fullName', 'Full name');
            $role = api_required_string($input, 'role', 'Role');
            $department = api_optional_string($input, 'department');
            $password = (string)($input['password'] ?? '');
            $roles = ['system_admin', 'property_admin', 'department_head', 'technician', 'gate_security'];
            if (!in_array($role, $roles, true)) {
                throw new InvalidArgumentException('Select a valid system role.');
            }
            if ($role === 'department_head' && $department === '') {
                throw new InvalidArgumentException('Department is required for Department Head accounts.');
            }
            if ($password !== '' && strlen($password) < 12) {
                throw new InvalidArgumentException('A new password must be at least 12 characters.');
            }

            $target = $pdo->prepare('SELECT role, is_active FROM users WHERE id = ?');
            $target->execute([$userId]);
            $existing = $target->fetch();
            if (!$existing) {
                throw new InvalidArgumentException('The selected account does not exist.');
            }
            if ((int)$admin['id'] === $userId && $role !== 'system_admin') {
                throw new InvalidArgumentException('You cannot change your own System Administrator role.');
            }
            if ($existing['role'] === 'system_admin' && (int)$existing['is_active'] === 1 && $role !== 'system_admin') {
                $activeAdmins = (int)$pdo->query(
                    "SELECT COUNT(*) FROM users WHERE role = 'system_admin' AND is_active = 1"
                )->fetchColumn();
                if ($activeAdmins <= 1) {
                    throw new InvalidArgumentException('The last active System Administrator cannot be demoted.');
                }
            }

            if ($password !== '') {
                $update = $pdo->prepare(
                    'UPDATE users SET full_name = ?, role = ?, department = ?, password_hash = ? WHERE id = ?'
                );
                $update->execute([
                    $fullName,
                    $role,
                    $role === 'department_head' ? $department : null,
                    password_hash($password, PASSWORD_DEFAULT),
                    $userId,
                ]);
            } else {
                $update = $pdo->prepare(
                    'UPDATE users SET full_name = ?, role = ?, department = ? WHERE id = ?'
                );
                $update->execute([
                    $fullName,
                    $role,
                    $role === 'department_head' ? $department : null,
                    $userId,
                ]);
            }  

            api_audit('user_account_updated', "Updated account ID $userId.");
            api_response(['success' => true, 'message' => 'User account updated.']);
        }
    }

    if ($method === 'GET' && $action === 'users') {
        api_require_roles(['system_admin']);
        $users = $pdo->query(
            'SELECT id, username, full_name, role, department, is_active, created_at
             FROM users ORDER BY full_name'
        )->fetchAll();
        api_response(['success' => true, 'data' => $users]);
    }

    api_response(['success' => false, 'error' => 'Authentication action not found.'], 404);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    if ($e instanceof PDOException && (string)$e->getCode() === '23000') {
        api_response(['success' => false, 'error' => 'That username is already in use.'], 409);
    }
    api_handle_error($e);
}
