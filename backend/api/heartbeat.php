<?php
require_once __DIR__ . "/config.php";
$u = require_auth();

// POST: update own heartbeat
if ($_SERVER["REQUEST_METHOD"] === "POST") {
    db()->prepare(
        "INSERT INTO heartbeats (user_id) VALUES (?)
         ON DUPLICATE KEY UPDATE last_seen = CURRENT_TIMESTAMP"
    )->execute([$u["id"]]);
    json_ok(["ok" => true]);
}

// GET: count users active in the last 60 seconds
if ($_SERVER["REQUEST_METHOD"] === "GET") {
    $stmt = db()->prepare(
        "SELECT COUNT(*) as cnt FROM heartbeats WHERE last_seen >= NOW() - INTERVAL 60 SECOND"
    );
    $stmt->execute();
    json_ok(["active" => (int)$stmt->fetch()["cnt"]]);
}

json_err("Method not allowed", 405);
