<?php

namespace App\Support;

final class IdentityDetailGuard
{
    public static function permitsDirectSave(mixed $currentValue, mixed $requestedValue): bool
    {
        $current = trim((string) $currentValue);
        $requested = trim((string) $requestedValue);

        return $current === '' || hash_equals($current, $requested);
    }
}
