#!/usr/bin/env node
// would-read-md.js — fetch Fox News from RSS, print news context to stdout

const RSS_URLS = [
  'https://feeds.foxnews.com/foxnews/latest',
  'https://feeds.foxnews.com/foxnews/politics',
  'https://feeds.foxnews.com/foxnews/us'
];

const KEYWORDS = ['trump', 'biden', 'congress', 'senate', 'white house', 'federal', 'government', 'policy', 'election', 'border', 'court', 'supreme', 'administration', 'president', 'democrat', 'republican', 'military', 'war', 'law', 'house', 'economy'];

function stripHtml(str) {
  const decoded = str.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/&#\d+;/g,'');
  return decoded.replace(/<[^>]+>/g, '').replace(/\s+/g,' ').trim();
}

function extractTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return m ? stripHtml(m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')) : '';
}

function parseItems(xml) {
  const items = [];
  const re = /<item>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = re.exec(xml)) !== null) {
    items.push({
      title:       extractTag(m[1], 'title'),
      description: extractTag(m[1], 'description'),
      link:        extractTag(m[1], 'link'),
      pubDate:     extractTag(m[1], 'pubDate')
    });
  }
  return items;
}

function isRelevant(item) {
  const text = (item.title + ' ' + item.description).toLowerCase();
  return KEYWORDS.some(k => text.includes(k));
}

async function main() {
  let items = [];

  for (const url of RSS_URLS) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ts-news/1.0)' } });
      if (!res.ok) { console.error(`⚠️  ${url} → ${res.status}`); continue; }
      const parsed = parseItems(await res.text()).filter(isRelevant);
      if (parsed.length > 0) { items = [parsed[0]]; break; }
    } catch (e) {
      console.error(`⚠️  ${e.message}`);
    }
  }

  if (items.length === 0) {
    console.error('No relevant news found');
    process.exit(1);
  }

  const item = items[0];
  const context = `${item.title}\n${item.pubDate}\n${item.description}\n${item.link}`;

  process.stdout.write(context);
}

main().catch(e => { console.error(e); process.exit(1); });
