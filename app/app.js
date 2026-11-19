// Leonida Trophy Guide — tracker logic. Loads data/trophies.json, renders the
// checklist and the roadmap, and keeps earned ticks in localStorage. No network
// calls besides the one same-origin fetch of the bundled data file.
const STORE_KEY = 'gta6-leonida-progress-v1';
const SPOILER_KEY = 'gta6-leonida-spoiler-v1';

const STAGES = [
  { n: 1, title: 'Stage 1 — Story first', meta: 'Chapters 1–4 and the mission trophies', blurb: 'Play the story. Keep a manual save at the start of every chapter — there is no mission replay.' },
  { n: 2, title: 'Stage 2 — Side stories & partners', meta: 'Stranger strands, side finales, duo jobs', blurb: 'Finish the stranger strands and the side-character finales, then do the partner and robbery trophies with Jason and Lucia together.' },
  { n: 3, title: 'Stage 3 — Collectibles & the map', meta: 'Cards, WAiNK, vehicles, meditation', blurb: 'Sweep Leonida region by region. Do the Chapter 1 balcony meditation before this stage ends — it is the one missable trophy.' },
  { n: 4, title: 'Stage 4 — Grinds & the platinum', meta: 'Stunts, races, challenges, 100%', blurb: 'The long grinds: 250 stunts, 50 challenges, 20 races, the shooting ranges. A Long Road and the platinum close the list.' },
];

const doc = await (await fetch('data/trophies.json')).json();
const trophies = doc.trophies;
const sourceMap = doc.sources || {};

let earned = new Set(JSON.parse(localStorage.getItem(STORE_KEY) ?? '[]'));
let spoiler = localStorage.getItem(SPOILER_KEY) === '1';

const $ = (id) => document.getElementById(id);
const cardsEl = $('cards');
const stagesEl = $('stages');

function save() {
  localStorage.setItem(STORE_KEY, JSON.stringify([...earned]));
  localStorage.setItem(SPOILER_KEY, spoiler ? '1' : '0');
}

function gradeLabel(g) {
  return g[0].toUpperCase() + g.slice(1);
}

function applyHash() {
  const h = new URLSearchParams(location.hash.slice(1));
  if (h.get('kind')) setKind(h.get('kind'));
  if (h.get('grade')) $('gradeFilter').value = h.get('grade');
  if (h.get('difficulty')) $('difficultyFilter').value = h.get('difficulty');
  if (h.get('spoiler') === '1') { spoiler = true; $('spoilerToggle').checked = true; }
  if (h.get('earnedOnly') === '1') $('earnedOnly').checked = true;
}

function scrollToHashView() {
  // Scroll only after the first render: before it the page is short and the
  // browser clamps the scroll back to the top.
  const view = new URLSearchParams(location.hash.slice(1)).get('view');
  if (view === 'roadmap') $('roadmap').scrollIntoView();
  if (view === 'tracker') $('tracker').scrollIntoView();
}

function setKind(kind) {
  for (const b of document.querySelectorAll('#kindButtons button')) {
    b.classList.toggle('active', b.dataset.kind === kind);
  }
}

function currentKind() {
  const active = document.querySelector('#kindButtons button.active');
  return active ? active.dataset.kind : 'all';
}

function visibleTrophies() {
  const q = $('search').value.trim().toLowerCase();
  const kind = currentKind();
  const grade = $('gradeFilter').value;
  const diff = $('difficultyFilter').value;
  const earnedOnly = $('earnedOnly').checked;
  return trophies.filter((t) => {
    if (kind === 'missable' && !t.missable) return false;
    if (kind !== 'all' && kind !== 'missable' && t.kind !== kind) return false;
    if (grade !== 'all' && t.grade !== grade) return false;
    if (diff !== 'all' && t.difficulty !== diff) return false;
    if (earnedOnly && !earned.has(t.name)) return false;
    if (q && !(t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.guide.toLowerCase().includes(q))) return false;
    return true;
  });
}

function masked(t) {
  return spoiler && t.hidden && !earned.has(t.name);
}

function renderProgress() {
  const total = trophies.length;
  const n = earned.size;
  const pct = Math.round((n / total) * 100);
  $('earnedCount').textContent = n;
  $('totalCount').textContent = total;
  $('progressPct').textContent = pct + '%';
  $('progressRing').style.setProperty('--pct', pct);
  $('progressFill').style.width = pct + '%';
  const byGrade = {};
  for (const t of trophies) if (earned.has(t.name)) byGrade[t.grade] = (byGrade[t.grade] || 0) + 1;
  $('gradeCounts').textContent = ['platinum', 'gold', 'silver', 'bronze']
    .map((g) => `${gradeLabel(g)} ${byGrade[g] || 0}/${trophies.filter((t) => t.grade === g).length}`).join(' · ');
  $('progressNote').textContent = n === 0
    ? 'The platinum is waiting. Start with Stage 1.'
    : n === total
      ? 'Leonida Legend — every trophy earned.'
      : n < 10
        ? 'Good start. The story trophies fall fast in Stage 1.'
        : n < 40
          ? 'Past the halfway habits — collectibles and grinds are next.'
          : 'Almost there. The grinds in Stage 4 are all that is left.';
}

function renderRoadmap() {
  stagesEl.replaceChildren();
  for (const s of STAGES) {
    const list = trophies.filter((t) => t.stage === s.n);
    const done = list.filter((t) => earned.has(t.name)).length;
    const div = document.createElement('div');
    div.className = 'stage';
    const h = document.createElement('h3');
    h.textContent = s.title;
    const meta = document.createElement('p');
    meta.className = 'stage-meta';
    meta.textContent = `${s.meta} — ${done}/${list.length} earned`;
    const blurb = document.createElement('p');
    blurb.className = 'stage-meta';
    blurb.textContent = s.blurb;
    const ul = document.createElement('ul');
    for (const t of list) {
      const li = document.createElement('li');
      li.textContent = masked(t) ? 'Hidden trophy' : t.name;
      if (earned.has(t.name)) li.className = 'done';
      ul.append(li);
    }
    div.append(h, meta, blurb, ul);
    stagesEl.append(div);
  }
}

function renderCards() {
  const list = visibleTrophies();
  $('resultCount').textContent = `Showing ${list.length} of ${trophies.length} trophies` +
    (earned.size ? ` · ${earned.size} earned` : '');
  cardsEl.replaceChildren();
  for (const t of list) {
    const card = document.createElement('article');
    card.className = 'card' + (earned.has(t.name) ? ' earned' : '') + (t.missable ? ' missable-card' : '');
    const head = document.createElement('div');
    head.className = 'card-head';
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = earned.has(t.name);
    box.setAttribute('aria-label', 'Mark ' + t.name + ' as earned');
    box.addEventListener('change', () => {
      if (box.checked) earned.add(t.name); else earned.delete(t.name);
      save();
      renderProgress();
      renderRoadmap();
      renderCards();
    });
    const title = document.createElement('div');
    title.className = 'card-title';
    const h3 = document.createElement('h3');
    h3.textContent = masked(t) ? 'Hidden trophy' : t.name;
    const off = document.createElement('p');
    off.className = 'official';
    off.textContent = masked(t) ? 'Spoiler mode hides this trophy until you earn it.' : '“' + t.description + '”';
    title.append(h3, off);
    const badge = document.createElement('span');
    badge.className = 'badge ' + t.grade;
    badge.textContent = gradeLabel(t.grade);
    head.append(box, title, badge);
    card.append(head);
    const tags = document.createElement('div');
    tags.className = 'tags';
    const kindTag = document.createElement('span');
    kindTag.className = 'tag';
    kindTag.textContent = t.kind;
    const diffTag = document.createElement('span');
    diffTag.className = 'tag';
    diffTag.textContent = t.difficulty;
    tags.append(kindTag, diffTag);
    if (t.hidden) {
      const ht = document.createElement('span');
      ht.className = 'tag hidden-tag';
      ht.textContent = 'hidden';
      tags.append(ht);
    }
    if (t.missable) {
      const mt = document.createElement('span');
      mt.className = 'tag missable-tag2';
      mt.textContent = '⚠ missable';
      tags.append(mt);
    }
    const stageTag = document.createElement('span');
    stageTag.className = 'tag';
    stageTag.textContent = 'Stage ' + t.stage;
    tags.append(stageTag);
    card.append(tags);
    if (masked(t)) {
      const m = document.createElement('div');
      m.className = 'spoiler-mask';
      m.textContent = 'Hidden story trophy — its name, description and guide stay hidden until you tick it earned.';
      card.append(m);
    } else {
      const details = document.createElement('details');
      details.className = 'guide';
      const sum = document.createElement('summary');
      sum.textContent = 'How to earn it';
      const p = document.createElement('p');
      p.textContent = t.guide;
      details.append(sum, p);
      card.append(details);
      const src = document.createElement('p');
      src.className = 'sources';
      src.textContent = 'Sources: ';
      t.sources.forEach((key, i) => {
        const s = sourceMap[key];
        if (!s) return;
        if (i > 0) src.append(document.createTextNode(' · '));
        const a = document.createElement('a');
        a.href = s.url;
        a.textContent = s.name;
        a.target = '_blank';
        a.rel = 'noopener';
        src.append(a);
      });
      card.append(src);
    }
    cardsEl.append(card);
  }
}

function renderAll() {
  renderProgress();
  renderRoadmap();
  renderCards();
}

$('search').addEventListener('input', renderCards);
$('gradeFilter').addEventListener('change', renderCards);
$('difficultyFilter').addEventListener('change', renderCards);
$('earnedOnly').addEventListener('change', renderCards);
$('spoilerToggle').addEventListener('change', (e) => {
  spoiler = e.target.checked;
  save();
  renderAll();
});
$('kindButtons').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-kind]');
  if (!b) return;
  setKind(b.dataset.kind);
  renderCards();
});
$('missableJump').addEventListener('click', () => {
  setKind('missable');
  $('tracker').scrollIntoView();
  renderCards();
});
$('exportBtn').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ game: 'Grand Theft Auto VI', earned: [...earned] }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'gta6-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
});
$('importFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const names = new Set(Array.isArray(data) ? data : data.earned || []);
    earned = new Set(trophies.map((t) => t.name).filter((n) => names.has(n)));
    save();
    renderAll();
  } catch {
    alert('That file is not a valid progress export.');
  }
  e.target.value = '';
});
$('resetBtn').addEventListener('click', () => {
  if (!confirm('Clear all earned ticks?')) return;
  earned = new Set();
  save();
  renderAll();
});

$('spoilerToggle').checked = spoiler;
applyHash();
renderAll();
scrollToHashView();
