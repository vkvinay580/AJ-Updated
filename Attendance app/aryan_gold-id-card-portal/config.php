<?php
// Update these values before deployment.
return [
    'app_name' => 'Aryan Gold ID Card Portal',
    'base_url' => 'http://localhost:8081',
    'timezone' => 'Asia/Kolkata',
    'db' => [
        'host' => '127.0.0.1',
        'port' => '3306',
        'name' => 'aryan_gold_id_portal',
        'user' => 'root',
        'pass' => '',
        'charset' => 'utf8mb4',
    ],
    'company' => [
        'name' => 'Aryan Gold Company',
        'website' => 'www.aryan_goldgoldcompany.com',
        'address' => 'Building no 1, Indian Express Building, 4th Floor, Balekundri Circle, Bengaluru, Karnataka 560001',
        'emergency_phone' => '+91 8880 300 300',
    ],
    'security' => [
        'max_photo_mb' => 3,
        'allowed_photo_mime' => ['image/jpeg', 'image/png', 'image/webp'],
    ],
];
