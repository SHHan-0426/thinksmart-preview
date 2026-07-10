#!/usr/bin/env node
// 장기 토큰(60일)을 refresh 하여 새 토큰을 stdout(GITHUB_OUTPUT)로 내보낸다.
// 사용: IG_TOKEN=... node scripts/refresh-token.mjs
// 결과는 GitHub Actions에서 IG_TOKEN 시크릿을 갱신하는 데 쓰인다.
import { appendFileSync } from 'node:fs';

const TOKEN = process.env.IG_TOKEN;
if (!TOKEN) { console.error('IG_TOKEN 필요'); process.exit(1); }

const url = `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${TOKEN}`;
const j = await (await fetch(url)).json();

if (j.error || !j.access_token) {
  console.error('토큰 갱신 실패:', JSON.stringify(j.error || j));
  // 갱신 실패해도 기존 토큰으로 페치는 시도하도록 새 토큰=기존 토큰 유지
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `token=${TOKEN}\nrefreshed=false\n`);
  process.exit(0);
}

const days = Math.round(j.expires_in / 86400);
console.log(`토큰 갱신 성공 · 만료 ${days}일`);
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `token=${j.access_token}\nrefreshed=true\n`);
