'use strict';

/* =========================================================
   Camino al 70.3 — todo vive en el navegador (localStorage).
   ========================================================= */

const STORE_KEY = 'tri703:v1';

const SPORTS = {
  swim:     { label: 'Natación', emoji: '🏊', color: 'var(--swim)' },
  bike:     { label: 'Ciclismo', emoji: '🚴', color: 'var(--bike)' },
  run:      { label: 'Carrera',  emoji: '🏃', color: 'var(--run)' },
  strength: { label: 'Fuerza',   emoji: '🏋️', color: 'var(--strength)' },
  other:    { label: 'Otro',     emoji: '⚡', color: 'var(--other)' }
};
const STATUS = {
  done:    { label: 'Hecho',      emoji: '✅' },
  partial: { label: 'Parcial',    emoji: '🟡' },
  skipped: { label: 'No lo hice', emoji: '❌' }
};
// RPE por defecto de cada nivel (para la carga sRPE = RPE × minutos, método Foster).
const EFFORTS = {
  easy:   { label: 'Fácil', emoji: '😌', rpe: 3 },
  medium: { label: 'Medio', emoji: '😤', rpe: 6 },
  hard:   { label: 'Duro',  emoji: '🥵', rpe: 8 }
};
const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const FEELINGS = ['😫', '😕', '😐', '🙂', '🤩'];

const QUOTES = [
  ['Anything is possible.', 'Lema Ironman'],
  ['La disciplina es elegir entre lo que querés ahora y lo que más querés.', 'Abraham Lincoln'],
  ['No cuenta los días, hacé que los días cuenten.', 'Muhammad Ali'],
  ['El dolor es temporal. Rendirse dura para siempre.', 'Lance Armstrong'],
  ['Los campeones siguen jugando hasta que lo hacen bien.', 'Billie Jean King'],
  ['Entrená lento para correr rápido: la Z2 construye el motor.', 'Principio 80/20'],
  ['Somos lo que hacemos repetidamente. La excelencia es un hábito.', 'Will Durant'],
  ['La consistencia le gana a la intensidad.', 'Sabiduría de triatleta'],
  ['Si te parece fácil, es porque estás haciendo bien la Z2.', 'Tu entrenador interno'],
  ['El que nada, pedalea y corre, también descansa. El descanso es entrenamiento.', 'Fisiología básica'],
  ['Cada brazada de hoy es un minuto ganado en abril.', 'Camino al 70.3'],
  ['No tenés que ser extremo, solo constante.', 'Anónimo'],
  ['Tu único rival es el de ayer.', 'Anónimo'],
  ['Comé en los fondos: 60–90 g de carbos por hora no son opcionales.', 'Nutrición deportiva'],
  ['Las carreras se ganan en los entrenamientos que nadie ve.', 'Anónimo'],
  ['113 km. Un día. Una línea de llegada. Vamos.', 'Camino al 70.3']
];

/* ---------------- Fechas ---------------- */
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
const todayISO = () => iso(new Date());
const mondayOf = s => { const d = parse(s); const wd = (d.getDay() + 6) % 7; d.setDate(d.getDate() - wd); return iso(d); };
const daysBetween = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);
const fmtDay = s => { const d = parse(s); return `${DAY_NAMES[(d.getDay() + 6) % 7]} ${d.getDate()} ${MONTHS[d.getMonth()]}`; };
const fmtShort = s => { const d = parse(s); return `${d.getDate()} ${MONTHS[d.getMonth()]}`; };
const fmtMin = m => {
  m = Math.round(m || 0);
  if (m < 60) return `${m}'`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h}h${pad(r)}` : `${h}h`;
};
const hours = m => (m / 60).toFixed(m >= 600 ? 0 : 1).replace('.0', '');

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------------- Estado ---------------- */
const DEFAULT_STATE = {
  config: {
    name: '',
    raceName: 'Ironman 70.3',
    raceDate: '2027-04-18',
    startDate: '',
    useBundled: true,
    theme: 'auto',
    onboarded: false
  },
  weeks: [],       // semanas importadas por el usuario (mismo formato que plan.js)
  extra: [],       // sesiones sueltas agregadas a mano
  logs: {},        // sessionId -> { status, effort, rpe, minutes, distance, notes, at }
  weekNotes: {}    // weekStart -> { feel, text }
};

let state = load();
let tab = 'today';
let weekCursor = mondayOf(todayISO());

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      return { ...structuredClone(DEFAULT_STATE), ...s, config: { ...DEFAULT_STATE.config, ...s.config } };
    }
  } catch (e) { /* almacenamiento no disponible: arrancamos vacío */ }
  return structuredClone(DEFAULT_STATE);
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
  catch (e) { toast('⚠️ No se pudo guardar en este navegador'); }
}

/* ---------------- Plan ---------------- */
function allWeeks() {
  const map = new Map();
  const bundled = state.config.useBundled ? (window.BUNDLED_PLAN?.weeks || []) : [];
  for (const w of bundled) map.set(w.start, { ...w, source: 'bundled' });
  for (const w of state.weeks) map.set(w.start, { ...w, source: 'user' }); // las importadas pisan
  return [...map.values()].sort((a, b) => a.start.localeCompare(b.start));
}

let _sessionsCache = null;
function allSessions() {
  if (_sessionsCache) return _sessionsCache;
  const out = [];
  for (const w of allWeeks()) {
    (w.sessions || []).forEach((s, i) => {
      out.push({ ...s, id: `${w.start}#${i}`, date: addDays(w.start, s.day ?? 0), week: w.start, source: w.source });
    });
  }
  for (const s of state.extra) out.push({ ...s, week: mondayOf(s.date), source: 'extra' });
  out.sort((a, b) => a.date.localeCompare(b.date));
  return (_sessionsCache = out);
}
const invalidate = () => { _sessionsCache = null; };

const sessionsOn = date => allSessions().filter(s => s.date === date);
const sessionsInWeek = start => allSessions().filter(s => s.week === start);
const weekMeta = start => allWeeks().find(w => w.start === start);

function startDate() {
  if (state.config.startDate) return state.config.startDate;
  const first = allSessions()[0];
  return first ? mondayOf(first.date) : mondayOf(todayISO());
}

/* ---------------- Métricas ---------------- */
const logOf = s => state.logs[s.id];
function doneMinutes(s) {
  const l = logOf(s);
  if (!l || l.status === 'skipped') return 0;
  if (l.minutes) return Number(l.minutes);
  return l.status === 'done' ? (s.duration || 0) : (s.duration || 0) * 0.5;
}
function credit(s) {
  const l = logOf(s);
  if (!l) return 0;
  return l.status === 'done' ? 1 : l.status === 'partial' ? 0.5 : 0;
}
function rpeOf(s) {
  const l = logOf(s);
  if (!l) return 0;
  return Number(l.rpe) || (EFFORTS[l.effort]?.rpe ?? 5);
}
const loadOf = s => doneMinutes(s) * rpeOf(s);

function weekStats(start) {
  const list = sessionsInWeek(start);
  const planned = list.filter(s => s.source !== 'extra');
  const bySport = {};
  for (const k of Object.keys(SPORTS)) bySport[k] = { planned: 0, done: 0 };
  for (const s of list) {
    const k = SPORTS[s.sport] ? s.sport : 'other';
    if (s.source !== 'extra') bySport[k].planned += s.duration || 0;
    bySport[k].done += doneMinutes(s);
  }
  const compliance = planned.length ? planned.reduce((a, s) => a + credit(s), 0) / planned.length : 0;
  return {
    list, planned, bySport, compliance,
    plannedMin: planned.reduce((a, s) => a + (s.duration || 0), 0),
    doneMin: list.reduce((a, s) => a + doneMinutes(s), 0),
    doneCount: list.filter(s => logOf(s) && logOf(s).status !== 'skipped').length,
    load: list.reduce((a, s) => a + loadOf(s), 0)
  };
}

// Día cumplido = todas sus sesiones planificadas registradas como hechas/parciales.
function dayState(date) {
  const list = sessionsOn(date).filter(s => s.source !== 'extra');
  const extras = sessionsOn(date).filter(s => s.source === 'extra' && logOf(s));
  if (!list.length) return extras.length ? 'bonus' : 'rest';
  const c = list.reduce((a, s) => a + credit(s), 0) / list.length;
  const logged = list.every(s => logOf(s));
  if (c >= 1) return 'full';
  if (c >= 0.5) return 'mostly';
  if (c > 0) return 'some';
  return logged ? 'missed' : 'pending';
}

function streak() {
  const t = todayISO();
  const start = startDate();
  let d = t, n = 0;
  while (d >= start) {
    const st = dayState(d);
    if (st === 'full' || st === 'mostly' || st === 'bonus') n++;
    else if (st === 'rest') { /* neutral */ }
    else if (d === t) { /* hoy todavía está en juego */ }
    else break;
    d = addDays(d, -1);
  }
  return n;
}
function bestStreak() {
  const t = todayISO();
  let d = startDate(), cur = 0, best = 0;
  while (d <= t) {
    const st = dayState(d);
    if (st === 'full' || st === 'mostly' || st === 'bonus') { cur++; best = Math.max(best, cur); }
    else if (st !== 'rest' && d !== t) cur = 0;
    d = addDays(d, 1);
  }
  return best;
}

function weekList() {
  const t = mondayOf(todayISO());
  const weeks = new Set(allSessions().map(s => s.week));
  return [...weeks].filter(w => w <= t).sort();
}

function acwr() {
  const weeks = weekList();
  const cur = mondayOf(todayISO());
  const idx = weeks.indexOf(cur);
  const upto = idx >= 0 ? weeks.slice(0, idx + 1) : weeks;
  if (upto.length < 2) return null;
  const acute = weekStats(upto[upto.length - 1]).load;
  const prev = upto.slice(-5, -1).map(w => weekStats(w).load);
  const chronic = prev.reduce((a, b) => a + b, 0) / prev.length;
  if (!chronic) return null;
  return { value: acute / chronic, acute, chronic };
}

/* ---------------- Logros ---------------- */
function badges() {
  const ss = allSessions();
  const done = ss.filter(s => logOf(s) && logOf(s).status !== 'skipped');
  const count = sp => done.filter(s => s.sport === sp).length;
  const totalMin = ss.reduce((a, s) => a + doneMinutes(s), 0);
  const weeks = weekList().map(w => weekStats(w));
  const perfect = weeks.filter(w => w.planned.length && w.compliance >= 1).length;
  const solid = weeks.filter(w => w.planned.length && w.compliance >= 0.8).length;
  const best = bestStreak();
  const hard = done.filter(s => logOf(s).effort === 'hard').length;
  const long = done.filter(s => doneMinutes(s) >= 180).length;
  const brick = done.some(s => /brick|transici/i.test(`${s.title} ${s.tag || ''}`));
  const total = daysBetween(startDate(), state.config.raceDate);
  const half = total > 0 && daysBetween(startDate(), todayISO()) >= total / 2;
  return [
    { i: '👟', n: 'Primer paso', d: 'Primera sesión hecha', ok: done.length >= 1 },
    { i: '🔥', n: 'En llamas', d: 'Racha de 7 días', ok: best >= 7 },
    { i: '☄️', n: 'Imparable', d: 'Racha de 21 días', ok: best >= 21 },
    { i: '💯', n: 'Semana perfecta', d: '100% de una semana', ok: perfect >= 1 },
    { i: '🧱', n: 'Constancia', d: '4 semanas ≥ 80%', ok: solid >= 4 },
    { i: '🐟', n: 'Pez', d: '10 sesiones de natación', ok: count('swim') >= 10 },
    { i: '🚲', n: 'Pedalero', d: '10 sesiones de bici', ok: count('bike') >= 10 },
    { i: '🦵', n: 'Corredor', d: '10 sesiones de carrera', ok: count('run') >= 10 },
    { i: '🏋️', n: 'Hierro', d: '10 sesiones de fuerza', ok: count('strength') >= 10 },
    { i: '🧩', n: 'Brick', d: 'Bici + carrera seguidas', ok: brick },
    { i: '🛣️', n: 'Fondista', d: 'Sesión de 3 h o más', ok: long >= 1 },
    { i: '🥵', n: 'Sufridor', d: '10 sesiones duras', ok: hard >= 10 },
    { i: '⏱️', n: '50 horas', d: '50 h entrenadas', ok: totalMin >= 3000 },
    { i: '🏆', n: '150 horas', d: '150 h entrenadas', ok: totalMin >= 9000 },
    { i: '⛰️', n: 'Mitad del camino', d: 'Pasaste la mitad', ok: half },
    { i: '🏅', n: 'Finisher', d: 'Día de carrera', ok: todayISO() >= state.config.raceDate }
  ];
}

/* ---------------- UI helpers ---------------- */
const $view = document.getElementById('view');
const $modal = document.getElementById('modal');
const $modalBody = document.getElementById('modal-body');

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 2200);
}

function openModal(html) {
  $modalBody.innerHTML = html;
  if (!$modal.open) $modal.showModal();
}
function closeModal() { if ($modal.open) $modal.close(); }
$modal.addEventListener('click', e => { if (e.target === $modal) closeModal(); });
$modal.addEventListener('close', () => render());

function sportOf(s) { return SPORTS[s.sport] || SPORTS.other; }

function statusPill(s) {
  const l = logOf(s);
  if (!l) return `<span class="pill pending">Pendiente</span>`;
  return `<span class="pill ${l.status}">${STATUS[l.status].emoji} ${STATUS[l.status].label}</span>`;
}

function sessionCard(s, { open = false } = {}) {
  const sp = sportOf(s);
  const l = logOf(s) || {};
  const blocks = (s.blocks || []).filter(b => b.text);
  const dur = s.durationLabel || fmtMin(s.duration);
  return `
  <article class="card session" style="--c:${sp.color}" data-id="${esc(s.id)}">
    <div class="head">
      <div class="emoji">${sp.emoji}</div>
      <div style="min-width:0">
        <div class="title">${esc(s.title || sp.label)}</div>
        <div class="sub">
          <span class="chip sport" style="background:${sp.color}">${sp.label}</span>
          <span>⏱ ${esc(dur)}</span>
          ${s.distance ? `<span>📏 ${esc(s.distance)}</span>` : ''}
          ${s.tag ? `<span>🔗 ${esc(s.tag)}</span>` : ''}
        </div>
      </div>
      <div class="status-pill">${statusPill(s)}</div>
    </div>
    ${blocks.length ? `
      <details ${open ? 'open' : ''}>
        <summary>Ver detalle de la sesión</summary>
        <div class="blocks">
          ${blocks.map(b => `<div class="block"><div class="bl">${esc(b.label || '')}</div>${esc(b.text)}</div>`).join('')}
        </div>
      </details>` : ''}
    <div class="log">
      <div class="lbl">¿Cómo te fue?</div>
      <div class="seg">
        ${Object.entries(STATUS).map(([k, v]) => `
          <button class="${k} ${l.status === k ? 'on' : ''}" data-act="status" data-v="${k}">
            <span class="e">${v.emoji}</span>${v.label}
          </button>`).join('')}
      </div>
      ${l.status && l.status !== 'skipped' ? `
        <div class="lbl" style="margin-top:12px">Esfuerzo percibido</div>
        <div class="seg">
          ${Object.entries(EFFORTS).map(([k, v]) => `
            <button class="${k} ${l.effort === k ? 'on' : ''}" data-act="effort" data-v="${k}">
              <span class="e">${v.emoji}</span>${v.label}
            </button>`).join('')}
        </div>
        <details style="border:0;margin-top:6px">
          <summary style="padding:8px 0">Más datos (RPE, tiempo real, notas)</summary>
          <div class="more">
            <label class="field full">RPE (1–10)
              <div class="rpe"><input type="range" min="1" max="10" step="1" value="${l.rpe || EFFORTS[l.effort]?.rpe || 5}" data-act="rpe"><output>${l.rpe || '–'}</output></div>
            </label>
            <label class="field">Minutos reales
              <input type="number" inputmode="numeric" min="0" placeholder="${s.duration || ''}" value="${esc(l.minutes || '')}" data-act="minutes">
            </label>
            <label class="field">Distancia
              <input type="text" placeholder="ej: 42 km" value="${esc(l.distance || '')}" data-act="distance">
            </label>
            <label class="field full">Notas
              <textarea placeholder="Sensaciones, ritmo, pulsaciones, nutrición…" data-act="notes">${esc(l.notes || '')}</textarea>
            </label>
          </div>
        </details>` : ''}
      ${l.status === 'skipped' ? `
        <div class="more" style="grid-template-columns:1fr">
          <label class="field">¿Por qué? (opcional)
            <input type="text" placeholder="Trabajo, lluvia, cansancio…" value="${esc(l.notes || '')}" data-act="notes">
          </label>
        </div>` : ''}
      ${s.source === 'extra' ? `<div style="margin-top:10px;text-align:right"><button class="btn sm danger" data-act="delete-extra">Eliminar sesión</button></div>` : ''}
    </div>
  </article>`;
}

/* ---------------- Vista: Hoy ---------------- */
function renderToday() {
  const t = todayISO();
  const cfg = state.config;
  const daysLeft = daysBetween(t, cfg.raceDate);
  const start = startDate();
  const total = Math.max(1, daysBetween(start, cfg.raceDate));
  const elapsed = Math.min(total, Math.max(0, daysBetween(start, t)));
  const weekN = Math.floor(elapsed / 7) + 1;
  const weeksTotal = Math.ceil(total / 7);
  const todays = sessionsOn(t);
  const ws = weekStats(mondayOf(t));
  const q = QUOTES[(parse(t).getTime() / 86400000 | 0) % QUOTES.length];
  const hour = new Date().getHours();
  const hi = hour < 12 ? 'Buen día' : hour < 20 ? 'Buenas tardes' : 'Buenas noches';

  // Sesiones pasadas (últimos 7 días) sin registrar
  const pending = allSessions().filter(s => s.date < t && s.date >= addDays(t, -7) && !logOf(s) && s.source !== 'extra');
  const tomorrow = sessionsOn(addDays(t, 1));
  const allDone = todays.length && todays.every(s => logOf(s) && logOf(s).status !== 'skipped');

  $view.innerHTML = `
    <section class="hero">
      <div class="tri">🏊🚴🏃</div>
      <div class="greet">${hi}${cfg.name ? `, ${esc(cfg.name)}` : ''} · ${fmtDay(t)}</div>
      ${daysLeft > 0 ? `
        <div class="days">${daysLeft}<small>días</small></div>
        <div class="race">para ${esc(cfg.raceName)} · ${fmtShort(cfg.raceDate)} ${parse(cfg.raceDate).getFullYear()}</div>`
      : daysLeft === 0 ? `<div class="days">HOY</div><div class="race">¡Es el día! 1.9 km · 90 km · 21.1 km. A disfrutarlo 🧡</div>`
      : `<div class="days">🏅</div><div class="race">${esc(cfg.raceName)} completado. ¡Finisher!</div>`}
      <div class="bar"><i style="width:${(elapsed / total * 100).toFixed(1)}%"></i></div>
      <div class="meta"><span>Semana ${Math.min(weekN, weeksTotal)} de ${weeksTotal}</span><span>${Math.round(elapsed / total * 100)}% del camino</span></div>
    </section>

    <div class="stats">
      <div class="stat"><b>🔥 ${streak()}</b><span>días de racha</span></div>
      <div class="stat"><b>${Math.round(ws.compliance * 100)}%</b><span>semana cumplida</span></div>
      <div class="stat"><b>${hours(ws.doneMin)}<small style="font-size:13px">/${hours(ws.plannedMin)}h</small></b><span>horas semana</span></div>
    </div>

    ${pending.length ? `
      <div class="alert" style="margin-top:12px">
        <span>📝</span>
        <div style="flex:1">Tenés <b>${pending.length}</b> sesión${pending.length > 1 ? 'es' : ''} sin registrar de los últimos días.
          <div class="row wrap" style="margin-top:8px">
            ${pending.slice(0, 4).map(s => `<button class="btn sm" data-open="${esc(s.id)}">${sportOf(s).emoji} ${fmtShort(s.date)}</button>`).join('')}
          </div>
        </div>
      </div>` : ''}

    <div class="section-title">
      <h2>${allDone ? '¡Día completo! 🎉' : 'Lo que toca hoy'}</h2>
      <button class="btn sm ghost" data-act="add-extra" data-date="${t}">＋ Sesión extra</button>
    </div>

    <div class="stack">
      ${todays.length ? todays.map(s => sessionCard(s)).join('') : `
        <div class="card rest">
          <div class="big">😴</div>
          <h3>Día de descanso</h3>
          <p class="muted small">El músculo crece cuando descansás. Dormí bien, hidratate y estirá.</p>
        </div>`}
    </div>

    ${noteForToday(t)}

    ${tomorrow.length ? `
      <div class="section-title"><h2>Mañana</h2><span class="muted small">${fmtDay(addDays(t, 1))}</span></div>
      <div class="card">
        ${tomorrow.map(s => `<div class="row" style="padding:4px 0"><span>${sportOf(s).emoji}</span><b style="flex:1">${esc(s.title)}</b><span class="muted small">${esc(s.durationLabel || fmtMin(s.duration))}</span></div>`).join('')}
      </div>` : ''}

    <div class="quote">“${esc(q[0])}” <b>— ${esc(q[1])}</b></div>
  `;
}

function noteForToday(t) {
  const w = weekMeta(mondayOf(t));
  if (!w?.notes?.length) return '';
  const dow = (parse(t).getDay() + 6) % 7;
  const long = sessionsOn(t).some(s => (s.duration || 0) >= 90);
  if (!(dow >= 4 || long)) return '';
  return w.notes.map(n => `
    <div class="alert info" style="margin-top:14px"><span>🍌</span><div><b>${esc(n.title)}</b><div class="small" style="margin-top:2px">${esc(n.text)}</div></div></div>`).join('');
}

/* ---------------- Vista: Semana ---------------- */
function ring(pct, size = 92, stroke = 10, color = 'var(--accent)') {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return `<div class="ring" style="width:${size}px;height:${size}px">
    <svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--card-2)" stroke-width="${stroke}"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - Math.min(1, pct))}"/></svg>
    <div class="v">${Math.round(pct * 100)}%</div></div>`;
}

function renderWeek() {
  const start = weekCursor;
  const ws = weekStats(start);
  const meta = weekMeta(start);
  const t = todayISO();
  const note = state.weekNotes[start] || {};
  const weekIdx = Math.floor(daysBetween(startDate(), start) / 7) + 1;

  $view.innerHTML = `
    <div class="week-nav">
      <button class="icon-btn" data-act="week-prev" aria-label="Semana anterior">‹</button>
      <div class="t">
        <h1 style="font-size:20px">${fmtShort(start)} – ${fmtShort(addDays(start, 6))}</h1>
        <div class="muted small">${weekIdx > 0 ? `Semana ${weekIdx} · ` : ''}${esc(meta?.title || (ws.list.length ? 'Semana' : 'Sin plan cargado'))}</div>
      </div>
      <button class="icon-btn" data-act="week-next" aria-label="Semana siguiente">›</button>
    </div>
    ${start !== mondayOf(t) ? `<div style="text-align:center;margin-top:8px"><button class="btn sm ghost" data-act="week-today">Ir a esta semana</button></div>` : ''}

    <div class="card" style="margin-top:14px">
      <div class="row" style="gap:18px;align-items:center">
        ${ring(ws.compliance)}
        <div class="sport-bars">
          ${['swim', 'bike', 'run', 'strength'].filter(k => ws.bySport[k].planned || ws.bySport[k].done).map(k => {
            const b = ws.bySport[k], p = b.planned ? Math.min(1, b.done / b.planned) : 1;
            return `<div class="sbar" style="--c:${SPORTS[k].color}"><div class="top"><span>${SPORTS[k].emoji} ${SPORTS[k].label}</span><span class="muted">${fmtMin(b.done)} / ${fmtMin(b.planned)}</span></div><div class="track"><i style="width:${p * 100}%"></i></div></div>`;
          }).join('') || '<span class="muted small">Sin sesiones esta semana.</span>'}
        </div>
      </div>
      <div class="row between small muted" style="margin-top:12px">
        <span>✅ ${ws.doneCount}/${ws.planned.length} sesiones</span>
        <span>⏱ ${hours(ws.doneMin)} / ${hours(ws.plannedMin)} h</span>
        <span>⚡ carga ${Math.round(ws.load)}</span>
      </div>
    </div>

    ${meta?.notes?.length ? meta.notes.map(n => `<div class="alert info" style="margin-top:12px"><span>📌</span><div><b>${esc(n.title)}</b><div class="small">${esc(n.text)}</div></div></div>`).join('') : ''}

    <div class="stack" style="margin-top:14px">
      ${[0, 1, 2, 3, 4, 5, 6].map(i => {
        const d = addDays(start, i);
        const list = sessionsOn(d);
        return `<div class="card day ${d === t ? 'today' : ''}">
          <div class="dh">
            <div><span class="dname">${DAY_NAMES[i]} ${parse(d).getDate()}</span>${d === t ? '<span class="tag-today">Hoy</span>' : ''}</div>
            <button class="btn sm ghost" data-act="add-extra" data-date="${d}" aria-label="Agregar sesión">＋</button>
          </div>
          ${list.length ? list.map(s => {
            const l = logOf(s);
            return `<button class="mini" style="--c:${sportOf(s).color}" data-open="${esc(s.id)}">
              <span class="dot"></span>
              <span class="mt"><div><b>${esc(s.title)}</b></div><div class="muted small">${sportOf(s).label} · ${esc(s.durationLabel || fmtMin(s.duration))}${s.source === 'extra' ? ' · extra' : ''}</div></span>
              ${l?.effort && l.status !== 'skipped' ? `<span class="eff" title="${EFFORTS[l.effort].label}">${EFFORTS[l.effort].emoji}</span>` : ''}
              ${statusPill(s)}
            </button>`;
          }).join('') : `<div class="mini muted small" style="cursor:default">😴 Descanso</div>`}
        </div>`;
      }).join('')}
    </div>

    <div class="section-title"><h2>Reflexión de la semana</h2></div>
    <div class="card">
      <div class="lbl small muted" style="margin-bottom:6px;font-weight:600">¿Cómo te sentiste en general?</div>
      <div class="feel">${FEELINGS.map((f, i) => `<button class="${note.feel === i + 1 ? 'on' : ''}" data-act="feel" data-v="${i + 1}">${f}</button>`).join('')}</div>
      <label class="field" style="margin-top:10px">Notas (qué salió bien, qué ajustar, molestias…)
        <textarea data-act="week-text" placeholder="Ej: El brick del martes me costó, la Z2 del sábado salió perfecta…">${esc(note.text || '')}</textarea>
      </label>
    </div>
  `;
}

/* ---------------- Vista: Progreso ---------------- */
// unit: 'h' muestra minutos como horas; fixedMax fija la escala (ej. 100 para %).
function barChart(rows, { height = 150, stacked, keys, colors, unit, fixedMax } = {}) {
  const W = 320, H = height, pad = { l: 30, r: 6, t: 8, b: 20 };
  const n = Math.max(rows.length, 1);
  const raw = Math.max(1, ...rows.map(r => Math.max(stacked ? keys.reduce((a, k) => a + (r[k] || 0), 0) : r.v, r.target || 0)));
  const step = unit === 'h' ? 120 : raw > 2000 ? 1000 : raw > 200 ? 100 : 10;
  const max = fixedMax || Math.ceil(raw / step) * step;
  const bw = Math.min(26, (W - pad.l - pad.r) / n * 0.68);
  const x = i => pad.l + (W - pad.l - pad.r) * (i + 0.5) / n;
  const y = v => pad.t + (H - pad.t - pad.b) * (1 - v / max);
  const ticks = [0, max / 2, max];
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img">`;
  ticks.forEach(tv => { s += `<line class="axis" x1="${pad.l}" x2="${W - pad.r}" y1="${y(tv)}" y2="${y(tv)}" stroke-dasharray="${tv ? '2 3' : ''}"/><text x="${pad.l - 4}" y="${y(tv) + 3}" text-anchor="end">${unit === 'h' ? `${Math.round(tv / 60)}h` : Math.round(tv) + (fixedMax === 100 ? '%' : '')}</text>`; });
  rows.forEach((r, i) => {
    const cx = x(i);
    if (r.target) s += `<rect x="${cx - bw / 2 - 2}" y="${y(r.target)}" width="${bw + 4}" height="${y(0) - y(r.target)}" rx="4" fill="none" stroke="var(--muted)" stroke-opacity=".5" stroke-dasharray="3 2"/>`;
    if (stacked) {
      let acc = 0;
      keys.forEach((k, j) => {
        const v = r[k] || 0; if (!v) return;
        s += `<rect x="${cx - bw / 2}" y="${y(acc + v)}" width="${bw}" height="${y(acc) - y(acc + v)}" fill="${colors[j]}" rx="2"><title>${r.label}: ${SPORTS[k]?.label || k} ${fmtMin(v)}</title></rect>`;
        acc += v;
      });
    } else {
      s += `<rect x="${cx - bw / 2}" y="${y(r.v)}" width="${bw}" height="${y(0) - y(r.v)}" fill="${r.color || 'var(--accent)'}" rx="3"><title>${r.label}: ${Math.round(r.v)}</title></rect>`;
    }
    if (n <= 16 || i % Math.ceil(n / 12) === 0) s += `<text x="${cx}" y="${H - 6}" text-anchor="middle">${r.label}</text>`;
  });
  return s + '</svg>';
}

const wkLabel = w => { const d = parse(w); return `${d.getDate()}/${d.getMonth() + 1}`; };

function renderProgress() {
  const ss = allSessions();
  const weeks = weekList();
  const recent = weeks.slice(-16);
  const ws = recent.map(w => ({ w, st: weekStats(w) }));
  const done = ss.filter(s => logOf(s) && logOf(s).status !== 'skipped');
  const totalMin = ss.reduce((a, s) => a + doneMinutes(s), 0);
  const pastPlanned = ss.filter(s => s.date <= todayISO() && s.source !== 'extra');
  const comp = pastPlanned.length ? pastPlanned.reduce((a, s) => a + credit(s), 0) / pastPlanned.length : 0;
  const eff = { easy: 0, medium: 0, hard: 0 };
  done.forEach(s => { const e = logOf(s).effort; if (e) eff[e] += doneMinutes(s); });
  const effTot = eff.easy + eff.medium + eff.hard;
  const ac = acwr();
  const bySport = { swim: 0, bike: 0, run: 0, strength: 0 };
  ss.forEach(s => { if (bySport[s.sport] !== undefined) bySport[s.sport] += doneMinutes(s); });
  const bd = badges();

  const acColor = !ac ? 'var(--muted)' : ac.value < 0.8 ? 'var(--swim)' : ac.value <= 1.3 ? 'var(--ok)' : ac.value <= 1.5 ? 'var(--warn)' : 'var(--bad)';
  const acText = !ac ? 'Necesitás al menos 2 semanas registradas.'
    : ac.value < 0.8 ? 'Carga por debajo de tu base: estás descargando (ideal en taper o semana de recuperación).'
    : ac.value <= 1.3 ? 'Zona óptima: estás progresando sin pasarte.'
    : ac.value <= 1.5 ? 'Subiste rápido la carga. Priorizá dormir y la Z2.'
    : 'Pico de carga alto: riesgo de lesión/sobreentrenamiento. Considerá aflojar.';

  $view.innerHTML = `
    <h1>Tu progreso</h1>
    <p class="muted small" style="margin:4px 0 0">Desde ${fmtShort(startDate())} · ${weeks.length} semana${weeks.length === 1 ? '' : 's'} de entrenamiento</p>

    <div class="grid-4" style="margin-top:14px">
      <div class="card kpi"><b>${hours(totalMin)} h</b><span>entrenadas</span></div>
      <div class="card kpi"><b>${done.length}</b><span>sesiones hechas</span></div>
      <div class="card kpi"><b>${Math.round(comp * 100)}%</b><span>cumplimiento total</span></div>
      <div class="card kpi"><b>🔥 ${bestStreak()}</b><span>mejor racha</span></div>
    </div>

    <div class="cols-2 stack" style="margin-top:14px">
      <div class="card chart">
        <h3>Horas por semana</h3>
        <p class="muted small" style="margin:2px 0 8px">Barras: hecho por deporte · contorno: planificado</p>
        ${barChart(ws.map(({ w, st }) => ({ label: wkLabel(w), target: st.plannedMin, swim: st.bySport.swim.done, bike: st.bySport.bike.done, run: st.bySport.run.done, strength: st.bySport.strength.done })),
          { stacked: true, unit: 'h', keys: ['swim', 'bike', 'run', 'strength'], colors: ['var(--swim)', 'var(--bike)', 'var(--run)', 'var(--strength)'] })}
        <div class="legend">${['swim', 'bike', 'run', 'strength'].map(k => `<span><i style="background:${SPORTS[k].color}"></i>${SPORTS[k].label}</span>`).join('')}</div>
      </div>

      <div class="card chart">
        <h3>Cumplimiento semanal</h3>
        <p class="muted small" style="margin:2px 0 8px">% de sesiones planificadas que hiciste</p>
        ${barChart(ws.map(({ w, st }) => ({ label: wkLabel(w), v: st.compliance * 100, color: st.compliance >= 0.8 ? 'var(--ok)' : st.compliance >= 0.5 ? 'var(--warn)' : 'var(--bad)' })), { fixedMax: 100 })}
      </div>

      <div class="card chart">
        <h3>Carga de entrenamiento</h3>
        <p class="muted small" style="margin:2px 0 8px">sRPE = esfuerzo × minutos (método Foster)</p>
        ${barChart(ws.map(({ w, st }) => ({ label: wkLabel(w), v: st.load, color: 'var(--accent)' })))}
        <div class="acwr">
          <div class="val" style="color:${acColor}">${ac ? ac.value.toFixed(2) : '—'}</div>
          <div style="flex:1">
            <div class="small" style="font-weight:700">Ratio carga aguda : crónica</div>
            <div class="gauge" style="margin-top:8px">${ac ? `<i style="left:${Math.min(100, ac.value / 2 * 100)}%"></i>` : ''}</div>
          </div>
        </div>
        <p class="small muted" style="margin:8px 0 0">${acText}</p>
      </div>

      <div class="card">
        <h3>Distribución de intensidad</h3>
        <p class="muted small" style="margin:2px 0 0">Los triatletas de fondo apuntan a ~80% fácil / 20% medio-duro.</p>
        ${effTot ? `<div class="effort-bar">
          ${['easy', 'medium', 'hard'].map(k => { const p = eff[k] / effTot * 100; return p ? `<div style="width:${p}%;background:${k === 'easy' ? 'var(--ok)' : k === 'medium' ? 'var(--warn)' : 'var(--bad)'}">${p >= 9 ? Math.round(p) + '%' : ''}</div>` : ''; }).join('')}
        </div>
        <div class="legend"><span><i style="background:var(--ok)"></i>Fácil ${fmtMin(eff.easy)}</span><span><i style="background:var(--warn)"></i>Medio ${fmtMin(eff.medium)}</span><span><i style="background:var(--bad)"></i>Duro ${fmtMin(eff.hard)}</span></div>
        <p class="small" style="margin:8px 0 0">${eff.easy / effTot >= 0.7 ? '👌 Buena base aeróbica.' : '⚠️ Mucho tiempo en medio/duro: cuidá que la Z2 sea realmente suave.'}</p>`
        : '<p class="muted small">Registrá el esfuerzo de tus sesiones para ver esto.</p>'}
        <h3 style="margin-top:18px">Por deporte</h3>
        <div class="sport-bars" style="margin-top:8px">
          ${Object.entries(bySport).map(([k, v]) => `<div class="sbar" style="--c:${SPORTS[k].color}"><div class="top"><span>${SPORTS[k].emoji} ${SPORTS[k].label}</span><span class="muted">${fmtMin(v)}</span></div><div class="track"><i style="width:${totalMin ? v / totalMin * 100 : 0}%"></i></div></div>`).join('')}
        </div>
      </div>
    </div>

    <div class="section-title"><h2>Camino a la carrera</h2><span class="muted small">cada cuadrado es un día</span></div>
    <div class="card">
      ${heatmap()}
      <div class="legend">
        <span><i style="background:var(--ok)"></i>Cumplido</span>
        <span><i style="background:color-mix(in srgb, var(--warn) 70%, var(--card-2))"></i>Parcial</span>
        <span><i style="background:color-mix(in srgb, var(--bad) 60%, var(--card-2))"></i>No hecho</span>
        <span><i style="background:var(--accent)"></i>Carrera</span>
      </div>
      ${phaseTimeline()}
    </div>

    <div class="section-title"><h2>Logros</h2><span class="muted small">${bd.filter(b => b.ok).length}/${bd.length}</span></div>
    <div class="badges">
      ${bd.map(b => `<div class="badge ${b.ok ? '' : 'locked'}"><div class="bi">${b.i}</div><div class="bn">${b.n}</div><div class="bd">${b.d}</div></div>`).join('')}
    </div>
  `;
}

function heatmap() {
  const start = mondayOf(startDate());
  const end = state.config.raceDate;
  const t = todayISO();
  const cells = [];
  for (let d = start; d <= end; d = addDays(d, 1)) {
    let cls = '';
    if (d === end) cls = 'race';
    else if (d > t) cls = 'future';
    else {
      const st = dayState(d);
      cls = { full: 'l4', bonus: 'l4', mostly: 'l3', some: 'l2', missed: 'l1', pending: d === t ? '' : 'l1', rest: 'rest' }[st];
    }
    if (d === t) cls += ' today';
    cells.push(`<span class="${cls}" title="${fmtDay(d)}"></span>`);
  }
  return `<div class="heat">${cells.join('')}</div>`;
}

// Periodización típica de un 70.3 contada hacia atrás desde la carrera.
function phaseTimeline() {
  const race = state.config.raceDate;
  const start = mondayOf(startDate());
  const total = daysBetween(start, race);
  if (total < 28) return '';
  const phases = [
    { n: 'Base', c: 'var(--swim)', from: start },
    { n: 'Construcción', c: 'var(--bike)', from: addDays(race, -16 * 7) },
    { n: 'Específico', c: 'var(--run)', from: addDays(race, -8 * 7) },
    { n: 'Taper', c: 'var(--strength)', from: addDays(race, -14) }
  ].filter(p => p.from >= start || p.n === 'Base');
  const now = Math.min(1, Math.max(0, daysBetween(start, todayISO()) / total));
  return `<div class="timeline">
    ${phases.map((p, i) => { const to = phases[i + 1]?.from || race; const w = daysBetween(p.from, to) / total * 100; return `<div style="width:${w}%;background:${p.c}">${w > 9 ? p.n : ''}</div>`; }).join('')}
    <span class="now" style="left:${now * 100}%"></span>
  </div>
  <p class="muted small" style="margin:6px 0 0">Fases de referencia contando hacia atrás desde la carrera. La línea marca dónde estás hoy.</p>`;
}

/* ---------------- Vista: Ajustes ---------------- */
const AI_PROMPT = `Convertí este plan de entrenamiento semanal a JSON con EXACTAMENTE este formato (sin texto extra):
{
  "start": "AAAA-MM-DD",            // fecha del LUNES de la semana
  "title": "Nombre de la semana",
  "notes": [{ "title": "...", "text": "..." }],
  "sessions": [
    {
      "day": 0,                     // 0=lunes ... 6=domingo
      "sport": "swim",              // swim | bike | run | strength | other
      "title": "Título corto",
      "duration": 60,               // minutos (si es un rango, usá el mínimo)
      "durationLabel": "1.5–2 h",   // opcional, texto a mostrar
      "distance": "2000 m",         // opcional
      "tag": "...",                 // opcional (ej: "brick")
      "blocks": [{ "label": "Calentamiento", "text": "..." }]
    }
  ]
}`;

function renderSettings() {
  const c = state.config;
  const imported = state.weeks.map(w => w.start).sort();
  const bundledCount = window.BUNDLED_PLAN?.weeks?.length || 0;
  $view.innerHTML = `
    <h1>Ajustes</h1>
    <div class="card settings" style="margin-top:14px">
      <h3 style="margin-bottom:12px">🏁 Tu carrera</h3>
      <label class="field">Tu nombre<input data-cfg="name" value="${esc(c.name)}" placeholder="Ej: Rodrigo"></label>
      <label class="field">Carrera<input data-cfg="raceName" value="${esc(c.raceName)}" placeholder="Ironman 70.3 …"></label>
      <div class="grid-2">
        <label class="field">Fecha de la carrera<input type="date" data-cfg="raceDate" value="${esc(c.raceDate)}"></label>
        <label class="field">Inicio del plan<input type="date" data-cfg="startDate" value="${esc(c.startDate)}" placeholder="auto"></label>
      </div>
      <label class="field">Tema
        <select data-cfg="theme">
          ${[['auto', 'Automático'], ['dark', 'Oscuro'], ['light', 'Claro']].map(([v, l]) => `<option value="${v}" ${c.theme === v ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
      </label>
    </div>

    <div class="card settings" style="margin-top:14px">
      <h3>📋 Plan de entrenamiento</h3>
      <label class="row" style="margin:12px 0;gap:10px;font-size:14px">
        <input type="checkbox" data-cfg="useBundled" ${c.useBundled ? 'checked' : ''} style="width:20px;height:20px;accent-color:var(--accent)">
        <span>Usar el plan incluido en la app (${bundledCount} semana${bundledCount === 1 ? '' : 's'})</span>
      </label>
      <p class="small muted" style="margin:0 0 6px">Semanas importadas por vos: ${imported.length ? imported.map(fmtShort).join(', ') : 'ninguna'}</p>
      ${imported.length ? `<button class="btn sm danger" data-act="clear-weeks">Borrar semanas importadas</button>` : ''}
      <hr>
      <h3>Agregar una semana nueva</h3>
      <p class="small muted">1) Copiá el prompt de abajo. 2) Pegalo en ChatGPT/Claude junto con el PDF de tu semana. 3) Pegá acá el JSON que te devuelve.</p>
      <div class="row wrap" style="margin:8px 0">
        <button class="btn sm" data-act="copy-prompt">📋 Copiar prompt</button>
        <label class="btn sm">📂 Importar archivo .json<input type="file" accept="application/json,.json" data-act="import-week-file" hidden></label>
      </div>
      <details><summary class="small muted" style="cursor:pointer">Ver formato</summary><pre>${esc(AI_PROMPT)}</pre></details>
      <label class="field" style="margin-top:10px">JSON de la semana
        <textarea id="week-json" placeholder='{ "start": "2026-11-09", "sessions": [ … ] }' style="min-height:110px;font-family:ui-monospace,monospace;font-size:12px"></textarea>
      </label>
      <button class="btn primary" data-act="import-week">Importar semana</button>
    </div>

    <div class="card settings" style="margin-top:14px">
      <h3>💾 Tus datos</h3>
      <p class="small muted">Todo se guarda en este dispositivo, sin cuentas ni servidores. Para pasar tus registros a otro dispositivo, exportá un backup y importalo allá.</p>
      <div class="row wrap">
        <button class="btn" data-act="export">⬇️ Exportar backup</button>
        <label class="btn">⬆️ Restaurar backup<input type="file" accept="application/json,.json" data-act="import-backup" hidden></label>
      </div>
      <hr>
      <button class="btn danger" data-act="reset">Borrar todo y empezar de cero</button>
    </div>

    <div class="card settings" style="margin-top:14px">
      <h3>📲 Instalar en el celular</h3>
      <p class="small"><b>iPhone (Safari):</b> botón Compartir → <i>Agregar a pantalla de inicio</i>.</p>
      <p class="small"><b>Android (Chrome):</b> menú ⋮ → <i>Instalar app</i> / <i>Agregar a pantalla principal</i>.</p>
      <p class="small"><b>Compu (Chrome/Edge):</b> ícono de instalar en la barra de direcciones.</p>
      <p class="small muted">¿Un amigo la quiere? Pasale el link: cada uno tiene sus propios datos en su dispositivo y puede cargar su propio plan.</p>
      <button class="btn sm" data-act="share">🔗 Compartir app</button>
    </div>
    <p class="muted small" style="text-align:center;margin-top:18px">Hecho con 🧡 para cruzar la meta · v1</p>
  `;
}

/* ---------------- Onboarding ---------------- */
function showOnboarding() {
  const c = state.config;
  openModal(`
    <div style="text-align:center;font-size:44px">🏊🚴🏃</div>
    <h2 style="text-align:center;margin-top:6px">Camino al 70.3</h2>
    <p class="muted small" style="text-align:center">1.9 km nadando · 90 km en bici · 21.1 km corriendo. Vamos a registrarlo día a día.</p>
    <div class="settings" style="margin-top:14px">
      <label class="field">¿Cómo te llamás?<input id="ob-name" value="${esc(c.name)}" placeholder="Tu nombre"></label>
      <label class="field">Carrera<input id="ob-race" value="${esc(c.raceName)}"></label>
      <label class="field">Fecha de la carrera<input type="date" id="ob-date" value="${esc(c.raceDate)}"></label>
      <div class="lbl small muted" style="margin:8px 0 6px;font-weight:600">Plan de entrenamiento</div>
      <div class="seg" style="grid-template-columns:1fr 1fr">
        <button class="on done" data-ob="bundled"><span class="e">📋</span>Usar el plan incluido</button>
        <button data-ob="own"><span class="e">✍️</span>Voy a cargar el mío</button>
      </div>
    </div>
    <button class="btn primary" style="width:100%;margin-top:16px" data-act="ob-save">¡Arranquemos!</button>
  `);
}

/* ---------------- Agregar sesión extra ---------------- */
function showAddExtra(date) {
  openModal(`
    <div class="modal-head"><h2>Agregar sesión</h2><button class="icon-btn" data-act="close">✕</button></div>
    <div class="settings">
      <label class="field">Fecha<input type="date" id="x-date" value="${date}"></label>
      <label class="field">Deporte
        <select id="x-sport">${Object.entries(SPORTS).map(([k, v]) => `<option value="${k}">${v.emoji} ${v.label}</option>`).join('')}</select>
      </label>
      <label class="field">Título<input id="x-title" placeholder="Ej: Rodaje suave con amigos"></label>
      <label class="field">Duración (minutos)<input type="number" inputmode="numeric" id="x-dur" value="60"></label>
      <label class="field">Detalle (opcional)<textarea id="x-text"></textarea></label>
      <button class="btn primary" style="width:100%" data-act="save-extra">Agregar</button>
    </div>
  `);
}

/* ---------------- Render ---------------- */
function applyTheme() {
  const t = state.config.theme;
  if (t === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
}

function render() {
  applyTheme();
  document.querySelectorAll('.tabbar button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  const y = window.scrollY;
  ({ today: renderToday, week: renderWeek, progress: renderProgress, settings: renderSettings })[tab]();
  // Si el modal muestra una sesión, la refrescamos también
  if ($modal.open && $modal.dataset.session) {
    const s = allSessions().find(x => x.id === $modal.dataset.session);
    if (s) $modalBody.innerHTML = sessionModal(s);
  }
  window.scrollTo(0, y);
}

function sessionModal(s) {
  return `<div class="modal-head"><div><h2>${fmtDay(s.date)}</h2></div><button class="icon-btn" data-act="close">✕</button></div>${sessionCard(s, { open: true })}`;
}
function openSession(id) {
  const s = allSessions().find(x => x.id === id);
  if (!s) return;
  $modal.dataset.session = id;
  openModal(sessionModal(s));
}
$modal.addEventListener('close', () => { delete $modal.dataset.session; });

/* ---------------- Eventos ---------------- */
function setLog(id, patch) {
  const prev = state.logs[id] || {};
  const next = { ...prev, ...patch, at: new Date().toISOString() };
  state.logs[id] = next;
  save();
}

function checkCelebrate(s) {
  const t = s.date;
  const list = sessionsOn(t).filter(x => x.source !== 'extra');
  if (list.length && list.every(x => logOf(x)?.status === 'done')) {
    confetti();
    toast(t === todayISO() ? '🎉 ¡Día completo! Un paso más cerca de la meta' : '🎉 Día completo');
  } else if (logOf(s)?.status === 'done') {
    toast(['💪 ¡Vamos!', '🔥 Sumado', '✅ Uno menos', '🧡 Bien ahí'][Math.floor(Math.random() * 4)]);
  }
}

document.addEventListener('click', async e => {
  const tabBtn = e.target.closest('.tabbar button');
  if (tabBtn) { tab = tabBtn.dataset.tab; render(); window.scrollTo(0, 0); return; }

  const openBtn = e.target.closest('[data-open]');
  if (openBtn) { openSession(openBtn.dataset.open); return; }

  const ob = e.target.closest('[data-ob]');
  if (ob) { ob.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === ob)); ob.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('done', b === ob)); return; }

  const el = e.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act;
  const card = el.closest('.session');
  const id = card?.dataset.id;

  if (act === 'status' && id) {
    const cur = state.logs[id]?.status;
    if (cur === el.dataset.v) { delete state.logs[id]; save(); render(); return; }
    setLog(id, { status: el.dataset.v });
    render();
    if (el.dataset.v === 'done') checkCelebrate(allSessions().find(s => s.id === id));
    return;
  }
  if (act === 'effort' && id) {
    setLog(id, { effort: el.dataset.v, rpe: null });
    render();
    return;
  }
  if (act === 'delete-extra' && id) {
    if (!confirm('¿Eliminar esta sesión extra?')) return;
    state.extra = state.extra.filter(s => s.id !== id);
    delete state.logs[id];
    invalidate(); save(); closeModal(); render();
    return;
  }
  if (act === 'close') { closeModal(); return; }
  if (act === 'week-prev') { weekCursor = addDays(weekCursor, -7); render(); return; }
  if (act === 'week-next') { weekCursor = addDays(weekCursor, 7); render(); return; }
  if (act === 'week-today') { weekCursor = mondayOf(todayISO()); render(); return; }
  if (act === 'feel') {
    state.weekNotes[weekCursor] = { ...(state.weekNotes[weekCursor] || {}), feel: Number(el.dataset.v) };
    save(); render(); return;
  }
  if (act === 'add-extra') { showAddExtra(el.dataset.date || todayISO()); return; }
  if (act === 'save-extra') {
    const date = document.getElementById('x-date').value;
    const title = document.getElementById('x-title').value.trim();
    const sport = document.getElementById('x-sport').value;
    if (!date) { toast('Elegí una fecha'); return; }
    const text = document.getElementById('x-text').value.trim();
    state.extra.push({
      id: `x-${Date.now().toString(36)}`, date, sport,
      title: title || SPORTS[sport].label,
      duration: Number(document.getElementById('x-dur').value) || 0,
      blocks: text ? [{ label: 'Detalle', text }] : []
    });
    invalidate(); save(); closeModal(); render(); toast('Sesión agregada');
    return;
  }
  if (act === 'ob-save') {
    state.config.name = document.getElementById('ob-name').value.trim();
    state.config.raceName = document.getElementById('ob-race').value.trim() || 'Ironman 70.3';
    state.config.raceDate = document.getElementById('ob-date').value || state.config.raceDate;
    state.config.useBundled = !!document.querySelector('[data-ob="bundled"].on');
    state.config.onboarded = true;
    invalidate(); save(); closeModal();
    if (!state.config.useBundled) { tab = 'settings'; }
    render();
    return;
  }
  if (act === 'copy-prompt') {
    try { await navigator.clipboard.writeText(AI_PROMPT); toast('Prompt copiado'); }
    catch { toast('No se pudo copiar: abrí "Ver formato"'); }
    return;
  }
  if (act === 'import-week') { importWeekText(document.getElementById('week-json').value); return; }
  if (act === 'clear-weeks') {
    if (!confirm('¿Borrar las semanas importadas? Los registros quedan guardados.')) return;
    state.weeks = []; invalidate(); save(); render(); return;
  }
  if (act === 'export') { exportBackup(); return; }
  if (act === 'reset') {
    if (!confirm('Esto borra TODOS tus registros de este dispositivo. ¿Seguro?')) return;
    state = structuredClone(DEFAULT_STATE); invalidate(); save(); tab = 'today'; render(); showOnboarding();
    return;
  }
  if (act === 'share') {
    const data = { title: 'Camino al 70.3', text: 'App gratis para seguir tu plan de Ironman 70.3', url: location.href.split('#')[0] };
    try { if (navigator.share) await navigator.share(data); else { await navigator.clipboard.writeText(data.url); toast('Link copiado'); } }
    catch { /* cancelado */ }
  }
});

document.addEventListener('input', e => {
  const el = e.target;
  const act = el.dataset.act;
  const id = el.closest('.session')?.dataset.id;
  if (act === 'rpe' && id) { el.nextElementSibling.textContent = el.value; setLog(id, { rpe: Number(el.value) }); return; }
  if (['minutes', 'distance', 'notes'].includes(act) && id) { setLog(id, { [act]: act === 'minutes' ? (el.value ? Number(el.value) : null) : el.value }); return; }
  if (act === 'week-text') {
    state.weekNotes[weekCursor] = { ...(state.weekNotes[weekCursor] || {}), text: el.value };
    save(); return;
  }
});

document.addEventListener('change', e => {
  const el = e.target;
  // Al terminar de editar campos de sesión, refrescamos métricas visibles
  if (['minutes', 'rpe'].includes(el.dataset.act)) { render(); return; }
  if (el.dataset.cfg) {
    const k = el.dataset.cfg;
    state.config[k] = el.type === 'checkbox' ? el.checked : el.value;
    invalidate(); save(); render(); toast('Guardado');
    return;
  }
  if (el.dataset.act === 'import-week-file' && el.files[0]) {
    el.files[0].text().then(importWeekText); el.value = ''; return;
  }
  if (el.dataset.act === 'import-backup' && el.files[0]) {
    el.files[0].text().then(txt => {
      try {
        const data = JSON.parse(txt);
        if (!data.logs || !data.config) throw new Error();
        if (!confirm('Esto reemplaza los datos actuales por los del backup. ¿Continuar?')) return;
        state = { ...structuredClone(DEFAULT_STATE), ...data, config: { ...DEFAULT_STATE.config, ...data.config } };
        invalidate(); save(); render(); toast('Backup restaurado');
      } catch { toast('Archivo de backup inválido'); }
    });
    el.value = '';
  }
});

function importWeekText(txt) {
  let data;
  try {
    const clean = txt.trim().replace(/^```(json)?/i, '').replace(/```$/, '');
    data = JSON.parse(clean);
  } catch { toast('El JSON no es válido'); return; }
  const weeks = Array.isArray(data) ? data : data.weeks || [data];
  let n = 0;
  for (const w of weeks) {
    if (!w || !/^\d{4}-\d{2}-\d{2}$/.test(w.start || '') || !Array.isArray(w.sessions)) continue;
    w.start = mondayOf(w.start);
    w.sessions = w.sessions.map(s => ({ ...s, sport: SPORTS[s.sport] ? s.sport : 'other', duration: Number(s.duration) || 0, day: Math.max(0, Math.min(6, Number(s.day) || 0)) }));
    state.weeks = state.weeks.filter(x => x.start !== w.start).concat(w);
    n++;
  }
  if (!n) { toast('No encontré una semana válida (falta "start" o "sessions")'); return; }
  invalidate(); save(); render();
  toast(`✅ ${n} semana${n > 1 ? 's' : ''} importada${n > 1 ? 's' : ''}`);
}

function exportBackup() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `camino-70-3-backup-${todayISO()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* ---------------- Confetti ---------------- */
function confetti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = document.getElementById('confetti');
  const ctx = c.getContext('2d');
  const dpr = devicePixelRatio || 1;
  c.width = innerWidth * dpr; c.height = innerHeight * dpr; ctx.scale(dpr, dpr);
  const colors = ['#38bdf8', '#fbbf24', '#f472b6', '#22c55e', '#ff6b35', '#a78bfa'];
  const parts = Array.from({ length: 140 }, () => ({
    x: innerWidth / 2 + (Math.random() - .5) * 80, y: innerHeight * .35,
    vx: (Math.random() - .5) * 12, vy: -Math.random() * 12 - 4,
    s: Math.random() * 7 + 4, r: Math.random() * 6, vr: (Math.random() - .5) * .3,
    c: colors[Math.floor(Math.random() * colors.length)]
  }));
  let frame = 0;
  (function tick() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    parts.forEach(p => {
      p.vy += .35; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore();
    });
    if (++frame < 150) requestAnimationFrame(tick); else ctx.clearRect(0, 0, innerWidth, innerHeight);
  })();
}

/* ---------------- Init ---------------- */
// Volver a la vista de hoy si la app queda abierta y cambia el día
let lastDay = todayISO();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && todayISO() !== lastDay) { lastDay = todayISO(); weekCursor = mondayOf(lastDay); render(); }
});

render();
if (!state.config.onboarded) showOnboarding();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
