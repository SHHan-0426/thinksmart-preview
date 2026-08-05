#!/usr/bin/env node
// 알라딘 OpenAPI로 책 표지 URL 수집 → data/data.json 의 각 book.cover 채우기
// 사용: ALADIN_TTB_KEY=ttb... node scripts/fetch-covers.mjs
// - ISBN(ISBN13) 보유 책만 조회. 이미 cover 있으면 건너뜀(--force로 재수집).
// - 알라딘 무료키 일일 호출 한도 넉넉(약 5000). 예의상 요청 간 딜레이.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const JSON_PATH = join(__dirname, '..', 'data', 'data.json');
const KEY = process.env.ALADIN_TTB_KEY;
const FORCE = process.argv.includes('--force');
const API = 'https://www.aladin.co.kr/ttb/api/ItemLookUp.aspx';

if (!KEY) { console.error('환경변수 ALADIN_TTB_KEY 가 필요합니다.'); process.exit(1); }

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function coverFor(isbn) {
  const url = `${API}?ttbkey=${KEY}&itemIdType=ISBN13&ItemId=${isbn}&output=js&Version=20131101&Cover=Big`;
  const res = await fetch(url);
  const text = await res.text();
  let d;
  try { d = JSON.parse(text); } catch { return { error: '응답 파싱 실패' }; }
  if (d.errorCode) return { error: d.errorMessage || ('code ' + d.errorCode) };
  const it = (d.item || [])[0];
  if (!it || !it.cover) return { error: '표지 없음' };
  // cover200 → cover500 으로 화질 상향(알라딘 표준 패턴). 실패 대비 원본도 반환.
  return { cover: it.cover, coverLarge: it.cover.replace('/cover200/', '/cover500/') };
}

async function main() {
  const db = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
  const books = db.books || [];
  let ok = 0, skip = 0, fail = 0;
  const fails = [];

  for (const b of books) {
    if (!b.isbn) { skip++; continue; }
    if (b.cover && !FORCE) { skip++; continue; }
    const r = await coverFor(b.isbn);
    if (r.error) { fail++; fails.push(`${b.id} ${b.isbn} (${r.error})`); }
    else { b.cover = r.coverLarge || r.cover; ok++; }
    await sleep(120);
    if ((ok + fail) % 50 === 0) console.log(`  진행 ${ok + fail}건...`);
  }

  writeFileSync(JSON_PATH, JSON.stringify(db, null, 2) + '\n');
  console.log(`\n표지 수집 완료 — 성공 ${ok} · 건너뜀 ${skip} · 실패 ${fail}`);
  if (fails.length) console.log('실패 목록:\n  ' + fails.slice(0, 30).join('\n  '));
}

main().catch(e => { console.error(e.message); process.exit(1); });
