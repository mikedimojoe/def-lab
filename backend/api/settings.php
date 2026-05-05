<?php
// ── DEF LAB — Global Settings ─────────────────────────────────────────────────
// GET  /api/settings.php          → return current settings (public, no auth)
// POST /api/settings.php          → save settings (admin only)
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $pdo = db();
    $rows = $pdo->query("SELECT k, v FROM settings")->fetchAll();
    $out  = [];
    foreach ($rows as $r) $out[$r['k']] = $r['v'];
    json_ok($out);
}

if ($method === 'POST') {
    require_admin();
    $data = body();
    if (empty($data)) json_err('No data');
    $pdo  = db();
    $stmt = $pdo->prepare("INSERT INTO settings (k, v) VALUES (?, ?) ON DUPLICATE KEY UPDATE v = VALUES(v)");
    foreach ($data as $k => $v) {
        $k = preg_replace('/[^a-z0-9_]/', '', strtolower((string)$k));
        if ($k) $stmt->execute([$k, (string)$v]);
    }
    json_ok(['saved' => true]);
}

json_err('Method not allowed', 405);
