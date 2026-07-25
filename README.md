# Secondary Market Research · 二级市场投资调研

## 项目说明

基于真实市场数据的二级市场调研网站,5-6万预算下「买回来既能用、还能倒手」的品类与单品分析。

## 核心内容

- **6 大核心品类**:当代艺术原作/中端腕表/限量球鞋/设计师家具/收藏级威士忌/潮玩盲盒
- **5 维实用价值评估**:日常使用(25%)+ 装饰审美(20%)+ 情感社交(15%)+ 流通变现(20%)+ 长期保值(20%)
- **真实数据**:基于 2025-2026 年公开市场(千岛、得物、Whiskystats、雅昌、腕表之家等)
- **投资建议**:单品 TOP 3 + 3 种组合方案(稳健型/品味型/激进型)
- **风险避坑**:5 大核心风险 + 应对建议

## 文件结构

```
secondary-market/
├── index.html          # 主页面(单页 SPA)
├── css/style.css       # 暗色主题样式
├── js/data.js          # 数据中心(品类、价格、评分、推荐)
├── js/app.js           # 交互逻辑 + ECharts 图表
└── README.md
```

## 启动方式

### 方式 1:直接打开(推荐)
双击 `index.html`,浏览器会自动用 `file://` 协议打开。

### 方式 2:本地 server(避免某些浏览器对 file:// 的限制)
```powershell
# 进入项目目录
Set-Location "D:\ProgramFiles\MinimaxCode\projects\secondary-market"

# 启动 Python 简易 server
python -m http.server 8765

# 浏览器访问 http://localhost:8765
```

## 技术栈

- **HTML5 + CSS3 + 原生 JavaScript**(无构建步骤)
- **ECharts 5.4.3**(CDN 引入,数据可视化)
- 响应式设计(桌面/平板/手机)
- 深色主题 + 暗金强调色,拍卖行/二级市场氛围

## 数据声明

所有数据来源于 2025-2026 年公开市场调研:
- 千岛 App、得物、闲鱼、Whiskystats、雅昌艺术网
- 腕表之家、Agehome、第一财经、新浪财经
- 邦瀚斯/苏富比拍卖记录

⚠️ 投资有风险,入市需谨慎。本文不构成投资建议。
