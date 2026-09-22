<?php
declare(strict_types=1);

/**
 * SMTP / email diagnostic. Sends one test email using the app's real Mailer
 * (same code path as verification / complaint emails) and reports the outcome
 * from the EmailOutbox table, including the exact SMTP error on failure.
 *
 * USAGE
 *   CLI (preferred — via cPanel Terminal / SSH):
 *       php sql/mailtest.php you@example.com
 *
 *   Browser (if you have no shell): temporarily copy this file into public/,
 *       visit  https://claims.thirstforlife-bg.com/mailtest.php?to=you@example.com
 *       then DELETE it afterwards.
 */

define('VLC_ROOT', dirname(__DIR__));

$configFile = VLC_ROOT . '/config/config.php';
if (!is_file($configFile)) {
    fwrite(STDERR, "Missing config/config.php\n");
    exit(1);
}
$CONFIG = require $configFile;
function cfg(string $key, mixed $default = null): mixed {
    global $CONFIG;
    $env = getenv($key);
    if ($env !== false && $env !== '') {
        if ($env === 'true') return true;
        if ($env === 'false') return false;
        if (is_numeric($env)) return $env + 0;
        return $env;
    }
    return $CONFIG[$key] ?? $default;
}
spl_autoload_register(function (string $class): void {
    if (!str_starts_with($class, 'App\\')) return;
    $path = VLC_ROOT . '/src/' . str_replace('\\', '/', substr($class, 4)) . '.php';
    if (is_file($path)) require $path;
});

// Needed by App\Mailer (client_ip/user_agent helpers).
require VLC_ROOT . '/src/helpers.php';

use App\Mailer;
use App\Database;

$cli = PHP_SAPI === 'cli';
$to = $cli ? ($argv[1] ?? '') : (string) ($_GET['to'] ?? '');
if (!$cli) header('Content-Type: text/plain; charset=utf-8');

if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
    echo "Provide a recipient email.\n  CLI:  php sql/mailtest.php you@example.com\n  Web:  ?to=you@example.com\n";
    exit(1);
}

echo "SMTP host : " . cfg('SMTP_HOST') . ':' . cfg('SMTP_PORT') . " (secure=" . (cfg('SMTP_SECURE') ?: 'none') . ")\n";
echo "SMTP user : " . (cfg('SMTP_USER') ?: '(none)') . "\n";
echo "From      : " . cfg('MAIL_FROM_NAME') . ' <' . cfg('MAIL_FROM_EMAIL') . ">\n";
echo "Sending test email to {$to} ...\n\n";

Mailer::send(
    'auth.verify_email',
    $to,
    'Thirstforlife Claims — SMTP test',
    ['name' => 'Test', 'verifyUrl' => rtrim((string) cfg('PUBLIC_BASE_URL', ''), '/') . '/'],
    null,
    null,
);

// Read back the outbox row we just created for this recipient.
$row = Database::one(
    'SELECT "status","attempts","lastError","sentAt" FROM "EmailOutbox"
      WHERE "toAddress" = :to ORDER BY "createdAt" DESC LIMIT 1',
    ['to' => $to],
);

if ($row && $row['status'] === 'sent') {
    echo "RESULT: ✅ SENT (recorded in EmailOutbox, sentAt={$row['sentAt']}).\n";
    echo "Check the recipient inbox (and spam).\n";
} else {
    echo "RESULT: ❌ FAILED.\n";
    echo "status : " . ($row['status'] ?? 'unknown') . "\n";
    echo "error  : " . ($row['lastError'] ?? '(none captured)') . "\n";
    echo "\nCommon causes: wrong SMTP_HOST/PORT, wrong mailbox password,\n";
    echo "SMTP_SECURE mismatch (465=ssl, 587=tls), or the host blocks outbound SMTP.\n";
}
