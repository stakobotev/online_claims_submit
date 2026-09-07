<?php
declare(strict_types=1);

namespace App;

/**
 * Lightweight validation collector. Mirrors the zod rules used by the original
 * backend/frontend (email format, password policy, min lengths, etc.).
 */
final class Validator
{
    /** @var array<string,string> field => first error message */
    private array $errors = [];

    /** Password policy identical to backend/src/lib/password.ts. */
    public const PASSWORD_REGEX =
        '/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};\':"\\\\|,.<>\/?]).{8,}$/';

    public function required(string $field, mixed $value, string $message): self
    {
        if (!isset($this->errors[$field]) && (trim((string) $value) === '')) {
            $this->errors[$field] = $message;
        }
        return $this;
    }

    public function email(string $field, mixed $value, string $message): self
    {
        if (!isset($this->errors[$field]) && !filter_var((string) $value, FILTER_VALIDATE_EMAIL)) {
            $this->errors[$field] = $message;
        }
        return $this;
    }

    public function minLen(string $field, mixed $value, int $min, string $message): self
    {
        if (!isset($this->errors[$field]) && mb_strlen(trim((string) $value)) < $min) {
            $this->errors[$field] = $message;
        }
        return $this;
    }

    public function password(string $field, mixed $value, string $message): self
    {
        if (!isset($this->errors[$field]) && !preg_match(self::PASSWORD_REGEX, (string) $value)) {
            $this->errors[$field] = $message;
        }
        return $this;
    }

    public function matches(string $field, mixed $a, mixed $b, string $message): self
    {
        if (!isset($this->errors[$field]) && (string) $a !== (string) $b) {
            $this->errors[$field] = $message;
        }
        return $this;
    }

    public function truthy(string $field, mixed $value, string $message): self
    {
        if (!isset($this->errors[$field]) && !$value) {
            $this->errors[$field] = $message;
        }
        return $this;
    }

    public function add(string $field, string $message): self
    {
        $this->errors[$field] ??= $message;
        return $this;
    }

    public function fails(): bool { return $this->errors !== []; }
    public function passes(): bool { return $this->errors === []; }
    /** @return array<string,string> */
    public function errors(): array { return $this->errors; }
}
