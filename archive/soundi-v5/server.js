const http = require('http');
const fs = require('fs');
const path = require('path');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) return;
    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    if (!key || process.env[key]) return;
    process.env[key] = rawValue.replace(/^[\"']|[\"']$/g, '');
  });
}

loadEnvFile(path.join(__dirname, '.env'));

const PORT = Number(process.env.PORT || 8126);
const HOST = process.env.HOST || '127.0.0.1';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5-nano';
const rootDir = __dirname;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy();
        reject(new Error('Request body too large'));
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function getOutputText(response) {
  if (typeof response.output_text === 'string') return response.output_text;
  const parts = [];
  (response.output || []).forEach((item) => {
    (item.content || []).forEach((content) => {
      if (content.type === 'output_text' && content.text) parts.push(content.text);
    });
  });
  return parts.join('\n');
}

function extractJson(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) throw new Error('Empty model response');
  try {
    return JSON.parse(trimmed);
  } catch (error) {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw error;
    return JSON.parse(match[0]);
  }
}

async function createOpenAIFeedback(payload) {
  if (!OPENAI_API_KEY) {
    const error = new Error('OPENAI_API_KEY is not set');
    error.statusCode = 503;
    throw error;
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      instructions: [
        'You are the With AI analyzer for soundi, a visual grid composition tool.',
        'Use only the given symbolic block data. Do not claim to hear real audio.',
        'soundi maps block data to V-A-T: Valence means bright/dark, Arousal means active/calm, Tension means tense/stable.',
        'Explain how the current composition relates to the user prompt and selected edit direction.',
        'Return only compact JSON with keys: matchScore, summary, strengths, structure, editSummary, visualDirection.',
        'strengths must be an array of 1 to 3 short reasons grounded in pitch, rhythm density, note length, repetition, motion, or harmony stability.',
        'visualDirection must have shape, color, and motion strings.',
        'Use Korean unless language is en.',
        'Keep every sentence short and concrete.',
        'Avoid poetic AI language, praise, metaphors, and vague words.',
        'Do not use phrases like soundscape, magical, special, beautiful, immersive, emotionally rich, or 펼쳐져요.',
        'Do not output markdown.'
      ].join(' '),
      input: JSON.stringify(payload)
    })
  });

  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error?.message || 'OpenAI request failed');
    error.statusCode = response.status;
    throw error;
  }

  const parsed = extractJson(getOutputText(data));
  return {
    matchScore: Math.max(0, Math.min(100, Number(parsed.matchScore) || 0)),
    summary: String(parsed.summary || ''),
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 3).map(String) : [],
    structure: String(parsed.structure || ''),
    editSummary: String(parsed.editSummary || ''),
    visualDirection: {
      shape: String(parsed.visualDirection?.shape || ''),
      color: String(parsed.visualDirection?.color || ''),
      motion: String(parsed.visualDirection?.motion || '')
    }
  };
}

async function handleAnalyze(req, res) {
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return;
  }
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }
  try {
    const payload = JSON.parse(await readBody(req));
    const feedback = await createOpenAIFeedback(payload);
    sendJson(res, 200, { feedback });
  } catch (error) {
    sendJson(res, error.statusCode || 500, { error: error.message || 'Analysis failed' });
  }
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(url.pathname);
  const requestedPath = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.normalize(path.join(rootDir, requestedPath));
  if (!filePath.startsWith(rootDir)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': mimeTypes[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/analyze')) {
    handleAnalyze(req, res);
    return;
  }
  serveStatic(req, res);
});

server.listen(PORT, HOST, () => {
  const aiState = OPENAI_API_KEY ? `OpenAI model ${OPENAI_MODEL}` : 'local fallback only';
  console.log(`soundi v5 running at http://localhost:${PORT}/ (${aiState})`);
});
