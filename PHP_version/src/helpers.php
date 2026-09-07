<?php
declare(strict_types=1);

/**
 * Global view + request helpers. Kept procedural so views can call them freely.
 */

/** HTML-escape a string for safe output. */
function e(?string $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

/** Build an absolute URL under the app base. */
function url(string $path = '/'): string
{
    $base = rtrim((string) cfg('PUBLIC_BASE_URL', ''), '/');
    if ($path === '' || $path[0] !== '/') {
        $path = '/' . $path;
    }
    return $base . $path;
}

/** Translate a dotted i18n key, interpolating {{vars}}. */
function t(string $key, array $vars = []): string
{
    return \App\I18n::t($key, $vars);
}

/** Current locale code. */
function locale(): string
{
    return \App\I18n::locale();
}

/** Issue a redirect and stop. */
function redirect(string $path): never
{
    $location = str_starts_with($path, 'http') ? $path : url($path);
    header('Location: ' . $location);
    exit;
}

/** Render a hidden CSRF input field. */
function csrf_field(): string
{
    return '<input type="hidden" name="_csrf" value="' . e(\App\Csrf::token()) . '">';
}

/** Store a one-shot flash message. */
function flash(string $type, string $message): void
{
    $_SESSION['_flash'][] = ['type' => $type, 'message' => $message];
}

/** Pull and clear all flash messages. */
function take_flashes(): array
{
    $flashes = $_SESSION['_flash'] ?? [];
    unset($_SESSION['_flash']);
    return $flashes;
}

/** Remember submitted form values (for repopulating after validation errors). */
function flash_old(array $values): void
{
    $_SESSION['_old'] = $values;
}

/** Read a previously-submitted value. */
function old(string $key, string $default = ''): string
{
    return isset($_SESSION['_old'][$key]) ? (string) $_SESSION['_old'][$key] : $default;
}

/** Stash validation errors then redirect back. */
function back_with_errors(array $errors, array $old = []): never
{
    $_SESSION['_errors'] = $errors;
    if ($old) {
        flash_old($old);
    }
    $ref = $_SERVER['HTTP_REFERER'] ?? url('/');
    header('Location: ' . $ref);
    exit;
}

/** Pull the current request's validation errors (leaves _old for old()). */
function take_errors(): array
{
    $errors = $_SESSION['_errors'] ?? [];
    unset($_SESSION['_errors']);
    return $errors;
}

/** Interpret a PostgreSQL boolean, which PDO may return as 't'/'f' strings. */
function pgbool(mixed $value): bool
{
    if (is_bool($value)) return $value;
    if (is_int($value))  return $value !== 0;
    return in_array(strtolower((string) $value), ['t', 'true', '1', 'yes', 'on'], true);
}

/** Get error text for a field from a supplied error bag. */
function err(array $errors, string $field): string
{
    return isset($errors[$field]) ? (string) $errors[$field] : '';
}

/** Currently authenticated user array or null. */
function current_user(): ?array
{
    return \App\Auth::user();
}

function is_admin(): bool
{
    $u = current_user();
    return $u !== null && ($u['role'] ?? '') === 'admin';
}

/** Requesting client IP (best effort). */
function client_ip(): ?string
{
    return $_SERVER['REMOTE_ADDR'] ?? null;
}

function user_agent(): ?string
{
    return $_SERVER['HTTP_USER_AGENT'] ?? null;
}

/** Render a view file inside a layout, returning nothing (echoes). */
function view(string $template, array $data = [], string $layout = 'app'): void
{
    extract($data, EXTR_SKIP);
    // Session-stashed errors/flashes are the default, but a controller may pass
    // its own 'errors' in $data to re-render a form inline.
    if (!isset($errors)) {
        $errors = take_errors();
    } else {
        take_errors(); // still clear any stale session copy
    }
    $flashes = take_flashes();
    ob_start();
    require VLC_ROOT . '/views/' . $template . '.php';
    $content = ob_get_clean();
    require VLC_ROOT . '/views/layouts/' . $layout . '.php';
    // Old input is only needed for the render we just produced.
    unset($_SESSION['_old']);
}

/** Human-readable byte size. */
function human_bytes(int $bytes): string
{
    $units = ['B', 'KB', 'MB', 'GB'];
    $i = 0;
    $n = (float) $bytes;
    while ($n >= 1024 && $i < count($units) - 1) {
        $n /= 1024;
        $i++;
    }
    return round($n, $i === 0 ? 0 : 1) . ' ' . $units[$i];
}

/** Format an ISO/timestamp string for display. */
function fmt_date(?string $value, bool $withTime = false): string
{
    if (!$value) {
        return '—';
    }
    try {
        $dt = new DateTime($value);
    } catch (\Throwable) {
        return e($value);
    }
    return $dt->format($withTime ? 'Y-m-d H:i' : 'Y-m-d');
}

/** Map a complaint status to a badge CSS modifier. */
function status_variant(string $status): string
{
    return match ($status) {
        'closed', 'approved', 'forwarded' => 'success',
        'rejected'                        => 'danger',
        'pending_review'                  => 'warning',
        default                           => 'info',
    };
}

/** Query-string builder preserving/overriding params. */
function qs(array $overrides = []): string
{
    $params = array_merge($_GET, $overrides);
    $params = array_filter($params, static fn ($v) => $v !== '' && $v !== null);
    return $params ? '?' . http_build_query($params) : '';
}
