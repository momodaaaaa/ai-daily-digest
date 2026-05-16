#!/usr/bin/env node

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const outputFile = path.join(__dirname, '../data/latest-raw.json');

async function harvest() {
  console.log('🌾 开始采集 AI 新闻...\n');
  const allArticles = [];

  try {
    const response = await axios.get('https://news.ycombinator.com/', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 15000
    });
    const $ = cheerio.load(response.data);
    let count = 0;
    $('.titleline').each((i, elem) => {
      if (count >= 10) return false;
      const titleLink = $(elem).find('a').first();
      let title = titleLink.text();
      let url = titleLink.attr('href') || '';
      if (title.startsWith('Ask HN') || title.startsWith('Show HN')) return;
      if (url.includes('ycombinator.com') && !url.startsWith('http')) {
        url = 'https://news.ycombinator.com/' + url;
      }
      if (!url.startsWith('http')) return;
      allArticles.push({
        title: title,
        url: url,
        source: 'hackernews',
        publishedAt: new Date().toISOString(),
        score: 0
      });
      count++;
    });
    console.log('✅ hackernews: 采集到', count, '篇');
  } catch (e) {
    console.log('❌ hackernews: 采集失败');
  }

  const output = {
    harvestedAt: new Date().toISOString(),
    totalArticles: allArticles.length,
    articles: allArticles.slice(0, 20)
  };

  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
  console.log('\n💾 已保存到 data/latest-raw.json');
  return output;
}

if (require.main === module) {
  harvest().then(r => console.log('\n✨ 完成! 共', r.totalArticles, '篇'));
}

module.exports = { harvest };