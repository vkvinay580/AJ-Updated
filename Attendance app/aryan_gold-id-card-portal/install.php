<?php
require __DIR__ . '/bootstrap.php';

$message = '';
$error = '';
try {
    // XAMPP-friendly setup: create the configured database when it does not exist.
    $d = $config['db'];
    $serverDsn = "mysql:host={$d['host']};port={$d['port']};charset={$d['charset']}";
    $serverPdo = new PDO($serverDsn, $d['user'], $d['pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    $databaseName = str_replace('`', '``', $d['name']);
    $serverPdo->exec("CREATE DATABASE IF NOT EXISTS `{$databaseName}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");

    $pdo = db();
    $pdo->exec("CREATE TABLE IF NOT EXISTS admins (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,name VARCHAR(100) NOT NULL,email VARCHAR(190) NOT NULL UNIQUE,password_hash VARCHAR(255) NOT NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB");
    $pdo->exec("CREATE TABLE IF NOT EXISTS employees (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,public_token CHAR(32) NOT NULL UNIQUE,full_name VARCHAR(120) NOT NULL,designation VARCHAR(120) NOT NULL,employee_code VARCHAR(40) NOT NULL UNIQUE,date_of_birth DATE NULL,blood_group VARCHAR(10) NOT NULL,phone VARCHAR(20) NULL,emergency_contact VARCHAR(10) NULL,email VARCHAR(190) NULL,company_address TEXT NOT NULL,home_address TEXT NOT NULL,photo_path VARCHAR(255) NOT NULL,status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',admin_notes TEXT NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,INDEX idx_status(status),INDEX idx_created_at(created_at)) ENGINE=InnoDB");

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        verify_csrf();
        $name = trim($_POST['name'] ?? '');
        $email = strtolower(trim($_POST['email'] ?? ''));
        $password = $_POST['password'] ?? '';
        if (!$name || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 8) {
            throw new RuntimeException('Enter a valid name, email and password of at least 8 characters.');
        }
        $stmt = $pdo->prepare('INSERT INTO admins(name,email,password_hash) VALUES(?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name), password_hash=VALUES(password_hash)');
        $stmt->execute([$name, $email, password_hash($password, PASSWORD_DEFAULT)]);
        $message = 'Installation complete. Delete install.php after setup and sign in to the admin panel.';
    }
} catch (Throwable $e) {
    $error = $e->getMessage();
}
?>
<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Install</title><link rel="stylesheet" href="assets/css/app.css"></head>
<body class="auth-page"><main class="auth-shell"><section class="auth-card"><div class="brand-mark">A</div><h1>Portal installation</h1><p>Create the first administrator account.</p><?php if($message): ?><div class="alert success"><?=e($message)?></div><?php endif; ?><?php if($error): ?><div class="alert danger"><?=e($error)?></div><?php endif; ?><form method="post" class="stack"><input type="hidden" name="csrf" value="<?=e(csrf_token())?>"><label>Administrator name<input name="name" required></label><label>Email<input type="email" name="email" required></label><label>Password<input type="password" name="password" minlength="8" required></label><button class="btn primary">Complete installation</button></form><a class="text-link" href="admin/login.php">Go to admin login</a></section></main></body></html>
