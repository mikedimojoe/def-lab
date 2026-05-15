<?php
require_once __DIR__ . '/config.php';
$u      = require_auth();
$method = $_SERVER['REQUEST_METHOD'];

// Auto-create table (no DEFAULT on LONGTEXT — MySQL strict mode forbids it)
db()->exec("CREATE TABLE IF NOT EXISTS drawings (
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    game_id      VARCHAR(32)  NOT NULL,
    play_index   INT          NOT NULL,
    strokes_json LONGTEXT     NOT NULL,
    updated_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY u_game_play (game_id, play_index)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

$game_id = $_GET['game_id'] ?? null;
if (!$game_id) json_err('game_id required');

// GET — all drawings for a game
if ($method === 'GET') {
    $stmt = db()->prepare(
        "SELECT play_index, strokes_json, updated_at FROM drawings WHERE game_id=? ORDER BY play_index"
    );
    $stmt->execute([$game_id]);
    $rows = $stmt->fetchAll();
    $result = array_map(fn($r) => [
        'play_index' => (int)$r['play_index'],
        'strokes'    => json_decode($r['strokes_json'], true) ?? [],
        'updated_at' => $r['updated_at'],
    ], $rows);
    json_ok($result);
}

// POST — save / update one play's drawing
if ($method === 'POST') {
    if ($u['role'] === 'Player') json_err('Not allowed', 403);
    $b          = body();
    $play_index = (int)($b['play_index'] ?? 0);
    $strokes    = $b['strokes'] ?? [];
    if ($play_index <= 0) json_err('play_index required');
    db()->prepare(
        "INSERT INTO drawings (game_id, play_index, strokes_json)
         VALUES (?,?,?)
         ON DUPLICATE KEY UPDATE strokes_json=VALUES(strokes_json), updated_at=NOW()"
    )->execute([$game_id, $play_index, json_encode($strokes, JSON_UNESCAPED_UNICODE)]);
    json_ok(['saved' => true, 'play_index' => $play_index]);
}

// DELETE — clear one play's drawing
if ($method === 'DELETE') {
    if ($u['role'] === 'Player') json_err('Not allowed', 403);
    $play_index = (int)($_GET['play_index'] ?? 0);
    if ($play_index <= 0) json_err('play_index required');
    db()->prepare("DELETE FROM drawings WHERE game_id=? AND play_index=?")
        ->execute([$game_id, $play_index]);
    json_ok(['deleted' => $play_index]);
}

json_err('Method not allowed', 405);
