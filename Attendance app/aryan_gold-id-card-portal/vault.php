<?php

declare(strict_types=1);

function id_card_vault_request(string $url, string $method, ?array $body, ?string $token, int $timeout): array
{
    if (!function_exists('curl_init')) throw new RuntimeException('The PHP cURL extension is required for Vault integration.');
    $handle = curl_init($url);
    $headers = ['Accept: application/json'];
    if ($token !== null) $headers[] = 'X-Vault-Token: ' . $token;
    if ($body !== null) {
        $headers[] = 'Content-Type: application/json';
        curl_setopt($handle, CURLOPT_POSTFIELDS, json_encode($body, JSON_THROW_ON_ERROR));
    }
    curl_setopt_array($handle, [
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => $timeout,
        CURLOPT_TIMEOUT => $timeout,
        CURLOPT_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS,
    ]);
    $raw = curl_exec($handle);
    $status = (int) curl_getinfo($handle, CURLINFO_RESPONSE_CODE);
    curl_close($handle);
    if ($raw === false || $status < 200 || $status >= 300) throw new RuntimeException("Vault request failed with HTTP {$status}.");
    $decoded = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
    return is_array($decoded) ? $decoded : [];
}

function id_card_vault_secrets(): array
{
    $required = getenv('VAULT_REQUIRED') === 'true';
    if (getenv('VAULT_ENABLED') === 'false') {
        if ($required) throw new RuntimeException('Vault cannot be disabled when VAULT_REQUIRED=true.');
        return [];
    }
    $application = trim((string) (getenv('VAULT_APPLICATION') ?: 'id-card-portal'));
    if (preg_match('/^[A-Za-z0-9_-]+$/', $application) !== 1) throw new RuntimeException('VAULT_APPLICATION contains unsupported characters.');
    $home = rtrim((string) (getenv('HOME') ?: dirname(__DIR__, 3)), '/');
    $directory = $home . '/.config/aryangold-vault/' . $application;
    $roleFile = (string) (getenv('VAULT_ROLE_ID_FILE') ?: $directory . '/role-id');
    $secretFile = (string) (getenv('VAULT_SECRET_ID_FILE') ?: $directory . '/secret-id');
    if (!is_file($roleFile) && !is_file($secretFile) && !$required) return [];
    if (!is_file($roleFile) || !is_file($secretFile)) throw new RuntimeException('Vault AppRole credential files are incomplete.');
    foreach ([$roleFile, $secretFile] as $file) {
        $permissions = fileperms($file);
        if ($permissions !== false && ($permissions & 0o077) !== 0) throw new RuntimeException('Vault credential files must be owner-only.');
    }
    $roleId = trim((string) file_get_contents($roleFile));
    $secretId = trim((string) file_get_contents($secretFile));
    if ($roleId === '' || $secretId === '') throw new RuntimeException('Vault AppRole credential files must not be empty.');
    $address = rtrim((string) (getenv('VAULT_ADDR') ?: 'http://127.0.0.1:8200'), '/');
    $addressParts = parse_url($address);
    if (!is_array($addressParts) || !in_array($addressParts['scheme'] ?? '', ['http', 'https'], true) || isset($addressParts['user']) || isset($addressParts['pass']) || empty($addressParts['host'])) {
        throw new RuntimeException('VAULT_ADDR must be an HTTP(S) URL without credentials.');
    }
    $secretPath = ltrim((string) (getenv('VAULT_SECRET_PATH') ?: 'secret/data/apps/' . $application), '/');
    if (str_contains($secretPath, '..') || preg_match('/^[A-Za-z0-9_.\/-]+$/', $secretPath) !== 1) throw new RuntimeException('VAULT_SECRET_PATH contains unsupported characters.');
    $timeout = min(60, max(1, (int) (getenv('VAULT_TIMEOUT_SECONDS') ?: 5)));
    $login = id_card_vault_request($address . '/v1/auth/approle/login', 'POST', [
        'role_id' => $roleId,
        'secret_id' => $secretId,
    ], null, $timeout);
    $token = $login['auth']['client_token'] ?? null;
    if (!is_string($token) || $token === '') throw new RuntimeException('Vault AppRole login returned no client token.');
    try {
        $response = id_card_vault_request($address . '/v1/' . $secretPath, 'GET', null, $token, $timeout);
        $values = $response['data']['data'] ?? null;
        if (!is_array($values)) throw new RuntimeException('Vault KV response did not contain a secret object.');
        return $values;
    } finally {
        try { id_card_vault_request($address . '/v1/auth/token/revoke-self', 'POST', [], $token, $timeout); } catch (RuntimeException) {}
    }
}

return id_card_vault_secrets();
