<?php
require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $rows = db()->query('SELECT skey, value FROM settings')->fetchAll();
    $out = [];
    foreach ($rows as $r) $out[$r['skey']] = $r['value'];
    json_ok($out);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require_admin();
    $data = body();
    $stmt = db()->prepare('INSERT INTO settings (skey, value) VALUES (?,?) ON DUPLICATE KEY UPDATE value=VALUES(value)');
    foreach ($data as $k => $v) {
        if (is_string($k) && strlen($k) <= 100) $stmt->execute([$k, $v]);
    }
    json_ok(true);
}

json_err('Method not allowed', 405);
