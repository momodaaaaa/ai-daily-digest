#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, '../data/latest-raw.json');
const outputFile = path.join(__dirname, '../data/daily-digest.json');

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const SOURCE_CONFIG = {
  hackernews: { name: 'Hacker News', color: '#ff6600' },
  reddit: { name: 'Reddit', color: '#ff4500' },
  venturebeat: { name: 'VentureBeat', color: '#00a562' },
  techcrunch: { name: 'TechCrunch', color: '#0a9a4d' }
};

// Google Translate 翻译标题
async function translateTitle(text, targetLang = 'zh') {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const response = await axios.get(url, { timeout: 10000 });
    const data = response.data;
    if (data && data[0]) {
      return data[0].map(item => item[0]).join('');
    }
  } catch (e) {
    console.log(`  标题翻译失败: ${e.message}`);
  }
  return text;
}

// Groq API 生成精炼摘要
async function generateSummary(title, source) {
  if (!GROQ_API_KEY) {
    console.log('  ❌ GROQ_API_KEY 未设置');
    return '请查看原文获取详细信息。';
  }

  try {
    const response = await axios.post(GROQ_API_URL, {
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `你是一个专业的 AI 新闻编辑。你的任务是为一篇 AI 新闻写一段"电梯演讲"式的精炼总结：

要求：
1. 长度控制在 80-150 字左右
2. 一句话概括文章的核心内容（这部分要占摘要的一半）
3. 说明这个新闻的意义或影响
4. 如果是技术文章，要用普通人能懂的话解释
5. 不要废话，不要重复标题，不要过度解释

格式示例：
"[一句话总结] 这一进展意味着[意义/影响]"

不要加标题、不要加引号、只输出摘要内容。`
        },
        {
          role: 'user',
          content: `来源：${SOURCE_CONFIG[source]?.name || 'AI 新闻'}\n标题：${title}\n\n请写一段精炼的摘要：`
        }
      ],
      temperature: 0.5,
      max_tokens: 300
    }, {
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    const summary = response.data?.choices?.[0]?.message?.content;
    if (summary) {
      return summary.trim();
    }
  } catch (e) {
    console.log(`  ❌ 摘要生成失败: ${e.message}`);
  }
  return '请查看原文获取详细信息。';
}

async function translateArticles(articles) {
  console.log(`📝 处理 ${articles.length} 篇文章...\n`);

  const results = [];
  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    console.log(`\n(${i + 1}/${articles.length}) ${article.title.substring(0, 50)}...`);

    // 翻译标题
    const translatedTitle = await translateTitle(article.title);
    console.log(`  ✅ 标题: ${translatedTitle}`);

    // 生成精炼摘要
    const summary = await generateSummary(article.title, article.source);
    console.log(`  ✅ 摘要: ${summary.substring(0, 60)}...`);

    results.push({
      title: translatedTitle || article.title,
      summary: summary,
      url: article.url,
      source: article.source
    });

    await new Promise(r => setTimeout(r, 500));
  }

  return results;
}

async function translate() {
  console.log('🔄 开始翻译和生成摘要...\n');
  console.log('GROQ API Key:', GROQ_API_KEY ? '已设置' : '❌ 未设置');

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
  console.log('\n✨ 翻译和摘要生成完成!');
}

if (require.main === module) {
  translate().catch(console.error);
}

module.exports = { translate };