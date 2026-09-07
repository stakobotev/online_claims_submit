<?php
declare(strict_types=1);

namespace App\Repo;

use App\Database;
use App\Ids;

final class Institutions
{
    /** Active institutions, optionally filtered by category (for dropdowns). */
    public static function activeByCategory(?string $categoryId = null): array
    {
        $sql = 'SELECT "id","name","categoryId","email" FROM "Institution" WHERE "active" = TRUE';
        $params = [];
        if ($categoryId) {
            $sql .= ' AND "categoryId" = :c';
            $params['c'] = $categoryId;
        }
        $sql .= ' ORDER BY "name"';
        return Database::all($sql, $params);
    }

    /** Paginated list for the admin panel (includes inactive). */
    public static function paginate(int $page, int $size): array
    {
        $total = (int) Database::scalar('SELECT COUNT(*) FROM "Institution"');
        $rows = Database::all(
            'SELECT i.*, c."name" AS "categoryName"
               FROM "Institution" i JOIN "Category" c ON c."id" = i."categoryId"
              ORDER BY i."name"
              LIMIT :limit OFFSET :offset',
            ['limit' => $size, 'offset' => ($page - 1) * $size],
        );
        return ['data' => $rows, 'total' => $total, 'page' => $page, 'size' => $size, 'pages' => (int) ceil($total / $size)];
    }

    public static function find(string $id): ?array
    {
        return Database::one('SELECT * FROM "Institution" WHERE "id" = :id', ['id' => $id]);
    }

    public static function findActive(string $id): ?array
    {
        return Database::one('SELECT * FROM "Institution" WHERE "id" = :id AND "active" = TRUE', ['id' => $id]);
    }

    public static function create(string $categoryId, string $name, string $email): string
    {
        $id = Ids::uuid();
        Database::run(
            'INSERT INTO "Institution" ("id","categoryId","name","email","active","createdAt","updatedAt")
             VALUES (:id,:cat,:name,:email,TRUE,now(),now())',
            ['id' => $id, 'cat' => $categoryId, 'name' => $name, 'email' => $email],
        );
        return $id;
    }

    public static function update(string $id, string $categoryId, string $name, string $email): void
    {
        Database::run(
            'UPDATE "Institution" SET "categoryId"=:cat,"name"=:name,"email"=:email,"updatedAt"=now() WHERE "id"=:id',
            ['cat' => $categoryId, 'name' => $name, 'email' => $email, 'id' => $id],
        );
    }

    public static function deactivate(string $id): void
    {
        Database::run('UPDATE "Institution" SET "active"=FALSE,"updatedAt"=now() WHERE "id"=:id', ['id' => $id]);
    }

    public static function activate(string $id): void
    {
        Database::run('UPDATE "Institution" SET "active"=TRUE,"updatedAt"=now() WHERE "id"=:id', ['id' => $id]);
    }
}
