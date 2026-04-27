#!/usr/bin/env node
'use strict';

const Parser = require('rss-parser');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const CONFIG_PATH = path.resolve(__dirname, '../../../..', 'configs/digest.yml');
const OUTPUT_PATH = '/tmp/raw-feeds.json';
const FETCH_TIMEOUT_MS = 12000;
const ARXIV_MAX_ITEMS = 5;

const parser = new Parser({
  timeout: FETCH_TIMEOUT_MS,
  headers: { 'User-Agent': 'ai-digest-tool/1.0 (RSS reader)' },
  customFields: { item: ['content:encoded', 'description'] },
});

function loadConfig() {
  const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
  return yaml.load(raw);
}

function cutoffTime(lookbackHours) {
  return new Date(Date.now() - lookbackHours * 60 * 60 * 1000);
}

function extractSummary(item) {
  const raw =
    item['content:encoded'] ||
    item.content ||
    item.contentSnippet ||
    item.summary ||
    item.description ||
    '';
  return raw.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 200);
}

async function fetchFeed(feed, cutoff, isArxiv) {
  const result = await parser.parseURL(feed.url);
  const items = isArxiv ? result.items.slice(0, ARXIV_MAX_ITEMS) : result.items;

  return items
    .filter((item) => {
      const pub = item.pubDate ? new Date(item.pubDate) : null;
      return pub && pub >= cutoff;
    })
    .map((item) => ({
      id: feed.id,
      source: feed.name,
      title: (item.title || '').trim(),
      summary: extractSummary(item),
      link: item.link || item.guid || '',
      published: item.pubDate ? new Date(item.pubDate).toISOString() : null,
    }));
}

async function main() {
  const config = loadConfig();
  const { feeds, settings } = config;
  const lookbackHours = settings?.lookback_hours ?? 24;
  const cutoff = cutoffTime(lookbackHours);

  console.log(`[fetch-feeds] 対象期間: 過去 ${lookbackHours} 時間（${cutoff.toISOString()} 以降）`);
  console.log(`[fetch-feeds] フィード数: ${feeds.length}`);

  const categories = {};
  const failedFeeds = [];
  let totalFetched = 0;
  let totalFiltered = 0;

  for (const feed of feeds) {
    process.stdout.write(`  取得中: ${feed.name} ... `);
    try {
      const isArxiv = feed.id === 'arxiv_ai';
      const articles = await fetchFeed(feed, cutoff, isArxiv);
      totalFetched += articles.length + (isArxiv ? 0 : 0);
      totalFiltered += articles.length;

      if (!categories[feed.category]) categories[feed.category] = [];
      categories[feed.category].push(...articles);
      console.log(`${articles.length} 件`);
    } catch (err) {
      console.log(`❌ 失敗 (${err.message.slice(0, 60)})`);
      failedFeeds.push(feed.id);
    }
  }

  const output = {
    fetched_at: new Date().toISOString(),
    lookback_hours: lookbackHours,
    categories,
    stats: {
      total_fetched: totalFetched,
      total_filtered: totalFiltered,
      failed_feeds: failedFeeds,
    },
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf8');
  console.log(`\n[fetch-feeds] 完了 → ${OUTPUT_PATH}`);
  console.log(`  合計: ${totalFiltered} 件 / 失敗フィード: ${failedFeeds.length} 件`);
}

main().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error('[fetch-feeds] 予期しないエラー:', err);
  process.exit(1);
});
