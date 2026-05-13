<?php
require_once __DIR__ . "/config.php";
$u = require_auth();
$method = $_SERVER["REQUEST_METHOD"];

// Pool key = game_id  →  one shared pool per game week per team.
// All coaches and players who select the same game share this pool.
$game_id = intval($_GET["game_id"] ?? 0);
if ($game_id <= 0) json_err("game_id required", 400);

if ($method === "GET") {
    $stmt = db()->prepare("SELECT row_data FROM live_rows WHERE game_id=? ORDER BY sort_order, id");
    $stmt->execute([$game_id]);
    $rows = array_map(fn($r) => json_decode($r["row_data"], true), $stmt->fetchAll());
    json_ok($rows);
}

if ($method === "POST") {
    if ($u["role"] === "Player") json_err("Not allowed", 403);
    $rows = body();
    if (!is_array($rows)) json_err("Expected array");
    $pdo = db();
    $pdo->beginTransaction();
    $pdo->prepare("DELETE FROM live_rows WHERE game_id=?")->execute([$game_id]);
    $ins = $pdo->prepare("INSERT INTO live_rows (game_id,row_data,sort_order) VALUES (?,?,?)");
    foreach ($rows as $i => $row) {
        $ins->execute([$game_id, json_encode($row, JSON_UNESCAPED_UNICODE), $i]);
    }
    $pdo->commit();
    json_ok(["count" => count($rows)]);
}

json_err("Method not allowed", 405);
