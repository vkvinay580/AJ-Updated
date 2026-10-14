<?php
return [
    'app_name' => 'Aryan Gold ID Card Portal',
    'base_url' => 'http://localhost/aryan_gold-id-card-portal',
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
        'address' => 'Aryan Gold Company, Building No. 1, Indian Express Building, 4th Floor, Balekundri Circle, Bengaluru, Karnataka 560001',
        'emergency_phone' => '+91 00000 00000',
    ],
    'security' => [
        'max_photo_mb' => 3,
        'allowed_photo_mime' => ['image/jpeg', 'image/png', 'image/webp'],
    ],
];
