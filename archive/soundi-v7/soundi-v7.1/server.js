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

  console.log('[Soundi AI] OpenAI 요청 시작');
  console.log(`[Soundi AI] 모델: ${OPENAI_MODEL}`);

  const compactPayload = {
    language: payload.language,
    intent: payload.intent,
    vat: payload.vat,
    blockFeatures: payload.blockFeatures,
    composition: {
      primaryMood: payload.composition?.primaryMood,
      secondaryMood: payload.composition?.secondaryMood,
      energy: payload.composition?.energy,
      tension: payload.composition?.tension,
      brightness: payload.composition?.brightness,
      density: payload.composition?.density,
      highRatio: payload.composition?.highRatio,
      lowRatio: payload.composition?.lowRatio,
      chordRatio: payload.composition?.chordRatio,
      repetitionStrength: payload.composition?.repetitionStrength,
      longNoteRatio: payload.composition?.longNoteRatio,
      shortNoteRatio: payload.composition?.shortNoteRatio,
      rhythmVariation: payload.composition?.rhythmVariation
    }
  };

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      max_output_tokens: 1200,
      reasoning: { effort: 'low' },
      instructions: [
        'You analyze symbolic block-composition data for Soundi.',
        'Do not claim to hear audio. Use only the supplied numeric and symbolic features.',
        'Return JSON only with exactly two keys: summary and gapAnalysis.',
        'summary: one short sentence describing the current composition itself, grounded in register, note length, density, repetition, energy, or harmony.',
        'gapAnalysis: an array of 2 short sentences comparing the current composition with the user intent and explaining what musical qualities need to change.',
        'Do not give step-by-step edit instructions; the client creates those deterministically.',
        'Avoid praise, metaphors, vague language, and repeated information.',
        'For Korean, use a natural friendly 해요체 ending such as ~해요, ~보여요, ~좋아요. Do not use report-style endings such as ~이다, ~한다, ~해야 한다, ~필요하다.',
        'Phrase comparisons as helpful guidance, not commands. Prefer expressions like ~하면 더 잘 어울려요, ~을 늘리면 좋아요, ~을 줄여보세요.',
        'Do not sound like an academic report or evaluation sheet. Write as a calm music-making assistant speaking directly to the user.',
        'Never show internal analysis terms or model variables to the user, including arousal, valence, tension, VAT, pitchHeight, rhythmDensity, repetitionStrength, harmonyStability, or similar technical labels.',
        'Translate all internal analysis into plain everyday language. For example, instead of saying arousal is low, say the song feels calm or has less movement; instead of high tension, say the harmony feels more unsettled or tense.',
        'Use words that a beginner with no music-theory background can understand. Prefer simple phrases such as 음이 자주 움직여요, 블록 사이가 촘촘해요, 높은 음이 많아요, 긴 음이 많아요, 같은 패턴이 자주 반복돼요.',
        'Keep each sentence conversational and easy to scan. Avoid English terms in parentheses and avoid specialist vocabulary unless it is a visible Soundi UI label.',
        'If language is ko, write Korean only. If language is en, write English only.'
      ].join(' '),
      input: JSON.stringify(compactPayload)
    })
  });

  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error?.message || 'OpenAI request failed');
    error.statusCode = response.status;
    throw error;
  }

  if (data.status === 'incomplete') {
    console.warn('[Soundi AI] OpenAI 응답 미완료', data.incomplete_details || {});
  }

  const outputText = getOutputText(data);
  console.log('[Soundi AI] OpenAI 응답 성공');
  console.log(`[Soundi AI] 출력 길이: ${outputText.length}자`);

  if (!outputText.trim()) {
    const reason = data.incomplete_details?.reason || data.status || 'empty_output';
    const error = new Error(`Empty model response (${reason})`);
    error.statusCode = 502;
    throw error;
  }

  const parsed = extractJson(outputText);
  const gapAnalysis = Array.isArray(parsed.gapAnalysis)
    ? parsed.gapAnalysis.slice(0, 3).map(String).filter(Boolean)
    : parsed.gapAnalysis
      ? [String(parsed.gapAnalysis)]
      : [];

  return {
    summary: String(parsed.summary || ''),
    gapAnalysis
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
    console.error('[Soundi AI] OpenAI 호출 실패', error);
    console.log('[Soundi AI] 로컬 분석으로 전환');
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
    res.writeHead(200, {
      'Content-Type': mimeTypes[path.extname(filePath)] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
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
  console.log(`soundi v7 running at http://localhost:${PORT}/ (${aiState})`);
});
