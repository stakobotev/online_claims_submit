<?php
declare(strict_types=1);

/**
 * One-time setup / seeder. Run from the command line:
 *
 *     php sql/setup.php
 *
 * Creates the schema (idempotent) and seeds categories, configuration, the admin
 * user, and (when SEED_DEMO_DATA is true) demo institutions. Mirrors
 * backend/prisma/seed.ts. Safe to re-run.
 *
 * If your host has no shell/CLI access, you can also hit it once via the browser
 * by temporarily copying it under public/ — but delete it afterwards.
 */

define('VLC_ROOT', dirname(__DIR__));

$configFile = VLC_ROOT . '/config/config.php';
if (!is_file($configFile)) {
    fwrite(STDERR, "Missing config/config.php. Copy config/config.example.php first.\n");
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

use App\Database;
use App\Ids;

function out(string $msg): void { echo $msg . "\n"; }

// 1) Schema ----------------------------------------------------------------
// Split into individual statements (PDO drivers vary on multi-statement exec).
$schema = (string) file_get_contents(VLC_ROOT . '/sql/schema.sql');
$schema = preg_replace('/^\s*--.*$/m', '', $schema); // strip line comments
foreach (array_filter(array_map('trim', explode(';', $schema))) as $stmt) {
    Database::pdo()->exec($stmt);
}
out('✔ Schema applied.');

// 2) Categories ------------------------------------------------------------
$categories = [
    ['id' => 'hospitals',       'name' => 'Hospitals'],
    ['id' => 'doctors',         'name' => 'Doctors'],
    ['id' => 'insurance_funds', 'name' => 'Health Insurance Funds'],
];
foreach ($categories as $c) {
    Database::run(
        'INSERT INTO "Category" ("id","name") VALUES (:id,:name)
         ON DUPLICATE KEY UPDATE "name" = VALUES("name")',
        $c,
    );
}
out('✔ Categories seeded.');

// 3) Configuration ---------------------------------------------------------
$configEntries = [
    ['key' => 'min_body_length',            'value' => (string) cfg('MIN_BODY_LENGTH', 100)],
    ['key' => 'captcha_required_anonymous', 'value' => cfg('CAPTCHA_REQUIRED_ANONYMOUS', true) ? 'true' : 'false'],
    ['key' => 'ombudsman_email',            'value' => (string) cfg('OMBUDSMAN_EMAIL', '')],
];
foreach ($configEntries as $entry) {
    Database::run(
        'INSERT INTO "Configuration" ("key","value","updatedAt") VALUES (:key,:value,now())
         ON DUPLICATE KEY UPDATE "value" = VALUES("value"), "updatedAt" = now()',
        $entry,
    );
}
out('✔ Configuration seeded.');

// 4) Admin user ------------------------------------------------------------
$adminEmail = (string) cfg('ADMIN_EMAIL', '');
$adminPassword = (string) cfg('ADMIN_INITIAL_PASSWORD', '');
if ($adminEmail !== '' && $adminPassword !== '') {
    $existing = Database::one('SELECT "id" FROM "User" WHERE "email" = :e', ['e' => $adminEmail]);
    if (!$existing) {
        $hash = password_hash($adminPassword, PASSWORD_ARGON2ID, [
            'memory_cost' => (int) cfg('ARGON2_MEMORY_COST', 19456),
            'time_cost'   => (int) cfg('ARGON2_TIME_COST', 2),
            'threads'     => (int) cfg('ARGON2_PARALLELISM', 1),
        ]);
        Database::run(
            'INSERT INTO "User" ("id","email","name","passwordHash","role","status","emailVerified","createdAt","updatedAt")
             VALUES (:id,:email,\'Admin\',:hash,\'admin\',\'active\',TRUE,now(),now())',
            ['id' => Ids::uuid(), 'email' => $adminEmail, 'hash' => $hash],
        );
        out("✔ Admin user created: {$adminEmail}");
    } else {
        out("• Admin user already exists: {$adminEmail}");
    }
}

// 5) Demo institutions -----------------------------------------------------
if (cfg('SEED_DEMO_DATA', false)) {
    $demo = [
        ['categoryId' => 'hospitals',       'name' => 'City Hospital',            'email' => 'city.hospital@example.org'],
        ['categoryId' => 'hospitals',       'name' => 'Regional Medical Center',  'email' => 'rmc@example.org'],
        ['categoryId' => 'hospitals',       'name' => 'University Hospital',       'email' => 'uni.hospital@example.org'],
        ['categoryId' => 'doctors',         'name' => 'Dr. Smith Clinic',         'email' => 'dr.smith@example.org'],
        ['categoryId' => 'doctors',         'name' => 'Family Health Center',     'email' => 'family.health@example.org'],
        ['categoryId' => 'doctors',         'name' => 'Specialist Practice',      'email' => 'specialist@example.org'],
        ['categoryId' => 'insurance_funds', 'name' => 'National Health Fund',     'email' => 'nhf@example.org'],
        ['categoryId' => 'insurance_funds', 'name' => 'Regional Insurance',       'email' => 'regional.ins@example.org'],
        ['categoryId' => 'insurance_funds', 'name' => 'Public Health Insurance',  'email' => 'phi@example.org'],
    ];
    foreach ($demo as $inst) {
        $exists = Database::one(
            'SELECT "id" FROM "Institution" WHERE "name" = :n AND "categoryId" = :c',
            ['n' => $inst['name'], 'c' => $inst['categoryId']],
        );
        if (!$exists) {
            Database::run(
                'INSERT INTO "Institution" ("id","categoryId","name","email","active","createdAt","updatedAt")
                 VALUES (:id,:categoryId,:name,:email,TRUE,now(),now())',
                array_merge(['id' => Ids::uuid()], $inst),
            );
        }
    }
    out('✔ Demo institutions seeded.');
}

// Ensure upload dir exists.
$uploadDir = (string) cfg('UPLOAD_DIR', VLC_ROOT . '/storage/uploads');
if (!is_dir($uploadDir)) {
    @mkdir($uploadDir, 0775, true);
}
out('✔ Setup complete.');
