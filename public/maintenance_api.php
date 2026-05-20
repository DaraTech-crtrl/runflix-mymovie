<?php
/**
 * Global maintenance mode — shared across all devices/browsers.
 * GET  → public status
 * POST → update (requires X-Admin-Token or X-Admin-Key)
 */

require_once __DIR__ . '/includes/admin_verify.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Admin-Key');
header('Cache-Control: no-store, no-cache, must-revalidate');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$file = __DIR__ . '/maintenance.json';

$defaultMessage = 'We are performing scheduled core upgrades to offer you a faster and smoother cinematic experience. Runflix Entertainment will be back online shortly!';

$default = [
    'enabled' => false,
    'message' => $defaultMessage,
    'updatedAt' => 0,
];

function readMaintenanceState(string $file, array $default): array
{
    if (!file_exists($file)) {
        return $default;
    }

    $raw = @file_get_contents($file);
    if ($raw === false) {
        return $default;
    }

    $data = json_decode($raw, true);
    if (!is_array($data)) {
        return $default;
    }

    return [
        'enabled' => !empty($data['enabled']),
        'message' => isset($data['message']) && is_string($data['message'])
            ? mb_substr(strip_tags($data['message']), 0, 500)
            : $default['message'],
        'updatedAt' => isset($data['updatedAt']) ? (int) $data['updatedAt'] : 0,
    ];
}

function writeMaintenanceState(string $file, array $state): bool
{
    $json = json_encode($state, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    if ($json === false) {
        return false;
    }

    $tmp = $file . '.tmp';
    if (@file_put_contents($tmp, $json, LOCK_EX) === false) {
        return false;
    }

    return @rename($tmp, $file);
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    echo json_encode([
        'success' => true,
        'data' => readMaintenanceState($file, $default),
    ]);
    exit;
}

if ($method === 'POST') {
    if (!rf_verify_admin_request()) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Unauthorized']);
        exit;
    }

    $body = json_decode(file_get_contents('php://input'), true);
    if (!is_array($body)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid JSON body']);
        exit;
    }

    $state = readMaintenanceState($file, $default);

    if (array_key_exists('enabled', $body)) {
        $state['enabled'] = (bool) $body['enabled'];
    }
    if (isset($body['message']) && is_string($body['message'])) {
        $state['message'] = mb_substr(strip_tags($body['message']), 0, 500);
    }
    $state['updatedAt'] = time();

    if (!writeMaintenanceState($file, $state)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to write maintenance state']);
        exit;
    }

    echo json_encode(['success' => true, 'data' => $state]);
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'error' => 'Method not allowed']);
