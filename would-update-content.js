#!/usr/bin/env node
// would-update-content.js — insert pre-computed analyses into GitHub files
// Usage: GITHUB_TOKEN=... ISSUE_ANALYSIS=... ASSET_ANALYSIS=... node would-update-content.js

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = 'toiflow';
const GITHUB_REPO  = process.env.GITHUB_REPOSITORY?.split('/')[1] || 'ts-news';
const ANCHOR = '####### <!-- ANCHOR MARKER - ADD ALL NEW ASSET ENTRIES DIRECTLY BELOW THIS LINE, NEVER DELETE OR EDIT PREVIOUS ASSET ENTRIES-->';

function nzTimestamp() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Pacific/Auckland',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).formatToParts(new Date());
  const get = t => parts.find(p => p.type === t).value;
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}`;
}

async function githubGet(path) {
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`,
    { headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}`, 'Accept': 'application/vnd.github+json' } }
  );
  if (!res.ok) throw new Error(`GitHub GET ${path} failed: ${res.status}`);
  const data = await res.json();
  return { sha: data.sha, content: Buffer.from(data.content, 'base64').toString('utf8') };
}

async function githubPut(path, sha, content, message) {
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`,
    {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}`, 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message, sha,
        content: Buffer.from(content).toString('base64'),
        committer: { name: GITHUB_REPO, email: 'jayreck996@gmail.com' }
      })
    }
  );
  if (!res.ok) throw new Error(`GitHub PUT ${path} failed: ${res.status} ${await res.text()}`);
}

function insertEntry(fileContent, entry) {
  const idx = fileContent.indexOf(ANCHOR);
  if (idx === -1) throw new Error('Anchor marker not found');
  const at = idx + ANCHOR.length;
  return fileContent.slice(0, at) + '\n' + entry + '\n' + fileContent.slice(at);
}

async function main() {
  if (!GITHUB_TOKEN) throw new Error('GITHUB_TOKEN not set');
  const issueAnalysis = process.env.ISSUE_ANALYSIS?.trim();
  const assetAnalysis = process.env.ASSET_ANALYSIS?.trim();
  if (!issueAnalysis) throw new Error('ISSUE_ANALYSIS not set');
  if (!assetAnalysis) throw new Error('ASSET_ANALYSIS not set');

  const ts = nzTimestamp();
  console.log(`📅 ${ts}`);

  const issueFile = await githubGet('could/CONTENT-ISSUE-V1.md');
  await githubPut(
    'could/CONTENT-ISSUE-V1.md', issueFile.sha,
    insertEntry(issueFile.content, `## ISSUE:NEWS ${ts}\n${issueAnalysis}`),
    `would-update: issue ${ts}`
  );
  console.log('✅ could/CONTENT-ISSUE-V1.md updated');

  const assetFile = await githubGet('could/CONTENT-ASSET-V1.md');
  await githubPut(
    'could/CONTENT-ASSET-V1.md', assetFile.sha,
    insertEntry(assetFile.content, `## ASSET:NEWS ${ts}\n${assetAnalysis}`),
    `would-update: asset ${ts}`
  );
  console.log('✅ could/CONTENT-ASSET-V1.md updated');

  console.log('\n✅ Done');
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
