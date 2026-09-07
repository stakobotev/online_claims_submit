<?php
declare(strict_types=1);

namespace App;

use PDO;
use PDOException;

/**
 * PDO PostgreSQL connection singleton with small query helpers.
 * Uses named/positional prepared statements everywhere (no string interpolation).
 */
final class Database
{
    private static ?PDO $pdo = null;

    public static function pdo(): PDO
    {
        if (self::$pdo instanceof PDO) {
            return self::$pdo;
        }

        $host = (string) cfg('DB_HOST', 'localhost');
        $port = (string) cfg('DB_PORT', '5432');
        $name = (string) cfg('DB_NAME', 'vallentin');
        $user = (string) cfg('DB_USER', 'vallentin');
        $pass = (string) cfg('DB_PASSWORD', '');

        $dsn = "pgsql:host={$host};port={$port};dbname={$name}";

        try {
            $pdo = new PDO($dsn, $user, $pass, [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            if (cfg('APP_ENV') !== 'production') {
                echo 'Database connection failed: ' . htmlspecialchars($e->getMessage());
            } else {
                echo 'Service temporarily unavailable.';
            }
            exit;
        }

        $schema = (string) cfg('DB_SCHEMA', 'public');
        $pdo->exec('SET search_path TO ' . $pdo->quote($schema));

        self::$pdo = $pdo;
        return $pdo;
    }

    /** Run a query and return all rows. */
    public static function all(string $sql, array $params = []): array
    {
        $stmt = self::pdo()->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    /** Run a query and return the first row or null. */
    public static function one(string $sql, array $params = []): ?array
    {
        $stmt = self::pdo()->prepare($sql);
        $stmt->execute($params);
        $row = $stmt->fetch();
        return $row === false ? null : $row;
    }

    /** Return a single scalar value from the first row/column. */
    public static function scalar(string $sql, array $params = []): mixed
    {
        $stmt = self::pdo()->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchColumn();
    }

    /** Execute a statement; returns affected row count. */
    public static function run(string $sql, array $params = []): int
    {
        $stmt = self::pdo()->prepare($sql);
        $stmt->execute($params);
        return $stmt->rowCount();
    }

    public static function begin(): void { self::pdo()->beginTransaction(); }
    public static function commit(): void { self::pdo()->commit(); }
    public static function rollback(): void
    {
        if (self::pdo()->inTransaction()) {
            self::pdo()->rollBack();
        }
    }

    /** Wrap a callable in a transaction. */
    public static function transaction(callable $fn): mixed
    {
        self::begin();
        try {
            $result = $fn();
            self::commit();
            return $result;
        } catch (\Throwable $e) {
            self::rollback();
            throw $e;
        }
    }
}
