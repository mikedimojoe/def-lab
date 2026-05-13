<?php
require_once __DIR__ . '/config.php';
$u = require_auth();
$method = $_SERVER['REQUEST_METHOD'];
$gameId = $_GET['game_id'] ?? null;
if (!$gameId) json_err('game_id required');

if ($method === 'GET') {
    $stmt = db()->prepare("SELECT data FROM roster_data WHERE game_id=?");
    $stmt->execute([$gameId]);
    $row = $stmt->fetch();
    json_ok($row ? json_decode($row['data'], true) : (object)[]);
}

if ($method === 'POST') {
    if ($u['role'] === 'Player') json_err('Not allowed', 403);
    $data = body();
    $json = json_encode($data, JSON_UNESCAPED_UNICODE);
    db()->prepare("INSERT INTO roster_data (game_id,data) VALUES (?,?)
                   ON DUPLICATE KEY UPDATE data=VALUES(data), updated_at=NOW()")
       ->execute([$gameId, $json]);
    json_ok(['saved' => true]);
}

json_err('Method not allowed', 405);
