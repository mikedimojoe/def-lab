<?php
require_once __DIR__ . '/config.php';
$u = require_auth();
$method = $_SERVER['REQUEST_METHOD'];

function seasons_for_user(array $u): array {
    if ($u['role'] === 'Admin') {
        return db()->query("SELECT * FROM seasons ORDER BY year DESC, name")->fetchAll();
    }
    $stmt = db()->prepare("SELECT * FROM seasons WHERE team_id=? OR team_id IS NULL ORDER BY year DESC");
    $stmt->execute([$u['team_id']]);
    return $stmt->fetchAll();
}

if ($method === 'GET') {
    json_ok(seasons_for_user($u));
}

if ($method === 'POST') {
    if ($u['role'] === 'Player') json_err('Not allowed', 403);
    $b = body();
    if (empty($b['year'])) json_err('year required');
    $id = uid();
    $teamId = $u['role'] === 'Admin' ? ($b['team_id'] ?? null) : $u['team_id'];
    db()->prepare("INSERT INTO seasons (id,year,name,team_id) VALUES (?,?,?,?)")
       ->execute([$id, $b['year'], $b['name'] ?? "GFL {$b['year']} Season", $teamId]);
    $stmt = db()->prepare("SELECT * FROM seasons WHERE id=?");
    $stmt->execute([$id]);
    json_ok($stmt->fetch());
}

if ($method === 'DELETE') {
    if ($u['role'] === 'Player') json_err('Not allowed', 403);
    $id = $_GET['id'] ?? json_err('id required');
    db()->prepare("DELETE FROM seasons WHERE id=?")->execute([$id]);
    json_ok(['deleted' => $id]);
}

json_err('Method not allowed', 405);
