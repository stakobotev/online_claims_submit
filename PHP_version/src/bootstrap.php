<?php
declare(strict_types=1);

/**
 * Application bootstrap: loads config, autoloader, starts session, sets up i18n.
 * Included by public/index.php (the single front controller).
 */

error_reporting(E_ALL);

define('VLC_ROOT', dirname(__DIR__));

// ---------------------------------------------------------------------------
// Config loading. config/config.php wins; individual OS env vars override keys
// when present (useful when a host DOES expose env vars).
// ---------------------------------------------------------------------------
$configFile = VLC_ROOT . '/config/config.php';
if (!is_file($configFile)) {
    http_response_code(500);
    echo 'Missing config/config.php. Copy config/config.example.php to config/config.php and edit it.';
    exit;
}
/** @var array<string,mixed> $CONFIG */
$CONFIG = require $configFile;

/**
 * Read a config value, allowing an OS environment variable of the same name to
 * override it. Env values are strings; callers cast as needed.
 */
function cfg(string $key, mixed $default = null): mixed
{
    global $CONFIG;
    $env = getenv($key);
    if ($env !== false && $env !== '') {
        // Coerce common scalar shapes.
        if ($env === 'true')  return true;
        if ($env === 'false') return false;
        if (is_numeric($env)) return $env + 0;
        return $env;
    }
    return $CONFIG[$key] ?? $default;
}

if (cfg('APP_ENV') === 'production') {
    ini_set('display_errors', '0');
} else {
    ini_set('display_errors', '1');
}

// ---------------------------------------------------------------------------
// Tiny PSR-4-ish autoloader for the App\ namespace under src/.
// ---------------------------------------------------------------------------
spl_autoload_register(function (string $class): void {
    $prefix = 'App\\';
    if (!str_starts_with($class, $prefix)) {
        return;
    }
    $relative = substr($class, strlen($prefix));
    $path = __DIR__ . '/' . str_replace('\\', '/', $relative) . '.php';
    if (is_file($path)) {
        require $path;
    }
});

require __DIR__ . '/helpers.php';

// ---------------------------------------------------------------------------
// Session (server-rendered auth replaces the SPA's in-memory JWT).
// ---------------------------------------------------------------------------
session_name((string) cfg('SESSION_NAME', 'vlc_session'));
session_set_cookie_params([
    'lifetime' => (int) cfg('SESSION_LIFETIME', 604800),
    'path'     => '/',
    'secure'   => (bool) cfg('SESSION_SECURE', false),
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_start();

// ---------------------------------------------------------------------------
// i18n. Locale precedence: ?lang query -> session -> cookie -> default.
// ---------------------------------------------------------------------------
\App\I18n::init();
