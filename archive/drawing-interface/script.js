const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');

const colorPalette = document.getElementById('colorPalette');
const toolButtons = document.getElementById('toolButtons');
const clearButton = document.getElementById('clearButton');
const sendButton = document.getElementById('sendButton');
const currentToolLabel = document.getElementById('currentTool');
const currentColorLabel = document.getElementById('currentColor');
const elementCountLabel = document.getElementById('elementCount');
const jsonPreview = document.getElementById('jsonPreview');
const appShell = document.getElementById('appShell');
const panelToggle = document.getElementById('panelToggle');
const workspace = document.getElementById('workspace');
const panelHeader = document.getElementById('panelHeader');
const zoomOutButton = document.getElementById('zoomOutButton');
const zoomInButton = document.getElementById('zoomInButton');
const fitButton = document.getElementById('fitButton');
const zoomLabel = document.getElementById('zoomLabel');

const colorMap = {
  yellow: '#ffd400',
  blue: '#2563eb',
  red: '#ef4444',
  green: '#22c55e',
  orange: '#f97316',
  violet: '#8b5cf6',
  white: '#ffffff',
  black: '#111111'
};

const timbreMap = {
  yellow: { family: 'bright-high', label: '밝은 고음', instruments: ['piccolo', 'trumpet', 'bell'] },
  blue: { family: 'deep-low', label: '깊은 저음', instruments: ['cello', 'double-bass', 'organ'] },
  red: { family: 'strong-percussive', label: '강한 타격음', instruments: ['drum', 'timpani', 'percussion'] },
  green: { family: 'stable-mid', label: '안정적인 중음', instruments: ['viola', 'clarinet', 'soft-synth'] },
  orange: { family: 'warm-mid-high', label: '따뜻한 중고음', instruments: ['alto-saxophone', 'horn', 'handbell'] },
  violet: { family: 'dark-low', label: '어두운 저음', instruments: ['bassoon', 'english-horn', 'dark-pad'] },
  white: { family: 'delicate-high', label: '여린 고음', instruments: ['glockenspiel', 'breath', 'thin-pad'] },
  black: { family: 'heavy-low', label: '무거운 저음', instruments: ['bass-drum', 'sub-bass', 'silence'] }
};

const musicConfig = {
  timeRangeSeconds: 16,
  midiPitchRange: { min: 36, max: 96 },
  lineDurationRangeSeconds: { min: 0.2, max: 8 },
  planeDurationRangeSeconds: { min: 0.4, max: 8 },
  dotDurationSeconds: 0.12
};

let selectedColor = 'yellow';
let selectedTool = 'dot';
let drawingData = [];
let activeStroke = null;
let startPoint = null;
let previewPlane = null;
let isDrawing = false;
let isDraggingPanel = false;
let isPanningWorkspace = false;
let panelWidth = 324;
let panelPosition = { x: 16, y: 16 };
let panelDragOffset = { x: 0, y: 0 };
let zoom = 1;
let pan = { x: 0, y: 0 };
let panStart = null;

// 향후 TouchDesigner WebSocket 연결용 준비 코드
// const socket = new WebSocket('ws://YOUR_TOUCHDESIGNER_SERVER');
// socket.addEventListener('open', () => console.log('WebSocket connected'));

function sendDrawingData(data) {
  const payload = Array.isArray(data) ? createTouchDesignerPayload(data) : createTouchDesignerPayload([data]);
  console.log('TouchDesigner payload:', payload);
  // if (socket && socket.readyState === WebSocket.OPEN) {
  //   socket.send(JSON.stringify(payload));
  // }
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  redrawCanvas();
}

function updateArtboardTransform() {
  zoomLabel.textContent = `${Math.round(zoom * 100)}%`;
  redrawCanvas();
}

function setZoom(nextZoom, focalPoint = null) {
  const next = clamp(nextZoom, 0.75, 1.6);
  const rect = canvas.getBoundingClientRect();
  const focus = focalPoint ?? {
    x: rect.width / 2,
    y: rect.height / 2
  };
  const worldX = (focus.x - pan.x) / zoom;
  const worldY = (focus.y - pan.y) / zoom;

  zoom = next;
  pan = {
    x: focus.x - worldX * zoom,
    y: focus.y - worldY * zoom
  };
  updateArtboardTransform();
}

function fitArtboard() {
  zoom = 1;
  pan = { x: 0, y: 0 };
  updateArtboardTransform();
}

function getCanvasSize() {
  const rect = canvas.getBoundingClientRect();
  return { width: rect.width, height: rect.height };
}

function getPointerPosition(event) {
  const rect = canvas.getBoundingClientRect();
  const x = Math.min(Math.max(event.clientX - rect.left, 0), rect.width);
  const y = Math.min(Math.max(event.clientY - rect.top, 0), rect.height);
  return { x, y };
}

function normalizePoint(point) {
  const { width, height } = getCanvasSize();
  return {
    x: Number((((point.x - pan.x) / zoom) / width).toFixed(4)),
    y: Number((((point.y - pan.y) / zoom) / height).toFixed(4))
  };
}

function denormalizePoint(point) {
  const { width, height } = getCanvasSize();
  return {
    x: point.x * width * zoom + pan.x,
    y: point.y * height * zoom + pan.y
  };
}

function normalizedDistance(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function drawGrid() {
  const { width, height } = getCanvasSize();
  const baseCellSize = 54;
  const cellSize = baseCellSize * zoom;
  const offsetX = ((pan.x % cellSize) + cellSize) % cellSize;
  const offsetY = ((pan.y % cellSize) + cellSize) % cellSize;

  ctx.save();
  ctx.strokeStyle = '#e8e8e8';
  ctx.lineWidth = 1;

  for (let x = offsetX; x <= width; x += cellSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  for (let y = offsetY; y <= height; y += cellSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  ctx.restore();
}

function drawDot(element) {
  const point = denormalizePoint({ x: element.x, y: element.y });
  const radius = Math.sqrt(element.area / Math.PI) * Math.min(...Object.values(getCanvasSize())) * zoom;

  ctx.save();
  ctx.fillStyle = colorMap[element.color];
  ctx.beginPath();
  ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
  ctx.fill();
  if (element.color === 'white') {
    ctx.strokeStyle = '#bdbdbd';
    ctx.stroke();
  }
  ctx.restore();
}

function drawLine(element) {
  if (!element.points.length) return;

  ctx.save();
  ctx.strokeStyle = colorMap[element.color];
  ctx.lineWidth = 5 * zoom;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();

  element.points.forEach((point, index) => {
    const p = denormalizePoint(point);
    if (index === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });

  ctx.stroke();
  ctx.restore();
}

function drawPlane(element) {
  const origin = denormalizePoint({ x: element.x, y: element.y });
  const { width, height } = getCanvasSize();

  ctx.save();
  ctx.fillStyle = hexToRgba(colorMap[element.color], 0.35);
  ctx.fillRect(origin.x, origin.y, element.width * width * zoom, element.height * height * zoom);
  ctx.restore();
}

function redrawCanvas() {
  const { width, height } = getCanvasSize();
  ctx.clearRect(0, 0, width, height);
  drawGrid();
  drawingData.forEach(drawElement);

  if (previewPlane) {
    drawPlane(previewPlane);
  }
}

function drawElement(element) {
  if (element.type === 'dot') drawDot(element);
  if (element.type === 'line') drawLine(element);
  if (element.type === 'plane') drawPlane(element);
}

function hexToRgba(hex, alpha) {
  const normalized = hex.replace('#', '');
  const bigint = parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function updateStatus() {
  if (currentToolLabel) currentToolLabel.textContent = capitalize(selectedTool);
  if (currentColorLabel) currentColorLabel.textContent = capitalize(selectedColor);
  if (elementCountLabel) elementCountLabel.textContent = drawingData.length;
  updateJsonPreview();
}

function setPanelWidth(width) {
  panelWidth = clamp(width, 280, 460);
  document.documentElement.style.setProperty('--panel-width', `${panelWidth}px`);
}

function setPanelPosition(x, y) {
  const maxX = Math.max(12, window.innerWidth - controlPanel.offsetWidth - 12);
  const maxY = Math.max(12, window.innerHeight - controlPanel.offsetHeight - 12);
  panelPosition = {
    x: clamp(x, 12, maxX),
    y: clamp(y, 12, maxY)
  };
  controlPanel.style.left = `${panelPosition.x}px`;
  controlPanel.style.top = `${panelPosition.y}px`;
}

function setPanelCollapsed(collapsed) {
  appShell.classList.toggle('is-panel-collapsed', collapsed);
  panelToggle.setAttribute('aria-expanded', String(!collapsed));
  panelToggle.setAttribute('aria-label', collapsed ? 'Expand controller' : 'Collapse controller');
  panelToggle.querySelector('span').textContent = collapsed ? '+' : '−';
  window.setTimeout(() => setPanelPosition(panelPosition.x, panelPosition.y), 230);
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function clamp(value, min = 0, max = 1) {
  return Math.min(Math.max(value, min), max);
}

function round(value, digits = 4) {
  return Number(value.toFixed(digits));
}

function mapPitch(y) {
  const normalized = clamp(1 - y);
  const { min, max } = musicConfig.midiPitchRange;
  return {
    normalized: round(normalized),
    midi: Math.round(min + normalized * (max - min))
  };
}

function mapStartTime(x) {
  return round(clamp(x) * musicConfig.timeRangeSeconds);
}

function mapVolume(area) {
  return round(clamp(Math.sqrt(Math.max(area, 0))));
}

function getElementStartX(element) {
  if (element.type === 'line') return element.points[0]?.x ?? 0;
  return element.x;
}

function getElementAnchorY(element) {
  if (element.type === 'line') {
    const total = element.points.reduce((sum, point) => sum + point.y, 0);
    return total / element.points.length;
  }

  if (element.type === 'plane') {
    return element.y + element.height / 2;
  }

  return element.y;
}

function getLineDuration(length) {
  const { min, max } = musicConfig.lineDurationRangeSeconds;
  return round(min + clamp(length) * (max - min));
}

function getPlaneDuration(width) {
  const { min, max } = musicConfig.planeDurationRangeSeconds;
  return round(min + clamp(width) * (max - min));
}

function classifyRhythm(interval) {
  if (interval === null) return 'initial';
  if (interval <= 0.08) return 'fast';
  if (interval <= 0.18) return 'medium';
  return 'slow';
}

function calculateDotRhythmMap(elements) {
  const dots = elements
    .map((element, index) => ({ element, index }))
    .filter(({ element }) => element.type === 'dot')
    .sort((a, b) => a.element.x - b.element.x);

  const rhythmByIndex = new Map();

  dots.forEach(({ element, index }, dotOrder) => {
    const previousDot = dots[dotOrder - 1]?.element;
    const interval = previousDot ? round(Math.abs(element.x - previousDot.x)) : null;

    rhythmByIndex.set(index, {
      intervalNormalized: interval,
      intervalSeconds: interval === null ? null : round(interval * musicConfig.timeRangeSeconds),
      density: classifyRhythm(interval)
    });
  });

  return rhythmByIndex;
}

function createMusicMetadata(element, rhythm = null) {
  const pitch = mapPitch(getElementAnchorY(element));
  const shared = {
    startTimeSeconds: mapStartTime(getElementStartX(element)),
    pitch,
    volume: mapVolume(element.area ?? 0),
    timbre: timbreMap[element.color]
  };

  if (element.type === 'dot') {
    return {
      ...shared,
      behavior: 'short-note',
      durationSeconds: musicConfig.dotDurationSeconds,
      rhythm
    };
  }

  if (element.type === 'line') {
    return {
      ...shared,
      behavior: 'sustained-note',
      durationSeconds: getLineDuration(element.length)
    };
  }

  return {
    ...shared,
    behavior: 'chord-or-layer',
    durationSeconds: getPlaneDuration(element.width)
  };
}

function createTouchDesignerPayload(elements = drawingData) {
  const rhythmByIndex = calculateDotRhythmMap(elements);

  return {
    schemaVersion: '1.0',
    type: 'drawing-score',
    canvas: {
      aspectRatio: '16:9',
      coordinateSystem: 'normalized',
      timeRangeSeconds: musicConfig.timeRangeSeconds,
      midiPitchRange: musicConfig.midiPitchRange
    },
    mappingRules: {
      x: 'startTime',
      y: 'pitch',
      area: 'volume',
      dotSpacing: 'rhythm',
      color: 'timbre',
      lineLength: 'duration',
      shapeType: {
        dot: 'short-note',
        line: 'sustained-note',
        plane: 'chord-or-layer'
      }
    },
    elements: elements.map((element, index) => ({
      id: `element-${index + 1}`,
      ...element,
      music: createMusicMetadata(element, rhythmByIndex.get(index) ?? null)
    }))
  };
}

function updateJsonPreview() {
  if (!jsonPreview) return;
  jsonPreview.textContent = JSON.stringify(createTouchDesignerPayload(), null, 2);
}

function createDot(point) {
  const normalized = normalizePoint(point);
  const radius = 9;
  const { width, height } = getCanvasSize();
  const normalizedRadius = radius / Math.min(width, height);
  const dot = {
    type: 'dot',
    x: normalized.x,
    y: normalized.y,
    color: selectedColor,
    area: Number((Math.PI * normalizedRadius * normalizedRadius).toFixed(4))
  };

  drawingData.push(dot);
  drawDot(dot);
  updateStatus();
  sendDrawingData(dot);
}

function beginLine(point) {
  const normalized = normalizePoint(point);
  activeStroke = {
    type: 'line',
    color: selectedColor,
    points: [normalized],
    length: 0,
    area: 0.004
  };
}

function extendLine(point) {
  if (!activeStroke) return;
  const normalized = normalizePoint(point);
  const previous = activeStroke.points[activeStroke.points.length - 1];
  const delta = normalizedDistance(previous, normalized);

  if (delta < 0.002) return;

  activeStroke.points.push(normalized);
  activeStroke.length = Number((activeStroke.length + delta).toFixed(4));
  redrawCanvas();
  drawLine(activeStroke);
}

function finishLine() {
  if (!activeStroke || activeStroke.points.length < 1) return;
  drawingData.push(activeStroke);
  sendDrawingData(activeStroke);
  activeStroke = null;
  redrawCanvas();
  updateStatus();
}

function beginPlane(point) {
  startPoint = point;
  previewPlane = createPlaneElement(point, point);
  redrawCanvas();
}

function updatePlane(point) {
  if (!startPoint) return;
  previewPlane = createPlaneElement(startPoint, point);
  redrawCanvas();
}

function finishPlane() {
  if (!previewPlane) return;
  drawingData.push(previewPlane);
  sendDrawingData(previewPlane);
  previewPlane = null;
  startPoint = null;
  redrawCanvas();
  updateStatus();
}

function createPlaneElement(a, b) {
  const { width, height } = getCanvasSize();
  const normalizedA = {
    x: (a.x - pan.x) / zoom,
    y: (a.y - pan.y) / zoom
  };
  const normalizedB = {
    x: (b.x - pan.x) / zoom,
    y: (b.y - pan.y) / zoom
  };
  const left = Math.min(normalizedA.x, normalizedB.x);
  const top = Math.min(normalizedA.y, normalizedB.y);
  const planeWidth = Math.abs(normalizedB.x - normalizedA.x);
  const planeHeight = Math.abs(normalizedB.y - normalizedA.y);

  return {
    type: 'plane',
    x: Number((left / width).toFixed(4)),
    y: Number((top / height).toFixed(4)),
    width: Number((planeWidth / width).toFixed(4)),
    height: Number((planeHeight / height).toFixed(4)),
    color: selectedColor,
    area: Number(((planeWidth / width) * (planeHeight / height)).toFixed(4))
  };
}

workspace.addEventListener('pointerdown', (event) => {
  if (event.target !== workspace) return;
  isPanningWorkspace = true;
  panStart = { x: event.clientX - pan.x, y: event.clientY - pan.y };
  workspace.setPointerCapture(event.pointerId);
});

workspace.addEventListener('pointermove', (event) => {
  if (!isPanningWorkspace || !panStart) return;
  pan = { x: event.clientX - panStart.x, y: event.clientY - panStart.y };
  updateArtboardTransform();
});

function stopWorkspacePan(event) {
  if (!isPanningWorkspace) return;
  isPanningWorkspace = false;
  panStart = null;
  if (event.pointerId) workspace.releasePointerCapture(event.pointerId);
}

workspace.addEventListener('pointerup', stopWorkspacePan);
workspace.addEventListener('pointercancel', stopWorkspacePan);
workspace.addEventListener('wheel', (event) => {
  event.preventDefault();
  const rect = canvas.getBoundingClientRect();
  setZoom(zoom + (event.deltaY < 0 ? 0.08 : -0.08), {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  });
}, { passive: false });

function beginWorkspacePan(event) {
  isPanningWorkspace = true;
  panStart = { x: event.clientX - pan.x, y: event.clientY - pan.y };
  workspace.setPointerCapture(event.pointerId);
}

canvas.addEventListener('pointerdown', (event) => {
  event.preventDefault();

  if (event.pointerType === 'touch') {
    beginWorkspacePan(event);
    return;
  }

  canvas.setPointerCapture(event.pointerId);
  isDrawing = true;
  const point = getPointerPosition(event);

  if (selectedTool === 'dot') createDot(point);
  if (selectedTool === 'line') beginLine(point);
  if (selectedTool === 'plane') beginPlane(point);
});

canvas.addEventListener('pointermove', (event) => {
  if (event.pointerType === 'touch' && isPanningWorkspace && panStart) {
    pan = { x: event.clientX - panStart.x, y: event.clientY - panStart.y };
    updateArtboardTransform();
    return;
  }

  if (!isDrawing) return;
  event.preventDefault();
  const point = getPointerPosition(event);

  if (selectedTool === 'line') extendLine(point);
  if (selectedTool === 'plane') updatePlane(point);
});

function endPointerInteraction(event) {
  if (event.pointerType === 'touch') {
    stopWorkspacePan(event);
    return;
  }

  if (!isDrawing) return;
  event.preventDefault();
  isDrawing = false;

  if (selectedTool === 'line') finishLine();
  if (selectedTool === 'plane') finishPlane();
}

canvas.addEventListener('pointerup', endPointerInteraction);
canvas.addEventListener('pointercancel', endPointerInteraction);

panelToggle.addEventListener('click', (event) => {
  event.stopPropagation();
  setPanelCollapsed(!appShell.classList.contains('is-panel-collapsed'));
});

panelHeader.addEventListener('pointerdown', (event) => {
  if (event.target.closest('button')) return;
  isDraggingPanel = true;
  panelDragOffset = { x: event.clientX - panelPosition.x, y: event.clientY - panelPosition.y };
  panelHeader.setPointerCapture(event.pointerId);
});

panelHeader.addEventListener('pointermove', (event) => {
  if (!isDraggingPanel) return;
  setPanelPosition(event.clientX - panelDragOffset.x, event.clientY - panelDragOffset.y);
});

function stopPanelDrag(event) {
  if (!isDraggingPanel) return;
  isDraggingPanel = false;
  if (event.pointerId) panelHeader.releasePointerCapture(event.pointerId);
}

panelHeader.addEventListener('pointerup', stopPanelDrag);
panelHeader.addEventListener('pointercancel', stopPanelDrag);

zoomOutButton.addEventListener('click', () => setZoom(zoom - 0.1));
zoomInButton.addEventListener('click', () => setZoom(zoom + 0.1));
fitButton.addEventListener('click', fitArtboard);

colorPalette.addEventListener('click', (event) => {
  const button = event.target.closest('[data-color]');
  if (!button) return;

  selectedColor = button.dataset.color;
  colorPalette.querySelectorAll('.color-button').forEach((item) => item.classList.remove('is-active'));
  button.classList.add('is-active');
  updateStatus();
});

toolButtons.addEventListener('click', (event) => {
  const button = event.target.closest('[data-tool]');
  if (!button) return;

  selectedTool = button.dataset.tool;
  toolButtons.querySelectorAll('.tool-button').forEach((item) => item.classList.remove('is-active'));
  button.classList.add('is-active');
  updateStatus();
});

clearButton.addEventListener('click', () => {
  drawingData.length = 0;
  activeStroke = null;
  previewPlane = null;
  startPoint = null;
  redrawCanvas();
  updateStatus();
});

sendButton.addEventListener('click', () => {
  sendDrawingData(drawingData);
});

window.addEventListener('resize', () => {
  resizeCanvas();
  setPanelPosition(panelPosition.x, panelPosition.y);
});
window.addEventListener('orientationchange', () => {
  resizeCanvas();
  setPanelPosition(panelPosition.x, panelPosition.y);
});

setPanelWidth(panelWidth);
setPanelPosition(panelPosition.x, panelPosition.y);
updateArtboardTransform();
resizeCanvas();
updateStatus();

// 디버깅 또는 외부 연동 준비를 위해 전역에서 접근 가능하게 노출
window.drawingData = drawingData;
window.sendDrawingData = sendDrawingData;
window.createTouchDesignerPayload = createTouchDesignerPayload;
