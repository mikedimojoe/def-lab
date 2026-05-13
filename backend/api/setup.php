<?php
// ── DEF LAB — Database Setup Script ──────────────────────────────────────────
// Call this ONCE via browser: https://def-lab.de/api/setup.php?key=SETUP_deflab_2026
require_once __DIR__ . '/config.php';

if (($_GET['key'] ?? '') !== 'SETUP_deflab_2026') {
    json_err('Invalid setup key', 403);
}

$pdo = db();

$sql = "
CREATE TABLE IF NOT EXISTS teams (
    id          VARCHAR(32) PRIMARY KEY,
    name        VARCHAR(120) NOT NULL,
    color1      VARCHAR(10)  DEFAULT '#154734',
    color2      VARCHAR(10)  DEFAULT '#5CBF8A',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS users (
    id            VARCHAR(32) PRIMARY KEY,
    username      VARCHAR(60)  NOT NULL UNIQUE,
    password_hash VARCHAR(128) NOT NULL,
    role          ENUM('Admin','Coach','Player') DEFAULT 'Player',
    display_name  VARCHAR(120),
    team_id       VARCHAR(32) NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS seasons (
    id         VARCHAR(32) PRIMARY KEY,
    year       VARCHAR(10)  NOT NULL,
    name       VARCHAR(120) NOT NULL,
    team_id    VARCHAR(32) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS games (
    id            VARCHAR(32) PRIMARY KEY,
    season_id     VARCHAR(32) NOT NULL,
    week          VARCHAR(10),
    opponent      VARCHAR(120),
    game_date     VARCHAR(20),
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS play_rows (
    id        BIGINT AUTO_INCREMENT PRIMARY KEY,
    game_id   VARCHAR(32) NOT NULL,
    row_data  JSON NOT NULL,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS live_rows (
    id        BIGINT AUTO_INCREMENT PRIMARY KEY,
    game_id   VARCHAR(32) NOT NULL,
    row_data  JSON NOT NULL,
    sort_order INT DEFAULT 0,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS roster_data (
    id        BIGINT AUTO_INCREMENT PRIMARY KEY,
    game_id   VARCHAR(32) NOT NULL UNIQUE,
    data      JSON NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS formation_images (
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    game_id      VARCHAR(32) NOT NULL,
    norm_name    VARCHAR(200) NOT NULL,
    filename     VARCHAR(200) NOT NULL,
    mime_type    VARCHAR(60),
    uploaded_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_game_form (game_id, norm_name),
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
";

// Execute each statement separately
foreach (array_filter(array_map('trim', explode(';', $sql))) as $stmt) {
    if ($stmt) $pdo->exec($stmt);
}

// Seed default admin user if none exists
$count = $pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
if ($count == 0) {
    $hash = password_hash('admin123', PASSWORD_BCRYPT);
    $id   = uid();
    $pdo->prepare("INSERT INTO users (id, username, password_hash, role, display_name) VALUES (?,?,?,?,?)")
        ->execute([$id, 'admin', $hash, 'Admin', 'Administrator']);
}

// Seed default team if none exists
$tc = $pdo->query("SELECT COUNT(*) FROM teams")->fetchColumn();
if ($tc == 0) {
    $pdo->prepare("INSERT INTO teams (id, name, color1, color2) VALUES (?,?,?,?)")
        ->execute([uid(), 'Schwäbisch Hall Unicorns', '#154734', '#5CBF8A']);
}

json_ok(['message' => 'Setup complete! Tables created. Default admin: admin / admin123']);
