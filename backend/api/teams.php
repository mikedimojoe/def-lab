<?php
require_once __DIR__ . '/config.php';
$u = require_auth();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // Admins see all teams; others see only their team
    if ($u['role'] === 'Admin') {
        $rows = db()->query("SELECT * FROM teams ORDER BY name")->fetchAll();
    } else {
        $rows = db()->prepare("SELECT * FROM teams WHERE id=?")->execute([$u['team_id']]) ? [] : [];
        $stmt = db()->prepare("SELECT * FROM teams WHERE id=?");
        $stmt->execute([$u['team_id']]);
        $rows = $stmt->fetchAll();
    }
    json_ok($rows);
}

if ($method === 'POST') {
    require_admin();
    $b = body();
    if (empty($b['name'])) json_err('Name required');
    $id = uid();
    db()->prepare("INSERT INTO teams (id,name,color1,color2) VALUES (?,?,?,?)")
       ->execute([$id, $b['name'], $b['color1'] ?? '#154734', $b['color2'] ?? '#5CBF8A']);
    $team = db()->prepare("SELECT * FROM teams WHERE id=?")->execute([$id]) ? null : null;
    $stmt = db()->prepare("SELECT * FROM teams WHERE id=?");
    $stmt->execute([$id]);
    json_ok($stmt->fetch());
}

if ($method === 'PUT') {
    require_admin();
    $id = $_GET['id'] ?? json_err('id required');
    $b  = body();
    db()->prepare("UPDATE teams SET name=?,color1=?,color2=? WHERE id=?")
       ->execute([$b['name'], $b['color1'] ?? '#154734', $b['color2'] ?? '#5CBF8A', $id]);
    json_ok(['id' => $id]);
}

if ($method === 'DELETE') {
    require_admin();
    $id = $_GET['id'] ?? json_err('id required');
    db()->prepare("DELETE FROM teams WHERE id=?")->execute([$id]);
    json_ok(['deleted' => $id]);
}

json_err('Method not allowed', 405);
