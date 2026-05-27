/* ===================================
   씽크스마트 프로토타입 공용 스크립트
   =================================== */

let DATA = null;
let EVENTS = null;

async function loadData() {
  if (DATA) return DATA;
  const res = await fetch('data/data.json');
  DATA = await res.json();
  return DATA;
}

async function loadEvents() {
  if (EVENTS) return EVENTS;
  const res = await fetch('data/events.json');
  EVENTS = await res.json();
  return EVENTS;
}

let INSTAGRAM = null;
async function loadInstagram() {
  if (INSTAGRAM) return INSTAGRAM;
  const res = await fetch('data/instagram.json');
  INSTAGRAM = await res.json();
  return INSTAGRAM;
}

function thumb(path) {
  // /assets/ig/XXXX.jpg → /assets/ig_thumb/XXXX.jpg
  return path
    .replace('/ig/', '/ig_thumb/')
    .replace(/\.(heic|HEIC|jpeg|JPEG|JPG)$/, '.jpg');
}

function shortCaption(s, n = 60) {
  if (!s) return '';
  s = s.replace(/\s+/g, ' ').trim();
  return s.length > n ? s.slice(0, n) + '…' : s;
}

function igCard(post) {
  const img = post.images?.[0];
  if (!img) return '';
  return `
    <a class="ig-card" href="ig-post.html?id=${post.id}">
      <div class="ig-thumb" style="background-image:url('${thumb(img)}');">
        ${post.images.length > 1 ? `<span class="ig-multi">⊞ ${post.images.length}</span>` : ''}
      </div>
    </a>`;
}

function igListCard(post) {
  const img = post.images?.[0];
  return `
    <a class="ig-list-card" href="ig-post.html?id=${post.id}">
      ${img ? `<div class="ig-list-thumb" style="background-image:url('${thumb(img)}');"></div>` : ''}
      <div class="ig-list-body">
        <div class="ig-list-date">${post.date_display || '날짜 미상'} ${post.images.length > 1 ? `· 사진 ${post.images.length}장` : ''}</div>
        <div class="ig-list-caption">${shortCaption(post.caption, 120)}</div>
        <div class="ig-list-tags">
          ${post.types.includes('event') ? '<span class="tag" style="background:#FFE0E0;color:#B5483B;">🎤 행사</span>' : ''}
          ${post.types.includes('book')  ? '<span class="tag" style="background:#E8F0E0;color:#2E5928;">📚 책</span>' : ''}
        </div>
      </div>
    </a>`;
}

function fmtKoreanDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const m = d.getMonth() + 1, day = d.getDate();
  const wk = ['일','월','화','수','목','금','토'][d.getDay()];
  return `${m}월 ${day}일 (${wk})`;
}

function daysUntil(iso) {
  if (!iso) return null;
  const d = new Date(iso); const now = new Date();
  now.setHours(0,0,0,0); d.setHours(0,0,0,0);
  return Math.round((d - now) / 86400000);
}

function eventTypeIcon(type) {
  const map = {
    '북토크': '🎤', '출간 기념': '📖', '살롱': '💬',
    '수료식': '🎓', '마을학교 모집': '🏫',
    '강연': '🗣️', '워크숍': '🛠️',
  };
  return map[type] || '📅';
}

function eventCard(ev) {
  const dleft = daysUntil(ev.date);
  let badge = '';
  if (ev.status === 'upcoming') {
    if (dleft !== null && dleft <= 0) badge = '<span class="tag" style="background:#B5483B;color:#fff;">진행 중</span>';
    else if (dleft !== null && dleft <= 7) badge = `<span class="tag" style="background:#D4A574;color:#fff;">D-${dleft}</span>`;
    else badge = `<span class="tag" style="background:#2E5984;color:#fff;">D-${dleft}</span>`;
  } else {
    badge = '<span class="tag" style="background:#E8E2D6;color:#6B7280;">지난 행사</span>';
  }
  return `
    <a class="event-card" href="event.html?id=${ev.id}">
      <div class="event-cover" style="background:linear-gradient(135deg, #2E5984 0%, #1F3A5F 100%);">
        <div class="event-icon">${eventTypeIcon(ev.type)}</div>
        <div class="event-date-badge">
          <div class="m">${new Date(ev.date).toLocaleDateString('ko-KR', {month:'short'}).replace('월','')}</div>
          <div class="d">${new Date(ev.date).getDate()}</div>
        </div>
      </div>
      <div class="event-body">
        <div class="event-meta">
          <span class="tag">${ev.type}</span>
          ${badge}
        </div>
        <div class="event-title">${ev.title}</div>
        <div class="event-sub">
          ${fmtKoreanDate(ev.date)}${ev.time ? ' · ' + ev.time : ''} · ${ev.location}
        </div>
        ${ev.host ? `<div class="event-host">진행: ${ev.host}</div>` : ''}
      </div>
    </a>`;
}

const SCHOOL_COLORS = {
  '낭독학교':   '#D4815A',
  '서각학교':   '#7A6A8A',
  '사춘기살롱': '#5B8B8B',
  '남독학교':   '#A37A5B',
  '썰래발학교': '#B5483B',
};

const AVATAR_COLORS = [
  '#1F3A5F', '#2E5984', '#B5483B', '#D4A574', '#5B8B8B',
  '#7A6A8A', '#A37A5B', '#8B7355', '#4A6B82', '#9B6B8B',
];

function avatarColor(name) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}

function initial(name) {
  return (name || '?').trim().slice(0, 1);
}

function qs(name, fallback = '') {
  return new URLSearchParams(location.search).get(name) || fallback;
}

function nav(active = '') {
  const tabs = [
    { id: 'home',    icon: '🏠', label: '홈',       href: 'index.html' },
    { id: 'authors', icon: '👤', label: '저자',     href: 'authors.html' },
    { id: 'books',   icon: '📚', label: '책방',     href: 'books.html' },
    { id: 'schools', icon: '🏫', label: '마을학교', href: 'schools.html' },
    { id: 'events',  icon: '🎤', label: '행사',     href: 'events.html' },
  ];
  return `<nav class="tab-bar">${tabs.map(t => `
    <a class="tab ${t.id === active ? 'active' : ''}" href="${t.href}">
      <span class="icon">${t.icon}</span>
      <span>${t.label}</span>
    </a>
  `).join('')}</nav>`;
}

function headerTop() {
  return `
    <header class="app-header">
      <div class="logo">씽크스마트 <small>사람이 책이 된다</small></div>
      <div class="header-actions">
        <button class="icon-btn" onclick="location.href='more.html'" aria-label="더보기">☰</button>
      </div>
    </header>
  `;
}

function backBar(title) {
  return `
    <header class="back-bar">
      <button class="icon-btn" onclick="history.back()">←</button>
      <h1>${title}</h1>
    </header>
  `;
}

function avatar(name, size = 60, fontSize = 22) {
  return `
    <div class="avatar" style="width:${size}px;height:${size}px;background:${avatarColor(name)};font-size:${fontSize}px;">
      ${initial(name)}
    </div>`;
}

function bookCover(title, series) {
  return `
    <div class="cover">
      ${series ? `<div style="font-size:9px;opacity:0.7;margin-bottom:3px;">${series.split(' 시리즈')[0]}</div>` : ''}
      <div style="font-weight:600;line-height:1.2;">${title.length > 12 ? title.slice(0,12)+'…' : title}</div>
    </div>`;
}

function bookCard(book) {
  const authors = book.author_names.slice(0, 2).join(', ') + (book.author_names.length > 2 ? ` 외 ${book.author_names.length - 2}` : '');
  return `
    <a class="book-card" href="book.html?id=${book.id}">
      ${bookCover(book.title, book.series)}
      <div class="info">
        <div class="title">${book.title}</div>
        ${book.subtitle ? `<div class="sub">${book.subtitle}</div>` : ''}
        <div class="meta">
          <strong>${authors}</strong> · ${book.pub_date}
          ${book.schools.length ? ` · <span style="color:${SCHOOL_COLORS[book.schools[0]]}">${book.schools[0]}</span>` : ''}
        </div>
      </div>
    </a>`;
}

function authorCard(author) {
  return `
    <a class="author-card" href="author.html?id=${author.id}">
      <div class="avatar" style="background:${avatarColor(author.name)};color:#fff;">
        ${initial(author.name)}
      </div>
      <div class="name">${author.name}</div>
      <div class="count">${author.count}권 집필</div>
      <div class="tags">
        ${author.grade === 'A' ? '<span class="tag grade-A">A</span>' : ''}
        ${author.schools.slice(0,1).map(s => `<span class="tag school">${s}</span>`).join('')}
      </div>
    </a>`;
}

function schoolCard(name, stats, desc) {
  const color = SCHOOL_COLORS[name] || '#888';
  return `
    <a class="school-card" href="school.html?name=${encodeURIComponent(name)}" style="border-color:${color}33;">
      <div class="icon">${desc.icon}</div>
      <div>
        <div class="name" style="color:${color};">${name}</div>
        <div class="stat">강사 ${stats.author_count}명 · 책 ${stats.book_count}권</div>
      </div>
    </a>`;
}
