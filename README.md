# Jason's Trip

个人行程公开页。首页看足迹和年份列表，点进去是带地图的逐日安排。

[打开站点](https://ich1990.github.io/trips/) · [浏览仓库](https://github.com/iCH1990/trips)

---

## 站点里有什么

| 页面 | 内容 |
| --- | --- |
| **首页** | 世界足迹图、到访次数，以及按年份切换的行程卡片 |
| **行程页** | Leaflet 地图 + 当日路线，点日期看停点和时间线 |
| **返回** | 每个行程页顶部都有「返回主页」 |

行程覆盖自驾、飞机 + 自驾、海岛和城市步行，年份从 2016 到 2026。

---

## 目录

```text
trips/
├── index.html                 首页
├── css/
│   ├── tokens.css             全站颜色
│   ├── home.css               首页
│   ├── home-noscript.css      首页无脚本时的年份标题
│   └── trip.css               行程页
├── js/color.js                把颜色变量解析成地图能用的色值
├── js/trip-model.js           行程数据校验和路线色解析
├── js/trip-render.js          行程页的地图、停点标记和时间线
├── js/trip-routing.js         自驾、步行、航班和双程路线策略
├── js/trip-chrome.js          行程页的日期切换、键盘操作和展开收起
├── tools/check-trip-data.mjs  校验全部行程数据
├── trips/
│   ├── data/countries.geo.json    足迹图国界（Natural Earth，公有领域）
│   ├── data/trip.schema.json      行程数据契约
│   ├── data/trips.json            首页行程清单、年份和发布状态
│   └── 2016/  2018/  2019/  2023/  2024/  2025/  2026/
│       └── {地点}_{YYMMDD}_{YYMMDD}.html
├── SPEC.md                    开发规范。架构调整时同步更新
└── README.md
```

一天的行程只写一个日期：`{地点}_{YYMMDD}.html`。  
跨天的写起止：`adelaide_261001_261007.html`。

地点用小写英文和下划线，日期是行程真实起止，不再加 `_trip_`。

| 文件 | 行程 |
| --- | --- |
| `trips/2026/adelaide_261001_261007.html` | Adelaide / Kangaroo Island / Mungo |
| `trips/2026/southern_highlands_260906.html` | Southern Highlands 一日 |
| `trips/2026/los_angeles_las_vegas_260207_260208.html` | Los Angeles → Las Vegas |
| `trips/2024/los_angeles_240127_240128.html` | Los Angeles |
| `trips/2023/changsha_231005_231008.html` | 上海 → 长沙 |
| `trips/2016/hong_kong_161119.html` | 深圳 → 香港铜锣湾 |

---

## 本地预览

```bash
python3 -m http.server 8765
```

打开 [http://127.0.0.1:8765/](http://127.0.0.1:8765/)。行程页相对首页的链接是 `../../index.html`，需要用本地服务器打开，不要直接双击 HTML。

首页地图用 ECharts；行程页路线用 Leaflet，驾驶时间按 OSRM 估算。

---

## 新增一页

完整约定在 [SPEC.md](SPEC.md)。下面是最短步骤。

1. 在对应年份目录里按上面的规则起名。
2. 在 `trips/data/trips.json` 对应年份里加一条记录，`href` 从站点根目录写起，例如 `trips/2026/example_260101.html`。还没公开的行程把 `published` 设为 `false`，段数会按已公开的记录自动计算。
3. 页头放返回主页：`<a class="back-home" href="../../index.html">← 返回主页</a>`。
4. 样式用 `../../css/tokens.css` 和 `../../css/trip.css`。数据交给 `../../js/trip-model.js`，地图和停点用 `../../js/trip-render.js`，路线用 `../../js/trip-routing.js`，日期切换和展开收起用 `../../js/trip-chrome.js`，不要再在页面里各写一份。
5. 多日行程写成 `const days = TripModel.prepareDays([...])`。当天路线色按顺序写 `"var(--route-1)"` 起。重点用 `kind: "highlight"`，住宿用 `kind: "stay"`，不要把路线色设成暖橙或紫色。
6. 改完后运行 `node tools/check-trip-data.mjs`。它会检查行程数据，也会确认每个页面都在 `trips/data/trips.json` 里。
