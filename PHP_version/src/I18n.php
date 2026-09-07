<?php
declare(strict_types=1);

namespace App;

/**
 * Minimal i18n loader. Reads JSON translation bundles (mirrors the React app's
 * public/locales/{lng}/common.json) and resolves dotted keys with {{var}}
 * interpolation. Locale is stored in the session + a cookie.
 */
final class I18n
{
    private static string $locale = 'en';
    /** @var array<string,mixed> */
    private static array $messages = [];

    public static function init(): void
    {
        $supported = (array) cfg('LOCALES', ['en']);
        $default   = (string) cfg('DEFAULT_LOCALE', 'en');

        $requested = $_GET['lang'] ?? ($_SESSION['_locale'] ?? ($_COOKIE['vlc_lang'] ?? $default));
        if (!in_array($requested, $supported, true)) {
            $requested = $default;
        }

        // Persist an explicit choice.
        if (isset($_GET['lang']) && in_array($_GET['lang'], $supported, true)) {
            $_SESSION['_locale'] = $_GET['lang'];
            setcookie('vlc_lang', $_GET['lang'], [
                'expires'  => time() + 31536000,
                'path'     => '/',
                'httponly' => false,
                'samesite' => 'Lax',
            ]);
        }

        self::$locale = (string) $requested;
        self::load(self::$locale);
    }

    private static function load(string $locale): void
    {
        $path = VLC_ROOT . '/locales/' . $locale . '.json';
        if (!is_file($path)) {
            $path = VLC_ROOT . '/locales/en.json';
        }
        $json = file_get_contents($path);
        self::$messages = $json ? (json_decode($json, true) ?: []) : [];
    }

    public static function locale(): string
    {
        return self::$locale;
    }

    /** Resolve "a.b.c" against the nested message array. */
    public static function t(string $key, array $vars = []): string
    {
        $value = self::resolve(self::$messages, explode('.', $key));
        if (!is_string($value)) {
            return $key; // fall back to the key itself if missing
        }
        foreach ($vars as $name => $v) {
            $value = str_replace('{{' . $name . '}}', (string) $v, $value);
        }
        return $value;
    }

    /**
     * Resolve nested keys while tolerating flat keys that themselves contain
     * dots (e.g. "submitted.title" living beside "submitted"). At each node we
     * first try the full remaining path as a literal key, then descend.
     */
    private static function resolve(mixed $node, array $segments): mixed
    {
        if (!is_array($node) || $segments === []) {
            return null;
        }
        $literal = implode('.', $segments);
        if (array_key_exists($literal, $node) && is_string($node[$literal])) {
            return $node[$literal];
        }
        $first = $segments[0];
        if (!array_key_exists($first, $node)) {
            return null;
        }
        if (count($segments) === 1) {
            return $node[$first];
        }
        return self::resolve($node[$first], array_slice($segments, 1));
    }
}
