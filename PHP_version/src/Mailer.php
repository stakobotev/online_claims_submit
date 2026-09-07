<?php
declare(strict_types=1);

namespace App;

/**
 * Email sending. Renders the Handlebars-style templates from /emails, records
 * every message in the "EmailOutbox" table (so the audit trail matches the
 * original app), and sends synchronously over SMTP during the web request
 * (per the chosen delivery strategy for restricted hosting).
 *
 * A minimal SMTP client is implemented in raw PHP so no Composer package is
 * required. Supports AUTH LOGIN and optional TLS/SSL.
 */
final class Mailer
{
    /**
     * Render + record + send an email.
     *
     * @param string $template            template base name in /emails
     * @param string $to                  recipient address
     * @param string $subject             subject line
     * @param array  $data                template variables
     * @param ?string $relatedComplaintId FK for the outbox row
     * @param ?string $relatedUserId      FK for the outbox row
     */
    public static function send(
        string $template,
        string $to,
        string $subject,
        array $data = [],
        ?string $relatedComplaintId = null,
        ?string $relatedUserId = null,
    ): void {
        $html = self::render($template, 'html', $data);
        $text = self::render($template, 'txt', $data);

        $fromEmail = (string) cfg('MAIL_FROM_EMAIL', 'no-reply@localhost');
        $fromName  = (string) cfg('MAIL_FROM_NAME', 'Vallentin Claims');
        $from      = "{$fromName} <{$fromEmail}>";

        $id = Ids::uuid();
        Database::run(
            'INSERT INTO "EmailOutbox"
                ("id","toAddress","fromAddress","subject","bodyHtml","bodyText","template",
                 "relatedComplaintId","relatedUserId","status","attempts","nextAttemptAt","createdAt")
             VALUES (:id,:to,:from,:subject,:html,:text,:template,:rc,:ru,\'pending\',0,now(),now())',
            [
                'id' => $id, 'to' => $to, 'from' => $from, 'subject' => $subject,
                'html' => $html, 'text' => $text, 'template' => $template,
                'rc' => $relatedComplaintId, 'ru' => $relatedUserId,
            ],
        );

        try {
            self::deliver($from, $fromEmail, $to, $subject, $html, $text);
            Database::run(
                'UPDATE "EmailOutbox" SET "status"=\'sent\', "attempts"="attempts"+1,
                    "lastAttemptAt"=now(), "sentAt"=now() WHERE "id"=:id',
                ['id' => $id],
            );
        } catch (\Throwable $e) {
            Database::run(
                'UPDATE "EmailOutbox" SET "status"=\'failed\', "attempts"="attempts"+1,
                    "lastAttemptAt"=now(), "lastError"=:err WHERE "id"=:id',
                ['id' => $id, 'err' => $e->getMessage()],
            );
            // Do not surface SMTP failures to the end user; the message is queued.
            error_log('[Mailer] delivery failed: ' . $e->getMessage());
        }
    }

    // ---------------------------------------------------------------------
    // Template rendering (subset of Handlebars: {{var}} and {{#if x}}..{{/if}})
    // ---------------------------------------------------------------------
    public static function render(string $template, string $ext, array $data): string
    {
        $path = VLC_ROOT . '/emails/' . $template . '.' . $ext;
        $src = is_file($path) ? (string) file_get_contents($path) : '';

        // {{#if key}}A{{else}}B{{/if}}
        $src = preg_replace_callback(
            '/\{\{#if\s+(\w+)\}\}(.*?)(?:\{\{else\}\}(.*?))?\{\{\/if\}\}/s',
            static function ($m) use ($data) {
                $truthy = !empty($data[$m[1]]);
                return $truthy ? $m[2] : ($m[3] ?? '');
            },
            $src,
        ) ?? $src;

        // {{var}}  (html-escape for .html; raw for .txt)
        $src = preg_replace_callback('/\{\{\s*(\w+)\s*\}\}/', static function ($m) use ($data, $ext) {
            $val = (string) ($data[$m[1]] ?? '');
            return $ext === 'html'
                ? htmlspecialchars($val, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8')
                : $val;
        }, $src) ?? $src;

        return $src;
    }

    // ---------------------------------------------------------------------
    // Minimal SMTP client
    // ---------------------------------------------------------------------
    private static function deliver(
        string $from,
        string $fromEmail,
        string $to,
        string $subject,
        string $html,
        string $text,
    ): void {
        $host = (string) cfg('SMTP_HOST', 'localhost');
        $port = (int) cfg('SMTP_PORT', 25);
        $user = (string) cfg('SMTP_USER', '');
        $pass = (string) cfg('SMTP_PASSWORD', '');
        $secure = strtolower((string) cfg('SMTP_SECURE', '')); // '', 'tls', 'ssl'

        $transport = $secure === 'ssl' ? "ssl://{$host}" : $host;
        $fp = @stream_socket_client("{$transport}:{$port}", $errno, $errstr, 15);
        if (!$fp) {
            throw new \RuntimeException("SMTP connect failed: {$errstr} ({$errno})");
        }
        stream_set_timeout($fp, 15);

        $read = static function () use ($fp): string {
            $data = '';
            while (($line = fgets($fp, 515)) !== false) {
                $data .= $line;
                if (isset($line[3]) && $line[3] === ' ') break;
            }
            return $data;
        };
        $cmd = static function (string $c, array $ok) use ($fp, $read): void {
            fwrite($fp, $c . "\r\n");
            $resp = $read();
            $code = (int) substr($resp, 0, 3);
            if (!in_array($code, $ok, true)) {
                throw new \RuntimeException("SMTP error after \"{$c}\": {$resp}");
            }
        };

        $read(); // greeting
        $ehlo = 'EHLO ' . (gethostname() ?: 'localhost');
        $cmd($ehlo, [250]);

        if ($secure === 'tls') {
            $cmd('STARTTLS', [220]);
            if (!stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                throw new \RuntimeException('STARTTLS negotiation failed');
            }
            $cmd($ehlo, [250]);
        }

        if ($user !== '') {
            $cmd('AUTH LOGIN', [334]);
            $cmd(base64_encode($user), [334]);
            $cmd(base64_encode($pass), [235]);
        }

        $cmd('MAIL FROM:<' . $fromEmail . '>', [250]);
        $cmd('RCPT TO:<' . $to . '>', [250, 251]);
        $cmd('DATA', [354]);

        $boundary = 'vlc-' . bin2hex(random_bytes(8));
        $headers = [
            'From: ' . $from,
            'To: ' . $to,
            'Subject: ' . self::encodeHeader($subject),
            'MIME-Version: 1.0',
            'Date: ' . date('r'),
            'Content-Type: multipart/alternative; boundary="' . $boundary . '"',
        ];
        $body = implode("\r\n", $headers) . "\r\n\r\n"
            . '--' . $boundary . "\r\n"
            . "Content-Type: text/plain; charset=UTF-8\r\n"
            . "Content-Transfer-Encoding: 8bit\r\n\r\n"
            . self::dotStuff($text) . "\r\n"
            . '--' . $boundary . "\r\n"
            . "Content-Type: text/html; charset=UTF-8\r\n"
            . "Content-Transfer-Encoding: 8bit\r\n\r\n"
            . self::dotStuff($html) . "\r\n"
            . '--' . $boundary . "--\r\n";

        fwrite($fp, $body . "\r\n.\r\n");
        $resp = $read();
        if ((int) substr($resp, 0, 3) !== 250) {
            throw new \RuntimeException('SMTP DATA rejected: ' . $resp);
        }
        fwrite($fp, "QUIT\r\n");
        fclose($fp);
    }

    private static function encodeHeader(string $value): string
    {
        return preg_match('/[^\x20-\x7e]/', $value)
            ? '=?UTF-8?B?' . base64_encode($value) . '?='
            : $value;
    }

    /** Escape leading dots per RFC 5321. */
    private static function dotStuff(string $body): string
    {
        $body = str_replace("\r\n", "\n", $body);
        $body = str_replace("\n", "\r\n", $body);
        return preg_replace('/^\./m', '..', $body) ?? $body;
    }
}
