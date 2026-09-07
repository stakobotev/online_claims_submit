<?php
declare(strict_types=1);

namespace App\Repo;

use App\Database;

final class Categories
{
    /** @return array<int,array{id:string,name:string}> */
    public static function all(): array
    {
        return Database::all('SELECT "id","name" FROM "Category" ORDER BY "name"');
    }

    public static function find(string $id): ?array
    {
        return Database::one('SELECT "id","name" FROM "Category" WHERE "id" = :id', ['id' => $id]);
    }

    /** id => name map for quick lookups in views. */
    public static function map(): array
    {
        $out = [];
        foreach (self::all() as $c) {
            $out[$c['id']] = $c['name'];
        }
        return $out;
    }
}
