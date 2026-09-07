<?php
declare(strict_types=1);

/**
 * Single front controller. All requests are rewritten here by .htaccess.
 * Route table mirrors the original React router + Express API surface, adapted
 * to server-rendered pages.
 */

require dirname(__DIR__) . '/src/bootstrap.php';

use App\Router;
use App\Controllers\HomeController;
use App\Controllers\PageController;
use App\Controllers\AuthController;
use App\Controllers\ComplaintController;
use App\Controllers\TrackController;
use App\Controllers\AttachmentController;
use App\Controllers\Admin\DashboardController;
use App\Controllers\Admin\ComplaintsController;
use App\Controllers\Admin\UsersController;
use App\Controllers\Admin\InstitutionsController;
use App\Controllers\Admin\StatisticsController;

$router = new Router();

// --- Public pages ---
$router->get('/', [HomeController::class, 'index']);
$router->get('/about', [PageController::class, 'about']);
$router->get('/privacy', [PageController::class, 'privacy']);
$router->get('/terms', [PageController::class, 'terms']);
$router->get('/track', [TrackController::class, 'index']);
$router->get('/track/{publicId}', [TrackController::class, 'show']);

// --- Auth ---
$router->get('/auth/login', [AuthController::class, 'loginForm']);
$router->post('/auth/login', [AuthController::class, 'login']);
$router->get('/auth/register', [AuthController::class, 'registerForm']);
$router->post('/auth/register', [AuthController::class, 'register']);
$router->get('/auth/verify-email', [AuthController::class, 'verifyEmail']);
$router->post('/auth/resend-verification', [AuthController::class, 'resendVerification']);
$router->get('/auth/forgot-password', [AuthController::class, 'forgotForm']);
$router->post('/auth/forgot-password', [AuthController::class, 'forgot']);
$router->get('/auth/reset-password', [AuthController::class, 'resetForm']);
$router->post('/auth/reset-password', [AuthController::class, 'reset']);
$router->post('/auth/logout', [AuthController::class, 'logout']);
// Google OAuth
$router->get('/auth/oauth/google', [AuthController::class, 'googleStart']);
$router->get('/auth/oauth/google/callback', [AuthController::class, 'googleCallback']);

// --- Complaints ---
$router->get('/complaints/submit', [ComplaintController::class, 'submitForm']);
$router->post('/complaints/submit', [ComplaintController::class, 'submit']);
$router->get('/complaints', [ComplaintController::class, 'mine']);
$router->get('/complaints/{publicId}', [ComplaintController::class, 'show']);

// --- Attachments ---
$router->get('/attachments/{id}', [AttachmentController::class, 'download']);

// --- Admin ---
$router->get('/admin', [DashboardController::class, 'index']);
$router->get('/admin/complaints', [ComplaintsController::class, 'index']);
$router->get('/admin/complaints/{publicId}', [ComplaintsController::class, 'show']);
$router->post('/admin/complaints/{publicId}/approve', [ComplaintsController::class, 'approve']);
$router->post('/admin/complaints/{publicId}/reject', [ComplaintsController::class, 'reject']);
$router->post('/admin/complaints/{publicId}/close', [ComplaintsController::class, 'close']);
$router->get('/admin/users', [UsersController::class, 'index']);
$router->post('/admin/users/{id}/update', [UsersController::class, 'update']);
$router->post('/admin/users/{id}/anonymize', [UsersController::class, 'anonymize']);
$router->get('/admin/users/{id}/export', [UsersController::class, 'export']);
$router->get('/admin/institutions', [InstitutionsController::class, 'index']);
$router->post('/admin/institutions', [InstitutionsController::class, 'create']);
$router->post('/admin/institutions/{id}/update', [InstitutionsController::class, 'update']);
$router->post('/admin/institutions/{id}/delete', [InstitutionsController::class, 'delete']);
$router->post('/admin/institutions/{id}/activate', [InstitutionsController::class, 'activate']);
$router->get('/admin/statistics', [StatisticsController::class, 'index']);
$router->get('/admin/statistics/export', [StatisticsController::class, 'export']);

$router->dispatch($_SERVER['REQUEST_METHOD'], $_SERVER['REQUEST_URI']);
