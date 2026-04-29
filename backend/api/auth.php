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
        json_err('Invalid credentials', 401);
    }

    unset($user['password_hash']);
    $_SESSION['user'] = $user;
    json_ok($user);
}

// POST /api/auth.php?action=logout
if ($method === 'POST' && $action === 'logout') {
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
    $_SESSION['user']['password_hash'] = null;
    json_ok(['message' => 'Password changed']);
}

json_err('Unknown action', 404);
