<?php
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// POST /api/auth.php?action=login
if ($method === 'POST' && $action === 'login') {
    $b = body();
    $username = trim($b['username'] ?? '');
    $password = $b['password'] ?? '';
    if (!$username || !$password) json_err('Username and password required');

    $stmt = db()->prepare("SELECT * FROM users WHERE LOWER(username) = LOWER(?)");
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        json_err('Ungültige Anmeldedaten.', 401);
    }

    // If an active session exists, destroy it so only one session per user is allowed
    if (!empty($user['active_session_id'])) {
        $savePath    = session_save_path() ?: sys_get_temp_dir();
        $sessionFile = rtrim($savePath, '/') . '/sess_' . $user['active_session_id'];
        if (file_exists($sessionFile)) {
            @unlink($sessionFile); // kick the old session out
        }
        db()->prepare("UPDATE users SET active_session_id=NULL WHERE id=?")->execute([$user['id']]);
    }

    // Store active session ID in DB
    $sid = session_id();
    db()->prepare("UPDATE users SET active_session_id=? WHERE id=?")->execute([$sid, $user['id']]);

    unset($user['password_hash'], $user['active_session_id']);
    $_SESSION['user'] = $user;
    json_ok($user);
}

// POST /api/auth.php?action=logout
if ($method === 'POST' && $action === 'logout') {
    $u = current_user();
    if ($u) {
        db()->prepare("UPDATE users SET active_session_id=NULL WHERE id=?")->execute([$u['id']]);
    }
    session_destroy();
    json_ok(['message' => 'Logged out']);
}

// GET /api/auth.php?action=me
if ($method === 'GET' && $action === 'me') {
    $u = current_user();
    if (!$u) json_err('Not authenticated', 401);
    json_ok($u);
}

// POST /api/auth.php?action=change_password
if ($method === 'POST' && $action === 'change_password') {
    $u = require_auth();
    $b = body();
    $newPw = $b['password'] ?? '';
    if (strlen($newPw) < 4) json_err('Password too short');
    $hash = password_hash($newPw, PASSWORD_BCRYPT);
    db()->prepare("UPDATE users SET password_hash=? WHERE id=?")->execute([$hash, $u['id']]);
    json_ok(['message' => 'Password changed']);
}

json_err('Unknown action', 404);
