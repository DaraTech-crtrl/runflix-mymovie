<?php
/**
 * Admin PIN verification — PIN never shipped in the JS bundle.
 * POST { "pin": "..." } → { "success": true, "token": "...", "expiresAt": ... }
 */

require_once __DIR__ . '/includes/admin_verify.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Cache-Control: no-store, no-cache, must-revalidate');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

$body = json_decode(file_get_contents('php://input') ?: '', true);
$pin = is_array($body) && isset($body['pin']) ? trim((string) $body['pin']) : '';

if ($pin === '' || !hash_equals(rf_admin_pin(), $pin)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Invalid PIN']);
    exit;
}

$token = rf_create_admin_token();
if ($token === null) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Could not create session']);
    exit;
}

echo json_encode([
    'success' => true,
    'token' => $token,
    'expiresAt' => time() + 86400,
]);
