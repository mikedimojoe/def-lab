<?php
// ── DEF LAB — Database Configuration ─────────────────────────────────────────
define('DB_HOST', 'localhost');
define('DB_NAME', 'kd246830db1');
define('DB_USER', 'kd246830db1');
define('DB_PASS', '22081992mM');
define('DB_CHARSET', 'utf8mb4');

// CORS — allow the frontend domain
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed = ['https://def-lab.de', 'https://www.def-lab.de', 'http://localhost:5173', 'http://localhost:3000'];
if (in_array($origin, $allowed)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header("Access-Control-Allow-Origin: https://def-lab.de");
}
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=utf-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

// ── DB connection (singleton) ─────────────────────────────────────────────────
function db(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    }
    return $pdo;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function json_ok($data)  { echo json_encode(['ok' => true,  'data' => $data]);  exit; }
function json_err($msg, $code = 400) {
    http_response_code($code);
    echo json_encode(['ok' => false, 'error' => $msg]);
    exit;
}
function body(): array {
    $raw = file_get_contents('php://input');
    return $raw ? (json_decode($raw, true) ?? []) : [];
}
function uid(): string { return bin2hex(random_bytes(8)) . base_convert(time(), 10, 36); }

// ── Session auth ──────────────────────────────────────────────────────────────
session_name('dl_session');
session_start();

function current_user(): ?array { return $_SESSION['user'] ?? null; }
function require_auth(): array {
    $u = current_user();
    if (!$u) json_err('Not authenticated', 401);
    return $u;
}
function require_admin(): array {
    $u = require_auth();
    if ($u['role'] !== 'Admin') json_err('Admin only', 403);
    return $u;
}
