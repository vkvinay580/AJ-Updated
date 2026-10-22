<?php

namespace App\Support;

use RuntimeException;

final class VaultEnvironment
{
    public static function load(): void
    {
        $required = getenv('VAULT_REQUIRED') === 'true';
        if (getenv('VAULT_ENABLED') === 'false') {
            if ($required) {
                throw new RuntimeException('Vault cannot be disabled when VAULT_REQUIRED=true.');
            }

            return;
        }

        $application = trim((string) (getenv('VAULT_APPLICATION') ?: 'attendance'));
        if (preg_match('/^[A-Za-z0-9_-]+$/', $application) !== 1) {
            throw new RuntimeException('VAULT_APPLICATION contains unsupported characters.');
        }
        $home = rtrim((string) (getenv('HOME') ?: dirname(__DIR__, 4)), '/');
        $credentialDirectory = $home.'/.config/aryangold-vault/'.$application;
        $roleIdFile = (string) (getenv('VAULT_ROLE_ID_FILE') ?: $credentialDirectory.'/role-id');
        $secretIdFile = (string) (getenv('VAULT_SECRET_ID_FILE') ?: $credentialDirectory.'/secret-id');
        $roleExists = is_file($roleIdFile);
        $secretExists = is_file($secretIdFile);
        if (! $required && ! $roleExists && ! $secretExists) {
            return;
        }
        if (! $roleExists || ! $secretExists) {
            throw new RuntimeException('Vault AppRole credential files are incomplete.');
        }

        self::assertPrivateFile($roleIdFile);
        self::assertPrivateFile($secretIdFile);
        $roleId = trim((string) file_get_contents($roleIdFile));
        $secretId = trim((string) file_get_contents($secretIdFile));
        if ($roleId === '' || $secretId === '') {
            throw new RuntimeException('Vault AppRole credential files must not be empty.');
        }

        $address = rtrim((string) (getenv('VAULT_ADDR') ?: 'http://127.0.0.1:8200'), '/');
        self::assertSafeAddress($address);
        $secretPath = ltrim((string) (getenv('VAULT_SECRET_PATH') ?: 'secret/data/apps/'.$application), '/');
        if (str_contains($secretPath, '..') || preg_match('/^[A-Za-z0-9_.\/-]+$/', $secretPath) !== 1) {
            throw new RuntimeException('VAULT_SECRET_PATH contains unsupported characters.');
        }
        $timeout = min(60, max(1, (int) (getenv('VAULT_TIMEOUT_SECONDS') ?: 5)));

        $login = self::request($address.'/v1/auth/approle/login', 'POST', [
            'role_id' => $roleId,
            'secret_id' => $secretId,
        ], null, $timeout);
        $token = $login['auth']['client_token'] ?? null;
        if (! is_string($token) || $token === '') {
            throw new RuntimeException('Vault AppRole login returned no client token.');
        }

        try {
            $response = self::request($address.'/v1/'.$secretPath, 'GET', null, $token, $timeout);
            $values = $response['data']['data'] ?? null;
            if (! is_array($values)) {
                throw new RuntimeException('Vault KV response did not contain a secret object.');
            }
            foreach ($values as $name => $value) {
                if (! is_string($name) || preg_match('/^[A-Za-z_][A-Za-z0-9_]*$/', $name) !== 1) {
                    continue;
                }
                if (! is_scalar($value) && $value !== null) {
                    continue;
                }
                $stringValue = $value === null ? '' : (string) $value;
                putenv($name.'='.$stringValue);
                $_ENV[$name] = $stringValue;
                $_SERVER[$name] = $stringValue;
            }
        } finally {
            try {
                self::request($address.'/v1/auth/token/revoke-self', 'POST', [], $token, $timeout);
            } catch (RuntimeException) {
                // A failed explicit revocation remains bounded by the AppRole token TTL.
            }
        }
    }

    private static function assertPrivateFile(string $file): void
    {
        $permissions = fileperms($file);
        if ($permissions !== false && ($permissions & 0o077) !== 0) {
            throw new RuntimeException('Vault credential files must be readable only by their owner.');
        }
    }

    private static function assertSafeAddress(string $address): void
    {
        $parts = parse_url($address);
        if (! is_array($parts)
            || ! in_array($parts['scheme'] ?? '', ['http', 'https'], true)
            || isset($parts['user'])
            || isset($parts['pass'])
            || empty($parts['host'])) {
            throw new RuntimeException('VAULT_ADDR must be an HTTP(S) URL without credentials.');
        }
    }

    private static function request(
        string $url,
        string $method,
        ?array $body,
        ?string $token,
        int $timeout,
    ): array {
        if (! function_exists('curl_init')) {
            throw new RuntimeException('The PHP cURL extension is required for Vault integration.');
        }
        $handle = curl_init($url);
        $headers = ['Accept: application/json'];
        if ($token !== null) {
            $headers[] = 'X-Vault-Token: '.$token;
        }
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
        $error = curl_error($handle);
        curl_close($handle);
        if ($raw === false) {
            throw new RuntimeException('Vault request failed: '.$error);
        }
        if ($status < 200 || $status >= 300) {
            throw new RuntimeException('Vault request failed with HTTP '.$status.'.');
        }
        $decoded = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);

        return is_array($decoded) ? $decoded : [];
    }
}
