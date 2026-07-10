#!/usr/bin/env node
// @thinksmart.official 인스타그램 게시물 → data/instagram.json 동기화
// 사용: IG_TOKEN=... node scripts/fetch-instagram.mjs
//
// 동작:
//  - Instagram Graph API에서 최신 미디어를 가져온다.
//  - permalink 로 기존 항목과 대조:
//      · 이미 있으면 → 이미지 CDN URL·캡션·유형을 갱신(upsert). CDN URL이
//        ~13일 후 만료되므로 매일 실행하며 최근 글 URL을 신선하게 유지한다.
//      · 없고, 백업 경계(로컬 이미지 최신 날짜)보다 새 글이면 → 추가.
//  - 백업(로컬 이미지, permalink 없음)의 과거 글은 건드리지 않는다(중복 방지).
//  - 이미지는 인스타 CDN URL 사용. app.js thumb()가 http URL을 통과시킴.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const JSON_PATH = join(__dirname, '..', 'data', 'instagram.json');
const TOKEN = process.env.IG_TOKEN;
const GRAPH = 'https://graph.instagram.com';
const MAX_PAGES = 12;   // 안전 상한 (약 600건)

if (!TOKEN) { console.error('환경변수 IG_TOKEN 이 필요합니다.'); process.exit(1); }

function classifyTypes(caption) {
  const c = caption || '';
  const t = [];
  const eventRe = /북토크|북콘서트|출간\s*기념|출간기념|모집|개강|신청|기수|수료|종강|살롱|강연|강좌|특강|세미나|워크숍|워크샵|낭독회|포럼|현장|행사|초대|참가|수강생|일시\s*:|장소\s*:/;
  const bookRe  = /신간|출간|도서|저자|시리즈|『|「|서평|증쇄|리커버|베스트셀러|예약\s*판매|서점|교보|예스24|알라딘/;
  if (eventRe.test(c)) t.push('event');
  if (bookRe.test(c)) t.push('book');
  if (t.length === 0) t.push('other');
  return t;
}

function toKST(tsUtc) {
  const d = new Date(tsUtc);
  const k = new Date(d.getTime() + 9 * 3600 * 1000);
  const p = n => String(n).padStart(2, '0');
  return {
    date: `${k.getUTCFullYear()}-${p(k.getUTCMonth() + 1)}-${p(k.getUTCDate())}T${p(k.getUTCHours())}:${p(k.getUTCMinutes())}`,
    display: `${k.getUTCFullYear()}년 ${p(k.getUTCMonth() + 1)}월 ${p(k.getUTCDate())}일`,
  };
}

function imagesOf(m) {
  if (m.media_type === 'CAROUSEL_ALBUM' && m.children?.data?.length) {
    return m.children.data.map(c => c.media_type === 'VIDEO' ? c.thumbnail_url : c.media_url).filter(Boolean);
  }
  if (m.media_type === 'VIDEO') return [m.thumbnail_url].filter(Boolean);
  return [m.media_url].filter(Boolean);
}

function toPost(m) {
  const { date, display } = toKST(m.timestamp);
  return { id: m.id, caption: m.caption || '', date, date_display: display,
           images: imagesOf(m), types: classifyTypes(m.caption), permalink: m.permalink };
}

async function main() {
  const db = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
  const posts = db.posts || [];

  const byPermalink = new Map();               // permalink → 기존 post 참조
  let maxLocalDate = '0000';                   // permalink 없는(백업) 글의 최신 날짜 = 추가 경계
  for (const p of posts) {
    if (p.permalink) byPermalink.set(p.permalink, p);
    else if (p.date > maxLocalDate) maxLocalDate = p.date;
  }
  // 갱신 대상(permalink 보유) 중 가장 오래된 날짜 → 여기까지만 페이지네이션
  let minRefreshDate = null;
  for (const p of byPermalink.values()) if (!minRefreshDate || p.date < minRefreshDate) minRefreshDate = p.date;

  const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,children{id,media_type,media_url,thumbnail_url}';
  let url = `${GRAPH}/me/media?fields=${encodeURIComponent(fields)}&limit=50&access_token=${TOKEN}`;

  const fresh = [];
  let updated = 0, pages = 0;
  while (url && pages < MAX_PAGES) {
    const page = await (await fetch(url)).json();
    if (page.error) throw new Error('API 오류: ' + JSON.stringify(page.error));
    pages++;
    let oldestOnPage = '9999';
    for (const m of (page.data || [])) {
      const np = toPost(m);
      if (np.date < oldestOnPage) oldestOnPage = np.date;
      const existing = np.permalink && byPermalink.get(np.permalink);
      if (existing) {
        existing.images = np.images;           // CDN URL 갱신
        existing.caption = np.caption;
        existing.types = np.types;
        updated++;
      } else if (np.date > maxLocalDate) {
        fresh.push(np);                         // 백업 경계 이후의 진짜 새 글
        byPermalink.set(np.permalink, np);
      }
    }
    // 갱신 대상 최신 글보다 더 과거까지 왔고, 새 글도 없으면 중단
    if (minRefreshDate && oldestOnPage <= minRefreshDate) break;
    if (!minRefreshDate && oldestOnPage <= maxLocalDate) break;
    url = page.paging?.next || null;
  }

  fresh.sort((a, b) => (a.date < b.date ? 1 : -1));
  db.posts = [...fresh, ...posts];

  const all = db.posts;
  db.meta = db.meta || {};
  db.meta.updated = toKST(new Date().toISOString()).date.slice(0, 10);
  db.meta.total_posts = all.length;
  db.meta.event_posts = all.filter(p => p.types.includes('event')).length;
  db.meta.book_posts = all.filter(p => p.types.includes('book')).length;
  db.meta.source = 'Instagram Graph API 자동 수집 (@thinksmart.official)';

  writeFileSync(JSON_PATH, JSON.stringify(db, null, 2) + '\n');
  console.log(`새 글 ${fresh.length}건 · URL 갱신 ${updated}건 · 총 ${all.length}건 (페이지 ${pages})`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
