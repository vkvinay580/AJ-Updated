<?php
declare(strict_types=1);

$config = require __DIR__ . '/config.php';
date_default_timezone_set($config['timezone'] ?? 'Asia/Kolkata');

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_name('aryan_gold_id_session');
    session_set_cookie_params([
        'httponly' => true,
        'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
        'samesite' => 'Lax',
    ]);
    session_start();
}

function db(): PDO
{
    static $pdo;
    global $config;
    if ($pdo instanceof PDO) return $pdo;

    $d = $config['db'];
    $dsn = "mysql:host={$d['host']};port={$d['port']};dbname={$d['name']};charset={$d['charset']}";
    $pdo = new PDO($dsn, $d['user'], $d['pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    return $pdo;
}

function e(?string $value): string
{
    return htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8');
}

function csrf_token(): string
{
    if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32));
    return $_SESSION['csrf'];
}

function verify_csrf(): void
{
    $token = $_POST['csrf'] ?? '';
    if (!$token || !hash_equals($_SESSION['csrf'] ?? '', $token)) {
        http_response_code(419);
        exit('Session expired. Please go back and try again.');
    }
}

function redirect(string $path): never
{
    header('Location: ' . $path);
    exit;
}

function admin_required(): void
{
    if (empty($_SESSION['admin_id'])) redirect('login.php');
}

function flash(string $type, string $message): void
{
    $_SESSION['flash'] = ['type' => $type, 'message' => $message];
}

function pull_flash(): ?array
{
    $flash = $_SESSION['flash'] ?? null;
    unset($_SESSION['flash']);
    return $flash;
}

function photo_url(?string $path): string
{
    if (!$path) return 'assets/img/avatar-placeholder.svg';
    return $path;
}

function find_duplicate_employee(
    string $employeeCode,
    string $phone,
    string $fullName,
    string $homeAddress,
    ?int $excludeId = null
): ?array {
    $sql = 'SELECT id, full_name, employee_code FROM employees
            WHERE (employee_code = ? OR phone = ? OR (full_name = ? AND home_address = ?))';
    $params = [$employeeCode, $phone, $fullName, $homeAddress];

    if ($excludeId !== null) {
        $sql .= ' AND id <> ?';
        $params[] = $excludeId;
    }

    $sql .= ' LIMIT 1';
    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    $employee = $stmt->fetch();
    return $employee ?: null;
}

function card_template_defaults(): array
{
    return [
        'front_image' => '',
        'back_image' => '',
        'front' => [
            'logo' => ['x'=>18,'y'=>20,'w'=>115,'h'=>72,'font'=>12,'color'=>'#ffffff','align'=>'center'],
            'photo' => ['x'=>173,'y'=>93,'w'=>142,'h'=>181,'font'=>14,'color'=>'#211b1d','align'=>'center'],
            'employee_icon' => ['x'=>55,'y'=>158,'w'=>31,'h'=>31,'font'=>12,'color'=>'#ffffff','align'=>'center'],
            'calendar_icon' => ['x'=>55,'y'=>270,'w'=>31,'h'=>31,'font'=>12,'color'=>'#ffffff','align'=>'center'],
            'globe_icon' => ['x'=>55,'y'=>393,'w'=>31,'h'=>31,'font'=>12,'color'=>'#ffffff','align'=>'center'],
            'full_name' => ['x'=>151,'y'=>294,'w'=>174,'h'=>45,'font'=>23,'color'=>'#5b0717','align'=>'center'],
            'designation' => ['x'=>151,'y'=>337,'w'=>174,'h'=>34,'font'=>14,'color'=>'#211b1d','align'=>'center'],
            'employee_code' => ['x'=>18,'y'=>192,'w'=>105,'h'=>59,'font'=>15,'color'=>'#ffffff','align'=>'center'],
            'date_of_birth' => ['x'=>12,'y'=>305,'w'=>118,'h'=>61,'font'=>14,'color'=>'#ffffff','align'=>'center'],
            'website' => ['x'=>4,'y'=>432,'w'=>140,'h'=>48,'font'=>8,'color'=>'#ffffff','align'=>'center'],
            'divider' => ['x'=>154,'y'=>395,'w'=>163,'h'=>18,'font'=>8,'color'=>'#d6a12f','align'=>'center'],
            'barcode' => ['x'=>158,'y'=>432,'w'=>157,'h'=>35,'font'=>12,'color'=>'#111111','align'=>'center'],
        ],
        'back' => [
            'blood_group' => ['x'=>17,'y'=>216,'w'=>95,'h'=>70,'font'=>22,'color'=>'#ffffff','align'=>'center'],
            'company_address' => ['x'=>158,'y'=>180,'w'=>158,'h'=>180,'font'=>13,'color'=>'#211b1d','align'=>'center'],
        ],
    ];
}

function card_template_settings(): array
{
    $defaults = card_template_defaults();
    $file = __DIR__ . '/uploads/templates/settings.json';
    if (!is_file($file)) return $defaults;
    $data = json_decode((string)file_get_contents($file), true);
    if (!is_array($data)) return $defaults;
    return array_replace_recursive($defaults, $data);
}

function save_card_template_settings(array $settings): void
{
    $dir = __DIR__ . '/uploads/templates';
    if (!is_dir($dir) && !mkdir($dir, 0775, true) && !is_dir($dir)) {
        throw new RuntimeException('Could not create template upload directory.');
    }
    file_put_contents($dir . '/settings.json', json_encode($settings, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), LOCK_EX);
}
