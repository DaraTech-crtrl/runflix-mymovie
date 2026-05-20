<?php
/**
 * Runflix global analytics — all devices share this file on the server.
 * POST /analytics_api.php  → record pageview (public)
 * GET  /analytics_api.php  → dashboard stats (X-Admin-Token required)
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

$file = __DIR__ . '/analytics.json';
$today = gmdate('Y-m-d');

$default = [
    'totalPageviews' => 0,
    'todayPageviews' => 0,
    'todayDate' => $today,
    'uniqueVisitorsToday' => 0,
    'activeLast5Min' => 0,
    'domains' => [
        'main' => ['pageviews' => 0, 'uniqueToday' => 0],
        'subdomain' => ['pageviews' => 0, 'uniqueToday' => 0],
    ],
    'topPages' => [],
    'recentPageviews' => [],
    'visitors' => [],
    'updatedAt' => 0,
];

function readAnalytics(string $file, array $default): array
{
    if (!file_exists($file)) {
        return $default;
    }
    $raw = @file_get_contents($file);
    if ($raw === false) {
        return $default;
    }
    $data = json_decode($raw, true);
    return is_array($data) ? array_merge($default, $data) : $default;
}

function writeAnalytics(string $file, array $state): bool
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

function resetTodayIfNeeded(array &$state, string $today): void
{
    if (($state['todayDate'] ?? '') !== $today) {
        $state['todayDate'] = $today;
        $state['todayPageviews'] = 0;
        $state['uniqueVisitorsToday'] = 0;
        $state['domains']['main']['uniqueToday'] = 0;
        $state['domains']['subdomain']['uniqueToday'] = 0;
        foreach ($state['visitors'] as &$v) {
            $v['seenToday'] = false;
        }
        unset($v);
    }
}

function pruneVisitors(array &$visitors, int $now): array
{
    $active = 0;
    $uniqueToday = 0;
    foreach ($visitors as $id => $info) {
        $last = (int) ($info['lastSeen'] ?? 0);
        if ($now - $last > 86400 * 7) {
            unset($visitors[$id]);
            continue;
        }
        if ($now - $last <= 300) {
            $active++;
        }
        if (!empty($info['seenToday'])) {
            $uniqueToday++;
        }
    }
    return ['active' => $active, 'uniqueToday' => $uniqueToday];
}

function detectDomainKey(): string
{
    $host = strtolower($_SERVER['HTTP_HOST'] ?? '');
    if (strpos($host, 'runconnect') !== false) {
        return 'subdomain';
    }
    return 'main';
}

function buildPublicStats(array $state, int $now): array
{
    $pruned = pruneVisitors($state['visitors'], $now);
    $state['activeLast5Min'] = $pruned['active'];
    $state['uniqueVisitorsToday'] = $pruned['uniqueToday'];

    return [
        'totalPageviews' => (int) $state['totalPageviews'],
        'todayPageviews' => (int) $state['todayPageviews'],
        'todayDate' => $state['todayDate'],
        'uniqueVisitorsToday' => (int) $state['uniqueVisitorsToday'],
        'activeLast5Min' => (int) $state['activeLast5Min'],
        'domains' => $state['domains'],
        'topPages' => array_slice($state['topPages'] ?? [], 0, 10),
        'recentPageviews' => array_slice($state['recentPageviews'] ?? [], 0, 20),
        'updatedAt' => (int) $state['updatedAt'],
    ];
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $state = readAnalytics($file, $default);
    resetTodayIfNeeded($state, $today);
    $now = time();
    echo json_encode(['success' => true, 'data' => buildPublicStats($state, $now)]);
    exit;
}

if ($method === 'POST') {
    $raw = file_get_contents('php://input');
    $body = json_decode($raw ?: '', true);
    if (!is_array($body)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid JSON body']);
        exit;
    }

    $path = isset($body['path']) ? substr(preg_replace('/[^a-zA-Z0-9\-_\/\?=&%]/', '', $body['path']), 0, 200) : '/';
    $visitorId = isset($body['visitorId']) ? preg_replace('/[^a-zA-Z0-9\-]/', '', $body['visitorId']) : '';
    if ($visitorId === '') {
        $visitorId = 'anon_' . substr(hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . ($_SERVER['HTTP_USER_AGENT'] ?? '')), 0, 16);
    }

    $domainKey = detectDomainKey();
    $now = time();
    $state = readAnalytics($file, $default);
    resetTodayIfNeeded($state, $today);

    $state['totalPageviews']++;
    $state['todayPageviews']++;
    $state['domains'][$domainKey]['pageviews'] = ($state['domains'][$domainKey]['pageviews'] ?? 0) + 1;

    $wasNewToday = empty($state['visitors'][$visitorId]['seenToday']);
    $state['visitors'][$visitorId] = [
        'lastSeen' => $now,
        'seenToday' => true,
        'domain' => $domainKey,
    ];
    if ($wasNewToday) {
        $state['domains'][$domainKey]['uniqueToday'] = ($state['domains'][$domainKey]['uniqueToday'] ?? 0) + 1;
    }

    $topPages = $state['topPages'] ?? [];
    $found = false;
    foreach ($topPages as &$row) {
        if ($row['path'] === $path) {
            $row['count']++;
            $found = true;
            break;
        }
    }
    unset($row);
    if (!$found) {
        $topPages[] = ['path' => $path, 'count' => 1];
    }
    usort($topPages, fn($a, $b) => ($b['count'] ?? 0) <=> ($a['count'] ?? 0));
    $state['topPages'] = array_slice($topPages, 0, 25);

    $recent = $state['recentPageviews'] ?? [];
    array_unshift($recent, [
        'path' => $path,
        'domain' => $domainKey,
        'at' => $now,
    ]);
    $state['recentPageviews'] = array_slice($recent, 0, 50);
    $state['updatedAt'] = $now;

    if (!writeAnalytics($file, $state)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to save analytics']);
        exit;
    }

    echo json_encode(['success' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'error' => 'Method not allowed']);
