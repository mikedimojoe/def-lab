<?php
require_once __DIR__ . '/config.php';
$u = require_auth();
$method = $_SERVER['REQUEST_METHOD'];
$gameId = $_GET['game_id'] ?? null;
if (!$gameId) json_err('game_id required');

define('IMG_DIR', __DIR__ . '/../uploads/formations/');

function norm_name(string $name): string {
    $name = strtolower(pathinfo($name, PATHINFO_FILENAME));
    return preg_replace('/[^a-z0-9]+/', '_', $name);
}

function img_url(string $gameId, string $filename): string {
    return '/uploads/formations/' . $gameId . '/' . rawurlencode($filename);
}

// GET — list all images for a game { normName: url }
if ($method === 'GET') {
    $stmt = db()->prepare("SELECT norm_name, filename FROM formation_images WHERE game_id=?");
    $stmt->execute([$gameId]);
    $map = [];
    foreach ($stmt->fetchAll() as $row) {
        $map[$row['norm_name']] = img_url($gameId, $row['filename']);
    }
    json_ok($map);
}

// POST — upload one image (multipart/form-data)
if ($method === 'POST') {
    if ($u['role'] === 'Player') json_err('Not allowed', 403);
    if (empty($_FILES['image'])) json_err('No file uploaded');
    $file = $_FILES['image'];
    $allowed = ['image/jpeg','image/png','image/webp','image/gif','image/bmp'];
    if (!in_array($file['type'], $allowed)) json_err('Invalid file type');
    if ($file['size'] > 5 * 1024 * 1024) json_err('File too large (max 5MB)');

    $dir = IMG_DIR . $gameId . '/';
    if (!is_dir($dir)) mkdir($dir, 0755, true);

    $ext      = pathinfo($file['name'], PATHINFO_EXTENSION);
    $normName = norm_name($file['name']);
    $filename = $normName . '.' . strtolower($ext);
    $dest     = $dir . $filename;

    if (!move_uploaded_file($file['tmp_name'], $dest)) json_err('Upload failed');

    db()->prepare("INSERT INTO formation_images (game_id,norm_name,filename,mime_type) VALUES (?,?,?,?)
                   ON DUPLICATE KEY UPDATE filename=VALUES(filename), mime_type=VALUES(mime_type)")
       ->execute([$gameId, $normName, $filename, $file['type']]);

    json_ok(['norm_name' => $normName, 'url' => img_url($gameId, $filename)]);
}

// DELETE — remove one image
if ($method === 'DELETE') {
    if ($u['role'] === 'Player') json_err('Not allowed', 403);
    $normName = $_GET['norm_name'] ?? json_err('norm_name required');
    $stmt = db()->prepare("SELECT filename FROM formation_images WHERE game_id=? AND norm_name=?");
    $stmt->execute([$gameId, $normName]);
    $row = $stmt->fetch();
    if ($row) {
        $path = IMG_DIR . $gameId . '/' . $row['filename'];
        if (file_exists($path)) unlink($path);
        db()->prepare("DELETE FROM formation_images WHERE game_id=? AND norm_name=?")
           ->execute([$gameId, $normName]);
    }
    json_ok(['deleted' => $normName]);
}

json_err('Method not allowed', 405);
