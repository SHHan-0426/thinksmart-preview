/* =========================================================
   저자 유니버스 (Author Universe) — Phase 1~3
   저자 한 사람 = 하나의 작은 세계. 저자별 테마 컬러 + 시그니처 인터랙션.
   파일럿 3인: 이관로(질문봇) · 홍재기(공저 성좌) · 강현구(식물)
   app.js 뒤에 로드됨. author.html / index.html 공용.
   ========================================================= */

// ── 유니버스 정의 (파일럿 3인) ─────────────────────────────
const UNIVERSE = {
  'A042': { accent: '#1A827B', sig: 'question',      label: '오늘의 질문',      home: '"요즘 가장 궁금한 건?" 눌러서 답하기' }, // 이관로
  'A010': { accent: '#A9791A', sig: 'constellation', label: '공저자 성좌',      home: '함께 쓴 저자들의 별자리 보기' },        // 홍재기
  'A056': { accent: '#3E7C5A', sig: 'plant',         label: '오늘의 식물 문장', home: '스크롤하면 자라는 비밀노트' },          // 강현구
};
// 홈 로테이션 노출 순서
const UNIVERSE_PILOTS = ['A042', 'A010', 'A056'];

function universeOf(id) { return UNIVERSE[id] || null; }

// ── 질문봇 데이터 (이관로) ────────────────────────────────
const QUESTION_SETS = {
  'A042': {
    q: '요즘 가장 답이 궁금한 건 무엇인가요?',
    opts: [
      { t: '관계에서 대화가 자꾸 막혀요', a: '『질문 잘 하는 법』의 10가지 질문공식이 실마리가 됩니다.', href: 'book.html?id=B001', cta: '질문 잘 하는 법 →' },
      { t: '퇴직 후 삶이 막막해요',       a: '『인생오후 굿애프터눈』이 퇴직 후 습관의 쓸모를 안내합니다.', href: 'book.html?id=B049', cta: '인생오후 굿애프터눈 →' },
      { t: '아이와 어떻게 말해야 할지',   a: '사춘기살롱에서 함께 질문하며 답을 찾아요.', href: 'school.html?name=' + encodeURIComponent('사춘기살롱'), cta: '사춘기살롱 →' },
    ],
  },
};

// ── 식물 문장 (강현구) ────────────────────────────────────
const PLANT_QUOTES = {
  'A056': '식물은 도망치지 않는 대신, 오래 기다려 답한다.',
};

// ========================================================
//  시그니처 모듈 — 마크업
// ========================================================
function universeQuestionModule(a) {
  const u = universeOf(a.id), set = QUESTION_SETS[a.id];
  if (!set) return '';
  return `
    <section class="uni-sig" style="--uni:${u.accent}">
      <div class="uni-lab">${u.label}</div>
      <div class="uni-qcard" id="uni-q">
        <div class="uni-q-text" id="uni-q-text">${set.q}</div>
        <div class="uni-q-opts">
          ${set.opts.map((o, i) => `<button class="uni-q-opt" type="button" data-qi="${i}">${o.t}</button>`).join('')}
        </div>
        <div class="uni-q-ans" id="uni-q-ans" aria-live="polite"></div>
      </div>
    </section>`;
}

function universeConstellationModule(a, coAuthors) {
  const u = universeOf(a.id);
  if (!coAuthors || !coAuthors.length) return '';
  return `
    <section class="uni-sig" style="--uni:${u.accent}">
      <div class="uni-lab">${u.label} · 함께 쓴 저자 ${coAuthors.length}명</div>
      <div class="uni-constel-wrap">
        <canvas id="uni-constel" role="img" aria-label="${a.name}와 공저자 네트워크"></canvas>
      </div>
      <p class="uni-hint">별을 누르면 그 저자로 이동합니다</p>
    </section>`;
}

function universePlantModule(a) {
  const u = universeOf(a.id), quote = PLANT_QUOTES[a.id] || '';
  return `
    <section class="uni-sig" style="--uni:${u.accent}">
      <div class="uni-lab">${u.label}</div>
      <div class="uni-plant-card">
        <div class="uni-plant" id="uni-plant">
          <svg width="66" height="76" viewBox="0 0 66 76" aria-hidden="true">
            <path class="uni-stem" d="M33 74 C33 52 33 46 33 22"/>
            <ellipse class="uni-leaf l1" cx="33" cy="22" rx="8" ry="4.5"/>
            <ellipse class="uni-leaf l2" cx="19" cy="40" rx="10" ry="5" transform="rotate(-28 19 40)"/>
            <ellipse class="uni-leaf l3" cx="47" cy="50" rx="10" ry="5" transform="rotate(28 47 50)"/>
          </svg>
        </div>
        ${quote ? `<p class="uni-quote">"${quote}"</p>` : ''}
      </div>
    </section>`;
}

// 저자 상세 시그니처 라우터
function universeSignature(a, ctx) {
  const u = universeOf(a.id);
  if (!u) return '';
  ctx = ctx || {};
  if (u.sig === 'question')      return universeQuestionModule(a);
  if (u.sig === 'constellation') return universeConstellationModule(a, ctx.coAuthors || []);
  if (u.sig === 'plant')         return universePlantModule(a);
  return '';
}

// ========================================================
//  시그니처 모듈 — 인터랙션 초기화
// ========================================================
function initUniverseQuestion(a) {
  const set = QUESTION_SETS[a.id]; if (!set) return;
  const box = document.getElementById('uni-q'); if (!box) return;
  box.querySelectorAll('.uni-q-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      const o = set.opts[+btn.dataset.qi];
      document.getElementById('uni-q-text').textContent = o.t;
      box.querySelectorAll('.uni-q-opt').forEach(b => b.classList.toggle('sel', b === btn));
      const ans = document.getElementById('uni-q-ans');
      ans.innerHTML = `<p>${o.a}</p><a class="uni-cta" href="${o.href}">${o.cta}</a>`;
      ans.classList.add('open');
    });
  });
}

function initUniverseConstellation(a, coAuthors) {
  const cv = document.getElementById('uni-constel');
  if (!cv || !coAuthors || !coAuthors.length) return;
  const acc = (universeOf(a.id) || {}).accent || '#A9791A';
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const N = Math.min(coAuthors.length, 12);
  const shown = coAuthors.slice(0, N);
  const subColor = (getComputedStyle(document.body).getPropertyValue('--c-sub') || '#6B7C92').trim();
  let stars = [];

  function layout() {
    const w = cv.offsetWidth, h = 200;
    cv.width = w * dpr; cv.height = h * dpr;
    const g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    const cxp = w / 2, cyp = h / 2;
    stars = shown.map((au, i) => {
      const ang = (i / N) * Math.PI * 2 - Math.PI / 2;
      const rad = Math.min(w, h) * 0.36 * (0.74 + ((i * 37) % 26) / 100);
      return { x: cxp + Math.cos(ang) * rad, y: cyp + Math.sin(ang) * rad, au };
    });
    // 연결선
    g.strokeStyle = acc; g.globalAlpha = 0.30; g.lineWidth = 1;
    stars.forEach(s => { g.beginPath(); g.moveTo(cxp, cyp); g.lineTo(s.x, s.y); g.stroke(); });
    g.globalAlpha = 1;
    // 위성 별 + 이름
    g.font = '11px -apple-system, sans-serif'; g.textAlign = 'center';
    stars.forEach(s => {
      g.beginPath(); g.fillStyle = acc; g.arc(s.x, s.y, 3.2, 0, 7); g.fill();
      g.fillStyle = subColor;
      g.fillText(s.au.name, s.x, s.y - 8);
    });
    // 중심 = 본 저자
    g.beginPath(); g.fillStyle = acc; g.arc(cxp, cyp, 7, 0, 7); g.fill();
    g.globalAlpha = 0.2; g.beginPath(); g.arc(cxp, cyp, 13, 0, 7); g.fill(); g.globalAlpha = 1;
    g.fillStyle = acc; g.font = '700 12px -apple-system, sans-serif';
    g.fillText(a.name, cxp, cyp + 24);
  }
  layout();
  window.addEventListener('resize', layout);
  cv.addEventListener('click', ev => {
    const r = cv.getBoundingClientRect();
    const x = ev.clientX - r.left, y = ev.clientY - r.top;
    let best = null, bd = 1e9;
    stars.forEach(s => { const d = (s.x - x) ** 2 + (s.y - y) ** 2; if (d < bd) { bd = d; best = s; } });
    if (best && bd < 1000) location.href = 'author.html?id=' + best.au.id;
  });
}

function initUniversePlant() {
  const p = document.getElementById('uni-plant'); if (!p) return;
  if (window.matchMedia('(prefers-reduced-motion:reduce)').matches) { p.classList.add('grown'); return; }
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { p.classList.add('grown'); io.disconnect(); }
  }), { threshold: 0.4 });
  io.observe(p);
}

function initUniverse(a, ctx) {
  const u = universeOf(a.id); if (!u) return;
  ctx = ctx || {};
  if (u.sig === 'question')      initUniverseQuestion(a);
  if (u.sig === 'constellation') initUniverseConstellation(a, ctx.coAuthors || []);
  if (u.sig === 'plant')         initUniversePlant();
}

// ========================================================
//  홈 연동 (Phase 3) — '오늘의 저자' 로테이션
// ========================================================
function uniHomeSlide(a) {
  const u = universeOf(a.id);
  return `
    <a class="uni-slide" style="--uni:${u.accent}" href="author.html?id=${a.id}">
      <div class="uni-slide-k">${u.label}</div>
      <div class="uni-slide-nm">${a.name}</div>
      <div class="uni-slide-ln">${u.home}</div>
    </a>`;
}

function universeHomeSection(authors) {
  const pilots = UNIVERSE_PILOTS.map(id => authors.find(x => x.id === id)).filter(Boolean);
  if (!pilots.length) return '';
  return `
    <section class="section">
      <div class="section-title">
        <h2>오늘의 저자</h2>
        <span class="more">유니버스 ${pilots.length}</span>
      </div>
      <div class="uni-rot" id="uni-rot">
        <div class="uni-rot-track" id="uni-rot-track">
          ${pilots.map(uniHomeSlide).join('')}
        </div>
      </div>
      <div class="uni-rot-dots" id="uni-rot-dots">
        ${pilots.map((_, i) => `<i class="${i === 0 ? 'on' : ''}"></i>`).join('')}
      </div>
    </section>`;
}

function initUniverseHome() {
  const track = document.getElementById('uni-rot-track');
  const dots = document.getElementById('uni-rot-dots');
  if (!track || !dots) return;
  const n = track.children.length;
  if (n < 2) return;
  if (window.matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  let i = 0;
  setInterval(() => {
    i = (i + 1) % n;
    track.style.transform = 'translateX(-' + (i * 100) + '%)';
    [...dots.children].forEach((d, k) => d.classList.toggle('on', k === i));
  }, 3200);
}
