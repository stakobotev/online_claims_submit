<?php
declare(strict_types=1);

namespace App;

/**
 * Tiny regex router. Routes are registered as (method, pattern, handler).
 * Pattern params use {name}; the matched values are passed to the handler as
 * an associative array. Handlers are [ControllerClass::class, 'method'].
 */
final class Router
{
    /** @var array<int,array{method:string,regex:string,params:string[],handler:array}> */
    private array $routes = [];

    public function get(string $path, array $handler): void { $this->add('GET', $path, $handler); }
    public function post(string $path, array $handler): void { $this->add('POST', $path, $handler); }

    private function add(string $method, string $path, array $handler): void
    {
        $params = [];
        $regex = preg_replace_callback('#\{(\w+)\}#', function ($m) use (&$params) {
            $params[] = $m[1];
            return '([^/]+)';
        }, $path);
        $this->routes[] = [
            'method'  => $method,
            'regex'   => '#^' . $regex . '$#',
            'params'  => $params,
            'handler' => $handler,
        ];
    }

    public function dispatch(string $method, string $uri): void
    {
        $path = parse_url($uri, PHP_URL_PATH) ?: '/';
        $path = rawurldecode($path);
        if ($path !== '/') {
            $path = rtrim($path, '/');
            if ($path === '') {
                $path = '/';
            }
        }

        // CSRF enforcement for all mutating requests.
        if ($method === 'POST' && !Csrf::check($_POST['_csrf'] ?? null)) {
            http_response_code(419);
            echo 'Invalid or expired form token. Please go back and try again.';
            return;
        }

        foreach ($this->routes as $route) {
            if ($route['method'] !== $method) {
                continue;
            }
            if (preg_match($route['regex'], $path, $matches)) {
                array_shift($matches);
                $args = array_combine($route['params'], $matches) ?: [];
                [$class, $action] = $route['handler'];
                (new $class())->$action($args);
                return;
            }
        }

        http_response_code(404);
        view('errors/404', [], 'app');
    }
}
