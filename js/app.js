/**
 * 倒爷市场 · v3.0
 * 分页路由 + 动态渲染 + 图表重置
 * 数据更新:2026-08-06
 */

(function () {
  'use strict';

  const M = window.MARKET_DATA;
  if (!M) { console.error('MARKET_DATA 未加载'); return; }

  // ========== 路由 ==========
  const ROUTES = {
    '#/overview':          { page: 'overview',          title: '概览' },
    '#/evaluate':          { page: 'evaluate',          title: '评估体系' },
    '#/dashboard':         { page: 'dashboard',         title: '交易仪表盘' },
    '#/category/watch':    { page: 'category-watch',    title: '中端腕表' },
    '#/category/whisky':   { page: 'category-whisky',   title: '收藏级威士忌' },
    '#/category/art':      { page: 'category-art',      title: '当代艺术' },
    '#/category/furniture':{ page: 'category-furniture',title: '设计师家具' },
    '#/category/sneaker':  { page: 'category-sneaker',  title: '限量球鞋' },
    '#/category/figure':   { page: 'category-figure',   title: '潮玩盲盒' },
    '#/recommend':         { page: 'recommend',         title: '投资建议' },
    '#/risks':             { page: 'risks',             title: '风险避坑' }
  };

  let currentRoute = '#/overview';
  let activeEvalDim = 'spread';

  // ========== 工具:从字符串价区间提取均值(用于仪表盘数字) ==========
  function parseRangeMean(rangeStr) {
    // 例: "4.8-5.2 万" -> 50000; "1,400-1,800" -> 1600; "100-200" -> 150
    const clean = rangeStr.replace(/[,\s]/g, '');
    const m = clean.match(/([\d.]+)\s*[-~到]\s*([\d.]+)\s*(万)?/);
    if (!m) return null;
    const a = parseFloat(m[1]);
    const b = parseFloat(m[2]);
    const isWan = !!m[3];
    const mean = (a + b) / 2;
    return isWan ? mean * 10000 : mean;
  }

  // ========== 路由:解析 hash ==========
  function parseRoute() {
    const h = location.hash || '#/overview';
    return ROUTES[h] ? h : '#/overview';
  }

  // ========== 路由:切换页面 ==========
  function navigate(route, pushState = true) {
    const target = ROUTES[route] ? route : '#/overview';
    if (pushState && location.hash !== target) {
      location.hash = target;
      return; // hashchange 会再次触发
    }
    currentRoute = target;

    // 隐藏所有 page,激活目标
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const targetPage = `data-page="${ROUTES[target].page}"`;
    const pageEl = document.querySelector(`.page[${targetPage}]`);
    if (pageEl) pageEl.classList.add('active');

    // 更新 nav 高亮
    document.querySelectorAll('.nav-menu .nav-link').forEach(a => {
      a.classList.toggle('active', a.getAttribute('data-route') === target);
    });

    // 更新标题
    document.title = `${ROUTES[target].title} · 倒爷市场`;

    // 关闭移动端 drawer
    closeDrawer();

    // 关闭 dropdown
    document.getElementById('navDropdown')?.classList.remove('open');

    // 触发页面渲染
    onPageShow(ROUTES[target].page);

    // 滚动到顶
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  // ========== 页面进入时渲染 ==========
  function onPageShow(page) {
    // 先 dispose 所有图表
    disposeAllCharts();

    if (page === 'overview') {
      renderCatOverview();
    } else if (page === 'evaluate') {
      renderEvalWeights();
      renderEvalRadar();
      renderEvalDimTabs();
      renderEvalDimChart();
    } else if (page === 'dashboard') {
      renderDashSummary();
      renderDashTable();
      renderDashCases();
    } else if (page === 'recommend') {
      renderRecSingle();
      renderRecPortfolio();
    } else if (page === 'risks') {
      renderRisk();
    } else if (page.startsWith('category-')) {
      const id = page.replace('category-', '');
      renderCatDetail(id);
    }
  }

  // ========== 图表管理 ==========
  const _chartRegistry = {};
  function getChart(id) { return _chartRegistry[id] || null; }
  function setChart(id, inst) {
    if (_chartRegistry[id]) {
      try { _chartRegistry[id].dispose(); } catch (e) {}
    }
    _chartRegistry[id] = inst;
  }
  function disposeAllCharts() {
    Object.keys(_chartRegistry).forEach(k => {
      try { _chartRegistry[k].dispose(); } catch (e) {}
      delete _chartRegistry[k];
    });
  }

  // ========== 通用:获取主题色 ==========
  function getThemeColors() {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
      text: dark ? '#e8eaf0' : '#1a1f2e',
      textSub: dark ? '#9ba3b4' : '#5a6373',
      border: dark ? '#2a3245' : '#e1e4e8',
      bg: dark ? '#141925' : '#ffffff',
      gold: '#d4af37',
      cyan: '#4ecdc4',
      blue: '#5b8def',
      green: '#6bcf7f',
      red: '#e74c3c',
      orange: '#f39c12',
      isDark: dark
    };
  }

  // ========== 1. 概览:6 品类卡片 ==========
  function renderCatOverview() {
    const grid = document.getElementById('catOverviewGrid');
    if (!grid) return;
    grid.innerHTML = M.CATEGORIES.map(c => {
      const score = M.calcWeightedScore(c.score);
      const firstBuy = c.tradeGuide.buyZone[0];
      return `
        <a class="cat-overview-card" data-route="#/category/${c.id}" href="#/category/${c.id}">
          <div class="cat-overview-head">
            <span class="cat-overview-emoji">${c.emoji}</span>
            <div>
              <h3 class="cat-overview-title">${c.name}</h3>
              <p class="cat-overview-tagline">${c.tagline}</p>
            </div>
          </div>
          <div class="cat-overview-stats">
            <div class="cat-overview-stat">
              <div class="cat-overview-stat-value">${score}</div>
              <div class="cat-overview-stat-label">赚钱评分</div>
            </div>
            <div class="cat-overview-stat">
              <div class="cat-overview-stat-value">${c.budgetFit}</div>
              <div class="cat-overview-stat-label">预算匹配</div>
            </div>
            <div class="cat-overview-stat">
              <div class="cat-overview-stat-value" style="color:var(--accent-green)">${firstBuy.range}</div>
              <div class="cat-overview-stat-label">入手价</div>
            </div>
          </div>
          <div class="cat-overview-cta">查看交易仪表盘 →</div>
        </a>
      `;
    }).join('');
  }

  // ========== 2. 评估:6 维权重说明 ==========
  function renderEvalWeights() {
    const wrap = document.getElementById('evalWeights');
    if (!wrap) return;
    wrap.innerHTML = Object.entries(M.EVAL_WEIGHTS).map(([key, v]) => `
      <div class="eval-weight-item">
        <div class="eval-weight-pct">${(v.weight * 100).toFixed(0)}%</div>
        <div class="eval-weight-info">
          <h4>${v.name}</h4>
          <p>${v.desc}</p>
        </div>
        <div class="eval-weight-bar" style="flex:0 0 120px">
          <div class="eval-weight-bar-fill" style="width:${v.weight * 100}%"></div>
        </div>
      </div>
    `).join('');
  }

  // ========== 2. 评估:雷达图 ==========
  function renderEvalRadar() {
    const dom = document.getElementById('evalRadarChart');
    if (!dom || !window.echarts) return;
    const c = getThemeColors();
    const cats = M.CATEGORIES;
    const dimKeys = Object.keys(M.EVAL_WEIGHTS);
    const dimNames = dimKeys.map(k => M.EVAL_WEIGHTS[k].name);

    const palette = [c.gold, c.cyan, c.blue, c.green, c.orange, c.red];
    const series = cats.map((cat, i) => ({
      name: cat.shortName,
      value: dimKeys.map(k => cat.score[k]),
      itemStyle: { color: palette[i % palette.length] },
      lineStyle: { color: palette[i % palette.length], width: 2 },
      areaStyle: { color: palette[i % palette.length], opacity: 0.08 }
    }));

    const inst = window.echarts.init(dom);
    inst.setOption({
      tooltip: { trigger: 'item' },
      legend: { bottom: 0, textStyle: { color: c.textSub } },
      radar: {
        indicator: dimNames.map(n => ({ name: n, max: 5 })),
        splitNumber: 5,
        axisName: { color: c.text, fontSize: 12 },
        splitLine: { lineStyle: { color: c.border } },
        splitArea: { areaStyle: { color: ['transparent'] } },
        axisLine: { lineStyle: { color: c.border } }
      },
      series: [{ type: 'radar', data: series, symbol: 'circle', symbolSize: 4 }]
    });
    setChart('evalRadar', inst);
  }

  // ========== 2. 评估:维度 tab + 条形图 ==========
  function renderEvalDimTabs() {
    const wrap = document.getElementById('evalDimTabs');
    if (!wrap) return;
    wrap.innerHTML = Object.entries(M.EVAL_WEIGHTS).map(([k, v]) => `
      <button class="eval-dim-tab ${k === activeEvalDim ? 'active' : ''}" data-dim="${k}">
        ${v.name} <span class="eval-dim-percent">${(v.weight * 100).toFixed(0)}%</span>
      </button>
    `).join('');
    wrap.querySelectorAll('.eval-dim-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        activeEvalDim = btn.getAttribute('data-dim');
        renderEvalDimTabs();
        renderEvalDimChart();
      });
    });
  }

  function renderEvalDimChart() {
    const dom = document.getElementById('evalDimChart');
    if (!dom || !window.echarts) return;
    const c = getThemeColors();
    const w = M.EVAL_WEIGHTS[activeEvalDim];
    const sorted = [...M.CATEGORIES].sort((a, b) => b.score[activeEvalDim] - a.score[activeEvalDim]);

    const inst = window.echarts.init(dom);
    inst.setOption({
      title: {
        text: `${w.name}得分(权重 ${(w.weight * 100).toFixed(0)}%)`,
        subtext: w.desc,
        left: 'left',
        textStyle: { color: c.text, fontSize: 15 },
        subtextStyle: { color: c.textSub, fontSize: 12 }
      },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: 90, right: 30, top: 60, bottom: 30 },
      xAxis: {
        type: 'value',
        max: 5,
        axisLine: { lineStyle: { color: c.border } },
        axisLabel: { color: c.textSub },
        splitLine: { lineStyle: { color: c.border, type: 'dashed' } }
      },
      yAxis: {
        type: 'category',
        data: sorted.map(x => `${x.emoji} ${x.shortName}`),
        axisLine: { lineStyle: { color: c.border } },
        axisLabel: { color: c.text }
      },
      series: [{
        type: 'bar',
        data: sorted.map((x, i) => ({
          value: x.score[activeEvalDim],
          itemStyle: { color: i === 0 ? c.gold : (i < 3 ? c.cyan : c.blue) }
        })),
        label: { show: true, position: 'right', color: c.text },
        barWidth: '60%'
      }]
    });
    setChart('evalDim', inst);
  }

  // ========== 3. 仪表盘:摘要卡 ==========
  function renderDashSummary() {
    const wrap = document.getElementById('dashSummary');
    if (!wrap) return;
    // 找出综合得分最高、流动性最好、价差最大、持有成本最低的
    const ranked = M.CATEGORIES.map(c => ({
      cat: c,
      score: parseFloat(M.calcWeightedScore(c.score))
    })).sort((a, b) => b.score - a.score);
    const topScore = ranked[0];
    const bestLiq = [...M.CATEGORIES].sort((a, b) => b.score.liquidity - a.score.liquidity)[0];
    const bestSpread = [...M.CATEGORIES].sort((a, b) => b.score.spread - a.score.spread)[0];
    const lowCost = [...M.CATEGORIES].sort((a, b) => b.score.cost - a.score.cost)[0];

    wrap.innerHTML = `
      <div class="dash-card">
        <div class="dash-card-label">🏆 综合最优</div>
        <div class="dash-card-value">${topScore.cat.shortName}</div>
        <div class="dash-card-sub">加权得分 ${topScore.score} · ${topScore.cat.emoji} ${topScore.cat.name}</div>
      </div>
      <div class="dash-card">
        <div class="dash-card-label">⚡ 变现最快</div>
        <div class="dash-card-value">${bestLiq.shortName}</div>
        <div class="dash-card-sub">流动性 ${bestLiq.score.liquidity}/5 · ${bestLiq.tradeGuide.platforms.sell[0]}</div>
      </div>
      <div class="dash-card">
        <div class="dash-card-label">💰 价差最大</div>
        <div class="dash-card-value">${bestSpread.shortName}</div>
        <div class="dash-card-sub">价差 ${bestSpread.score.spread}/5 · ${bestSpread.tradeGuide.buyZone[0].range} → ${bestSpread.tradeGuide.sellZone[0]?.range || '长持'}</div>
      </div>
      <div class="dash-card">
        <div class="dash-card-label">💸 成本最低</div>
        <div class="dash-card-value">${lowCost.shortName}</div>
        <div class="dash-card-sub">持有成本 ${lowCost.score.cost}/5 · ${lowCost.tradeGuide.feeNote}</div>
      </div>
    `;
  }

  // ========== 3. 仪表盘:价格表 ==========
  function renderDashTable() {
    const wrap = document.getElementById('dashTable');
    if (!wrap) return;
    wrap.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>品类</th>
            <th>入手价</th>
            <th>出手价</th>
            <th>持有期</th>
            <th>预期年化</th>
            <th>综合分</th>
            <th>趋势</th>
          </tr>
        </thead>
        <tbody>
          ${M.CATEGORIES.map(c => {
            const score = M.calcWeightedScore(c.score);
            const buy = c.tradeGuide.buyZone[0].range;
            const sell = c.tradeGuide.sellZone[0]?.range || '长持';
            const signalCls = c.score.preserve >= 4 ? 'signal-up' : (c.score.preserve <= 2 ? 'signal-down' : 'signal-flat');
            const signalText = c.score.preserve >= 4 ? '↑ 稳/涨' : (c.score.preserve <= 2 ? '↓ 弱' : '→ 震荡');
            return `
              <tr>
                <td><a class="cat-cell" data-route="#/category/${c.id}" href="#/category/${c.id}"><span class="emoji">${c.emoji}</span>${c.shortName}</a></td>
                <td class="price-buy">${buy}</td>
                <td class="price-sell">${sell}</td>
                <td>${c.tradeGuide.holdPeriod}</td>
                <td>${c.tradeGuide.expectedReturn}</td>
                <td><strong>${score}</strong> / 5</td>
                <td class="${signalCls}">${signalText}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  // ========== 4-9. 品类详情页 ==========
  function renderCatDetail(catId) {
    const c = M.CATEGORIES.find(x => x.id === catId);
    if (!c) return;
    const targetId = `catDetail${catId.charAt(0).toUpperCase() + catId.slice(1)}`;
    const wrap = document.getElementById(targetId);
    if (!wrap) return;

    const score = M.calcWeightedScore(c.score);
    const dimBars = Object.entries(M.EVAL_WEIGHTS).map(([k, v]) => `
      <div class="cat-dim-row">
        <div class="cat-dim-label">${v.name}</div>
        <div class="cat-dim-bar">
          <div class="cat-dim-bar-fill" style="width:${(c.score[k] / 5) * 100}%;background:${c.score[k] >= 4 ? 'var(--accent-green)' : (c.score[k] >= 3 ? 'var(--accent-gold)' : 'var(--accent-red)')}"></div>
        </div>
        <div class="cat-dim-value">${c.score[k]}/5</div>
      </div>
    `).join('');

    const insightHtml = c.insight.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // 该品类的成交案例(最多 2 个)
    const catCases = M.CASE_STUDIES.filter(x => x.cat === c.id).slice(0, 2);
    const catCasesHtml = catCases.length > 0 ? `
      <section class="cat-info-card">
        <h3>📈 近期成交案例</h3>
        ${catCases.map(cs => renderCaseCard(cs, 'compact')).join('')}
      </section>
    ` : '';

    wrap.innerHTML = `
      <a class="cat-back-btn" data-route="#/dashboard" href="#/dashboard">← 返回仪表盘</a>

      <header class="cat-detail-header">
        <div class="cat-detail-header-inner">
          <span class="cat-detail-emoji">${c.emoji}</span>
          <div class="cat-detail-header-text">
            <h1 class="cat-detail-title">${c.name}</h1>
            <p class="cat-detail-tagline">${c.tagline}</p>
            <div class="cat-detail-meta">
              <span>💰 ${c.priceRange}</span>
              <span>🎯 预算匹配:${c.budgetFit}</span>
              <span>⭐ 综合得分:${score} / 5</span>
            </div>
          </div>
        </div>
      </header>

      <div class="cat-detail-body">
        <main class="cat-detail-main">
          <!-- 交易仪表盘:入手 -->
          <div class="trade-block">
            <div class="trade-block-label"><span class="icon">🟢</span> 入手价区间(该买什么价)</div>
            <div class="trade-list">
              ${c.tradeGuide.buyZone.map(b => `
                <div class="trade-item">
                  <div class="trade-item-range">${b.range}</div>
                  <div class="trade-item-name">${b.item}</div>
                  <div class="trade-item-note">${b.note}</div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- 交易仪表盘:出手 -->
          <div class="trade-block sell">
            <div class="trade-block-label"><span class="icon">🔴</span> 出手价区间(该卖什么价)</div>
            ${c.tradeGuide.sellZone.length > 0
              ? `<div class="trade-list">${c.tradeGuide.sellZone.map(s => `
                <div class="trade-item">
                  <div class="trade-item-range">${s.range}</div>
                  <div class="trade-item-name">${s.item}</div>
                  <div class="trade-item-note">${s.note}</div>
                </div>
              `).join('')}</div>`
              : '<div class="trade-item-note" style="color:var(--text-muted);padding:12px 14px;background:var(--bg-secondary);border-radius:6px">本品类以长期持有为主,无短线出手价</div>'
            }
          </div>

          <!-- 交易仪表盘:信号 -->
          <div class="trade-block signals">
            <div class="trade-block-label"><span class="icon">🚦</span> 交易信号(什么时候买/卖)</div>
            <div class="trade-summary">
              <div class="trade-signal">
                <h4>✅ 买入信号(出现任一即可入场)</h4>
                <ul class="trade-signal-list">${c.tradeGuide.buySignals.map(s => `<li>${s}</li>`).join('')}</ul>
              </div>
              <div class="trade-signal">
                <h4>💰 卖出信号(出现任一即可出手)</h4>
                <ul class="trade-signal-list">${c.tradeGuide.sellSignals.map(s => `<li>${s}</li>`).join('')}</ul>
              </div>
            </div>
          </div>

          <!-- 交易仪表盘:避坑 -->
          <div class="trade-block avoid">
            <div class="trade-block-label"><span class="icon">⛔</span> 避坑清单(千万别碰)</div>
            <ul class="avoid-list">${c.tradeGuide.avoidZones.map(a => `<li>${a}</li>`).join('')}</ul>
          </div>

          <!-- 交易仪表盘:平台与费用(横向大块) -->
          <div class="trade-block trade-block-wide">
            <div class="trade-block-label"><span class="icon">🏪</span> 平台/费用</div>
            <div class="platform-grid">
              <div>
                <h4>📥 买入渠道</h4>
                <ul>${c.tradeGuide.platforms.buy.map(p => `<li>${p}</li>`).join('')}</ul>
              </div>
              <div>
                <h4>📤 卖出渠道</h4>
                <ul>${c.tradeGuide.platforms.sell.map(p => `<li>${p}</li>`).join('')}</ul>
              </div>
              <div>
                <h4>💸 费用说明</h4>
                <div class="fee-note">${c.tradeGuide.feeNote}</div>
              </div>
            </div>
          </div>
        </main>

        <aside class="cat-detail-aside">
          <section class="cat-info-card">
            <h3>📊 6 维评分</h3>
            <div class="cat-dim-bars">${dimBars}</div>
          </section>

          <section class="cat-info-card">
            <h3>💎 主推单品</h3>
            <ul class="cat-picks">
              ${c.picks.map(p => `
                <li>
                  <span class="cat-pick-name">${p.name}</span>
                  <span class="cat-pick-price">${p.price}</span>
                </li>
              `).join('')}
            </ul>
          </section>

          <section class="cat-info-card">
            <h3>⚠️ 风险提示</h3>
            <ul class="cat-risk-list">${c.risks.map(r => `<li>${r}</li>`).join('')}</ul>
          </section>

          ${catCasesHtml}

          <section class="cat-info-card">
            <h3>📌 2026-07 行情总结</h3>
            <div class="cat-insight-box">${insightHtml}</div>
          </section>
        </aside>
      </div>
    `;
  }

  // ========== 10. 投资建议:单品 TOP 3 ==========
  function renderRecSingle() {
    const wrap = document.getElementById('recSingleGrid');
    if (!wrap) return;
    wrap.innerHTML = M.RECOMMENDATIONS.single.map(r => `
      <div class="rec-card ${r.rank === 1 ? 'featured' : ''}">
        <div class="rec-rank">#${r.rank}</div>
        <span class="rec-tag">${r.tag}</span>
        <h3 class="rec-name">${r.name}</h3>
        <div class="rec-price">${r.price}</div>
        <p class="rec-reason">${r.reason}</p>
        <div class="rec-zone">📍 入手/出手:${r.buyZone}</div>
        <div class="rec-risk">⚠️ 风险:${r.risk}</div>
      </div>
    `).join('');
  }

  // ========== 10. 投资建议:组合方案 ==========
  function renderRecPortfolio() {
    const wrap = document.getElementById('recPortfolioGrid');
    if (!wrap) return;
    wrap.innerHTML = M.RECOMMENDATIONS.portfolio.map(p => `
      <div class="portfolio-card">
        <h3 class="portfolio-name">${p.name}</h3>
        <div class="portfolio-alloc">${p.allocation}</div>
        <p class="portfolio-desc">${p.desc}</p>
        <div class="portfolio-return">📈 预期收益:${p.expectedReturn}</div>
        <div class="portfolio-suitable">👤 适合:${p.suitable}</div>
      </div>
    `).join('');
  }

  // ========== 成交案例(通用渲染器) ==========
  function renderCaseCard(c, mode = 'compact') {
    const isProfit = c.outcome === 'profit';
    const outcomeCls = isProfit ? 'case-profit' : 'case-loss';
    const outcomeTag = isProfit ? '✓ 赚' : '✗ 亏';
    const flow = mode === 'full' ? `
      <div class="case-flow">
        <div class="case-flow-side">
          <div class="case-flow-label">买入</div>
          <div class="case-flow-price">¥${c.buyPrice}</div>
          <div class="case-flow-date">${c.buyDate}</div>
          <div class="case-flow-channel">📥 ${c.buyChannel}</div>
        </div>
        <div class="case-flow-arrow ${outcomeCls}">→</div>
        <div class="case-flow-side">
          <div class="case-flow-label">卖出</div>
          <div class="case-flow-price">¥${c.sellPrice}</div>
          <div class="case-flow-date">${c.sellDate}</div>
          <div class="case-flow-channel">📤 ${c.sellChannel}</div>
        </div>
      </div>` : '';
    const flowCompact = mode === 'compact' ? `
      <div class="case-mini-flow">
        <span class="case-mini-buy">¥${c.buyPrice}</span>
        <span class="case-mini-arrow">→</span>
        <span class="case-mini-sell">¥${c.sellPrice}</span>
      </div>` : '';
    const noteHtml = c.note.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    return `
      <div class="case-card ${mode} ${outcomeCls}">
        <div class="case-card-head">
          <span class="case-outcome-tag">${outcomeTag}</span>
          <span class="case-return">${c.netReturn}</span>
          <span class="case-hold">📅 ${c.holdPeriod}</span>
        </div>
        <h4 class="case-title">${c.title}</h4>
        <div class="case-item">${c.item}</div>
        ${flow}
        ${flowCompact}
        <div class="case-meta-row">
          <span class="case-profit-amt">${c.profit}</span>
        </div>
        <p class="case-note">${noteHtml}</p>
      </div>
    `;
  }

  function renderDashCases() {
    const wrap = document.getElementById('dashCases');
    if (!wrap) return;
    // 仪表盘展示 4 个:2 赚 2 亏(对比鲜明)
    const profits = M.CASE_STUDIES.filter(c => c.outcome === 'profit').slice(0, 2);
    const losses = M.CASE_STUDIES.filter(c => c.outcome === 'loss').slice(0, 2);
    const featured = [...profits, ...losses];
    wrap.innerHTML = `
      <div class="case-grid case-grid-4">
        ${featured.map(c => renderCaseCard(c, 'compact')).join('')}
      </div>
      <div class="case-summary-bar">
        <span><strong>10</strong> 个真实风格案例</span>
        <span>·</span>
        <span>覆盖 6 大品类</span>
        <span>·</span>
        <span>查看品类详情页 → 了解该品类全部案例</span>
      </div>
    `;
  }

  // ========== 11. 风险 ==========
  function renderRisk() {
    const wrap = document.getElementById('riskGrid');
    if (!wrap) return;
    wrap.innerHTML = M.RISKS.map((r, i) => `
      <div class="risk-card">
        <div class="risk-num">${i + 1}</div>
        <h3 class="risk-title">${r.title}</h3>
        <p class="risk-detail">${r.detail}</p>
        <div class="risk-advice">✅ 应对:${r.advice}</div>
      </div>
    `).join('');
  }

  // ========== 主题切换 ==========
  function initTheme() {
    const saved = localStorage.getItem('sm-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    const btn = document.getElementById('themeToggle');
    if (btn) btn.textContent = saved === 'dark' ? '☀️' : '🌙';
    btn?.addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('sm-theme', next);
      btn.textContent = next === 'dark' ? '☀️' : '🌙';
      // 重渲染当前页图表(颜色变了)
      onPageShow(ROUTES[currentRoute].page);
    });
  }

  // ========== 移动端抽屉 ==========
  function initDrawer() {
    const burger = document.getElementById('navBurger');
    const drawer = document.getElementById('navDrawer');
    const backdrop = document.getElementById('navBackdrop');
    function openDrawer() {
      burger.classList.add('open');
      drawer.classList.add('open');
      backdrop.classList.add('show');
    }
    function closeDrawerFn() {
      burger.classList.remove('open');
      drawer.classList.remove('open');
      backdrop.classList.remove('show');
    }
    burger?.addEventListener('click', () => {
      if (drawer.classList.contains('open')) closeDrawerFn();
      else openDrawer();
    });
    backdrop?.addEventListener('click', closeDrawerFn);
  }
  function closeDrawer() {
    document.getElementById('navBurger')?.classList.remove('open');
    document.getElementById('navDrawer')?.classList.remove('open');
    document.getElementById('navBackdrop')?.classList.remove('show');
  }

  // ========== 品类下拉菜单 ==========
  function initDropdown() {
    const btn = document.getElementById('navCatBtn');
    const dd = document.getElementById('navDropdown');
    if (!btn || !dd) return;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      dd.classList.toggle('open');
    });
    document.addEventListener('click', () => dd.classList.remove('open'));
    dd.addEventListener('click', (e) => e.stopPropagation());
  }

  // ========== 全局点击代理:navigation ==========
  function initNavDelegate() {
    document.body.addEventListener('click', (e) => {
      const a = e.target.closest('a[data-route]');
      if (!a) return;
      const route = a.getAttribute('data-route');
      if (ROUTES[route]) {
        e.preventDefault();
        navigate(route);
      }
    });
  }

  // ========== 启动 ==========
  function boot() {
    initTheme();
    initDrawer();
    initDropdown();
    initNavDelegate();
    window.addEventListener('hashchange', () => navigate(parseRoute(), false));
    navigate(parseRoute(), false);

    // 窗口 resize 重置图表
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        Object.values(_chartRegistry).forEach(c => { try { c.resize(); } catch (e) {} });
      }, 200);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
