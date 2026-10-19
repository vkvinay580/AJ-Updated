<?php

namespace App\Casts;

class EncryptedStringOrEmpty extends EncryptedString
{
    public function get($model, string $key, $value, array $attributes): string
    {
        return parent::get($model, $key, $value, $attributes) ?? '';
    }

    public function set($model, string $key, $value, array $attributes): string
    {
        $value = trim((string) $value);

        return $value === '' ? '' : (string) parent::set($model, $key, $value, $attributes);
    }
}
