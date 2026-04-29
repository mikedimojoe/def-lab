<?php
require_once __DIR__ . '/config.php';
$u = require_auth();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $seasonId = $_GET['season_id'] ?? null;
    if (!$seasonId) json_err('season_id required');
    $stmt = db()->prepare("
        SELECT g.*,
            (SELECT COUNT(*) FROM play_rows WHERE game_id=g.id) AS play_count,
            (SELECT COUNT(*) FROM live_rows WHERE game_id=g.id) AS live_count
        FROM games g WHERE g.season_id=? ORDER BY g.week+0, g.week
    ");
    $stmt->execute([$seasonId]);
    json_ok($stmt->fetchAll());
}

if ($method === 'POST') {
    if ($u['role'] === 'Player') json_err('Not allowed', 403);
    $b = body();
    if (empty($b['season_id'])) json_err('season_id required');
    $id = uid();
    db()->prepare("INSERT INTO games (id,season_id,week,opponent,game_date) VALUES (?,?,?,?,?)")
       ->execute([$id, $b['season_id'], $b['week'] ?? '', $b['opponent'] ?? '', $b['date'] ?? '']);
    $stmt = db()->prepare("SELECT * FROM games WHERE id=?");
    $stmt->execute([$id]);
    json_ok($stmt->fetch());
}

if ($method === 'PUT') {
    if ($u['role'] === 'Player') json_err('Not allowed', 403);
    $id = $_GET['id'] ?? json_err('id required');
    $b  = body();
    db()->prepare("UPDATE games SET week=?,opponent=?,game_date=? WHERE id=?")
       ->execute([$b['week'] ?? '', $b['opponent'] ?? '', $b['date'] ?? '', $id]);
    json_ok(['id' => $id]);
}

if ($method === 'DELETE') {
    if ($u['role'] === 'Player') json_err('Not allowed', 403);
    $id = $_GET['id'] ?? json_err('id required');
    db()->prepare("DELETE FROM games WHERE id=?")->execute([$id]);
    json_ok(['deleted' => $id]);
}

json_err('Method not allowed', 405);
