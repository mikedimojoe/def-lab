<?php
// ── DEF LAB Auto-Installer ────────────────────────────────────────────────────
// Upload this single file to /html/api/install.php
// Then open: https://def-lab.de/api/install.php?key=SETUP_deflab_2026
// It will create all other PHP files and set up the database.

if (($_GET['key'] ?? '') !== 'SETUP_deflab_2026') {
    http_response_code(403);
    die(json_encode(['ok' => false, 'error' => 'Invalid key. Append ?key=SETUP_deflab_2026 to the URL.']));
}

header('Content-Type: text/html; charset=utf-8');
$dir = __DIR__;
$log = [];

// ── 1. Write all PHP backend files ───────────────────────────────────────────

$files = [];

// ── config.php ────────────────────────────────────────────────────────────────
$files['config.php'] = <<<'PHP'
<?php
define('DB_HOST', 'localhost');
define('DB_NAME', 'kd246830db1');
define('DB_USER', 'kd246830db1');
define('DB_PASS', '22081992mM');
define('DB_CHARSET', 'utf8mb4');

$origin  = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed = ['https://def-lab.de','https://www.def-lab.de','http://localhost:5173','http://localhost:3000'];
if (in_array($origin, $allowed)) header("Access-Control-Allow-Origin: $origin");
else header("Access-Control-Allow-Origin: https://def-lab.de");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=utf-8");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

function db(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $pdo = new PDO("mysql:host=".DB_HOST.";dbname=".DB_NAME.";charset=".DB_CHARSET,
            DB_USER, DB_PASS, [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES=>false]);
    }
    return $pdo;
}
function json_ok($data)       { echo json_encode(['ok'=>true,'data'=>$data]); exit; }
function json_err($msg,$code=400) { http_response_code($code); echo json_encode(['ok'=>false,'error'=>$msg]); exit; }
function body(): array        { $r=file_get_contents('php://input'); return $r?(json_decode($r,true)??[]):[]; }
function uid(): string        { return bin2hex(random_bytes(8)).base_convert(time(),10,36); }
session_name('dl_session'); session_start();
function current_user(): ?array { return $_SESSION['user']??null; }
function require_auth(): array  { $u=current_user(); if(!$u) json_err('Not authenticated',401); return $u; }
function require_admin(): array { $u=require_auth(); if($u['role']!=='Admin') json_err('Admin only',403); return $u; }
PHP;

// ── auth.php ──────────────────────────────────────────────────────────────────
$files['auth.php'] = <<<'PHP'
<?php
require_once __DIR__.'/config.php';
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method==='POST' && $action==='login') {
    $b = body();
    $username = trim($b['username']??'');
    $password = $b['password']??'';
    if (!$username||!$password) json_err('Username and password required');
    $stmt = db()->prepare("SELECT * FROM users WHERE LOWER(username)=LOWER(?)");
    $stmt->execute([$username]);
    $user = $stmt->fetch();
    if (!$user||!password_verify($password,$user['password_hash'])) json_err('Invalid credentials',401);
    unset($user['password_hash']);
    $_SESSION['user'] = $user;
    json_ok($user);
}
if ($method==='POST' && $action==='logout') { session_destroy(); json_ok(['message'=>'Logged out']); }
if ($method==='GET'  && $action==='me')     { $u=current_user(); if(!$u) json_err('Not authenticated',401); json_ok($u); }
if ($method==='POST' && $action==='change_password') {
    $u=require_auth(); $b=body(); $pw=$b['password']??'';
    if(strlen($pw)<4) json_err('Password too short');
    db()->prepare("UPDATE users SET password_hash=? WHERE id=?")->execute([password_hash($pw,PASSWORD_BCRYPT),$u['id']]);
    json_ok(['message'=>'Password changed']);
}
json_err('Unknown action',404);
PHP;

// ── teams.php ─────────────────────────────────────────────────────────────────
$files['teams.php'] = <<<'PHP'
<?php
require_once __DIR__.'/config.php';
$u=$m=$_SERVER['REQUEST_METHOD'];$u=require_auth();$m=$_SERVER['REQUEST_METHOD'];
if($m==='GET'){
    if($u['role']==='Admin') $rows=db()->query("SELECT * FROM teams ORDER BY name")->fetchAll();
    else { $s=db()->prepare("SELECT * FROM teams WHERE id=?"); $s->execute([$u['team_id']]); $rows=$s->fetchAll(); }
    json_ok($rows);
}
if($m==='POST'){ require_admin(); $b=body(); if(empty($b['name'])) json_err('Name required');
    $id=uid(); db()->prepare("INSERT INTO teams(id,name,color1,color2)VALUES(?,?,?,?)")
        ->execute([$id,$b['name'],$b['color1']??'#154734',$b['color2']??'#5CBF8A']);
    $s=db()->prepare("SELECT * FROM teams WHERE id=?"); $s->execute([$id]); json_ok($s->fetch()); }
if($m==='PUT'){ require_admin(); $id=$_GET['id']??json_err('id required'); $b=body();
    db()->prepare("UPDATE teams SET name=?,color1=?,color2=? WHERE id=?")
        ->execute([$b['name'],$b['color1']??'#154734',$b['color2']??'#5CBF8A',$id]); json_ok(['id'=>$id]); }
if($m==='DELETE'){ require_admin(); $id=$_GET['id']??json_err('id required');
    db()->prepare("DELETE FROM teams WHERE id=?")->execute([$id]); json_ok(['deleted'=>$id]); }
json_err('Method not allowed',405);
PHP;

// ── users.php ─────────────────────────────────────────────────────────────────
$files['users.php'] = <<<'PHP'
<?php
require_once __DIR__.'/config.php';
$me=require_auth(); $m=$_SERVER['REQUEST_METHOD'];
if($m==='GET'){
    if($me['role']==='Admin') $rows=db()->query("SELECT id,username,role,display_name,team_id FROM users ORDER BY username")->fetchAll();
    else { $s=db()->prepare("SELECT id,username,role,display_name,team_id FROM users WHERE id=?"); $s->execute([$me['id']]); $rows=$s->fetchAll(); }
    json_ok($rows);
}
if($m==='POST'){ require_admin(); $b=body();
    if(empty($b['username'])||empty($b['password'])) json_err('username+password required');
    $c=db()->prepare("SELECT COUNT(*) FROM users WHERE LOWER(username)=LOWER(?)"); $c->execute([$b['username']]);
    if($c->fetchColumn()>0) json_err('Username taken');
    $id=uid(); db()->prepare("INSERT INTO users(id,username,password_hash,role,display_name,team_id)VALUES(?,?,?,?,?,?)")
        ->execute([$id,$b['username'],password_hash($b['password'],PASSWORD_BCRYPT),$b['role']??'Player',
                   $b['display_name']??$b['username'],$b['team_id']??null]);
    $s=db()->prepare("SELECT id,username,role,display_name,team_id FROM users WHERE id=?"); $s->execute([$id]); json_ok($s->fetch()); }
if($m==='PUT'){ $id=$_GET['id']??json_err('id required');
    if($me['role']!=='Admin'&&$me['id']!==$id) json_err('Forbidden',403);
    $b=body();
    if(!empty($b['password'])) db()->prepare("UPDATE users SET password_hash=? WHERE id=?")->execute([password_hash($b['password'],PASSWORD_BCRYPT),$id]);
    if($me['role']==='Admin') db()->prepare("UPDATE users SET display_name=?,role=?,team_id=? WHERE id=?")
        ->execute([$b['display_name']??'',$b['role']??'Player',$b['team_id']??null,$id]);
    if($me['id']===$id){ $s=db()->prepare("SELECT id,username,role,display_name,team_id FROM users WHERE id=?"); $s->execute([$id]); $_SESSION['user']=$s->fetch(); }
    json_ok(['id'=>$id]); }
if($m==='DELETE'){ require_admin(); $id=$_GET['id']??json_err('id required');
    if($id===$me['id']) json_err('Cannot delete yourself');
    db()->prepare("DELETE FROM users WHERE id=?")->execute([$id]); json_ok(['deleted'=>$id]); }
json_err('Method not allowed',405);
PHP;

// ── seasons.php ───────────────────────────────────────────────────────────────
$files['seasons.php'] = <<<'PHP'
<?php
require_once __DIR__.'/config.php';
$u=require_auth(); $m=$_SERVER['REQUEST_METHOD'];
if($m==='GET'){
    if($u['role']==='Admin') $rows=db()->query("SELECT * FROM seasons ORDER BY year DESC,name")->fetchAll();
    else { $s=db()->prepare("SELECT * FROM seasons WHERE team_id=? OR team_id IS NULL ORDER BY year DESC"); $s->execute([$u['team_id']]); $rows=$s->fetchAll(); }
    json_ok($rows);
}
if($m==='POST'){ if($u['role']==='Player') json_err('Not allowed',403); $b=body();
    if(empty($b['year'])) json_err('year required'); $id=uid();
    $tid=$u['role']==='Admin'?($b['team_id']??null):$u['team_id'];
    db()->prepare("INSERT INTO seasons(id,year,name,team_id)VALUES(?,?,?,?)")
        ->execute([$id,$b['year'],$b['name']??"GFL {$b['year']} Season",$tid]);
    $s=db()->prepare("SELECT * FROM seasons WHERE id=?"); $s->execute([$id]); json_ok($s->fetch()); }
if($m==='DELETE'){ if($u['role']==='Player') json_err('Not allowed',403);
    $id=$_GET['id']??json_err('id required');
    db()->prepare("DELETE FROM seasons WHERE id=?")->execute([$id]); json_ok(['deleted'=>$id]); }
json_err('Method not allowed',405);
PHP;

// ── games.php ─────────────────────────────────────────────────────────────────
$files['games.php'] = <<<'PHP'
<?php
require_once __DIR__.'/config.php';
$u=require_auth(); $m=$_SERVER['REQUEST_METHOD'];
if($m==='GET'){ $sid=$_GET['season_id']??null; if(!$sid) json_err('season_id required');
    $s=db()->prepare("SELECT g.*,(SELECT COUNT(*) FROM play_rows WHERE game_id=g.id) AS play_count,(SELECT COUNT(*) FROM live_rows WHERE game_id=g.id) AS live_count FROM games g WHERE g.season_id=? ORDER BY g.week+0,g.week");
    $s->execute([$sid]); json_ok($s->fetchAll()); }
if($m==='POST'){ if($u['role']==='Player') json_err('Not allowed',403); $b=body();
    if(empty($b['season_id'])) json_err('season_id required'); $id=uid();
    db()->prepare("INSERT INTO games(id,season_id,week,opponent,game_date)VALUES(?,?,?,?,?)")
        ->execute([$id,$b['season_id'],$b['week']??'',$b['opponent']??'',$b['date']??'']);
    $s=db()->prepare("SELECT * FROM games WHERE id=?"); $s->execute([$id]); json_ok($s->fetch()); }
if($m==='PUT'){ if($u['role']==='Player') json_err('Not allowed',403); $id=$_GET['id']??json_err('id required'); $b=body();
    db()->prepare("UPDATE games SET week=?,opponent=?,game_date=? WHERE id=?")->execute([$b['week']??'',$b['opponent']??'',$b['date']??'',$id]); json_ok(['id'=>$id]); }
if($m==='DELETE'){ if($u['role']==='Player') json_err('Not allowed',403); $id=$_GET['id']??json_err('id required');
    db()->prepare("DELETE FROM games WHERE id=?")->execute([$id]); json_ok(['deleted'=>$id]); }
json_err('Method not allowed',405);
PHP;

// ── plays.php ─────────────────────────────────────────────────────────────────
$files['plays.php'] = <<<'PHP'
<?php
require_once __DIR__.'/config.php';
$u=require_auth(); $m=$_SERVER['REQUEST_METHOD'];
$gid=$_GET['game_id']??null; if(!$gid) json_err('game_id required');
if($m==='GET'){ $s=db()->prepare("SELECT row_data FROM play_rows WHERE game_id=? ORDER BY id"); $s->execute([$gid]);
    json_ok(array_map(fn($r)=>json_decode($r['row_data'],true),$s->fetchAll())); }
if($m==='POST'){ if($u['role']==='Player') json_err('Not allowed',403); $rows=body();
    if(!is_array($rows)) json_err('Expected array');
    $pdo=db(); $pdo->beginTransaction();
    $pdo->prepare("DELETE FROM play_rows WHERE game_id=?")->execute([$gid]);
    $ins=$pdo->prepare("INSERT INTO play_rows(game_id,row_data)VALUES(?,?)");
    foreach($rows as $row) $ins->execute([$gid,json_encode($row,JSON_UNESCAPED_UNICODE)]);
    $pdo->commit(); json_ok(['count'=>count($rows)]); }
json_err('Method not allowed',405);
PHP;

// ── liverows.php ──────────────────────────────────────────────────────────────
$files['liverows.php'] = <<<'PHP'
<?php
require_once __DIR__.'/config.php';
$u=require_auth(); $m=$_SERVER['REQUEST_METHOD'];
$gid=$_GET['game_id']??null; if(!$gid) json_err('game_id required');
if($m==='GET'){ $s=db()->prepare("SELECT row_data FROM live_rows WHERE game_id=? ORDER BY sort_order,id"); $s->execute([$gid]);
    json_ok(array_map(fn($r)=>json_decode($r['row_data'],true),$s->fetchAll())); }
if($m==='POST'){ if($u['role']==='Player') json_err('Not allowed',403); $rows=body();
    if(!is_array($rows)) json_err('Expected array');
    $pdo=db(); $pdo->beginTransaction();
    $pdo->prepare("DELETE FROM live_rows WHERE game_id=?")->execute([$gid]);
    $ins=$pdo->prepare("INSERT INTO live_rows(game_id,row_data,sort_order)VALUES(?,?,?)");
    foreach($rows as $i=>$row) $ins->execute([$gid,json_encode($row,JSON_UNESCAPED_UNICODE),$i]);
    $pdo->commit(); json_ok(['count'=>count($rows)]); }
json_err('Method not allowed',405);
PHP;

// ── roster.php ────────────────────────────────────────────────────────────────
$files['roster.php'] = <<<'PHP'
<?php
require_once __DIR__.'/config.php';
$u=require_auth(); $m=$_SERVER['REQUEST_METHOD'];
$gid=$_GET['game_id']??null; if(!$gid) json_err('game_id required');
if($m==='GET'){ $s=db()->prepare("SELECT data FROM roster_data WHERE game_id=?"); $s->execute([$gid]);
    $r=$s->fetch(); json_ok($r?json_decode($r['data'],true):(object)[]); }
if($m==='POST'){ if($u['role']==='Player') json_err('Not allowed',403);
    db()->prepare("INSERT INTO roster_data(game_id,data)VALUES(?,?) ON DUPLICATE KEY UPDATE data=VALUES(data)")
        ->execute([$gid,json_encode(body(),JSON_UNESCAPED_UNICODE)]); json_ok(['saved'=>true]); }
json_err('Method not allowed',405);
PHP;

// ── images.php ────────────────────────────────────────────────────────────────
$files['images.php'] = <<<'PHP'
<?php
require_once __DIR__.'/config.php';
$u=require_auth(); $m=$_SERVER['REQUEST_METHOD'];
$gid=$_GET['game_id']??null; if(!$gid) json_err('game_id required');
define('IMG_DIR',__DIR__.'/../uploads/formations/');
function norm_name(string $n):string{ return preg_replace('/[^a-z0-9]+/','_',strtolower(pathinfo($n,PATHINFO_FILENAME))); }
function img_url(string $g,string $f):string{ return '/uploads/formations/'.$g.'/'.rawurlencode($f); }
if($m==='GET'){ $s=db()->prepare("SELECT norm_name,filename FROM formation_images WHERE game_id=?"); $s->execute([$gid]);
    $map=[]; foreach($s->fetchAll() as $r) $map[$r['norm_name']]=img_url($gid,$r['filename']); json_ok($map); }
if($m==='POST'){ if($u['role']==='Player') json_err('Not allowed',403);
    if(empty($_FILES['image'])) json_err('No file');
    $f=$_FILES['image']; $ok=['image/jpeg','image/png','image/webp','image/gif','image/bmp'];
    if(!in_array($f['type'],$ok)) json_err('Invalid type'); if($f['size']>5*1024*1024) json_err('Too large');
    $dir=IMG_DIR.$gid.'/'; if(!is_dir($dir)) mkdir($dir,0755,true);
    $n=norm_name($f['name']); $fn=$n.'.'.strtolower(pathinfo($f['name'],PATHINFO_EXTENSION));
    if(!move_uploaded_file($f['tmp_name'],$dir.$fn)) json_err('Upload failed');
    db()->prepare("INSERT INTO formation_images(game_id,norm_name,filename)VALUES(?,?,?) ON DUPLICATE KEY UPDATE filename=VALUES(filename)")
        ->execute([$gid,$n,$fn]); json_ok(['norm_name'=>$n,'url'=>img_url($gid,$fn)]); }
if($m==='DELETE'){ if($u['role']==='Player') json_err('Not allowed',403);
    $n=$_GET['norm_name']??json_err('norm_name required');
    $s=db()->prepare("SELECT filename FROM formation_images WHERE game_id=? AND norm_name=?"); $s->execute([$gid,$n]); $r=$s->fetch();
    if($r){ $p=IMG_DIR.$gid.'/'.$r['filename']; if(file_exists($p)) unlink($p);
        db()->prepare("DELETE FROM formation_images WHERE game_id=? AND norm_name=?")->execute([$gid,$n]); }
    json_ok(['deleted'=>$n]); }
json_err('Method not allowed',405);
PHP;

// ── 2. Write files to disk ────────────────────────────────────────────────────
foreach ($files as $name => $content) {
    $path = $dir . '/' . $name;
    if (file_put_contents($path, $content) !== false) {
        $log[] = "✅ Created: api/$name";
    } else {
        $log[] = "❌ FAILED:  api/$name";
    }
}

// ── 3. Create uploads directory ───────────────────────────────────────────────
$uploadsDir = dirname($dir) . '/uploads/formations';
if (!is_dir($uploadsDir)) {
    mkdir($uploadsDir, 0755, true);
    $log[] = "✅ Created: uploads/formations/";
} else {
    $log[] = "ℹ️  Already exists: uploads/formations/";
}

// ── 4. Set up database ────────────────────────────────────────────────────────
try {
    $pdo = new PDO("mysql:host=localhost;dbname=kd246830db1;charset=utf8mb4",
        'kd246830db1', '22081992mM',
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

    $tables = [
        "CREATE TABLE IF NOT EXISTS teams(id VARCHAR(32) PRIMARY KEY,name VARCHAR(120) NOT NULL,color1 VARCHAR(10) DEFAULT '#154734',color2 VARCHAR(10) DEFAULT '#5CBF8A') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
        "CREATE TABLE IF NOT EXISTS users(id VARCHAR(32) PRIMARY KEY,username VARCHAR(60) NOT NULL UNIQUE,password_hash VARCHAR(128) NOT NULL,role ENUM('Admin','Coach','Player') DEFAULT 'Player',display_name VARCHAR(120),team_id VARCHAR(32) NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
        "CREATE TABLE IF NOT EXISTS seasons(id VARCHAR(32) PRIMARY KEY,year VARCHAR(10),name VARCHAR(120),team_id VARCHAR(32) NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
        "CREATE TABLE IF NOT EXISTS games(id VARCHAR(32) PRIMARY KEY,season_id VARCHAR(32) NOT NULL,week VARCHAR(10),opponent VARCHAR(120),game_date VARCHAR(20)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
        "CREATE TABLE IF NOT EXISTS play_rows(id BIGINT AUTO_INCREMENT PRIMARY KEY,game_id VARCHAR(32) NOT NULL,row_data JSON NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
        "CREATE TABLE IF NOT EXISTS live_rows(id BIGINT AUTO_INCREMENT PRIMARY KEY,game_id VARCHAR(32) NOT NULL,row_data JSON NOT NULL,sort_order INT DEFAULT 0) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
        "CREATE TABLE IF NOT EXISTS roster_data(id BIGINT AUTO_INCREMENT PRIMARY KEY,game_id VARCHAR(32) NOT NULL UNIQUE,data JSON NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
        "CREATE TABLE IF NOT EXISTS formation_images(id BIGINT AUTO_INCREMENT PRIMARY KEY,game_id VARCHAR(32) NOT NULL,norm_name VARCHAR(200) NOT NULL,filename VARCHAR(200) NOT NULL,UNIQUE KEY u(game_id,norm_name)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
    ];
    foreach ($tables as $sql) { $pdo->exec($sql); }
    $log[] = "✅ Database: All tables created";

    if (!$pdo->query("SELECT COUNT(*) FROM users")->fetchColumn()) {
        $pdo->prepare("INSERT INTO users(id,username,password_hash,role,display_name)VALUES(?,?,?,?,?)")
            ->execute([bin2hex(random_bytes(8)), 'admin', password_hash('admin123', PASSWORD_BCRYPT), 'Admin', 'Administrator']);
        $log[] = "✅ Database: Admin user created (admin / admin123)";
    } else {
        $log[] = "ℹ️  Database: Users already exist";
    }
    if (!$pdo->query("SELECT COUNT(*) FROM teams")->fetchColumn()) {
        $pdo->prepare("INSERT INTO teams(id,name,color1,color2)VALUES(?,?,?,?)")
            ->execute([bin2hex(random_bytes(8)), 'Schwäbisch Hall Unicorns', '#154734', '#5CBF8A']);
        $log[] = "✅ Database: Default team created";
    }
} catch (Exception $e) {
    $log[] = "❌ Database error: " . $e->getMessage();
}

// ── 5. Output result ──────────────────────────────────────────────────────────
?><!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>DEF LAB Installer</title>
<style>body{background:#111;color:#e8e8e8;font-family:monospace;padding:40px;max-width:700px}
h1{color:#5CBF8A}li{margin:4px 0;font-size:14px}.done{color:#5CBF8A;margin-top:24px;font-size:16px;font-weight:bold}</style>
</head><body>
<h1>🏈 DEF LAB — Setup Complete</h1>
<ul><?php foreach($log as $l) echo "<li>$l</li>"; ?></ul>
<p class="done">✅ All done! You can now visit <a href="https://def-lab.de" style="color:#5CBF8A">def-lab.de</a></p>
<p style="color:#555;font-size:12px;margin-top:20px">⚠️ Delete this install.php file after setup for security!</p>
</body></html>
