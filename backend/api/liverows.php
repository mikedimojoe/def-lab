<?php
require_once __DIR__ . '/config.php';
$u = require_auth();
$method = $_SERVER['REQUEST_METHOD'];
$gameId = $_GET['game_id'] ?? null;
if (!$gameId) json_err('game_id required');

if ($method === 'GET') {
    $stmt = db()->prepare("SELECT row_data FROM live_rows WHERE game_id=? ORDER BY sort_order, id");
    $stmt->execute([$gameId]);
    $rows = array_map(fn($r) => json_decode($r['row_data'], true), $stmt->fetchAll());
    json_ok($rows);
}

// POST — save ALL live rows at once (full replace)
if ($method === 'POST') {
    if ($u['role'] === 'Player') json_err('Not allowed', 403);
    $rows = body();
    if (!is_array($rows)) json_err('Expected array');
    $pdo = db();
    $pdo->beginTransaction();
    $pdo->prepare("DELETE FROM live_rows WHERE game_id=?")->execute([$gameId]);
    $ins = $pdo->prepare("INSERT INTO live_rows (game_id,row_data,sort_order) VALUES (?,?,?)");
    foreach ($rows as $i => $row) {
        $ins->execute([$gameId, json_encode($row, JSON_UNESCAPED_UNICODE), $i]);
    }
    $pdo->commit();
    json_ok(['count' => count($rows)]);
}

json_err('Method not allowed', 405);
