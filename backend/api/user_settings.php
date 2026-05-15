<?php
require_once __DIR__ . '/config.php';

// Ensure table exists
db()->exec("CREATE TABLE IF NOT EXISTS user_settings (
  user_id VARCHAR(100) PRIMARY KEY,
  settings_json TEXT NOT NULL DEFAULT '{}'
)");

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
  $u = require_auth();
  $stmt = db()->prepare("SELECT settings_json FROM user_settings WHERE user_id = ?");
  $stmt->execute([$u['id']]);
  $row = $stmt->fetch();
  $settings = $row ? (json_decode($row['settings_json'], true) ?: []) : [];
  json_ok((object)$settings);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $u = require_auth();
  $data = body();
  // Load existing settings and merge — individual keys are updated, others preserved
  $stmt = db()->prepare("SELECT settings_json FROM user_settings WHERE user_id = ?");
  $stmt->execute([$u['id']]);
  $row = $stmt->fetch();
  $existing = $row ? (json_decode($row['settings_json'], true) ?: []) : [];
  $merged = array_merge($existing, $data);
  $json = json_encode($merged);
  db()->prepare("INSERT INTO user_settings (user_id, settings_json) VALUES (?,?) ON DUPLICATE KEY UPDATE settings_json=VALUES(settings_json)")
    ->execute([$u['id'], $json]);
  json_ok(true);
}

json_err('Method not allowed', 405);
