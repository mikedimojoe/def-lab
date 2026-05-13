<?php
require_once __DIR__ . '/config.php';
$me     = require_auth();
$method = $_SERVER['REQUEST_METHOD'];

function safe_user(array $u): array {
    unset($u['password_hash']); return $u;
}

if ($method === 'GET') {
    if ($me['role'] === 'Admin') {
        $rows = db()->query("SELECT id,username,role,display_name,team_id,created_at FROM users ORDER BY username")->fetchAll();
    } else {
        $stmt = db()->prepare("SELECT id,username,role,display_name,team_id FROM users WHERE id=?");
        $stmt->execute([$me['id']]);
        $rows = $stmt->fetchAll();
    }
    json_ok($rows);
}

if ($method === 'POST') {
    require_admin();
    $b = body();
    if (empty($b['username']) || empty($b['password'])) json_err('username + password required');
    // Check unique
    $chk = db()->prepare("SELECT COUNT(*) FROM users WHERE LOWER(username)=LOWER(?)");
    $chk->execute([$b['username']]);
    if ($chk->fetchColumn() > 0) json_err('Username already taken');
    $id   = uid();
    $hash = password_hash($b['password'], PASSWORD_BCRYPT);
    db()->prepare("INSERT INTO users (id,username,password_hash,role,display_name,team_id) VALUES (?,?,?,?,?,?)")
       ->execute([$id, $b['username'], $hash, $b['role'] ?? 'Player',
                  $b['display_name'] ?? $b['username'], $b['team_id'] ?? null]);
    $stmt = db()->prepare("SELECT id,username,role,display_name,team_id FROM users WHERE id=?");
    $stmt->execute([$id]);
    json_ok($stmt->fetch());
}

if ($method === 'PUT') {
    $id = $_GET['id'] ?? json_err('id required');
    if ($me['role'] !== 'Admin' && $me['id'] !== $id) json_err('Forbidden', 403);
    $b  = body();
    // Password change
    if (!empty($b['password'])) {
        $hash = password_hash($b['password'], PASSWORD_BCRYPT);
        db()->prepare("UPDATE users SET password_hash=? WHERE id=?")->execute([$hash, $id]);
    }
    if ($me['role'] === 'Admin') {
        db()->prepare("UPDATE users SET display_name=?,role=?,team_id=? WHERE id=?")
           ->execute([$b['display_name'] ?? '', $b['role'] ?? 'Player', $b['team_id'] ?? null, $id]);
    } elseif (!empty($b['display_name'])) {
        db()->prepare("UPDATE users SET display_name=? WHERE id=?")->execute([$b['display_name'], $id]);
    }
    // Refresh session if editing self
    if ($me['id'] === $id) {
        $stmt = db()->prepare("SELECT id,username,role,display_name,team_id FROM users WHERE id=?");
        $stmt->execute([$id]);
        $_SESSION['user'] = $stmt->fetch();
    }
    json_ok(['id' => $id]);
}

if ($method === 'DELETE') {
    require_admin();
    $id = $_GET['id'] ?? json_err('id required');
    if ($id === $me['id']) json_err('Cannot delete yourself');
    db()->prepare("DELETE FROM users WHERE id=?")->execute([$id]);
    json_ok(['deleted' => $id]);
}

json_err('Method not allowed', 405);
