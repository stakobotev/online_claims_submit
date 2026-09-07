<?php
declare(strict_types=1);

namespace App;

/**
 * Google OAuth 2.0 (Authorization Code flow) implemented with plain curl —
 * no Composer dependency. Replaces the passport-google-oauth20 strategy.
 */
final class GoogleOAuth
{
    public static function configured(): bool
    {
        return (string) cfg('GOOGLE_CLIENT_ID', '') !== ''
            && (string) cfg('GOOGLE_CLIENT_SECRET', '') !== '';
    }

    /** Build the consent-screen URL and stash an anti-forgery state token. */
    public static function authUrl(?string $returnTo = null): string
    {
        $state = Ids::randomToken(16);
        $_SESSION['_oauth_state'] = $state;
        $_SESSION['_oauth_return'] = $returnTo ?: '/';

        $params = [
            'client_id'     => (string) cfg('GOOGLE_CLIENT_ID', ''),
            'redirect_uri'  => (string) cfg('GOOGLE_REDIRECT_URL', ''),
            'response_type' => 'code',
            'scope'         => 'openid email profile',
            'state'         => $state,
            'access_type'   => 'online',
            'prompt'        => 'select_account',
        ];
        return 'https://accounts.google.com/o/oauth2/v2/auth?' . http_build_query($params);
    }

    public static function checkState(?string $state): bool
    {
        $ok = is_string($state)
            && !empty($_SESSION['_oauth_state'])
            && hash_equals($_SESSION['_oauth_state'], $state);
        unset($_SESSION['_oauth_state']);
        return $ok;
    }

    public static function returnTo(): string
    {
        $to = $_SESSION['_oauth_return'] ?? '/';
        unset($_SESSION['_oauth_return']);
        return is_string($to) ? $to : '/';
    }

    /**
     * Exchange the authorization code for the user's profile.
     * @return array{sub:string,email:string,name:?string,email_verified:bool}
     */
    public static function fetchProfile(string $code): array
    {
        $token = self::post('https://oauth2.googleapis.com/token', [
            'code'          => $code,
            'client_id'     => (string) cfg('GOOGLE_CLIENT_ID', ''),
            'client_secret' => (string) cfg('GOOGLE_CLIENT_SECRET', ''),
            'redirect_uri'  => (string) cfg('GOOGLE_REDIRECT_URL', ''),
            'grant_type'    => 'authorization_code',
        ]);
        if (empty($token['access_token'])) {
            throw new \RuntimeException('Token exchange failed');
        }

        $ch = curl_init('https://openidconnect.googleapis.com/v1/userinfo');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => ['Authorization: Bearer ' . $token['access_token']],
            CURLOPT_TIMEOUT        => 10,
        ]);
        $raw = curl_exec($ch);
        curl_close($ch);
        $info = json_decode((string) $raw, true);
        if (!is_array($info) || empty($info['sub']) || empty($info['email'])) {
            throw new \RuntimeException('Failed to fetch Google profile');
        }

        return [
            'sub'            => (string) $info['sub'],
            'email'          => (string) $info['email'],
            'name'           => isset($info['name']) ? (string) $info['name'] : null,
            'email_verified' => !empty($info['email_verified']),
        ];
    }

    private static function post(string $url, array $fields): array
    {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => http_build_query($fields),
            CURLOPT_TIMEOUT        => 10,
        ]);
        $raw = curl_exec($ch);
        curl_close($ch);
        $data = json_decode((string) $raw, true);
        return is_array($data) ? $data : [];
    }
}
