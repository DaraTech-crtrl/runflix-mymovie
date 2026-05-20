<?php
/**
 * Cross-device watch progress (per visitor ID).
 * GET  ?visitorId=...  → { success, progress }
 * POST { visitorId, subjectId, season, episode, lastTime, duration, completedEpisodes?, markComplete? }
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Cache-Control: no-store, no-cache, must-revalidate');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$file = __DIR__ . '/watch_progress.json';

function wp_read(string $file): array
{
    if (!file_exists($file)) {
        return ['visitors' => []];
    }
    $data = json_decode(file_get_contents($file) ?: '{}', true);
    return is_array($data) && isset($data['visitors']) ? $data : ['visitors' => []];
}

function wp_write(string $file, array $state): bool
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

function wp_sanitize_visitor_id(string $id): string
{
    return substr(preg_replace('/[^a-zA-Z0-9\-]/', '', $id), 0, 64);
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $visitorId = wp_sanitize_visitor_id($_GET['visitorId'] ?? '');
    if ($visitorId === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'visitorId required']);
        exit;
    }
    $state = wp_read($file);
    $progress = $state['visitors'][$visitorId]['progress'] ?? [];
    echo json_encode(['success' => true, 'progress' => $progress]);
    exit;
}

if ($method === 'POST') {
    $body = json_decode(file_get_contents('php://input') ?: '', true);
    if (!is_array($body)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid JSON']);
        exit;
    }

    $visitorId = wp_sanitize_visitor_id($body['visitorId'] ?? '');
    $subjectId = preg_replace('/[^a-zA-Z0-9]/', '', (string) ($body['subjectId'] ?? ''));
    if ($visitorId === '' || $subjectId === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'visitorId and subjectId required']);
        exit;
    }

    $season = max(1, (int) ($body['season'] ?? 1));
    $episode = max(1, (int) ($body['episode'] ?? 1));
    $lastTime = max(0, (float) ($body['lastTime'] ?? 0));
    $duration = max(0, (float) ($body['duration'] ?? 0));
    $key = $season * 1000 + $episode;

    $state = wp_read($file);
    if (!isset($state['visitors'][$visitorId])) {
        $state['visitors'][$visitorId] = ['progress' => [], 'updatedAt' => 0];
    }

    $current = $state['visitors'][$visitorId]['progress'][$subjectId] ?? [
        'lastEpisode' => 1,
        'lastSeason' => 1,
        'completedEpisodes' => [],
        'updatedAt' => 0,
    ];

    $completed = $current['completedEpisodes'] ?? [];
    if (is_array($body['completedEpisodes'] ?? null)) {
        $completed = array_values(array_unique(array_map('intval', $body['completedEpisodes'])));
        $completed = array_filter($completed, fn($e) => $e >= 1001);
    }
    if (!empty($body['markComplete'])) {
        $completed[] = $key;
        $completed = array_values(array_unique(array_map('intval', $completed)));
    }

    $state['visitors'][$visitorId]['progress'][$subjectId] = [
        'lastSeason' => $season,
        'lastEpisode' => $episode,
        'lastTime' => $lastTime,
        'duration' => $duration,
        'completedEpisodes' => array_values(array_unique(array_map('intval', $completed))),
        'updatedAt' => time(),
    ];
    $state['visitors'][$visitorId]['updatedAt'] = time();

    if (count($state['visitors']) > 5000) {
        uasort($state['visitors'], fn($a, $b) => ($b['updatedAt'] ?? 0) <=> ($a['updatedAt'] ?? 0));
        $state['visitors'] = array_slice($state['visitors'], 0, 4000, true);
    }

    if (!wp_write($file, $state)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to save progress']);
        exit;
    }

    echo json_encode([
        'success' => true,
        'data' => $state['visitors'][$visitorId]['progress'][$subjectId],
    ]);
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'error' => 'Method not allowed']);
