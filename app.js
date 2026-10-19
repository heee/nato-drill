(() => {
  'use strict';

  // ---------- Data ----------

  const DATA = [
    ['A', 'ALFA', 'AL · FAH'],
    ['B', 'BRAVO', 'BRAH · VOH'],
    ['C', 'CHARLIE', 'CHAR · LEE'],
    ['D', 'DELTA', 'DELL · TAH'],
    ['E', 'ECHO', 'ECK · OH'],
    ['F', 'FOXTROT', 'FOKS · TROT'],
    ['G', 'GOLF', 'GOLF'],
    ['H', 'HOTEL', 'HOH · TELL'],
    ['I', 'INDIA', 'IN · DEE · AH'],
    ['J', 'JULIETT', 'JEW · LEE · ETT'],
    ['K', 'KILO', 'KEY · LOH'],
    ['L', 'LIMA', 'LEE · MAH'],
    ['M', 'MIKE', 'MIKE'],
    ['N', 'NOVEMBER', 'NO · VEM · BER'],
    ['O', 'OSCAR', 'OSS · CAH'],
    ['P', 'PAPA', 'PAH · PAH'],
    ['Q', 'QUEBEC', 'KEH · BECK'],
    ['R', 'ROMEO', 'ROW · ME · OH'],
    ['S', 'SIERRA', 'SEE · AIR · RAH'],
    ['T', 'TANGO', 'TANG · GO'],
    ['U', 'UNIFORM', 'YOU · NEE · FORM'],
    ['V', 'VICTOR', 'VIK · TAH'],
    ['W', 'WHISKEY', 'WISS · KEY'],
    ['X', 'X-RAY', 'ECKS · RAY'],
    ['Y', 'YANKEE', 'YANG · KEY'],
    ['Z', 'ZULU', 'ZOO · LOO'],
  ];
  const LETTERS = DATA.map((d) => d[0]);
  const INFO = {};
  DATA.forEach(([letter, word, pron], i) => {
    INFO[letter] = { letter, word, pron, num: String(i + 1).padStart(2, '0') };
  });

  // ---------- Learning logic ----------

  const STORAGE_KEY = 'natoDrill.v1';
  const MAX_LEVEL = 5;
  const INTERVALS = [2, 4, 8, 15, 30, 60]; // turns until due again, by new level
  const MISS_INTERVAL = 2;
  const SKIP_INTERVAL = 3;
  const HISTORY_MAX = 50;

  function freshState() {
    const cards = {};
    for (const l of LETTERS) cards[l] = { level: 0, dueAt: 0, seen: 0, correct: 0, missed: 0 };
    return { version: 1, turn: 0, cards, history: [], current: null };
  }

  function int(v, lo, hi) {
    return Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.floor(v))) : lo;
  }

  // Coerce anything (old saves, imported files) into a valid state.
  function normalize(raw) {
    const s = freshState();
    if (!raw || typeof raw !== 'object') return s;
    s.turn = int(raw.turn, 0, 1e9);
    if (raw.cards && typeof raw.cards === 'object') {
      for (const l of LETTERS) {
        const c = raw.cards[l];
        if (!c || typeof c !== 'object') continue;
        s.cards[l] = {
          level: int(c.level, 0, MAX_LEVEL),
          dueAt: int(c.dueAt, 0, 1e9),
          seen: int(c.seen, 0, 1e9),
          correct: int(c.correct, 0, 1e9),
          missed: int(c.missed, 0, 1e9),
        };
      }
    }
    if (Array.isArray(raw.history)) s.history = raw.history.filter((l) => INFO[l]).slice(-HISTORY_MAX);
    if (INFO[raw.current]) s.current = raw.current;
    return s;
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? normalize(JSON.parse(raw)) : freshState();
    } catch (e) {
      return freshState();
    }
  }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* storage full or blocked */ }
  }

  let state = load();

  const masteredCount = () => LETTERS.filter((l) => state.cards[l].level === MAX_LEVEL).length;

  function randomOf(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  // Lowest level among due cards (ties random); otherwise the card due soonest. Never repeats `exclude`.
  function pickNext(exclude) {
    const pool = LETTERS.filter((l) => l !== exclude);
    const due = pool.filter((l) => state.cards[l].dueAt <= state.turn);
    if (due.length) {
      const min = Math.min(...due.map((l) => state.cards[l].level));
      return randomOf(due.filter((l) => state.cards[l].level === min));
    }
    const min = Math.min(...pool.map((l) => state.cards[l].dueAt));
    return randomOf(pool.filter((l) => state.cards[l].dueAt === min));
  }

  function show(letter) {
    state.current = letter;
    state.turn += 1;
    state.cards[letter].seen += 1;
  }

  function pushHistory(letter) {
    state.history.push(letter);
    if (state.history.length > HISTORY_MAX) state.history.splice(0, state.history.length - HISTORY_MAX);
  }

  function grade(correct) {
    const l = state.current;
    const c = state.cards[l];
    if (correct) {
      c.level = Math.min(MAX_LEVEL, c.level + 1);
      c.correct += 1;
      c.dueAt = state.turn + INTERVALS[c.level];
    } else {
      c.level = Math.max(0, c.level - 1);
      c.missed += 1;
      c.dueAt = state.turn + MISS_INTERVAL;
    }
    pushHistory(l);
    show(pickNext(l));
  }

  function skip() {
    const l = state.current;
    state.cards[l].dueAt = state.turn + SKIP_INTERVAL;
    pushHistory(l);
    show(pickNext(l));
  }

  function back() {
    show(state.history.pop());
  }

  // ---------- DOM ----------

  const $ = (id) => document.getElementById(id);
  const main = $('main');
  const stage = $('stage');
  const cardLabel = $('cardLabel');
  const cardSegs = Array.from($('cardSegs').children);
  const overallBtn = $('overallBtn');
  const overallLabel = $('overallLabel');
  const overallFill = $('overallFill');
  const sheet = $('sheet');
  const sheetPanel = $('sheetPanel');
  const sheetHead = $('sheetHead');
  const sheetCount = $('sheetCount');
  const sheetTrained = $('sheetTrained');
  const sheetFill = $('sheetFill');
  const grid = $('grid');
  const statusEl = $('status');
  const resetBtn = $('resetBtn');
  const importFile = $('importFile');

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let cardEl = null;
  let flipped = false;
  let busy = false;   // a swipe animation is running
  let queued = null;  // at most one gesture waits for it
  let sheetOpen = false;

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function makeCard(letter) {
    const info = INFO[letter];
    const card = el('button', 'card');
    card.type = 'button';
    card.dataset.letter = letter;

    const inner = el('div', 'card-inner');

    const front = el('div', 'face front');
    front.setAttribute('aria-hidden', 'true');
    const fRow = el('div', 'face-row');
    fRow.append(el('span', '', `NATO · ${info.num}`), el('span', '', 'PHONETIC'));
    front.append(fRow, el('div', 'big', letter), el('div', 'face-foot', 'TAP TO FLIP'));

    const backFace = el('div', 'face back');
    backFace.setAttribute('aria-hidden', 'true');
    const bRow = el('div', 'face-row');
    bRow.append(el('span', '', `NATO · ${info.num}`), el('span', '', letter));
    const mid = el('div', 'mid');
    mid.append(el('div', 'word', info.word), el('div', 'pron', info.pron));
    backFace.append(bRow, mid, el('div', 'face-foot', '↑ GOT IT · ↓ MISSED'));

    inner.append(front, backFace);
    card.append(inner);
    setCardLabel(card, false);
    return card;
  }

  function setCardLabel(card, isFlipped) {
    const info = INFO[card.dataset.letter];
    card.setAttribute('aria-label', isFlipped
      ? `${info.word}, pronounced ${info.pron.replace(/ · /g, '-')}`
      : `Letter ${info.letter}. Tap to flip.`);
  }

  // Shrink long code words (NOVEMBER, WHISKEY) so they fit the card.
  function fitWord(card) {
    const word = card && card.querySelector('.word');
    if (!word) return;
    word.style.fontSize = '';
    const avail = word.clientWidth;
    if (avail && word.scrollWidth > avail) {
      const size = parseFloat(getComputedStyle(word).fontSize);
      word.style.fontSize = `${Math.floor(size * (avail / word.scrollWidth) * 0.98)}px`;
    }
  }

  function replaceCard() {
    const next = makeCard(state.current);
    if (cardEl) cardEl.remove();
    stage.append(next);
    cardEl = next;
    flipped = false;
    fitWord(next);
    renderTop(state.current);
  }

  function renderTop(letter) {
    const level = state.cards[letter].level;
    cardLabel.textContent = `CARD · ${level} / ${MAX_LEVEL}`;
    cardSegs.forEach((s, i) => s.classList.toggle('on', i < level));
    const m = masteredCount();
    overallLabel.textContent = `MASTERED · ${m} / ${LETTERS.length}`;
    overallFill.style.transform = `scaleX(${m / LETTERS.length})`;
    overallBtn.setAttribute('aria-label', `Mission log. ${m} of ${LETTERS.length} mastered.`);
  }

  // ---------- Card actions ----------

  function flip() {
    if (busy) { queue('flip'); return; }
    flipped = !flipped;
    cardEl.classList.toggle('flipped', flipped);
    setCardLabel(cardEl, flipped);
  }

  function queue(action) {
    if (!queued) queued = action;
  }

  function runQueued() {
    const q = queued;
    queued = null;
    if (q === 'flip') flip();
    else if (q) perform(q, null);
  }

  function dragTransform(d) {
    return d ? `translate(${d.x}px, ${d.y}px) rotate(${d.x * 0.05}deg)` : 'none';
  }

  // dir: 'up' (correct) | 'down' (missed) | 'right' (skip) | 'left' (back). drag: current finger offset or null.
  function perform(dir, drag) {
    if (busy) { queue(dir); return; }
    if (dir === 'left' && !state.history.length) { bounce(drag); return; }

    busy = true;
    const old = cardEl;
    const hadFocus = document.activeElement === old;
    const graded = state.current;

    if (dir === 'up') grade(true);
    else if (dir === 'down') grade(false);
    else if (dir === 'right') skip();
    else back();
    save();

    // Show the graded card's new mastery right away; the next card's takes over once it lands.
    renderTop(dir === 'up' || dir === 'down' ? graded : state.current);
    if (sheetOpen) renderSheet();

    const next = makeCard(state.current);
    stage.insertBefore(next, old); // underneath the outgoing card
    fitWord(next);
    cardEl = next;
    flipped = false;
    old.setAttribute('aria-hidden', 'true');
    old.tabIndex = -1;

    animateSwap(old, next, dir, drag).then(() => {
      old.remove();
      renderTop(state.current);
      if (hadFocus) next.focus({ preventScroll: true });
      busy = false;
      runQueued();
    });
  }

  function finished(anim) {
    return anim.finished.catch(() => {});
  }

  const EXIT_MS = 240;

  // Got it: a quick nod (scale pop). Missed: a head-shake. Then fly off vertically while fading out.
  // Every keyframe uses the same translate/rotate/scale list so the browser interpolates smoothly.
  function gradeFrames(dir, drag) {
    const x = drag ? drag.x : 0;
    const y = drag ? drag.y : 0;
    const r = x * 0.05;
    const at = (dx, rot, scale, opacity, offset, easing) => ({
      transform: `translate(${x + dx}px, ${y}px) rotate(${r + rot}deg) scale(${scale})`,
      opacity,
      offset,
      easing,
    });

    const sign = dir === 'up' ? -1 : 1;
    const tilt = (x ? Math.sign(x) : -sign) * 4;
    const exit = {
      transform: `translate(${x}px, ${y + sign * window.innerHeight * 1.2}px) rotate(${r + tilt}deg) scale(1)`,
      opacity: 0,
      offset: 1,
    };

    if (dir === 'up') {
      const feedback = 140;
      const total = feedback + EXIT_MS;
      const t = (ms) => ms / total;
      return {
        feedback,
        duration: total,
        keyframes: [
          at(0, 0, 1, 1, 0, 'cubic-bezier(.2, .7, .3, 1)'),
          at(0, 0, 1.06, 1, t(60), 'cubic-bezier(.4, 0, .4, 1)'),
          at(0, 0, 1, 1, t(feedback), 'cubic-bezier(.4, 0, .9, .6)'),
          exit,
        ],
      };
    }

    const feedback = 200;
    const total = feedback + EXIT_MS;
    const t = (ms) => ms / total;
    const ease = 'ease-in-out';
    return {
      feedback,
      duration: total,
      keyframes: [
        at(0, 0, 1, 1, 0, ease),
        at(18, 1.5, 1, 1, t(40), ease),
        at(-12, -1, 1, 1, t(90), ease),
        at(6, 0.5, 1, 1, t(140), ease),
        at(0, 0, 1, 1, t(feedback), 'cubic-bezier(.4, 0, .9, .6)'),
        exit,
      ],
    };
  }

  function animateSwap(old, next, dir, drag) {
    const from = dragTransform(drag);

    if (reducedMotion.matches) {
      return Promise.all([
        finished(old.animate([{ transform: from, opacity: 1 }, { transform: from, opacity: 0 }],
          { duration: 150, easing: 'linear', fill: 'forwards' })),
        finished(next.animate([{ opacity: 0 }, { opacity: 1 }],
          { duration: 150, easing: 'linear', fill: 'backwards' })),
      ]);
    }

    if (dir === 'up' || dir === 'down') {
      const frames = gradeFrames(dir, drag);
      return Promise.all([
        finished(old.animate(frames.keyframes, { duration: frames.duration, fill: 'forwards' })),
        // The next card starts rising when the exit starts, after the nod / shake.
        finished(next.animate([{ transform: 'scale(.94)', opacity: 0.6 }, { transform: 'none', opacity: 1 }],
          { duration: 260, delay: frames.feedback, easing: 'cubic-bezier(.2, .7, .2, 1)', fill: 'backwards' })),
      ]);
    }

    // Carousel: skip exits right / enters from left; back exits left / enters from right.
    const w = window.innerWidth * 1.2;
    const exitX = dir === 'right' ? w : -w;
    return Promise.all([
      finished(old.animate([{ transform: from }, { transform: `translateX(${exitX}px) rotate(${exitX * 0.01}deg)` }],
        { duration: 300, easing: 'cubic-bezier(.4, 0, .6, 1)', fill: 'forwards' })),
      finished(next.animate([{ transform: `translateX(${-exitX}px)` }, { transform: 'none' }],
        { duration: 320, easing: 'cubic-bezier(.2, .7, .2, 1)', fill: 'backwards' })),
    ]);
  }

  // Nothing to go back to: rubber-band.
  function bounce(drag) {
    busy = true;
    const card = cardEl;
    card.style.transform = '';
    const frames = drag
      ? [{ transform: dragTransform(drag) }, { transform: 'translateX(12px)' }, { transform: 'none' }]
      : [{ transform: 'none' }, { transform: 'translateX(-28px)' }, { transform: 'translateX(8px)' }, { transform: 'none' }];
    finished(card.animate(frames, { duration: reducedMotion.matches ? 150 : 340, easing: 'ease-out' })).then(() => {
      busy = false;
      runQueued();
    });
  }

  function springBack(card, drag) {
    card.style.transform = '';
    if (!drag || (!drag.x && !drag.y)) return;
    card.animate([{ transform: dragTransform(drag) }, { transform: 'none' }],
      { duration: 200, easing: 'cubic-bezier(.2, .7, .2, 1)' });
  }

  // ---------- Gestures ----------

  const TAP_MAX_MOVE = 8;
  const TAP_MAX_MS = 250;
  const AXIS_LOCK = 12;
  const COMMIT_DIST = 90;
  const COMMIT_VELOCITY = 0.5; // px/ms

  let g = null;

  stage.addEventListener('pointerdown', (e) => {
    if (g || sheetOpen || e.button > 0) return;
    if (!e.target.closest('.card')) return;
    g = {
      id: e.pointerId,
      x0: e.clientX,
      y0: e.clientY,
      t0: performance.now(),
      axis: null,
      x: 0,
      y: 0,
      maxMove: 0,
      pts: [{ x: e.clientX, y: e.clientY, t: performance.now() }],
      live: !busy, // the card only follows the finger when it's not mid-animation
      card: cardEl,
    };
    try { stage.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  });

  stage.addEventListener('pointermove', (e) => {
    if (!g || e.pointerId !== g.id) return;
    const dx = e.clientX - g.x0;
    const dy = e.clientY - g.y0;
    const now = performance.now();
    g.maxMove = Math.max(g.maxMove, Math.hypot(dx, dy));
    if (!g.axis && Math.hypot(dx, dy) > AXIS_LOCK) g.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    g.x = g.axis === 'y' ? 0 : dx;
    g.y = g.axis === 'x' ? 0 : dy;
    g.pts.push({ x: e.clientX, y: e.clientY, t: now });
    while (g.pts.length > 2 && now - g.pts[0].t > 100) g.pts.shift();
    if (g.live && g.card === cardEl && !busy) g.card.style.transform = dragTransform(g);
  });

  function endGesture(e, cancelled) {
    if (!g || e.pointerId !== g.id) return;
    const gest = g;
    g = null;
    const drag = { x: gest.x, y: gest.y };
    const followed = gest.live && gest.card === cardEl && !busy;

    if (cancelled) {
      if (followed) springBack(gest.card, drag);
      return;
    }

    const elapsed = performance.now() - gest.t0;
    if (!gest.axis && gest.maxMove < TAP_MAX_MOVE && elapsed < TAP_MAX_MS) {
      if (followed) gest.card.style.transform = '';
      flip();
      return;
    }

    if (gest.axis) {
      const d = gest.axis === 'x' ? gest.x : gest.y;
      const p0 = gest.pts[0];
      const p1 = { x: e.clientX, y: e.clientY, t: performance.now() };
      const dt = Math.max(1, p1.t - p0.t);
      const v = gest.axis === 'x' ? (p1.x - p0.x) / dt : (p1.y - p0.y) / dt;
      const commit = Math.abs(d) > COMMIT_DIST || (Math.abs(v) > COMMIT_VELOCITY && Math.sign(v) === Math.sign(d));
      if (commit) {
        const dir = gest.axis === 'x' ? (d > 0 ? 'right' : 'left') : (d < 0 ? 'up' : 'down');
        perform(dir, followed ? drag : null);
        return;
      }
    }
    if (followed) springBack(gest.card, drag);
  }

  stage.addEventListener('pointerup', (e) => endGesture(e, false));
  stage.addEventListener('pointercancel', (e) => endGesture(e, true));

  // Keyboard / assistive-tech activation of the card button (pointer taps are handled above).
  stage.addEventListener('click', (e) => {
    if (e.detail === 0 && e.target.closest('.card') === cardEl) flip();
  });

  // ---------- Keyboard (desktop testing) ----------

  document.addEventListener('keydown', (e) => {
    if (sheetOpen) {
      if (e.key === 'Escape') closeSheet();
      return;
    }
    const onOtherButton = e.target.closest && e.target.closest('button') && !e.target.closest('.card');
    switch (e.key) {
      case ' ':
      case 'Spacebar':
        if (onOtherButton) return;
        e.preventDefault();
        if (!e.repeat) flip();
        break;
      case 'ArrowUp': e.preventDefault(); perform('up', null); break;
      case 'ArrowDown': e.preventDefault(); perform('down', null); break;
      case 'ArrowRight': e.preventDefault(); perform('right', null); break;
      case 'ArrowLeft': e.preventDefault(); perform('left', null); break;
      default:
    }
  });
  document.addEventListener('keyup', (e) => {
    if (!sheetOpen && e.key === ' ' && e.target.closest && e.target.closest('.card')) e.preventDefault();
  });

  // iOS: no pinch / double-tap zoom.
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('dblclick', (e) => e.preventDefault());

  // ---------- Stats sheet ----------

  const tiles = LETTERS.map((l) => {
    const tile = el('div', 'tile');
    const mini = el('div', 'mini');
    for (let i = 0; i < MAX_LEVEL; i++) mini.append(el('span'));
    tile.append(el('div', 'tile-l', l), el('div', 'tile-w', INFO[l].word), mini);
    grid.append(tile);
    return { tile, segs: Array.from(mini.children) };
  });

  function renderSheet() {
    const m = masteredCount();
    sheetCount.textContent = `${m} / ${LETTERS.length} MASTERED`;
    // Every graded card (got it + missed); skips don't count.
    const trained = LETTERS.reduce((n, l) => n + state.cards[l].correct + state.cards[l].missed, 0);
    sheetTrained.textContent = `${trained} TRAINED`;
    sheetFill.style.transform = `scaleX(${m / LETTERS.length})`;
    LETTERS.forEach((l, i) => {
      const level = state.cards[l].level;
      const { tile, segs } = tiles[i];
      tile.classList.toggle('mastered', level === MAX_LEVEL);
      segs.forEach((s, j) => s.classList.toggle('on', j < level));
      tile.setAttribute('aria-label', `${INFO[l].word}: level ${level} of ${MAX_LEVEL}`);
      tile.setAttribute('role', 'img');
    });
  }

  function openSheet() {
    if (sheetOpen) return;
    renderSheet();
    sheetOpen = true;
    sheet.inert = false;
    main.inert = true;
    sheet.classList.add('open');
    $('closeBtn').focus({ preventScroll: true });
  }

  function closeSheet() {
    if (!sheetOpen) return;
    sheetOpen = false;
    disarmReset();
    sheetPanel.style.transition = '';
    sheetPanel.style.transform = '';
    sheet.classList.remove('open');
    sheet.inert = true;
    main.inert = false;
    overallBtn.focus({ preventScroll: true });
  }

  overallBtn.addEventListener('click', openSheet);
  $('closeBtn').addEventListener('click', closeSheet);
  $('sheetBackdrop').addEventListener('click', closeSheet);

  // Swipe down on the sheet header to close.
  let sg = null;
  sheetHead.addEventListener('pointerdown', (e) => {
    if (!sheetOpen || e.target.closest('button')) return;
    sg = { id: e.pointerId, y0: e.clientY, dy: 0, pts: [{ y: e.clientY, t: performance.now() }] };
    sheetPanel.style.transition = 'none';
    try { sheetHead.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  });
  sheetHead.addEventListener('pointermove', (e) => {
    if (!sg || e.pointerId !== sg.id) return;
    const now = performance.now();
    sg.dy = Math.max(0, e.clientY - sg.y0);
    sg.pts.push({ y: e.clientY, t: now });
    while (sg.pts.length > 2 && now - sg.pts[0].t > 100) sg.pts.shift();
    sheetPanel.style.transform = `translateY(${sg.dy}px)`;
  });
  function endSheetDrag(e) {
    if (!sg || e.pointerId !== sg.id) return;
    const p0 = sg.pts[0];
    const v = (e.clientY - p0.y) / Math.max(1, performance.now() - p0.t);
    const close = sg.dy > 80 || (v > COMMIT_VELOCITY && sg.dy > 10);
    sg = null;
    if (close) {
      closeSheet();
    } else {
      sheetPanel.style.transition = '';
      sheetPanel.style.transform = '';
    }
  }
  sheetHead.addEventListener('pointerup', endSheetDrag);
  sheetHead.addEventListener('pointercancel', endSheetDrag);

  // Export / import

  let statusText = 'CHECKING OFFLINE…';
  let updateReady = false;
  let flashTimer = 0;

  function renderStatus() {
    if (flashTimer) return;
    statusEl.textContent = '';
    if (updateReady) {
      const b = el('button', '', 'UPDATE AVAILABLE · TAP TO RELOAD');
      b.type = 'button';
      b.addEventListener('click', applyUpdate);
      statusEl.append(b);
    } else {
      statusEl.textContent = statusText;
    }
  }

  function flashStatus(text) {
    clearTimeout(flashTimer);
    statusEl.textContent = text;
    flashTimer = setTimeout(() => { flashTimer = 0; renderStatus(); }, 2500);
  }

  $('exportBtn').addEventListener('click', () => {
    const payload = { app: 'nato-drill', format: 1, exportedAt: new Date().toISOString(), state };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = el('a');
    a.href = url;
    a.download = 'nato-drill-progress.json';
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    flashStatus('PROGRESS EXPORTED ✓');
  });

  $('importBtn').addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', async () => {
    const file = importFile.files && importFile.files[0];
    importFile.value = '';
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const raw = parsed && parsed.state ? parsed.state : parsed;
      if (!raw || typeof raw !== 'object' || !raw.cards) throw new Error('not a progress file');
      state = normalize(raw);
      if (!state.current) show(pickNext(null));
      save();
      replaceCard();
      renderSheet();
      flashStatus('PROGRESS IMPORTED ✓');
    } catch (err) {
      flashStatus('IMPORT FAILED · NOT A PROGRESS FILE');
    }
  });

  // Reset: two taps within 3 seconds.
  let resetTimer = 0;
  function disarmReset() {
    clearTimeout(resetTimer);
    resetTimer = 0;
    resetBtn.classList.remove('armed');
    resetBtn.textContent = 'RESET PROGRESS';
  }
  resetBtn.addEventListener('click', () => {
    if (!resetTimer) {
      resetBtn.classList.add('armed');
      resetBtn.textContent = 'TAP AGAIN TO CONFIRM';
      resetTimer = setTimeout(disarmReset, 3000);
      return;
    }
    disarmReset();
    state = freshState();
    show(pickNext(null));
    save();
    replaceCard();
    renderSheet();
    flashStatus('PROGRESS RESET');
  });

  // ---------- Offline / service worker ----------

  let swReg = null;

  function askWorker(worker, type) {
    return new Promise((resolve) => {
      if (!worker) { resolve(null); return; }
      const ch = new MessageChannel();
      const t = setTimeout(() => resolve(null), 4000);
      ch.port1.onmessage = (e) => { clearTimeout(t); resolve(e.data); };
      worker.postMessage({ type }, [ch.port2]);
    });
  }

  async function checkOffline(attempt = 0) {
    const reg = await navigator.serviceWorker.ready;
    const res = await askWorker(reg.active, 'check-offline');
    if (res && res.ok) {
      statusText = 'READY OFFLINE ✓';
    } else {
      statusText = 'CACHING FOR OFFLINE…';
      if (attempt < 10) setTimeout(() => checkOffline(attempt + 1), 2000);
    }
    renderStatus();
  }

  function showUpdate() {
    updateReady = true;
    renderStatus();
  }

  function applyUpdate() {
    if (swReg && swReg.waiting) {
      navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true });
      swReg.waiting.postMessage({ type: 'skip-waiting' });
    } else {
      location.reload();
    }
  }

  function initServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      statusText = 'OFFLINE MODE NOT SUPPORTED HERE';
      renderStatus();
      return;
    }
    const hadController = !!navigator.serviceWorker.controller;
    // A new worker took over (it calls skipWaiting); the running page is still the old code.
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hadController) showUpdate();
    });
    navigator.serviceWorker.register('sw.js').then((reg) => {
      swReg = reg;
      if (reg.waiting && hadController) showUpdate();
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && hadController) showUpdate();
          if (nw.state === 'activated') checkOffline();
        });
      });
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update().catch(() => {});
      });
    }).catch(() => {
      statusText = 'OFFLINE CACHE UNAVAILABLE';
      renderStatus();
    });
    checkOffline();
  }

  // ---------- Boot ----------

  if (!state.current) show(pickNext(null));
  save();
  replaceCard();
  renderSheet();
  renderStatus();

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => fitWord(cardEl));
  window.addEventListener('resize', () => fitWord(cardEl));

  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

  initServiceWorker();
})();
