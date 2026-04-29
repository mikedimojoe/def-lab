<?php
require_once __DIR__ . '/config.php';
$u = require_auth();
$method = $_SERVER['REQUEST_METHOD'];
$teamId = $_GET['team_id'] ?? null;
if (!$teamId) json_err('team_id required');

define('IMG_DIR', __DIR__ . '/../uploads/formations/');

function norm_name(string $name): string {
    $name = strtolower(pathinfo($name, PATHINFO_FILENAME));
    return preg_replace('/[^a-z0-9]+/', '_', $name);
}

function img_url(string $teamId, string $filename): string {
    return '/uploads/formations/' . $teamId . '/' . rawurlencode($filename);
}

// GET — list all images for a team { normName: url }
if ($method === 'GET') {
    $stmt = db()->prepare("SELECT norm_name, filename FROM formation_images WHERE team_id=?");
    $stmt->execute([$teamId]);
    $map = [];
    foreach ($stmt->fetchAll() as $row) {
        $map[$row['norm_name']] = img_url($teamId, $row['filename']);
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

    $dir = IMG_DIR . $teamId . '/';
    if (!is_dir($dir)) mkdir($dir, 0755, true);

    $ext      = pathinfo($file['name'], PATHINFO_EXTENSION);
    $normName = norm_name($file['name']);
    $filename = $normName . '.' . strtolower($ext);
    $dest     = $dir . $filename;

    if (!move_uploaded_file($file['tmp_name'], $dest)) json_err('Upload failed');

    db()->prepare("INSERT INTO formation_images (team_id,norm_name,filename) VALUES (?,?,?)
                   ON DUPLICATE KEY UPDATE filename=VALUES(filename)")
       ->execute([$teamId, $normName, $filename]);

    json_ok(['norm_name' => $normName, 'url' => img_url($teamId, $filename)]);
}

// DELETE — remove one image
if ($method === 'DELETE') {
    if ($u['role'] === 'Player') json_err('Not allowed', 403);
    $normName = $_GET['norm_name'] ?? json_err('norm_name required');
    $stmt = db()->prepare("SELECT filename FROM formation_images WHERE team_id=? AND norm_name=?");
    $stmt->execute([$teamId, $normName]);
    $row = $stmt->fetch();
    if ($row) {
        $path = IMG_DIR . $teamId . '/' . $row['filename'];
        if (file_exists($path)) unlink($path);
        db()->prepare("DELETE FROM formation_images WHERE team_id=? AND norm_name=?")
           ->execute([$teamId, $normName]);
    }
    json_ok(['deleted' => $normName]);
}

json_err('Method not allowed', 405);
