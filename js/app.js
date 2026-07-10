/* ===================================
   씽크스마트 프로토타입 공용 스크립트
   =================================== */

let DATA = null;
let EVENTS = null;
let CONFIG = null;

async function loadConfig() {
  if (CONFIG) return CONFIG;
  try {
    const res = await fetch('data/config.json');
    CONFIG = await res.json();
  } catch (e) {
    CONFIG = {};
  }
  return CONFIG;
}

function applyAffiliate(url, source) {
  if (!url || !CONFIG) return url;
  const sep = url.includes('?') ? '&' : '?';
  if (source === 'aladin' && CONFIG.aladin_ttb_key) {
    return `${url}${sep}partner=${CONFIG.aladin_ttb_key}`;
  }
  if (source === 'yes24' && CONFIG.yes24_aff_id) {
    return `${url}${sep}LinkID=${CONFIG.yes24_aff_id}`;
  }
  if (source === 'kyobo' && CONFIG.kyobo_aff_id) {
    return `${url}${sep}aff=${CONFIG.kyobo_aff_id}`;
  }
  return url;
}

// GA4 자동 부트스트랩 — config에 ID가 있을 때만 활성화
loadConfig().then(c => {
  if (c && c.ga_measurement_id) {
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${c.ga_measurement_id}`;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    gtag('js', new Date());
    gtag('config', c.ga_measurement_id);
  }
});

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

// 가로 스크롤 영역에 진행 인디케이터 자동 부착
function attachScrollIndicators() {
  document.querySelectorAll('.h-scroll').forEach(scroll => {
    const items = scroll.children.length;
    if (items < 2) return;
    if (scroll.dataset.indicatorAttached) return;
    scroll.dataset.indicatorAttached = '1';
    const dots = document.createElement('div');
    dots.className = 'scroll-indicator';
    for (let i = 0; i < items; i++) {
      const dot = document.createElement('div');
      dot.className = 'dot' + (i === 0 ? ' active' : '');
      dots.appendChild(dot);
    }
    scroll.parentNode.insertBefore(dots, scroll.nextSibling);

    scroll.addEventListener('scroll', () => {
      const cards = scroll.children;
      const scrollLeft = scroll.scrollLeft;
      const cardW = cards[0].offsetWidth + 12; // gap
      const active = Math.round(scrollLeft / cardW);
      [...dots.children].forEach((d, i) => {
        d.classList.toggle('active', i === Math.min(active, items - 1));
      });
    }, { passive: true });
  });
}

// DOMContentLoaded 시점이 아니라 페이지 렌더 후 호출
function afterRender() {
  requestAnimationFrame(() => {
    attachScrollIndicators();
  });
}

// #content 안의 변화를 감지해 자동 인디케이터 부착
document.addEventListener('DOMContentLoaded', () => {
  const target = document.getElementById('content');
  if (!target) return;
  const obs = new MutationObserver(() => {
    attachScrollIndicators();
    attachDrawerHandlers();
  });
  obs.observe(target, { childList: true, subtree: true });
});

function thumb(path) {
  // 인스타 CDN 등 http(s) URL은 그대로 사용 (자동 수집 게시물)
  if (/^https?:/.test(path)) return path;
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

// ====== 통합 검색 헬퍼 ======
function normalize(s) {
  return (s || '').toString().toLowerCase().replace(/\s+/g, '');
}

function searchAll(query) {
  if (!query || !query.trim()) return { authors: [], books: [], events: [], schools: [], picks: [], ig: [] };
  const q = normalize(query);
  const results = { authors: [], books: [], events: [], schools: [], picks: [], ig: [] };
  if (!DATA || !EVENTS) return results;

  // 저자
  DATA.authors.forEach(a => {
    if (normalize(a.name).includes(q) || normalize(a.lead).includes(q)) {
      results.authors.push(a);
    }
  });
  // 책
  DATA.books.forEach(b => {
    if (normalize(b.title).includes(q) ||
        normalize(b.subtitle).includes(q) ||
        normalize(b.series).includes(q) ||
        normalize(b.category).includes(q) ||
        (b.author_names || []).some(n => normalize(n).includes(q))) {
      results.books.push(b);
    }
  });
  // 행사
  (EVENTS.events || []).forEach(e => {
    if (normalize(e.title).includes(q) ||
        normalize(e.summary).includes(q) ||
        normalize(e.host).includes(q) ||
        normalize(e.location).includes(q)) {
      results.events.push(e);
    }
  });
  // 인스타 픽
  (EVENTS.instagram_picks || []).forEach(p => {
    if (normalize(p.title).includes(q) ||
        normalize(p.summary).includes(q) ||
        normalize(p.type).includes(q)) {
      results.picks.push(p);
    }
  });
  // 마을학교
  Object.keys(DATA.schools || {}).forEach(name => {
    const d = DATA.school_descriptions[name];
    if (normalize(name).includes(q) || (d && normalize(d.desc).includes(q))) {
      results.schools.push({ name, stats: DATA.schools[name], desc: d });
    }
  });
  // 인스타 캡션 (상위 매칭만)
  if (INSTAGRAM) {
    let igHits = 0;
    for (const p of INSTAGRAM.posts) {
      if (igHits >= 12) break;
      if (normalize(p.caption).includes(q)) {
        results.ig.push(p);
        igHits++;
      }
    }
  }
  return results;
}

// ====== 참가 신청 모달 ======
function registerModalMarkup() {
  return `
    <div class="reg-backdrop" data-reg-close></div>
    <aside class="reg-modal" role="dialog" aria-modal="true" aria-labelledby="reg-title">
      <div class="reg-head">
        <h2 id="reg-title">참가 신청</h2>
        <button class="icon-btn" data-reg-close aria-label="닫기">✕</button>
      </div>
      <div class="reg-event-info">
        <div class="reg-event-title" id="reg-event-title"></div>
        <div class="reg-event-sub" id="reg-event-sub"></div>
      </div>
      <form class="reg-form" name="event-registration" method="POST"
            data-netlify="true" netlify-honeypot="bot-field"
            data-reg-form>
        <input type="hidden" name="form-name" value="event-registration">
        <input type="hidden" name="event_id" id="reg-event-id" value="">
        <input type="hidden" name="event_name" id="reg-event-name" value="">
        <p style="display:none;"><label>안 보임: <input name="bot-field"></label></p>

        <label class="reg-field">
          <span class="reg-label">이름 <em>*</em></span>
          <input type="text" name="name" required maxlength="20" placeholder="홍길동">
        </label>
        <label class="reg-field">
          <span class="reg-label">휴대폰 <em>*</em></span>
          <input type="tel" name="phone" required pattern="[0-9\\-]{9,13}"
                 placeholder="010-0000-0000" inputmode="tel">
        </label>
        <label class="reg-field">
          <span class="reg-label">참가 인원 <em>*</em></span>
          <select name="attendees" required>
            <option value="1">1명</option>
            <option value="2">2명</option>
            <option value="3">3명</option>
            <option value="4">4명</option>
            <option value="5+">5명 이상</option>
          </select>
        </label>
        <label class="reg-field">
          <span class="reg-label">한 마디 (선택)</span>
          <textarea name="message" rows="2" maxlength="200"
                    placeholder="궁금한 점·요청사항을 적어주세요"></textarea>
        </label>

        <label class="reg-agree">
          <input type="checkbox" name="agree" required>
          <span>
            <strong>개인정보 수집·이용 동의 (필수)</strong><br>
            수집 항목: 이름·휴대폰·신청 정보 · 보유 기간: 행사 종료 후 3개월 ·
            거부 시 신청이 불가합니다.
          </span>
        </label>

        <p class="reg-notice">
          ※ 신청 후 운영자가 카톡 또는 휴대폰으로 안내드립니다.
          (24시간 내 응답)
        </p>

        <button type="submit" class="btn amber reg-submit">신청하기</button>
      </form>

      <div class="reg-success" style="display:none;">
        <div class="reg-success-icon">✅</div>
        <h3>신청 완료!</h3>
        <p>운영자가 24시간 내 카톡 또는 휴대폰으로 안내드립니다.<br>
           기다리시는 동안 인스타그램(@thinksmart.official)도 둘러보세요.</p>
        <button class="btn outline" data-reg-close>확인</button>
      </div>
    </aside>
  `;
}

function attachRegisterHandlers() {
  if (document._regWired) return;
  document._regWired = true;

  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-event-register]');
    if (btn) {
      e.preventDefault();
      const id    = btn.dataset.eventId    || '';
      const name  = btn.dataset.eventName  || '';
      const date  = btn.dataset.eventDate  || '';
      const loc   = btn.dataset.eventLoc   || '';
      document.getElementById('reg-event-id').value   = id;
      document.getElementById('reg-event-name').value = name;
      document.getElementById('reg-event-title').textContent = name;
      document.getElementById('reg-event-sub').textContent = [date, loc].filter(Boolean).join(' · ');
      // reset form state
      const form = document.querySelector('[data-reg-form]');
      const success = document.querySelector('.reg-success');
      if (form && success) {
        form.style.display = '';
        form.reset();
        success.style.display = 'none';
      }
      document.body.classList.add('reg-open');
      return;
    }
    if (e.target.closest('[data-reg-close]')) {
      document.body.classList.remove('reg-open');
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') document.body.classList.remove('reg-open');
  });

  document.addEventListener('submit', e => {
    const form = e.target.closest('[data-reg-form]');
    if (!form) return;
    e.preventDefault();
    const submitBtn = form.querySelector('.reg-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = '전송 중…';
    const data = new FormData(form);
    fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(data).toString(),
    }).then(res => {
      if (!res.ok) throw new Error('전송 실패');
      form.style.display = 'none';
      document.querySelector('.reg-success').style.display = 'block';
    }).catch(err => {
      submitBtn.disabled = false;
      submitBtn.textContent = '신청하기';
      alert('전송에 실패했어요. 잠시 후 다시 시도해 주세요.\n(' + err.message + ')');
    });
  });
}

// 페이지 로드 시 모달 마크업을 body에 한 번만 부착
function ensureRegisterModalMounted() {
  if (document.getElementById('reg-modal-mount')) return;
  const mount = document.createElement('div');
  mount.id = 'reg-modal-mount';
  mount.innerHTML = registerModalMarkup();
  document.body.appendChild(mount);
  attachRegisterHandlers();
}
document.addEventListener('DOMContentLoaded', ensureRegisterModalMounted);

// ====== 셔플 / 카테고리 그룹 헬퍼 ======
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickOnePerGroup(items, keyFn) {
  // 그룹별로 무작위 1개씩 선택, 그룹은 항목 수 내림차순
  const groups = {};
  for (const x of items) {
    const k = keyFn(x);
    if (!k) continue;
    (groups[k] = groups[k] || []).push(x);
  }
  return Object.entries(groups)
    .sort((a,b) => b[1].length - a[1].length)
    .map(([k, list]) => ({
      group: k,
      count: list.length,
      pick: list[Math.floor(Math.random() * list.length)],
    }));
}

function authorNameCard(author) {
  // 사진 대신 이름 전체 카드 (이니셜 아바타 안 씀)
  const color = avatarColor(author.name);
  return `
    <a class="author-name-card" href="author.html?id=${author.id}">
      <div class="name-block" style="background:${color};">
        <div class="full-name">${author.name}</div>
      </div>
      <div class="name-meta">
        <strong>${author.count}권</strong>
        ${author.schools.length ? ` · ${author.schools[0]}` : ''}
      </div>
    </a>`;
}

// ====== 인스타 픽 (URL 임베드) ======
function instaCode(url) {
  // /p/CODE/ 추출
  const m = (url || '').match(/\/p\/([^\/?]+)/);
  return m ? m[1] : '';
}

function pickTypeColor(type) {
  const map = {
    '북토크':       '#E07857',
    '북콘서트':     '#E07857',
    '신간':         '#5C97D4',
    '수상·소식':    '#D4A574',
    '책 홍보':       '#7A6A8A',
    '일상':         '#9B9B9B',
  };
  return map[type] || '#5C97D4';
}

function instaPickCard(pick) {
  const color = pickTypeColor(pick.type);
  return `
    <a class="pick-card" href="ig-embed.html?id=${pick.id}">
      <div class="pick-head" style="background:${color};">
        <span class="pick-type">${pick.type}</span>
        <span class="pick-date">${pick.date_hint || ''}</span>
      </div>
      <div class="pick-body">
        <div class="pick-title">${pick.title}</div>
        <div class="pick-summary">${shortCaption(pick.summary, 90)}</div>
      </div>
      <div class="pick-foot">
        <span>📷 인스타 보기 →</span>
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
        <button class="icon-btn" data-drawer-open aria-label="메뉴 열기">☰</button>
      </div>
    </header>
    ${drawerMarkup()}
  `;
}

function drawerMarkup() {
  return `
    <div class="drawer-backdrop" data-drawer-close></div>
    <aside class="drawer" role="dialog" aria-label="보조 메뉴">
      <div class="drawer-head">
        <div class="drawer-logo">씽크스마트</div>
        <button class="icon-btn" data-drawer-close aria-label="메뉴 닫기">✕</button>
      </div>

      <div class="drawer-search">
        <form action="search.html" method="get" style="margin:0;">
          <input type="search" name="q" placeholder="저자·책·행사·마을학교 검색…" autocomplete="off">
        </form>
      </div>

      <nav class="drawer-menu">
        <a class="d-item"><span class="d-ic">📢</span><span>공지사항</span><span class="d-arrow">›</span></a>
        <a class="d-item" href="events.html"><span class="d-ic">🎤</span><span>모든 행사</span><span class="d-arrow">›</span></a>
        <a class="d-item" href="instagram.html"><span class="d-ic">📷</span><span>인스타그램 피드</span><span class="d-arrow">›</span></a>
        <a class="d-item" href="events-guide.html"><span class="d-ic">📘</span><span>인스타 입력 가이드</span><span class="d-arrow">›</span></a>
        <a class="d-item"><span class="d-ic">📖</span><span>씽크스마트 소개</span><span class="d-arrow">›</span></a>
        <a class="d-item"><span class="d-ic">✉️</span><span>출판 상담 신청</span><span class="d-arrow">›</span></a>
      </nav>

      <div class="drawer-divider"></div>

      <nav class="drawer-menu">
        <a class="d-item"><span class="d-ic">⚙️</span><span>설정</span><span class="d-arrow">›</span></a>
        <a class="d-item"><span class="d-ic">👤</span><span>로그인 / 마이페이지</span><span class="d-arrow">›</span></a>
      </nav>

      <div class="drawer-foot">
        v0.4 · ${new Date().toISOString().slice(0,10)}<br>
        <a href="https://www.instagram.com/thinksmart.official/" target="_blank">@thinksmart.official</a>
      </div>
    </aside>
  `;
}

function attachDrawerHandlers() {
  if (document._drawerWired) return;
  document._drawerWired = true;
  document.addEventListener('click', e => {
    if (e.target.closest('[data-drawer-open]')) {
      document.body.classList.add('drawer-open');
    } else if (e.target.closest('[data-drawer-close]')) {
      document.body.classList.remove('drawer-open');
    }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') document.body.classList.remove('drawer-open');
  });
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
  const empty = (stats.author_count === 0 && stats.book_count === 0);
  if (empty) {
    return `
      <a class="school-card empty" href="school.html?name=${encodeURIComponent(name)}">
        <div class="empty-badge">준비 중</div>
        <div class="icon" style="opacity:0.4;">${desc.icon}</div>
        <div>
          <div class="name" style="color:var(--c-sub);">${name}</div>
          <div class="stat">곧 시작합니다</div>
        </div>
      </a>`;
  }
  return `
    <a class="school-card" href="school.html?name=${encodeURIComponent(name)}" style="border-color:${color}33;">
      <div class="icon">${desc.icon}</div>
      <div>
        <div class="name" style="color:${color};">${name}</div>
        <div class="stat">강사 ${stats.author_count}명 · 책 ${stats.book_count}권</div>
      </div>
    </a>`;
}
