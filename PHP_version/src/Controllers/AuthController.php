<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Auth;
use App\Captcha;
use App\Validator;
use App\GoogleOAuth;

final class AuthController
{
    // ---- Login -------------------------------------------------------------
    public function loginForm(array $params): void
    {
        if (Auth::check()) {
            redirect('/');
        }
        view('auth/login', [
            'title' => t('nav.login'),
            'from'  => (string) ($_GET['from'] ?? ''),
            'reset' => isset($_GET['reset']),
            'oauthError' => isset($_GET['error']),
        ], 'app');
    }

    public function login(array $params): void
    {
        $email = (string) ($_POST['email'] ?? '');
        $password = (string) ($_POST['password'] ?? '');
        $from = (string) ($_POST['from'] ?? '');

        $v = (new Validator())
            ->required('email', $email, t('auth.email'))
            ->required('password', $password, t('auth.password'));
        if ($v->fails()) {
            $this->rerenderLogin($v->errors(), $email, $from);
            return;
        }

        $result = Auth::attemptLogin($email, $password);
        if (!$result['ok']) {
            $this->rerenderLogin(['email' => t('auth.invalidCredentials')], $email, $from);
            return;
        }

        Auth::login($result['user']);
        $target = ($from !== '' && str_starts_with($from, '/')) ? $from : '/';
        redirect($target);
    }

    private function rerenderLogin(array $errors, string $email, string $from): void
    {
        flash_old(['email' => $email]);
        view('auth/login', [
            'title' => t('nav.login'), 'errors' => $errors, 'from' => $from,
            'reset' => false, 'oauthError' => false,
        ], 'app');
    }

    // ---- Register ----------------------------------------------------------
    public function registerForm(array $params): void
    {
        if (Auth::check()) {
            redirect('/');
        }
        view('auth/register', ['title' => t('auth.createAccount')], 'app');
    }

    public function register(array $params): void
    {
        $email = (string) ($_POST['email'] ?? '');
        $name = (string) ($_POST['name'] ?? '');
        $password = (string) ($_POST['password'] ?? '');
        $confirm = (string) ($_POST['passwordConfirmation'] ?? '');
        $terms = !empty($_POST['terms']);
        $marketing = !empty($_POST['marketing']);

        $v = (new Validator())
            ->email('email', $email, t('auth.email'))
            ->minLen('name', $name, 2, t('auth.name'))
            ->password('password', $password, t('auth.passwordHint'))
            ->matches('passwordConfirmation', $password, $confirm, t('auth.passwordConfirmation'))
            ->truthy('terms', $terms, t('auth.agreeTerms'));

        if (Captcha::enabled() && !Captcha::verify($_POST['h-captcha-response'] ?? null)) {
            $v->add('captcha', t('auth.captchaRequired'));
        }

        if ($v->fails()) {
            flash_old(['email' => $email, 'name' => $name]);
            view('auth/register', ['title' => t('auth.createAccount'), 'errors' => $v->errors()], 'app');
            return;
        }

        $result = Auth::register($email, $name, $password, $marketing);
        if (!$result['ok']) {
            flash_old(['email' => $email, 'name' => $name]);
            $msg = $result['error'] === 'emailInUse' ? t('auth.emailInUse') : t('errors.generic');
            view('auth/register', ['title' => t('auth.createAccount'), 'errors' => ['email' => $msg]], 'app');
            return;
        }

        // Mirrors the SPA: after registering, show the "check your email" screen.
        redirect('/auth/verify-email');
    }

    // ---- Email verification ------------------------------------------------
    public function verifyEmail(array $params): void
    {
        $token = (string) ($_GET['token'] ?? '');
        if ($token === '') {
            view('auth/verify_email', ['title' => t('auth.checkEmail'), 'mode' => 'sent'], 'app');
            return;
        }
        $ok = Auth::verifyEmail($token);
        view('auth/verify_email', [
            'title' => $ok ? t('auth.emailVerified') : t('auth.verifyFailed'),
            'mode'  => $ok ? 'success' : 'failed',
        ], 'app');
    }

    public function resendVerification(array $params): void
    {
        $email = (string) ($_POST['email'] ?? '');
        if ($email !== '') {
            Auth::resendVerification($email);
        }
        flash('success', t('auth.resentSuccess'));
        redirect('/auth/verify-email');
    }

    // ---- Forgot / reset ----------------------------------------------------
    public function forgotForm(array $params): void
    {
        view('auth/forgot', ['title' => t('auth.forgotPassword'), 'sent' => false], 'app');
    }

    public function forgot(array $params): void
    {
        $email = (string) ($_POST['email'] ?? '');
        $v = (new Validator())->email('email', $email, t('auth.email'));
        if (Captcha::enabled() && !Captcha::verify($_POST['h-captcha-response'] ?? null)) {
            $v->add('captcha', t('auth.captchaRequired'));
        }
        if ($v->fails()) {
            flash_old(['email' => $email]);
            view('auth/forgot', ['title' => t('auth.forgotPassword'), 'errors' => $v->errors(), 'sent' => false], 'app');
            return;
        }
        Auth::forgotPassword($email);
        // Always report success (no account enumeration).
        view('auth/forgot', ['title' => t('auth.forgotPassword'), 'sent' => true], 'app');
    }

    public function resetForm(array $params): void
    {
        $token = (string) ($_GET['token'] ?? '');
        view('auth/reset', ['title' => t('auth.resetPassword'), 'token' => $token], 'app');
    }

    public function reset(array $params): void
    {
        $token = (string) ($_POST['token'] ?? '');
        $password = (string) ($_POST['password'] ?? '');
        $confirm = (string) ($_POST['passwordConfirmation'] ?? '');

        $v = (new Validator())
            ->password('password', $password, t('auth.passwordHint'))
            ->matches('passwordConfirmation', $password, $confirm, t('auth.passwordConfirmation'));
        if ($v->fails()) {
            view('auth/reset', ['title' => t('auth.resetPassword'), 'token' => $token, 'errors' => $v->errors()], 'app');
            return;
        }

        if (!Auth::resetPassword($token, $password)) {
            view('auth/reset', [
                'title' => t('auth.resetPassword'), 'token' => $token,
                'errors' => ['password' => t('auth.verifyFailedDesc')],
            ], 'app');
            return;
        }
        redirect('/auth/login?reset=1');
    }

    // ---- Logout ------------------------------------------------------------
    public function logout(array $params): void
    {
        Auth::logout();
        redirect('/');
    }

    // ---- Google OAuth ------------------------------------------------------
    public function googleStart(array $params): void
    {
        if (!GoogleOAuth::configured()) {
            redirect('/auth/login?error=1');
        }
        redirect(GoogleOAuth::authUrl((string) ($_GET['from'] ?? '/')));
    }

    public function googleCallback(array $params): void
    {
        $code = (string) ($_GET['code'] ?? '');
        $state = (string) ($_GET['state'] ?? '');
        if ($code === '' || !GoogleOAuth::checkState($state)) {
            redirect('/auth/login?error=1');
        }
        try {
            $profile = GoogleOAuth::fetchProfile($code);
        } catch (\Throwable) {
            redirect('/auth/login?error=1');
        }
        $result = Auth::findOrCreateOAuthUser('google', $profile);
        if (!$result['ok']) {
            redirect('/auth/login?error=1');
        }
        Auth::login($result['user']);
        $to = GoogleOAuth::returnTo();
        redirect(str_starts_with($to, '/') ? $to : '/');
    }
}
