<?php
declare(strict_types=1);

namespace App;

/**
 * hCaptcha server-side verification. Mirrors backend/src/lib/captcha.ts.
 * If no secret is configured, verification is skipped (dev convenience).
 */
final class Captcha
{
    public static function siteKey(): string
    {
        return (string) cfg('HCAPTCHA_SITE_KEY', '');
    }

    public static function enabled(): bool
    {
        return self::siteKey() !== '' && (string) cfg('HCAPTCHA_SECRET', '') !== '';
    }

    public static function verify(?string $token): bool
    {
        $secret = (string) cfg('HCAPTCHA_SECRET', '');
        if ($secret === '') {
            return true; // not configured -> do not block
        }
        if (!$token) {
            return false;
        }

        $post = http_build_query([
            'secret'   => $secret,
            'response' => $token,
            'remoteip' => client_ip() ?? '',
        ]);

        $ch = curl_init('https://hcaptcha.com/siteverify');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $post,
            CURLOPT_TIMEOUT        => 10,
        ]);
        $response = curl_exec($ch);
        curl_close($ch);

        if ($response === false) {
            return false;
        }
        $data = json_decode((string) $response, true);
        return is_array($data) && !empty($data['success']);
    }
}
