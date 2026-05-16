#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, '../data/latest-raw.json');
const outputFile = path.join(__dirname, '../data/daily-digest.json');

const SOURCE_CONFIG = {
  hackernews: { name: 'Hacker News', color: '#ff6600' },
  reddit: { name: 'Reddit', color: '#ff4500' },
  venturebeat: { name: 'VentureBeat', color: '#00a562' },
  techcrunch: { name: 'TechCrunch', color: '#0a9a4d' }
};

// Google Translate API 调用（免费，无需 key）
async function translateText(text, targetLang = 'zh-CN') {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const response = await axios.get(url, { timeout: 10000 });
    const data = response.data;
    if (data && data[0]) {
      return data[0].map(item => item[0]).join('');
    }
  } catch (e) {
    console.log(`  翻译失败: ${e.message}`);
  }
  return text; // 失败时返回原文
}

async function translateArticles(articles) {
  console.log(`📝 翻译 ${articles.length} 篇文章...\n`);

  const results = [];
  for (const article of articles) {
    console.log(`  翻译: ${article.title.substring(0, 40)}...`);

    // 翻译标题
    const translatedTitle = await translateText(article.title);

    // 生成摘要（这里用标题+来源+简单的描述）
    const summaryPrompt = `这是一篇来自 ${SOURCE_CONFIG[article.source]?.name || 'AI 新闻'} 的文章：${article.title}\n\n请用中文写一段 500 字左右的详细摘要，包含文章的核心内容、背景和意义。`;
    const translatedSummary = await translateText(summaryPrompt);

    results.push({
      title: translatedTitle || article.title,
      summary: translatedSummary || '暂无摘要',
      url: article.url,
      source: article.source
    });

    await new Promise(r => setTimeout(r, 100)); // 小延迟避免请求过快
  }

  return results;
}

async function translate() {
  console.log('🔄 开始翻译文章...\n');

  if (!fs.existsSync(inputFile)) {
    console.error('❌ 请先运行 npm run harvest');
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
  const articles = raw.articles.slice(0, 3);

  const results = await translateArticles(articles);

  const output = {
    generatedAt: new Date().toISOString(),
    date: new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }),
    articles: results
  };

  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
  console.log('\n✨ 翻译完成!');
}

if (require.main === module) {
  translate().catch(console.error);
}

module.exports = { translate };