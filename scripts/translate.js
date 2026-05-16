#!/usr/bin/env node

const { Anthropic } = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, '../data/latest-raw.json');
const outputFile = path.join(__dirname, '../data/daily-digest.json');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const SYSTEM_PROMPT = `你是一个专业的 AI 新闻翻译专家。任务：
1. 将英文标题翻译成流畅的中文
2. 写一段 500 字左右的摘要，要详细、有信息量
3. 保留 LLM、API、GPU 等专业术语

输出 JSON：
{
  "title": "中文标题",
  "summary": "500字摘要..."
}`;

async function translateArticle(article) {
  console.log(`📝 翻译: ${article.title.substring(0, 40)}...`);
  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4',
      max_tokens: 800,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `标题: ${article.title}` }]
    });

    const content = response.content[0].type === 'text' ? response.content[0].text : '';
    console.log(`  原始响应: ${content.substring(0, 100)}...`);

    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        return {
          title: parsed.title || article.title,
          summary: parsed.summary || '暂无摘要',
          url: article.url,
          source: article.source
        };
      } catch (e) {
        console.log('  JSON 解析失败');
      }
    }
  } catch (e) {
    console.log(`  ❌ 翻译失败: ${e.message}`);
  }
  return {
    title: article.title,
    summary: '翻译失败，请查看原文',
    url: article.url,
    source: article.source
  };
}

async function translate() {
  console.log('🔄 开始翻译文章...\n');
  console.log('API Key:', process.env.ANTHROPIC_API_KEY ? '已设置' : '❌ 未设置');

  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your_api_key_here') {
    console.error('❌ API Key 未正确配置');
    process.exit(1);
  }

  if (!fs.existsSync(inputFile)) {
    console.error('❌ 请先运行 npm run harvest');
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
  const articles = raw.articles.slice(0, 3);
  console.log(`📊 将翻译 ${articles.length} 篇文章\n`);

  const results = [];
  for (const article of articles) {
    const translated = await translateArticle(article);
    results.push(translated);
    await new Promise(r => setTimeout(r, 1000));
  }
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