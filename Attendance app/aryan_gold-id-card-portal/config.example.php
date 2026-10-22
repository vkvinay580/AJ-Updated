<?php
$vault = require __DIR__ . '/vault.php';

return [
    'app_name' => 'Aryan Gold ID Card Portal',
    'base_url' => 'http://localhost/aryan_gold-id-card-portal',
    'timezone' => 'Asia/Kolkata',
    'db' => [
        'host' => $vault['DB_HOST'] ?? '127.0.0.1',
        'port' => $vault['DB_PORT'] ?? '3306',
        'name' => $vault['DB_DATABASE'] ?? 'aryan_gold_id_portal',
        'user' => $vault['DB_USERNAME'] ?? 'root',
        'pass' => $vault['DB_PASSWORD'] ?? '',
        'charset' => 'utf8mb4',
    ],
    'company' => [
        'name' => 'Aryan Gold Company',
        'website' => 'www.aryan_goldgoldcompany.com',
        'address' => 'Aryan Gold Company, Building No. 1, Indian Express Building, 4th Floor, Balekundri Circle, Bengaluru, Karnataka 560001',
        'emergency_phone' => '+91 00000 00000',
    ],
    'security' => [
        'max_photo_mb' => 3,
        'allowed_photo_mime' => ['image/jpeg', 'image/png', 'image/webp'],
    ],
];
