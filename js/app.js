/**
 * 二级市场调研 - 应用主逻辑
 * 渲染内容 · 初始化图表 · 交互
 */

(function () {
  'use strict';

  const D = window.MARKET_DATA;

  // ========== ECharts 主题 ==========
  const CHART_COLORS = {
    gold: '#d4af37',
    cyan: '#4ecdc4',
    blue: '#5b8def',
    green: '#6bcf7f',
    red: '#e74c3c',
    orange: '#f39c12',
    purple: '#9b59b6',
    text: '#e8eaf0',
    subtext: '#9ba3b4',
    border: '#2a3245',
    bg: '#1a2030'
  };

  const CATEGORY_COLORS = [
    '#d4af37', '#4ecdc4', '#5b8def', '#9b59b6',
    '#f39c12', '#e74c3c'
  ];

  // ECharts 通用配置
  const baseChartOption = {
    textStyle: { color: CHART_COLORS.text, fontFamily: 'inherit' },
    backgroundColor: 'transparent'
  };

  // ========== 1. 渲染品类卡片 ==========
  function renderCategories() {
    const grid = document.getElementById('cat-grid');
    if (!grid) return;

    grid.innerHTML = D.CATEGORIES.map((cat, idx) => {
      const total = D.calcWeightedScore(cat.score);
      const budgetCls = cat.budgetFit === '高' ? 'budget-high' :
                        cat.budgetFit === '中' ? 'budget-mid' : 'budget-low';

      return `
        <div class="cat-card">
          <div class="cat-head">
            <div class="cat-emoji">${cat.emoji}</div>
            <span class="cat-budget ${budgetCls}">${cat.budgetFit === '高' ? '✓ 预算友好' : cat.budgetFit === '中' ? '⚠ 部分超预算' : '✗ 谨慎投入'}</span>
          </div>
          <h3 class="cat-title">${cat.name}</h3>
          <p class="cat-tagline">${cat.tagline}</p>

          <div class="cat-score-row">
            <span class="cat-score-label">综合</span>
            <span class="cat-score-value">${total}</span>
            <div class="cat-score-bar">
              <div class="cat-score-bar-fill" style="width:${(total / 5 * 100).toFixed(0)}%"></div>
            </div>
            <span class="cat-score-label">/ 5.0</span>
          </div>

          <div class="cat-radar" id="cat-radar-${cat.id}"></div>

          <div class="cat-info">
            <div class="cat-info-item">
              <div class="cat-info-item-label">价格区间</div>
              <div class="cat-info-item-value">¥${cat.priceRange}</div>
            </div>
            <div class="cat-info-item">
              <div class="cat-info-item-label">主要平台</div>
              <div class="platform-list">
                ${cat.platforms.map(p => `<span class="platform-tag">${p}</span>`).join('')}
              </div>
            </div>
          </div>

          <div class="cat-detail">
            <h5>⚠️ 风险点</h5>
            <ul class="cat-picks" style="font-size:12px;">
              ${cat.risks.map(r => `<li style="color:var(--text-secondary);border-bottom:1px solid var(--border);"><span style="color:var(--accent-orange);">·</span>&nbsp;${r}</li>`).join('')}
            </ul>
          </div>

          <div class="cat-detail">
            <h5>💎 典型标的(5-6万预算)</h5>
            <ul class="cat-picks">
              ${cat.picks.map(p => `
                <li>
                  <span class="cat-pick-name">${p.name}</span>
                  <span class="cat-pick-price">${p.price}</span>
                </li>
              `).join('')}
            </ul>
          </div>

          <div class="cat-insight">
            <strong style="color:var(--accent-cyan);">洞察</strong> · ${cat.insight}
          </div>
        </div>
      `;
    }).join('');

    // 每个卡片渲染小型雷达图
    D.CATEGORIES.forEach((cat, idx) => {
      const dom = document.getElementById(`cat-radar-${cat.id}`);
      if (!dom) return;
      const chart = echarts.init(dom);
      chart.setOption({
        ...baseChartOption,
        tooltip: {
          trigger: 'item',
          backgroundColor: 'rgba(20, 25, 37, 0.95)',
          borderColor: CHART_COLORS.border,
          textStyle: { color: CHART_COLORS.text }
        },
        radar: {
          indicator: [
            { name: '日常', max: 5 },
            { name: '装饰', max: 5 },
            { name: '社交', max: 5 },
            { name: '流通', max: 5 },
            { name: '保值', max: 5 }
          ],
          shape: 'polygon',
          splitNumber: 5,
          axisName: { color: CHART_COLORS.subtext, fontSize: 11 },
          splitLine: { lineStyle: { color: CHART_COLORS.border } },
          splitArea: { areaStyle: { color: ['transparent'] } },
          axisLine: { lineStyle: { color: CHART_COLORS.border } }
        },
        series: [{
          type: 'radar',
          data: [{
            value: [cat.score.daily, cat.score.decor, cat.score.social, cat.score.liquidity, cat.score.preserve],
            name: cat.name,
            symbol: 'circle',
            symbolSize: 4,
            lineStyle: { color: CATEGORY_COLORS[idx], width: 2 },
            areaStyle: { color: CATEGORY_COLORS[idx], opacity: 0.25 },
            itemStyle: { color: CATEGORY_COLORS[idx] }
          }]
        }]
      });
    });
  }

  // ========== 2. 综合雷达图 ==========
  function initRadarChart() {
    const dom = document.getElementById('chart-radar');
    if (!dom) return;
    const chart = echarts.init(dom);

    const dimensions = ['日常使用', '装饰审美', '情感社交', '流通变现', '长期保值'];

    chart.setOption({
      ...baseChartOption,
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(20, 25, 37, 0.95)',
        borderColor: CHART_COLORS.border
      },
      legend: {
        data: D.CATEGORIES.map(c => c.name),
        bottom: 0,
        textStyle: { color: CHART_COLORS.subtext, fontSize: 11 },
        itemWidth: 14,
        itemHeight: 10
      },
      radar: {
        indicator: dimensions.map(d => ({ name: d, max: 5 })),
        shape: 'polygon',
        splitNumber: 5,
        axisName: { color: CHART_COLORS.text, fontSize: 12 },
        splitLine: { lineStyle: { color: CHART_COLORS.border } },
        splitArea: { areaStyle: { color: ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.04)'] } },
        axisLine: { lineStyle: { color: CHART_COLORS.border } }
      },
      series: [{
        type: 'radar',
        symbol: 'circle',
        symbolSize: 4,
        data: D.CATEGORIES.map((cat, idx) => ({
          value: [cat.score.daily, cat.score.decor, cat.score.social, cat.score.liquidity, cat.score.preserve],
          name: cat.name,
          lineStyle: { color: CATEGORY_COLORS[idx], width: 2 },
          areaStyle: { color: CATEGORY_COLORS[idx], opacity: 0.12 },
          itemStyle: { color: CATEGORY_COLORS[idx] }
        }))
      }]
    });
  }

  // ========== 3. 加权得分排名 ==========
  function initScoreChart() {
    const dom = document.getElementById('chart-score');
    if (!dom) return;
    const chart = echarts.init(dom);

    const data = D.CATEGORIES.map(cat => ({
      name: cat.name.replace('(劳力士/帝舵/欧米茄)', '中端腕表').replace('(山崎/麦卡伦)', '收藏威士忌'),
      value: parseFloat(D.calcWeightedScore(cat.score))
    })).sort((a, b) => b.value - a.value);

    chart.setOption({
      ...baseChartOption,
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(20, 25, 37, 0.95)',
        borderColor: CHART_COLORS.border,
        formatter: (params) => {
          const p = params[0];
          return `${p.name}<br/><strong style="color:${CHART_COLORS.gold};font-size:16px;">${p.value.toFixed(2)}</strong> / 5.00`;
        }
      },
      grid: { top: 20, right: 30, bottom: 60, left: 50 },
      xAxis: {
        type: 'category',
        data: data.map(d => d.name),
        axisLine: { lineStyle: { color: CHART_COLORS.border } },
        axisLabel: { color: CHART_COLORS.subtext, fontSize: 11, interval: 0, rotate: 20 }
      },
      yAxis: {
        type: 'value',
        max: 5,
        min: 0,
        axisLine: { show: false },
        axisLabel: { color: CHART_COLORS.subtext, fontSize: 11 },
        splitLine: { lineStyle: { color: CHART_COLORS.border, type: 'dashed' } }
      },
      series: [{
        type: 'bar',
        data: data.map((d, i) => ({
          value: d.value,
          itemStyle: {
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: CATEGORY_COLORS[i] },
                { offset: 1, color: CATEGORY_COLORS[i] + '66' }
              ]
            },
            borderRadius: [6, 6, 0, 0]
          }
        })),
        label: {
          show: true,
          position: 'top',
          color: CHART_COLORS.gold,
          fontWeight: 700,
          fontSize: 13,
          formatter: '{c}'
        },
        barWidth: '50%'
      }]
    });
  }

  // ========== 4. 价格 vs 实用价值散点图 ==========
  function initScatterChart() {
    const dom = document.getElementById('chart-scatter');
    if (!dom) return;
    const chart = echarts.init(dom);

    // 用价格中位数作为 X 轴(单位:万)
    const data = D.CATEGORIES.map((cat, idx) => {
      const range = cat.priceRange.match(/[\d,]+/g);
      const min = parseFloat(range[0].replace(/,/g, '')) / 10000;
      const max = parseFloat(range[1].replace(/,/g, '')) / 10000;
      const mid = ((min + max) / 2).toFixed(1);
      return {
        name: cat.name,
        value: [parseFloat(mid), parseFloat(D.calcWeightedScore(cat.score)), idx]
      };
    });

    chart.setOption({
      ...baseChartOption,
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(20, 25, 37, 0.95)',
        borderColor: CHART_COLORS.border,
        formatter: (params) => {
          const d = params.data;
          return `<strong>${d.name}</strong><br/>价格中位数: ¥${d.value[0]} 万<br/>综合得分: <span style="color:${CHART_COLORS.gold};">${d.value[1]}</span>`;
        }
      },
      grid: { top: 30, right: 30, bottom: 50, left: 60 },
      xAxis: {
        type: 'value',
        name: '价格中位数(万元)',
        nameLocation: 'middle',
        nameGap: 30,
        nameTextStyle: { color: CHART_COLORS.subtext, fontSize: 12 },
        axisLine: { lineStyle: { color: CHART_COLORS.border } },
        axisLabel: { color: CHART_COLORS.subtext, fontSize: 11 },
        splitLine: { lineStyle: { color: CHART_COLORS.border, type: 'dashed' } }
      },
      yAxis: {
        type: 'value',
        name: '综合得分',
        max: 5,
        min: 0,
        nameLocation: 'middle',
        nameGap: 40,
        nameTextStyle: { color: CHART_COLORS.subtext, fontSize: 12 },
        axisLine: { show: false },
        axisLabel: { color: CHART_COLORS.subtext, fontSize: 11 },
        splitLine: { lineStyle: { color: CHART_COLORS.border, type: 'dashed' } }
      },
      series: [{
        type: 'scatter',
        symbolSize: (val) => 30 + val[1] * 8,
        data: data,
        itemStyle: {
          color: (params) => CATEGORY_COLORS[params.data.value[2]],
          opacity: 0.7,
          borderColor: '#fff',
          borderWidth: 1
        },
        label: {
          show: true,
          position: 'right',
          color: CHART_COLORS.text,
          fontSize: 11,
          formatter: (params) => params.data.name
        },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: CHART_COLORS.gold, type: 'dashed', width: 1 },
          data: [
            { xAxis: 5, label: { formatter: '预算上限 ¥5.6万', color: CHART_COLORS.gold, position: 'end' } },
            { yAxis: 3, label: { formatter: '及格线 3.0', color: CHART_COLORS.gold, position: 'end' } }
          ]
        }
      }]
    });
  }

  // ========== 5. 流动性柱状图 ==========
  function initLiquidityChart() {
    const dom = document.getElementById('chart-liquidity');
    if (!dom) return;
    const chart = echarts.init(dom);

    const data = D.CATEGORIES.map(cat => ({
      name: cat.name,
      liquidity: cat.score.liquidity,
      preserve: cat.score.preserve
    })).sort((a, b) => b.liquidity - a.liquidity);

    chart.setOption({
      ...baseChartOption,
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(20, 25, 37, 0.95)',
        borderColor: CHART_COLORS.border
      },
      legend: {
        data: ['流通变现能力', '长期保值潜力'],
        top: 0,
        textStyle: { color: CHART_COLORS.subtext, fontSize: 11 }
      },
      grid: { top: 40, right: 20, bottom: 60, left: 50 },
      xAxis: {
        type: 'category',
        data: data.map(d => d.name),
        axisLine: { lineStyle: { color: CHART_COLORS.border } },
        axisLabel: { color: CHART_COLORS.subtext, fontSize: 10, interval: 0, rotate: 18 }
      },
      yAxis: {
        type: 'value',
        max: 5,
        axisLine: { show: false },
        axisLabel: { color: CHART_COLORS.subtext, fontSize: 11 },
        splitLine: { lineStyle: { color: CHART_COLORS.border, type: 'dashed' } }
      },
      series: [
        {
          name: '流通变现能力',
          type: 'bar',
          data: data.map(d => d.liquidity),
          itemStyle: { color: CHART_COLORS.cyan, borderRadius: [4, 4, 0, 0] },
          barWidth: '35%'
        },
        {
          name: '长期保值潜力',
          type: 'bar',
          data: data.map(d => d.preserve),
          itemStyle: { color: CHART_COLORS.gold, borderRadius: [4, 4, 0, 0] },
          barWidth: '35%'
        }
      ]
    });
  }

  // ========== 6. 价格区间横向条形图 ==========
  function initRangeChart() {
    const dom = document.getElementById('chart-range');
    if (!dom) return;
    const chart = echarts.init(dom);

    // 解析价格区间
    const data = D.CATEGORIES.map(cat => {
      const range = cat.priceRange.match(/[\d,]+/g);
      const min = parseFloat(range[0].replace(/,/g, '')) / 10000; // 转万
      const max = parseFloat(range[1].replace(/,/g, '')) / 10000;
      return { name: cat.name, min, max, emoji: cat.emoji };
    });

    // 预算上限 5.6 万
    const BUDGET = 5.6;

    chart.setOption({
      ...baseChartOption,
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(20, 25, 37, 0.95)',
        borderColor: CHART_COLORS.border,
        formatter: (params) => {
          const d = params[0];
          const min = d.value;
          const max = d.value + d.data.range;
          return `<strong>${d.name}</strong><br/>价格区间: ¥${min.toFixed(1)} 万 ~ ¥${max.toFixed(1)} 万<br/>预算覆盖: ${min <= BUDGET ? '✅ 可触达' : '⚠️ 部分超预算'}`;
        }
      },
      grid: { top: 30, right: 80, bottom: 30, left: 180 },
      xAxis: {
        type: 'value',
        name: '价格(万元)',
        nameTextStyle: { color: CHART_COLORS.subtext },
        axisLine: { lineStyle: { color: CHART_COLORS.border } },
        axisLabel: { color: CHART_COLORS.subtext },
        splitLine: { lineStyle: { color: CHART_COLORS.border, type: 'dashed' } }
      },
      yAxis: {
        type: 'category',
        data: data.map(d => d.name).reverse(),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: CHART_COLORS.text, fontSize: 12 }
      },
      series: [
        // 区间条
        {
          type: 'bar',
          stack: 'range',
          data: data.map(d => d.min).reverse(),
          itemStyle: { color: 'transparent' },
          barWidth: 24
        },
        {
          type: 'bar',
          stack: 'range',
          data: data.map(d => d.max - d.min).reverse(),
          itemStyle: {
            color: (params) => {
              const d = data[data.length - 1 - params.dataIndex];
              return d.min <= BUDGET ? CHART_COLORS.cyan : CHART_COLORS.gold;
            },
            borderRadius: [0, 6, 6, 0]
          },
          label: {
            show: true,
            position: 'right',
            color: CHART_COLORS.text,
            fontSize: 11,
            formatter: (params) => {
              const d = data[data.length - 1 - params.dataIndex];
              return `¥${d.min.toFixed(1)} - ${d.max.toFixed(1)}万`;
            }
          },
          barWidth: 24
        }
      ]
    });
  }

  // ========== 7. 渲染推荐方案 ==========
  function renderRecommendations() {
    const grid = document.getElementById('rec-grid');
    if (!grid) return;
    grid.innerHTML = D.RECOMMENDATIONS.single.map(rec => `
      <div class="rec-card ${rec.rank === 1 ? 'featured' : ''}">
        <div class="rec-rank">${rec.rank}</div>
        <span class="rec-tag">${rec.tag}</span>
        <h3 class="rec-name">${rec.name}</h3>
        <div class="rec-price">${rec.price}</div>
        <p class="rec-reason"><strong style="color:var(--accent-cyan);">推荐理由</strong><br/>${rec.reason}</p>
        <div class="rec-risk">⚠️ ${rec.risk}</div>
      </div>
    `).join('');

    const portfolioGrid = document.getElementById('portfolio-grid');
    if (!portfolioGrid) return;
    portfolioGrid.innerHTML = D.RECOMMENDATIONS.portfolio.map(p => `
      <div class="portfolio-card">
        <h3 class="portfolio-name">${p.name}</h3>
        <span class="portfolio-alloc">${p.allocation}</span>
        <p class="portfolio-desc">${p.desc}</p>
        <div class="portfolio-suitable">👤 适合:${p.suitable}</div>
      </div>
    `).join('');
  }

  // ========== 8. 渲染风险提示 ==========
  function renderRisks() {
    const grid = document.getElementById('risk-grid');
    if (!grid) return;
    grid.innerHTML = D.RISKS.map(risk => `
      <div class="risk-card">
        <h4 class="risk-title">⚠️ ${risk.title}</h4>
        <p class="risk-detail">${risk.detail}</p>
        <div class="risk-advice">💡 ${risk.advice}</div>
      </div>
    `).join('');
  }

  // ========== 9. 滚动锚点高亮 ==========
  function initNavHighlight() {
    const sections = document.querySelectorAll('section[id], header[id]');
    const navLinks = document.querySelectorAll('.nav-menu a');

    window.addEventListener('scroll', () => {
      let current = '';
      sections.forEach(section => {
        const top = section.offsetTop;
        if (window.scrollY >= top - 120) {
          current = section.id;
        }
      });
      navLinks.forEach(link => {
        link.style.color = '';
        link.style.background = '';
        if (link.getAttribute('href') === '#' + current) {
          link.style.color = 'var(--accent-gold)';
          link.style.background = 'var(--bg-card)';
        }
      });
    });
  }

  // ========== 10. 响应式 resize ==========
  function initResizeHandler() {
    let timer = null;
    window.addEventListener('resize', () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        echarts.getInstanceByDom(document.getElementById('chart-radar'))?.resize();
        echarts.getInstanceByDom(document.getElementById('chart-score'))?.resize();
        echarts.getInstanceByDom(document.getElementById('chart-scatter'))?.resize();
        echarts.getInstanceByDom(document.getElementById('chart-liquidity'))?.resize();
        echarts.getInstanceByDom(document.getElementById('chart-range'))?.resize();
        D.CATEGORIES.forEach(cat => {
          echarts.getInstanceByDom(document.getElementById(`cat-radar-${cat.id}`))?.resize();
        });
      }, 200);
    });
  }

  // ========== 启动 ==========
  function init() {
    renderCategories();
    renderRecommendations();
    renderRisks();
    initRadarChart();
    initScoreChart();
    initScatterChart();
    initLiquidityChart();
    initRangeChart();
    initNavHighlight();
    initResizeHandler();
    console.log('[倒爷市场] 调研网站已加载 · 6 品类 · 5 维评估');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
