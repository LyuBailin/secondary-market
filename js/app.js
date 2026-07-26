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
    text: '#e8eaf0',
    subtext: '#9ba3b4',
    border: '#2a3245',
    bg: 'transparent'
  };

  const CATEGORY_COLORS = [
    '#d4af37', '#4ecdc4', '#5b8def', '#9b59b6',
    '#f39c12', '#e74c3c'
  ];

  // 检测亮色主题
  const isLight = () => document.documentElement.getAttribute('data-theme') === 'light';

  // ECharts 通用配置(根据主题调整)
  const baseChartOption = () => ({
    textStyle: { color: isLight() ? '#1a1f2e' : CHART_COLORS.text, fontFamily: 'inherit' },
    backgroundColor: 'transparent',
    animation: true,
    animationDuration: 800,
    animationEasing: 'cubicOut',
    animationDelay: (idx) => idx * 80
  });

  // ========== 工具:图表加载完成后移除 skeleton ==========
  function markChartLoaded(dom) {
    if (dom && dom.parentElement) {
      dom.parentElement.classList.add('loaded');
    }
  }

  // ========== 1. 渲染品类卡片 ==========
  function renderCategories() {
    const grid = document.getElementById('cat-grid');
    if (!grid) return;

    grid.innerHTML = D.CATEGORIES.map((cat, idx) => {
      const total = D.calcWeightedScore(cat.score);
      const budgetCls = cat.budgetFit === '高' ? 'budget-high' :
                        cat.budgetFit === '中' ? 'budget-mid' : 'budget-low';
      const budgetIcon = cat.budgetFit === '高' ? '✓' :
                         cat.budgetFit === '中' ? '⚠' : '✗';
      const budgetText = cat.budgetFit === '高' ? '预算友好' :
                         cat.budgetFit === '中' ? '部分超预算' : '谨慎投入';

      return `
        <div class="cat-card">
          <div class="cat-head">
            <div class="cat-emoji">${cat.emoji}</div>
            <span class="cat-budget ${budgetCls}">${budgetIcon} ${budgetText}</span>
          </div>
          <h3 class="cat-title">${cat.name}</h3>
          <p class="cat-tagline">${cat.tagline}</p>

          <div class="cat-score-row">
            <span class="cat-score-label">综合</span>
            <span class="cat-score-value">${total}</span>
            <div class="cat-score-bar">
              <div class="cat-score-bar-fill" data-score="${(total / 5 * 100).toFixed(0)}"></div>
            </div>
            <span class="cat-score-label">/ 5.0</span>
          </div>

          <div class="cat-radar" id="cat-radar-${cat.id}">
            <div class="skeleton skeleton-chart">加载中...</div>
          </div>

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

          <details class="cat-detail">
            <summary class="cat-detail-summary">⚠️ 风险点 (${cat.risks.length})</summary>
            <ul class="cat-picks risk">
              ${cat.risks.map(r => `<li><span style="color:var(--accent-orange);">·</span>&nbsp;${r}</li>`).join('')}
            </ul>
          </details>

          <div class="cat-detail">
            <h5 class="cat-detail-summary" style="cursor:default;">💎 典型标的 (5-6万预算)</h5>
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
            <strong>洞察</strong> · ${cat.insight}
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
        ...baseChartOption(),
        tooltip: {
          trigger: 'item',
          backgroundColor: isLight() ? 'rgba(255,255,255,0.95)' : 'rgba(20, 25, 37, 0.95)',
          borderColor: CHART_COLORS.border,
          textStyle: { color: isLight() ? '#1a1f2e' : CHART_COLORS.text }
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
          axisName: { color: isLight() ? '#5a6373' : CHART_COLORS.subtext, fontSize: 11 },
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
      // 监听首次渲染完成
      chart.on('finished', () => markChartLoaded(dom));
    });

    // 触发进度条动画(用 IntersectionObserver 在可见时播放)
    observeScoreBars();
  }

  // ========== 进度条入场动画 ==========
  function observeScoreBars() {
    const bars = document.querySelectorAll('.cat-score-bar-fill');
    if (!('IntersectionObserver' in window)) {
      // 降级:直接设置
      bars.forEach(b => b.style.width = b.dataset.score + '%');
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const bar = entry.target;
          bar.style.width = bar.dataset.score + '%';
          observer.unobserve(bar);
        }
      });
    }, { threshold: 0.3 });
    bars.forEach(b => observer.observe(b));
  }

  // ========== 2. 综合雷达图 ==========
  function initRadarChart() {
    const dom = document.getElementById('chart-radar');
    if (!dom) return;
    const chart = echarts.init(dom);

    const dimensions = ['日常使用', '装饰审美', '情感社交', '流通变现', '长期保值'];

    chart.setOption({
      ...baseChartOption(),
      tooltip: {
        trigger: 'item',
        backgroundColor: isLight() ? 'rgba(255,255,255,0.95)' : 'rgba(20, 25, 37, 0.95)',
        borderColor: CHART_COLORS.border
      },
      legend: {
        data: D.CATEGORIES.map(c => c.name),
        bottom: 0,
        textStyle: { color: isLight() ? '#5a6373' : CHART_COLORS.subtext, fontSize: 11 },
        itemWidth: 14,
        itemHeight: 10
      },
      radar: {
        indicator: dimensions.map(d => ({ name: d, max: 5 })),
        shape: 'polygon',
        splitNumber: 5,
        axisName: { color: isLight() ? '#1a1f2e' : CHART_COLORS.text, fontSize: 12 },
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
    chart.on('finished', () => markChartLoaded(dom));
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

    const textColor = isLight() ? '#1a1f2e' : CHART_COLORS.text;
    const subColor = isLight() ? '#5a6373' : CHART_COLORS.subtext;

    chart.setOption({
      ...baseChartOption(),
      tooltip: {
        trigger: 'axis',
        backgroundColor: isLight() ? 'rgba(255,255,255,0.95)' : 'rgba(20, 25, 37, 0.95)',
        borderColor: CHART_COLORS.border,
        textStyle: { color: textColor },
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
        axisLabel: { color: subColor, fontSize: 11, interval: 0, rotate: 20 }
      },
      yAxis: {
        type: 'value',
        max: 5,
        min: 0,
        axisLine: { show: false },
        axisLabel: { color: subColor, fontSize: 11 },
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
    chart.on('finished', () => markChartLoaded(dom));
  }

  // ========== 4. 价格 vs 实用价值散点图 ==========
  function initScatterChart() {
    const dom = document.getElementById('chart-scatter');
    if (!dom) return;
    const chart = echarts.init(dom);

    const subColor = isLight() ? '#5a6373' : CHART_COLORS.subtext;
    const textColor = isLight() ? '#1a1f2e' : CHART_COLORS.text;

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
      ...baseChartOption(),
      tooltip: {
        trigger: 'item',
        backgroundColor: isLight() ? 'rgba(255,255,255,0.95)' : 'rgba(20, 25, 37, 0.95)',
        borderColor: CHART_COLORS.border,
        textStyle: { color: textColor },
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
        nameTextStyle: { color: subColor, fontSize: 12 },
        axisLine: { lineStyle: { color: CHART_COLORS.border } },
        axisLabel: { color: subColor, fontSize: 11 },
        splitLine: { lineStyle: { color: CHART_COLORS.border, type: 'dashed' } }
      },
      yAxis: {
        type: 'value',
        name: '综合得分',
        max: 5,
        min: 0,
        nameLocation: 'middle',
        nameGap: 40,
        nameTextStyle: { color: subColor, fontSize: 12 },
        axisLine: { show: false },
        axisLabel: { color: subColor, fontSize: 11 },
        splitLine: { lineStyle: { color: CHART_COLORS.border, type: 'dashed' } }
      },
      series: [{
        type: 'scatter',
        symbolSize: (val) => 30 + val[1] * 8,
        data: data,
        itemStyle: {
          color: (params) => CATEGORY_COLORS[params.data.value[2]],
          opacity: 0.7,
          borderColor: textColor,
          borderWidth: 1
        },
        label: {
          show: true,
          position: 'right',
          color: textColor,
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
    chart.on('finished', () => markChartLoaded(dom));
  }

  // ========== 5. 流动性柱状图 ==========
  function initLiquidityChart() {
    const dom = document.getElementById('chart-liquidity');
    if (!dom) return;
    const chart = echarts.init(dom);

    const subColor = isLight() ? '#5a6373' : CHART_COLORS.subtext;
    const textColor = isLight() ? '#1a1f2e' : CHART_COLORS.text;

    const data = D.CATEGORIES.map(cat => ({
      name: cat.name,
      liquidity: cat.score.liquidity,
      preserve: cat.score.preserve
    })).sort((a, b) => b.liquidity - a.liquidity);

    chart.setOption({
      ...baseChartOption(),
      tooltip: {
        trigger: 'axis',
        backgroundColor: isLight() ? 'rgba(255,255,255,0.95)' : 'rgba(20, 25, 37, 0.95)',
        borderColor: CHART_COLORS.border,
        textStyle: { color: textColor }
      },
      legend: {
        data: ['流通变现能力', '长期保值潜力'],
        top: 0,
        textStyle: { color: subColor, fontSize: 11 }
      },
      grid: { top: 40, right: 20, bottom: 60, left: 50 },
      xAxis: {
        type: 'category',
        data: data.map(d => d.name),
        axisLine: { lineStyle: { color: CHART_COLORS.border } },
        axisLabel: { color: subColor, fontSize: 10, interval: 0, rotate: 18 }
      },
      yAxis: {
        type: 'value',
        max: 5,
        axisLine: { show: false },
        axisLabel: { color: subColor, fontSize: 11 },
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
    chart.on('finished', () => markChartLoaded(dom));
  }

  // ========== 6. 价格区间横向条形图 ==========
  function initRangeChart() {
    const dom = document.getElementById('chart-range');
    if (!dom) return;
    const chart = echarts.init(dom);

    const subColor = isLight() ? '#5a6373' : CHART_COLORS.subtext;
    const textColor = isLight() ? '#1a1f2e' : CHART_COLORS.text;

    const data = D.CATEGORIES.map(cat => {
      const range = cat.priceRange.match(/[\d,]+/g);
      const min = parseFloat(range[0].replace(/,/g, '')) / 10000;
      const max = parseFloat(range[1].replace(/,/g, '')) / 10000;
      return { name: cat.name, min, max, emoji: cat.emoji };
    });

    const BUDGET = 5.6;

    chart.setOption({
      ...baseChartOption(),
      tooltip: {
        trigger: 'axis',
        backgroundColor: isLight() ? 'rgba(255,255,255,0.95)' : 'rgba(20, 25, 37, 0.95)',
        borderColor: CHART_COLORS.border,
        textStyle: { color: textColor },
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
        nameTextStyle: { color: subColor },
        axisLine: { lineStyle: { color: CHART_COLORS.border } },
        axisLabel: { color: subColor },
        splitLine: { lineStyle: { color: CHART_COLORS.border, type: 'dashed' } }
      },
      yAxis: {
        type: 'category',
        data: data.map(d => d.name).reverse(),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: textColor, fontSize: 12 }
      },
      series: [
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
            color: textColor,
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
    chart.on('finished', () => markChartLoaded(dom));
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

  // ========== 9. 滚动锚点高亮(底部金线) ==========
  function initNavHighlight() {
    const sections = document.querySelectorAll('section[id], header[id]');
    const navLinks = document.querySelectorAll('.nav-menu a[data-nav], .nav-drawer a[data-nav]');

    const updateActive = () => {
      let current = '';
      sections.forEach(section => {
        const top = section.offsetTop;
        if (window.scrollY >= top - 120) {
          current = section.id;
        }
      });
      navLinks.forEach(link => {
        const isActive = link.getAttribute('href') === '#' + current;
        link.classList.toggle('active', isActive);
      });
    };

    window.addEventListener('scroll', updateActive, { passive: true });
    updateActive();
  }

  // ========== 10. 移动端汉堡菜单 ==========
  function initMobileMenu() {
    const burger = document.getElementById('navBurger');
    const drawer = document.getElementById('navDrawer');
    const backdrop = document.getElementById('navBackdrop');
    if (!burger || !drawer) return;

    const close = () => {
      burger.classList.remove('open');
      drawer.classList.remove('open');
      backdrop.classList.remove('show');
      document.body.style.overflow = '';
    };

    const toggle = () => {
      const isOpen = drawer.classList.contains('open');
      if (isOpen) close(); else {
        burger.classList.add('open');
        drawer.classList.add('open');
        backdrop.classList.add('show');
        document.body.style.overflow = 'hidden';
      }
    };

    burger.addEventListener('click', toggle);
    backdrop.addEventListener('click', close);

    // 抽屉菜单点击后关闭
    drawer.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => setTimeout(close, 100));
    });

    // ESC 关闭
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer.classList.contains('open')) close();
    });
  }

  // ========== 11. 主题切换 ==========
  const THEME_KEY = 'secondary-market-theme';
  function initThemeToggle() {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;

    // 读取保存的主题
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
      btn.textContent = '☀️';
    }

    btn.addEventListener('click', () => {
      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      const next = isLight ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      btn.textContent = next === 'light' ? '☀️' : '🌙';
      localStorage.setItem(THEME_KEY, next);
      // 重新渲染图表(颜色变了)
      rerenderAllCharts();
    });
  }

  function rerenderAllCharts() {
    // 销毁并重建所有图表
    [
      'chart-radar', 'chart-score', 'chart-scatter', 'chart-liquidity', 'chart-range'
    ].forEach(id => {
      const dom = document.getElementById(id);
      if (dom) echarts.dispose(dom);
    });
    D.CATEGORIES.forEach(cat => {
      const dom = document.getElementById(`cat-radar-${cat.id}`);
      if (dom) echarts.dispose(dom);
    });
    // 重建(先重置 skeleton)
    document.querySelectorAll('.chart-canvas').forEach(c => c.classList.remove('loaded'));
    initRadarChart();
    initScoreChart();
    initScatterChart();
    initLiquidityChart();
    initRangeChart();
    // 重新渲染卡片雷达(独立)
    D.CATEGORIES.forEach((cat, idx) => {
      const dom = document.getElementById(`cat-radar-${cat.id}`);
      if (!dom) return;
      const chart = echarts.init(dom);
      chart.setOption({
        ...baseChartOption(),
        tooltip: {
          trigger: 'item',
          backgroundColor: isLight() ? 'rgba(255,255,255,0.95)' : 'rgba(20, 25, 37, 0.95)',
          borderColor: CHART_COLORS.border
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
          axisName: { color: isLight() ? '#5a6373' : CHART_COLORS.subtext, fontSize: 11 },
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
      chart.on('finished', () => markChartLoaded(dom));
    });
  }

  // ========== 12. 返回顶部按钮 ==========
  function initBackToTop() {
    const btn = document.getElementById('backToTop');
    if (!btn) return;

    const onScroll = () => {
      btn.classList.toggle('visible', window.scrollY > 600);
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ========== 13. 响应式 resize ==========
  function initResizeHandler() {
    let timer = null;
    window.addEventListener('resize', () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        ['chart-radar', 'chart-score', 'chart-scatter', 'chart-liquidity', 'chart-range']
          .forEach(id => echarts.getInstanceByDom(document.getElementById(id))?.resize());
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
    initMobileMenu();
    initThemeToggle();
    initBackToTop();
    initResizeHandler();
    console.log('[倒爷市场] v2.0 · 14 项 UI 优化已完成');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
