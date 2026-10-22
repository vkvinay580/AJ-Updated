<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'ok' => false,
        'message' => 'Method not allowed. Use POST.',
    ]);
    exit;
}

try {
    $vault = require __DIR__.'/vault.php';
    $secret = static function (string $name) use ($vault): string {
        $value = $vault[$name] ?? getenv($name);

        return is_scalar($value) ? trim((string) $value) : '';
    };

    $DB_HOST = $secret('DB_HOST');
    $DB_NAME = $secret('DB_NAME');
    $DB_USER = $secret('DB_USER');
    $DB_PASS = $secret('DB_PASSWORD');
    $SYNC_TOKEN = $secret('ARYANGOLD_EMPLOYEE_SYNC_TOKEN');

    if (in_array('', [$DB_HOST, $DB_NAME, $DB_USER, $DB_PASS, $SYNC_TOKEN], true)) {
        throw new RuntimeException('Required employee-sync secrets are unavailable.');
    }
} catch (Throwable) {
    http_response_code(503);
    echo json_encode([
        'ok' => false,
        'message' => 'Employee sync is temporarily unavailable.',
    ]);
    exit;
}

$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';

if ($authHeader === '' && function_exists('getallheaders')) {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
}

if (!preg_match('/Bearer\s+(.+)/i', $authHeader, $matches)) {
    http_response_code(401);
    echo json_encode([
        'ok' => false,
        'message' => 'Missing bearer token.',
    ]);
    exit;
}

$incomingToken = trim($matches[1]);

if ($incomingToken !== $SYNC_TOKEN) {
    http_response_code(401);
    echo json_encode([
        'ok' => false,
        'message' => 'Invalid token.',
    ]);
    exit;
}

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);

if (!is_array($data)) {
    http_response_code(400);
    echo json_encode([
        'ok' => false,
        'message' => 'Invalid JSON payload.',
    ]);
    exit;
}

function clean_string($value, int $max = 255): string
{
    $value = trim((string) ($value ?? ''));

    if (function_exists('mb_substr')) {
        return mb_substr($value, 0, $max);
    }

    return substr($value, 0, $max);
}

function nullable_string($value, int $max = 255): ?string
{
    $value = clean_string($value, $max);

    return $value === '' ? null : $value;
}

function nullable_int($value): ?int
{
    if ($value === null || $value === '') {
        return null;
    }

    if (!is_numeric($value)) {
        return null;
    }

    return (int) $value;
}

$empId = clean_string($data['empId'] ?? '');
$name = clean_string($data['name'] ?? '');
$contact = clean_string($data['contact'] ?? '');
$mailId = clean_string($data['mailId'] ?? '');

if ($empId === '' || $name === '' || $contact === '' || $mailId === '') {
    http_response_code(422);
    echo json_encode([
        'ok' => false,
        'message' => 'empId, name, contact, mailId are required.',
    ]);
    exit;
}

$branchId = nullable_string($data['branchId'] ?? null);
$address = nullable_string($data['address'] ?? null);
$location = nullable_string($data['location'] ?? null);
$designation = nullable_string($data['designation'] ?? null);
$photo = nullable_string($data['photo'] ?? null);
$rating = nullable_int($data['rating'] ?? 0);
$status = nullable_string($data['status'] ?? null) ?? 'Active';
$salary = nullable_int($data['salary'] ?? null);
$advance = nullable_int($data['advance'] ?? 0);

if ($advance === null) {
    $advance = 0;
}

if ($rating === null) {
    $rating = 0;
}

try {
    $pdo = new PDO(
        "mysql:host={$DB_HOST};dbname={$DB_NAME};charset=utf8mb4",
        $DB_USER,
        $DB_PASS,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'message' => 'Database connection failed.',
    ]);
    exit;
}

try {
    $checkStmt = $pdo->prepare('SELECT id FROM employee WHERE empId = :empId LIMIT 1');
    $checkStmt->execute([
        ':empId' => $empId,
    ]);

    $existing = $checkStmt->fetch();

    if ($existing) {
        $updateStmt = $pdo->prepare(
            'UPDATE employee SET
                name = :name,
                contact = :contact,
                branchId = :branchId,
                mailId = :mailId,
                address = :address,
                location = :location,
                designation = :designation,
                photo = :photo,
                rating = :rating,
                status = :status,
                salary = :salary,
                advance = :advance
            WHERE empId = :empId'
        );

        $updateStmt->execute([
            ':name' => $name,
            ':contact' => $contact,
            ':branchId' => $branchId,
            ':mailId' => $mailId,
            ':address' => $address ?? '',
            ':location' => $location ?? '',
            ':designation' => $designation,
            ':photo' => $photo ?? '',
            ':rating' => $rating,
            ':status' => $status,
            ':salary' => $salary,
            ':advance' => $advance,
            ':empId' => $empId,
        ]);

        echo json_encode([
            'ok' => true,
            'action' => 'updated',
            'empId' => $empId,
        ]);
        exit;
    }

    $insertStmt = $pdo->prepare(
        'INSERT INTO employee (
            empId, name, contact, branchId, mailId, address, location,
            designation, photo, rating, status, salary, advance
        ) VALUES (
            :empId, :name, :contact, :branchId, :mailId, :address, :location,
            :designation, :photo, :rating, :status, :salary, :advance
        )'
    );

    $insertStmt->execute([
        ':empId' => $empId,
        ':name' => $name,
        ':contact' => $contact,
        ':branchId' => $branchId,
        ':mailId' => $mailId,
        ':address' => $address ?? '',
        ':location' => $location ?? '',
        ':designation' => $designation,
        ':photo' => $photo ?? '',
        ':rating' => $rating,
        ':status' => $status,
        ':salary' => $salary,
        ':advance' => $advance,
    ]);

    echo json_encode([
        'ok' => true,
        'action' => 'inserted',
        'empId' => $empId,
    ]);
    exit;
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'message' => 'Employee sync failed.',
        'error' => $e->getMessage(),
    ]);
    exit;
}
