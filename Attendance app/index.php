<?php

declare(strict_types=1);

$backendPublicPath = __DIR__ . DIRECTORY_SEPARATOR . 'Backend' . DIRECTORY_SEPARATOR . 'public';
$requestUriPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$scriptName = str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? ''));
$requestPath = is_string($requestUriPath) ? $requestUriPath : '/';

if ($scriptName !== '' && $scriptName !== '/' && str_starts_with($requestPath, $scriptName)) {
    $requestPath = substr($requestPath, strlen($scriptName));
}

$requestPath = '/' . ltrim($requestPath, '/');
$normalizedPath = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, ltrim(urldecode($requestPath), '/'));
$candidatePath = realpath($backendPublicPath . DIRECTORY_SEPARATOR . $normalizedPath);

if (
    $candidatePath !== false
    && str_starts_with($candidatePath, realpath($backendPublicPath) ?: $backendPublicPath)
    && is_file($candidatePath)
) {
    $extension = strtolower(pathinfo($candidatePath, PATHINFO_EXTENSION));
    $mimeTypes = [
        'css' => 'text/css; charset=UTF-8',
        'gif' => 'image/gif',
        'html' => 'text/html; charset=UTF-8',
        'ico' => 'image/x-icon',
        'js' => 'application/javascript; charset=UTF-8',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'json' => 'application/json; charset=UTF-8',
        'map' => 'application/json; charset=UTF-8',
        'png' => 'image/png',
        'svg' => 'image/svg+xml',
        'txt' => 'text/plain; charset=UTF-8',
        'wasm' => 'application/wasm',
        'webp' => 'image/webp',
        'woff' => 'font/woff',
        'woff2' => 'font/woff2',
    ];

    if (isset($mimeTypes[$extension])) {
        header('Content-Type: ' . $mimeTypes[$extension]);
    }

    header('Content-Length: ' . (string) filesize($candidatePath));
    readfile($candidatePath);
    exit;
}

require $backendPublicPath . DIRECTORY_SEPARATOR . 'index.php';
