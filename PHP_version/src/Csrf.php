<?php
declare(strict_types=1);

namespace App;

/**
 * Per-session CSRF token. Every state-changing request (POST) must include a
 * matching `_csrf` field. The router enforces this for non-GET methods.
 */
final class Csrf
{
    public static function token(): string
    {
        if (empty($_SESSION['_csrf'])) {
            $_SESSION['_csrf'] = bin2hex(random_bytes(32));
        }
        return $_SESSION['_csrf'];
    }

    public static function check(?string $token): bool
    {
        return is_string($token)
            && !empty($_SESSION['_csrf'])
            && hash_equals($_SESSION['_csrf'], $token);
    }
}
