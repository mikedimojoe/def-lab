<?php
require_once __DIR__ . '/config.php';
$u = require_auth();
$method = $_SERVER['REQUEST_METHOD'];
$gameId = $_GET['game_id'] ?? null;
if (!$gameId) json_err('game_id required');

// GET — return all play rows for a game as array of objects
if ($method === 'GET') {
    $stmt = db()->prepare("SELECT row_data FROM play_rows WHERE game_id=? ORDER BY id");
    $stmt->execute([$gameId]);
    $rows = array_map(fn($r) => json_decode($r['row_data'], true), $stmt->fetchAll());
    json_ok($rows);
}

// POST — bulk replace all play rows (upload)
if ($method === 'POST') {
    if ($u['role'] === 'Player') json_err('Not allowed', 403);
    $rows = body(); // array of row objects
    if (!is_array($rows)) json_err('Expected array of rows');

    $pdo = db();
    $pdo->beginTransaction();
    $pdo->prepare("DELETE FROM play_rows WHERE game_id=?")->execute([$gameId]);
    $ins = $pdo->prepare("INSERT INTO play_rows (game_id, row_data) VALUES (?,?)");
    foreach ($rows as $row) {
        $ins->execute([$gameId, json_encode($row, JSON_UNESCAPED_UNICODE)]);
    }
    $pdo->commit();
    json_ok(['count' => count($rows)]);
}

json_err('Method not allowed', 405);
