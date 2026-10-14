<?php

return [

    'carto' => [
        'api_key' => env('CARTO_API_KEY', ''),
    ],

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'mailgun' => [
        'domain' => env('MAILGUN_DOMAIN'),
        'secret' => env('MAILGUN_SECRET'),
        'endpoint' => env('MAILGUN_ENDPOINT', 'api.mailgun.net'),
        'scheme' => 'https',
    ],

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'fcm' => [
        'project_id' => env('FIREBASE_PROJECT_ID'),
        'service_account' => env('FIREBASE_SERVICE_ACCOUNT', storage_path('app/firebase/service-account.json')),
    ],

    'aryangold_employee_sync' => [
        // The AJ portal now reads the Attendance business API directly. Keep the
        // legacy outbound sync disabled unless a compatible endpoint is supplied.
        'url' => env('ARYANGOLD_EMPLOYEE_SYNC_URL', ''),
        'token' => env('ARYANGOLD_EMPLOYEE_SYNC_TOKEN'),
        'timeout' => env('ARYANGOLD_EMPLOYEE_SYNC_TIMEOUT', 15),
    ],

    'aryangold_business' => [
        'integration_key' => env('ARYANGOLD_BUSINESS_INTEGRATION_KEY'),
    ],

    'birthday_sms' => [
        'endpoint' => env('BIRTHDAY_SMS_ENDPOINT'),
        'token' => env('BIRTHDAY_SMS_TOKEN'),
        'sender_id' => env('BIRTHDAY_SMS_SENDER_ID'),
        'timeout' => env('BIRTHDAY_SMS_TIMEOUT', 15),
    ],

];
