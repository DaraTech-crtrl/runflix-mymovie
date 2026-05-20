<?php
/**
 * Shared admin verification for PHP APIs.
 * PIN lives only on the server (MAINTENANCE_ADMIN_KEY env or default).
 */

function rf_admin_pin(): string {
    return getenv('MAINTENANCE_ADMIN_KEY') ?: '2009';
}

function rf_admin_sessions_file(): string {
    return dirname(__DIR__) . '/admin_sessions.json';
}

function rf_read_admin_sessions(): array {
    $file = rf_admin_sessions_file();
    if (!file_exists($file)) {
        return [];
    }
    $data = json_decode(file_get_contents($file) ?: '[]', true);
    return is_array($data) ? $data : [];
}

function rf_write_admin_sessions(array $sessions): bool {
    $file = rf_admin_sessions_file();
    $json = json_encode($sessions, JSON_PRETTY_PRINT);
    if ($json === false) {
        return false;
    }
    $tmp = $file . '.tmp';
    if (@file_put_contents($tmp, $json, LOCK_EX) === false) {
        return false;
    }
    return @rename($tmp, $file);
}

function rf_prune_admin_sessions(array $sessions): array {
    $now = time();
    foreach ($sessions as $token => $meta) {
        if (!is_array($meta) || ($meta['expires'] ?? 0) < $now) {
            unset($sessions[$token]);
        }
    }
    return $sessions;
}

function rf_create_admin_token(): ?string {
    $token = bin2hex(random_bytes(32));
    $sessions = rf_prune_admin_sessions(rf_read_admin_sessions());
    $sessions[$token] = [
        'created' => time(),
        'expires' => time() + 86400,
    ];
    if (!rf_write_admin_sessions($sessions)) {
        return null;
    }
    return $token;
}

function rf_verify_admin_token(string $token): bool {
    if ($token === '' || strlen($token) < 32) {
        return false;
    }
    $sessions = rf_prune_admin_sessions(rf_read_admin_sessions());
    rf_write_admin_sessions($sessions);
    return isset($sessions[$token]) && ($sessions[$token]['expires'] ?? 0) > time();
}

/**
 * Verify admin request via PIN (X-Admin-Key) or token (X-Admin-Token).
 */
function rf_verify_admin_request(): bool {
    $pin = rf_admin_pin();
    $key = $_SERVER['HTTP_X_ADMIN_KEY'] ?? '';
    if ($key !== '' && hash_equals($pin, $key)) {
        return true;
    }
    $token = $_SERVER['HTTP_X_ADMIN_TOKEN'] ?? '';
    if ($token !== '' && rf_verify_admin_token($token)) {
        return true;
    }
    return false;
}
?>
