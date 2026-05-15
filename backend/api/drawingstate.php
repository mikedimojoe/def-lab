<?php
require_once __DIR__ . "/config.php";
$u = require_auth();
$method  = $_SERVER["REQUEST_METHOD"];
$game_id = trim($_GET["game_id"] ?? "");
if ($game_id === "") json_err("game_id required", 400);

if ($method === "GET") {
    $stmt = db()->prepare("SELECT play_idx FROM drawing_state WHERE game_id=?");
    $stmt->execute([$game_id]);
    $row = $stmt->fetch();
    // -1 = no shared state set yet → frontend will default to last play
    json_ok(["play_idx" => $row ? (int)$row["play_idx"] : -1]);
}

if ($method === "PUT") {
    if ($u["role"] === "Player") json_err("Not allowed", 403);
    $b        = body();
    $play_idx = (int)($b["play_idx"] ?? 0);
    db()->prepare(
        "INSERT INTO drawing_state (game_id, play_idx)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE play_idx=VALUES(play_idx)"
    )->execute([$game_id, $play_idx]);
    json_ok(["play_idx" => $play_idx]);
}

json_err("Method not allowed", 405);
