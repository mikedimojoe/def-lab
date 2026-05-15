<?php
require_once __DIR__ . "/config.php";
$u = require_auth();
$method = $_SERVER["REQUEST_METHOD"];

$game_id = trim($_GET["game_id"] ?? "");
if ($game_id === "") json_err("game_id required", 400);

// Fields that Drawing may set — must not be wiped by a LiveTagging bulk-save
// unless the LiveTagging row explicitly has a non-empty value for them.
const DRAWING_FIELDS = ['DN', 'DIST', 'PERSONNEL', 'DRIVE'];

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

    // Fetch existing rows so we can preserve Drawing-set fields
    $stmt = $pdo->prepare("SELECT sort_order, row_data FROM live_rows WHERE game_id=?");
    $stmt->execute([$game_id]);
    $existing = [];
    foreach ($stmt->fetchAll() as $r) {
        $existing[(int)$r['sort_order']] = json_decode($r['row_data'], true) ?? [];
    }

    // Merge: if incoming row has an empty Drawing field but existing has a value, keep existing.
    // Once the user manually fills the field in LiveTagging (non-empty value), it wins.
    foreach ($rows as $i => &$row) {
        $ex = $existing[$i] ?? [];
        foreach (DRAWING_FIELDS as $f) {
            if (($row[$f] ?? '') === '' && ($ex[$f] ?? '') !== '') {
                $row[$f] = $ex[$f];
            }
        }
    }
    unset($row);

    $pdo->beginTransaction();
    $pdo->prepare("DELETE FROM live_rows WHERE game_id=?")->execute([$game_id]);
    $ins = $pdo->prepare("INSERT INTO live_rows (game_id,row_data,sort_order) VALUES (?,?,?)");
    foreach ($rows as $i => $row) {
        $ins->execute([$game_id, json_encode($row, JSON_UNESCAPED_UNICODE), $i]);
    }
    $pdo->commit();
    json_ok(["count" => count($rows)]);
}

// PATCH: upsert specific fields into a row by sort_order.
// Creates the row if it doesn't exist yet (Drawing ahead of LiveTagging).
if ($method === "PATCH") {
    if ($u["role"] === "Player") json_err("Not allowed", 403);
    $b = body();
    $sort_order = isset($b["sort_order"]) ? (int)$b["sort_order"] : -1;
    $fields     = $b["fields"] ?? [];
    if ($sort_order < 0 || empty($fields)) json_err("sort_order and fields required", 400);

    $pdo  = db();
    $stmt = $pdo->prepare("SELECT id, row_data FROM live_rows WHERE game_id=? AND sort_order=?");
    $stmt->execute([$game_id, $sort_order]);
    $row  = $stmt->fetch();

    if ($row) {
        // Row exists — merge fields in
        $data = json_decode($row["row_data"], true) ?: [];
        foreach ($fields as $k => $v) { $data[$k] = $v; }
        $pdo->prepare("UPDATE live_rows SET row_data=? WHERE id=?")
            ->execute([json_encode($data, JSON_UNESCAPED_UNICODE), $row["id"]]);
        json_ok(["updated" => true]);
    } else {
        // Row doesn't exist yet — create a placeholder so Drawing data is not lost
        $data = array_merge(
            ['PLAY #' => (string)($sort_order + 1), 'ODK' => 'O'],
            $fields
        );
        $pdo->prepare("INSERT INTO live_rows (game_id, row_data, sort_order) VALUES (?, ?, ?)")
            ->execute([$game_id, json_encode($data, JSON_UNESCAPED_UNICODE), $sort_order]);
        json_ok(["created" => true]);
    }
}

json_err("Method not allowed", 405);
