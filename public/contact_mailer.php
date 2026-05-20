<?php
/**
 * RUNFlix Contact Form Mailer
 * Uses Google SMTP to send contact form submissions to daratech.web@gmail.com
 * 
 * IMPORTANT: You must generate a Google App Password for this to work.
 * Go to: https://myaccount.google.com/apppasswords
 * Create an app password for "Mail" and replace SMTP_PASSWORD below.
 */

// CORS headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed"]);
    exit;
}

// ========== CONFIGURATION ==========
$SMTP_HOST     = 'mail.runflix.name.ng';
$SMTP_PORT     = 587;
$SMTP_USERNAME = 'support@runflix.name.ng';
$SMTP_PASSWORD = 'Akinsola2020'; // Replace with Google App Password
$RECIPIENT     = 'RunFlix Entertainment';
// ====================================

// Parse incoming JSON
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Invalid request body"]);
    exit;
}

$name    = htmlspecialchars(trim($input['name'] ?? ''));
$email   = filter_var(trim($input['email'] ?? ''), FILTER_VALIDATE_EMAIL);
$subject = htmlspecialchars(trim($input['subject'] ?? 'General Inquiry'));
$message = htmlspecialchars(trim($input['message'] ?? ''));

// Validation
if (!$name || !$email || !$message) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Name, valid email, and message are required."]);
    exit;
}

// Subject prefix mapping
$subjectMap = [
    'general'     => '💬 General Inquiry',
    'bug'         => '🐛 Bug Report',
    'feature'     => '✨ Feature Request',
    'copyright'   => '©️ Copyright/DMCA',
    'partnership'  => '🤝 Partnership',
    'other'       => '📋 Other',
];
$subjectLabel = $subjectMap[$subject] ?? $subject;
$fullSubject  = "[RUNFlix Contact] $subjectLabel — from $name";

// Build beautiful HTML email
$timestamp = date('F j, Y \a\t g:i A');
$htmlBody = <<<HTML
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { margin: 0; padding: 0; background: #0a0a0f; font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; }
    .container { max-width: 560px; margin: 0 auto; padding: 32px 24px; }
    .header { background: linear-gradient(135deg, #e50914 0%, #b20710 100%); border-radius: 16px 16px 0 0; padding: 28px 24px; text-align: center; }
    .header h1 { color: #fff; font-size: 20px; font-weight: 900; margin: 0 0 4px 0; letter-spacing: 1px; }
    .header p { color: rgba(255,255,255,0.7); font-size: 12px; margin: 0; }
    .body { background: #111118; border: 1px solid rgba(255,255,255,0.06); border-top: none; border-radius: 0 0 16px 16px; padding: 28px 24px; }
    .field { margin-bottom: 20px; }
    .label { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #888; margin-bottom: 6px; }
    .value { font-size: 14px; color: #e8e8ed; line-height: 1.6; }
    .value a { color: #e50914; text-decoration: none; }
    .message-box { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 16px; margin-top: 6px; }
    .divider { border: none; border-top: 1px solid rgba(255,255,255,0.06); margin: 20px 0; }
    .footer { text-align: center; padding: 16px 0 0; }
    .footer p { font-size: 11px; color: #555; }
    .badge { display: inline-block; background: rgba(229,9,20,0.15); color: #e50914; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎬 RUNFlix Contact</h1>
      <p>New message received</p>
    </div>
    <div class="body">
      <div class="field">
        <div class="label">Category</div>
        <div class="value"><span class="badge">$subjectLabel</span></div>
      </div>
      <div class="field">
        <div class="label">From</div>
        <div class="value">$name</div>
      </div>
      <div class="field">
        <div class="label">Email</div>
        <div class="value"><a href="mailto:$email">$email</a></div>
      </div>
      <hr class="divider">
      <div class="field">
        <div class="label">Message</div>
        <div class="message-box">
          <div class="value">$message</div>
        </div>
      </div>
      <hr class="divider">
      <div class="footer">
        <p>Sent from RUNFlix Contact Form · $timestamp</p>
      </div>
    </div>
  </div>
</body>
</html>
HTML;

// ========== SEND VIA SMTP ==========
// Using fsockopen-based SMTP (no external dependencies needed)
$success = sendSmtpEmail(
    $SMTP_HOST, $SMTP_PORT, $SMTP_USERNAME, $SMTP_PASSWORD,
    $SMTP_USERNAME, $RECIPIENT, $fullSubject, $htmlBody, $email, $name
);

if ($success) {
    echo json_encode(["success" => true, "message" => "Message sent successfully!"]);
} else {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Failed to send email. Please try again or contact us directly."]);
}

/**
 * Pure PHP SMTP mailer — no PHPMailer dependency required.
 */
function sendSmtpEmail($host, $port, $user, $pass, $from, $to, $subject, $htmlBody, $replyTo, $replyName) {
    $socket = @fsockopen($host, $port, $errno, $errstr, 10);
    if (!$socket) return false;

    $response = fgets($socket, 512);
    if (substr($response, 0, 3) !== '220') { fclose($socket); return false; }

    // EHLO
    fwrite($socket, "EHLO localhost\r\n");
    while ($line = fgets($socket, 512)) {
        if (substr($line, 3, 1) === ' ') break;
    }

    // STARTTLS
    fwrite($socket, "STARTTLS\r\n");
    $response = fgets($socket, 512);
    if (substr($response, 0, 3) !== '220') { fclose($socket); return false; }

    // Enable TLS
    stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT);

    // EHLO again after TLS
    fwrite($socket, "EHLO localhost\r\n");
    while ($line = fgets($socket, 512)) {
        if (substr($line, 3, 1) === ' ') break;
    }

    // AUTH LOGIN
    fwrite($socket, "AUTH LOGIN\r\n");
    fgets($socket, 512);
    fwrite($socket, base64_encode($user) . "\r\n");
    fgets($socket, 512);
    fwrite($socket, base64_encode($pass) . "\r\n");
    $response = fgets($socket, 512);
    if (substr($response, 0, 3) !== '235') { fclose($socket); return false; }

    // MAIL FROM
    fwrite($socket, "MAIL FROM:<$from>\r\n");
    fgets($socket, 512);

    // RCPT TO
    fwrite($socket, "RCPT TO:<$to>\r\n");
    fgets($socket, 512);

    // DATA
    fwrite($socket, "DATA\r\n");
    fgets($socket, 512);

    // Headers + Body
    $boundary = md5(uniqid(time()));
    $headers  = "From: RUNFlix Support Team <$from>\r\n";
    $headers .= "Reply-To: $replyName <$replyTo>\r\n";
    $headers .= "To: <$to>\r\n";
    $headers .= "Subject: $subject\r\n";
    $headers .= "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
    $headers .= "\r\n";

    fwrite($socket, $headers . $htmlBody . "\r\n.\r\n");
    $response = fgets($socket, 512);

    // QUIT
    fwrite($socket, "QUIT\r\n");
    fclose($socket);

    return substr($response, 0, 3) === '250';
}
