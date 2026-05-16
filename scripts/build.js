#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, '../data/daily-digest.json');

const SOURCE_CONFIG = {
  hackernews: { name: 'Hacker News', color: '#ff6600' },
  reddit: { name: 'Reddit', color: '#ff4500' },
  venturebeat: { name: 'VentureBeat', color: '#00a562' },
  techcrunch: { name: 'TechCrunch', color: '#0a9a4d' }
};

function escapeHtml(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function generateHTML(data) {
  const articles = data.articles.map(a => {
    const src = SOURCE_CONFIG[a.source] || SOURCE_CONFIG.hackernews;
    return `<article class="article-card">
      <div class="article-card__header">
        <span class="source-tag" style="background:${src.color}">${src.name}</span>
      </div>
      <a href="${escapeHtml(a.url)}" target="_blank" class="article-card__link">
        <h2 class="article-card__title">${escapeHtml(a.title)}</h2>
        <p class="article-card__summary">${escapeHtml(a.summary)}</p>
      </a>
    </article>`;
  }).join('\n');

  const today = new Date();
  const dateStr = today.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  const fileName = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}.html`;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Daily Digest - ${data.date}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root{--bg:#fafafa;--card:#fff;--text:#1a1a1a;--text2:#666;--accent:#2563eb;--border:#e5e5e5;--r:12px}
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Inter','Noto Sans SC',sans-serif;background:var(--bg);color:var(--text);line-height:1.6;min-height:100vh}
    .container{max-width:720px;margin:0 auto;padding:40px 20px 80px}
    .header{text-align:center;margin-bottom:48px;padding-top:40px}
    .header .logo{font-size:14px;font-weight:600;color:var(--accent);text-transform:uppercase;letter-spacing:2px;margin-bottom:16px}
    .header h1{font-size:36px;font-weight:700;margin-bottom:12px}
    .header p{font-size:16px;color:var(--text2);max-width:400px;margin:0 auto}
    .date{text-align:center;margin-bottom:32px}
    .date span{font-size:14px;color:#999;background:var(--card);padding:8px 16px;border-radius:20px;border:1px solid var(--border)}
    .articles{display:flex;flex-direction:column;gap:24px}
    .article-card{background:var(--card);border-radius:var(--r);padding:28px;border:1px solid var(--border);box-shadow:0 1px 3px rgba(0,0,0,.08);transition:all .2s}
    .article-card:hover{box-shadow:0 4px 12px rgba(0,0,0,.1);transform:translateY(-2px)}
    .article-card .header{margin-bottom:16px;padding:0}
    .source-tag{font-size:11px;font-weight:600;text-transform:uppercase;padding:4px 10px;border-radius:4px;color:#fff}
    .article-card__link{text-decoration:none;color:inherit}
    .article-card__link:hover .article-card__title{color:var(--accent)}
    .article-card__title{font-size:20px;font-weight:600;line-height:1.4;margin-bottom:12px}
    .article-card__summary{font-size:16px;color:var(--text2);line-height:1.8}
    @media(max-width:640px){.container{padding:24px 16px 60px}.header h1{font-size:28px}.article-card{padding:20px}.article-card__title{font-size:18px}}
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      <div class="logo">AI Daily Digest</div>
      <h1>每日 AI 资讯</h1>
      <p>每天 3 篇精选 AI 资讯，帮你省时省力跟上 AI 潮流</p>
    </header>
    <div class="date"><span>${data.date}</span></div>
    <div class="articles">${articles}</div>
    <footer style="text-align:center;margin-top:48px;padding-top:24px;color:#999;font-size:13px">
      由 AI 自动生成 · 每天北京时间 8:00 更新
    </footer>
  </div>
</body>
</html>`;
}

async function build() {
  console.log('🏗️ 生成网页...\n');
  if (!fs.existsSync(inputFile)) {
    console.error('❌ 请先运行 npm run translate');
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
  const html = generateHTML(data);
  fs.writeFileSync('index.html', html);
  console.log('✅ index.html 已生成');
}

if (require.main === module) {
  build().catch(console.error);
}

module.exports = { build };