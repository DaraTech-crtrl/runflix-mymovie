<?php
/**
 * RUNFlix API Proxy
 * Bypasses CORS and Origin-based blocking from the API provider.
 */

// Allow CORS for the client browser
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$request_uri = $_SERVER['REQUEST_URI'];
$pos = strpos($request_uri, '/api/v2/');

if ($pos === false) {
    http_response_code(400);
    echo json_encode(["status" => 400, "success" => false, "message" => "Invalid Proxy Endpoint"]);
    exit;
}

// Extract the path after /api/v2/ (e.g. trending, homepage, etc.)
$endpoint = substr($request_uri, $pos + strlen('/api/v2/'));
$target_url = 'https://movieapi.gifted.co.ke/api/v2/' . $endpoint;

// Forward browser Authorization header securely
$headers = [];
$auth_header = null;

if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
    $auth_header = $_SERVER['HTTP_AUTHORIZATION'];
} elseif (function_exists('apache_request_headers')) {
    $apache_headers = apache_request_headers();
    if (isset($apache_headers['Authorization'])) {
        $auth_header = $apache_headers['Authorization'];
    }
}

if ($auth_header) {
    $headers[] = "Authorization: " . $auth_header;
}
$headers[] = "Content-Type: application/json";

// Query parameters (if any) are already appended via cURL URL from $_SERVER['REQUEST_URI']
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $target_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_TIMEOUT, 25);

// CRITICAL: Strip the browser Origin and Referer so the destination server does not block the request
curl_setopt($ch, CURLOPT_REFERER, '');
curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

$response = curl_exec($ch);
$status_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);

if (curl_errno($ch)) {
    $error_msg = curl_error($ch);
    http_response_code(502);
    echo json_encode([
        "status" => 502,
        "success" => false,
        "message" => "Proxy Connection Error",
        "details" => $error_msg
    ]);
    curl_close($ch);
    exit;
}

curl_close($ch);

// Output response back to client browser
http_response_code($status_code);
header("Content-Type: application/json");
echo $response;
