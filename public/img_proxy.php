<?php
/**
 * RUNFlix Image Proxy
 * Bypasses CORS and hotlink/robots.txt blocking for pbcdnw.aoneroom.com images.
 */

// Allow CORS for the client browser
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: GET, OPTIONS");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Get the target image URL
$target_url = isset($_GET['url']) ? trim($_GET['url']) : '';

if (empty($target_url)) {
    http_response_code(400);
    echo "Missing 'url' parameter";
    exit;
}

// Validate that it is a valid HTTP/HTTPS URL
if (!filter_var($target_url, FILTER_VALIDATE_URL) || !preg_match('/^https?:\/\//i', $target_url)) {
    http_response_code(400);
    echo "Invalid image URL";
    exit;
}

// Fetch the image using cURL
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $target_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 25);
curl_setopt($ch, CURLOPT_MAXREDIRS, 5);

// Set standard browser user agent and strip the browser Referer to bypass hotlink checks
curl_setopt($ch, CURLOPT_REFERER, '');
curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

// Execute the request
$response = curl_exec($ch);
$status_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$content_type = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);

if (curl_errno($ch)) {
    $error_msg = curl_error($ch);
    http_response_code(502);
    echo "Proxy Connection Error: " . $error_msg;
    curl_close($ch);
    exit;
}

curl_close($ch);

// Set the response status and headers
http_response_code($status_code);

if ($content_type) {
    header("Content-Type: " . $content_type);
} else {
    // Fallback to generic image header if not detected
    header("Content-Type: image/jpeg");
}

// Enable aggressive caching to make subsequent loads instant
header("Cache-Control: public, max-age=604800");

// Output the image body
echo $response;
