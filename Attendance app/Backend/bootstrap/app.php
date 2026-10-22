<?php

$helpersPath = dirname(__DIR__).'/app/Support/helpers.php';

if (is_file($helpersPath)) {
    require_once $helpersPath;
}

// Laravel normally reads .env after this file returns. Vault connection metadata
// must be available first so the secret loader can fail closed before config boots.
Dotenv\Dotenv::createImmutable(dirname(__DIR__))->safeLoad();
App\Support\VaultEnvironment::load();


$app = new Illuminate\Foundation\Application(
    $_ENV['APP_BASE_PATH'] ?? dirname(__DIR__)
);



$app->singleton(
    Illuminate\Contracts\Http\Kernel::class,
    App\Http\Kernel::class
);

$app->singleton(
    Illuminate\Contracts\Console\Kernel::class,
    App\Console\Kernel::class
);

$app->singleton(
    Illuminate\Contracts\Debug\ExceptionHandler::class,
    App\Exceptions\Handler::class
);


return $app;
