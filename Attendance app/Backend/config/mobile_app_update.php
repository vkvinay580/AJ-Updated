<?php

return [
    'android' => [
        'package_name' => env('APP_UPDATE_ANDROID_PACKAGE_NAME', 'aryan.attendance'),
        'latest_version' => env('APP_UPDATE_ANDROID_LATEST_VERSION', '5.0.44'),
        'latest_build_number' => (int) env('APP_UPDATE_ANDROID_LATEST_BUILD', 5045),
        'minimum_supported_build_number' => (int) env('APP_UPDATE_ANDROID_MIN_SUPPORTED_BUILD', 5045),
        'force_update' => (bool) env('APP_UPDATE_ANDROID_FORCE', true),
        'download_url' => env(
            'APP_UPDATE_ANDROID_DOWNLOAD_URL',
            'https://play.google.com/store/apps/details?id=aryan.attendance'
        ),
        'title' => env('APP_UPDATE_ANDROID_TITLE', 'Update required'),
        'message' => env(
            'APP_UPDATE_ANDROID_MESSAGE',
            'A newer version of Aryan Gold Attendance is available. Please update the app to continue.'
        ),
        'release_notes' => preg_split('/\r\n|\r|\n/', (string) env(
            'APP_UPDATE_ANDROID_RELEASE_NOTES',
            'Aadhaar and PAN numbers are locked after saving and now require approved edit access plus administrator verification for corrections.'
        )) ?: [],
    ],
];
