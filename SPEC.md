# 行程站点开发规范

本文件是这个仓库的开发规范。新增行程、改交互、做架构调整，都按这里做。

架构变了，就在同一次改动里更新本文件。包括共享脚本的职责、数据字段、颜色令牌、路线策略、首页清单、页面接入方式和校验器。规范和代码不一致时，两边一起改，不要只改一边。

`README.md` 只保留站点简介和新增一页的最短步骤。字段、策略和接入方式以本文件为准。

## 站点约束

站点部署在 GitHub Pages，是纯静态页面。不引入框架，不加构建或打包。

共享脚本用普通 `<script>`，不用 `type="module"`。`TripModel`、`TripRender`、`TripRouting` 挂在 `globalThis` 上，页面里的后续脚本可以直接调用。

行程页放在 `trips/{年份}/`，样式和脚本都用 `../../`。用本地静态服务器打开，不要直接双击 HTML。已有服务占着 `8765` 时，继续用那个地址，不要再起一份。

Leaflet 和 ECharts 不能直接使用 CSS 变量。数据里的路线色写 `var(--route-N)`，交给 `TripModel` 或 `tokenColor` 解析成色值后再传给地图。

## 文件职责

| 路径 | 职责 |
| --- | --- |
| `css/tokens.css` | 全站颜色。页面不另写一套色值 |
| `css/home.css`、`css/trip.css` | 首页和行程页的布局 |
| `css/home-noscript.css` | 只在没有 JavaScript 时加载 |
| `js/color.js` | `tokenColor`，把 `var(--token)` 解析成色值 |
| `js/trip-model.js` | 校验天数、停点和路线色 |
| `js/trip-render.js` | 地图、日期标签、停点标记、总览列表和时间线 |
| `js/trip-routing.js` | 路线策略。页面只选择策略，不自己请求 OSRM |
| `js/trip-chrome.js` | 日期条滚动、方向键、展开和收起 |
| `trips/data/trip.schema.json` | 天和停点的字段契约，与 `trip-model.js` 保持一致 |
| `trips/data/trips.json` | 首页年份、卡片和发布状态 |
| `trips/{年份}/` | 各年的行程页 |
| `tools/check-trip-data.mjs` | 校验全部行程页和首页清单 |
| `index.html` | 足迹图和首页结构。行程卡片不写死在这里 |

足迹图的国家列表仍写在 `index.html` 的 `places` 数组里。那不是行程卡片，不要放进 `trips/data/trips.json`。

## 视觉

颜色只加在 `css/tokens.css`。

- `--warm` 是重点，`--stay` 是住宿。
- `--route-1` 到 `--route-9` 只给当天路线和普通停靠点，按当天顺序使用。
- 路线色不用暖橙，也不用紫色。重点和住宿用 `kind`，不用路线色表达。

首页年份标签用 `repeat(auto-fit, minmax(96px, 1fr))`。窄屏保持 3 列。新增一年时不要为了列数去改 CSS。

## 行程页

### 文件名

放在 `trips/` 下的对应年份目录。地点用小写英文和下划线，日期是行程真实起止，格式 `YYMMDD`。

- 一天：`{地点}_{YYMMDD}.html`
- 跨天：`{地点}_{YYMMDD}_{YYMMDD}.html`

页面标题、`h1` 和首页卡片的 `title` 使用同一个行程名称。

### 页面结构

多日页保留这些节点，脚本和 `trip-chrome.js` 按 id 查找：

- `#map`
- `#dayTabs`，左右箭头使用 `.day-arrow`，`data-dir` 为 `-1` 和 `1`
- `#daySummary`、`#glance`、`#routeStat`
- `#detailTitle`、`#detailNote`、`#itinerary`
- `#detailExpand`，按钮文案初始为「展开」

没有日期切换的一日页可以不放 `#dayTabs`。`trip-chrome.js` 仍放在 `body` 末尾，展开和收起继续生效。

页头必须有 `<a class="back-home" href="../../index.html">← 返回主页</a>`。

`<head>` 里的脚本顺序固定：

1. Leaflet
2. `../../js/color.js`
3. `../../js/trip-model.js`
4. `../../js/trip-render.js`
5. `../../js/trip-routing.js`

`../../js/trip-chrome.js` 放在 `body` 末尾。样式使用 `../../css/tokens.css` 和 `../../css/trip.css`。

### 页面脚本做什么

页面脚本只保留这份行程自己的内容：

- 用 `TripModel.prepareDays([...])` 或 `TripModel.prepareStops([...])` 准备数据。
- 用 `TripRender.createMap` 设置该页的地图中心和初始缩放。
- 用 `TripRender.createDayTabs`、`selectDayTab`、`renderStops` 画当天内容。
- 点选停点时调用 `TripRender.focusStop`。缩放优先用当天的 `day.zoom`；这页本来就写死缩放的，保持原值。
- 选择一个 `TripRouting` 策略绘制路线。

不要在页面里再写一份地图初始化、停点 HTML、路线请求、日期键盘或展开收起。已有页面的地图中心和缩放是内容的一部分，抽共用逻辑时不要改掉它们。

### 数据

多日行程使用 `prepareDays`。没有日期条、只有一组停点的行程使用 `prepareStops`。字段同时受 `js/trip-model.js` 和 `trips/data/trip.schema.json` 的 `$defs` 约束，两边要一致。

每一天必须有 `date`、`weekday`、`color`、`stops`。`color` 写成 `"var(--route-1)"` 这种形式，按当天顺序递增。可选字段：

| 字段 | 取值 |
| --- | --- |
| `title`、`meta` | 当天标题和补充说明 |
| `zoom` | 点选停点时的地图缩放 |
| `mode` | `foot` 或 `eurostar` |
| `flightStat` | 航班段显示的文字，例如航班号和起降地 |

每个停点必须有 `name`、`lat`、`lng`，以及至少一条 `activities`。每条活动必须有 `time` 和 `text`。可选字段：

| 字段 | 取值 |
| --- | --- |
| `time` | 停点在总览里的时间 |
| `drive` | 从上一个停点过来的说明，显示在时间线上方 |
| `kind` | `highlight` 显示「重点」，`stay` 显示「住宿」 |
| `leg` | `flight`、`taxi`、`metro`、`slide`。不写则按所选策略的默认走法 |
| `optional` | `true` 时显示「可选」 |
| `note` | 地址或其他补充，显示为备注 |

新增字段时，同时改 `js/trip-model.js`、`trips/data/trip.schema.json` 和本文件。校验器靠执行 `prepareDays` / `prepareStops` 检查这些字段。

### 路线策略

页面按行程的走法选择一个策略。新的走法加到 `js/trip-routing.js`，不要把请求逻辑复制进页面。

| 策略 | 适用 | 现在的页面 |
| --- | --- | --- |
| `road` | 自驾，或 `mode: "foot"` 的步行。`leg: "flight"` 画虚线，其余向 OSRM 请求 | 京都、普吉、黄金海岸、洛杉矶、迈阿密、蓝山、Orange、珀斯、南高地与堪培拉、阿德莱德、海曼岛、洛杉矶至拉斯维加斯、墨尔本、云南 |
| `drive` | 一整天一条驾驶线，不按航班拆段 | Dubbo、Lake St Clair、Hunter Valley |
| `city` | 步行。地铁、打车、航班、滑道画虚线 | 长沙 |
| `walk` | 步行。地铁、打车画虚线 | 东京、香港 |
| `visit` | `mode: "eurostar"` 时直接显示固定文字；步行距离用公里和分钟，分钟不换算成小时 | 巴黎 |
| `drivingLine` | 没有日期条的去程和返程，各一条驾驶线 | 2026 年 Southern Highlands |

调用 `road`、`city`、`walk`、`drive`、`visit` 时传入 `isCurrent: () => activeDay === dayIndex`。过期的请求返回后必须停住，不能画到已经切换走的那一天。

先放一条虚线作为退路，请求成功后再换成实际路线。`visit` 的 Eurostar 文案现在是 `Eurostar · 约 2 小时 15 分（示意线）`。要改这句话时改策略，并同步本文件。

`drivingLine` 由页面传入 `label`，两条线各自写入自己的统计节点。

### 交互

`trip-chrome.js` 负责：

- 日期条溢出时显示左右箭头。
- 日期标签是横向 tab。方向键切换，Home 到第一天，End 到最后一天。
- 「展开」给 `html` 加上 `is-page-scroll`，按钮改为「收起」。收起时回到页顶。

首页年份标签的方向键和 `#年份` 地址写在 `index.html`，不要搬进行程页的 chrome。

## 首页清单

`trips/data/trips.json` 的形状：

```json
{
  "years": [
    {
      "year": 2026,
      "trips": [
        {
          "href": "trips/2026/example_260101.html",
          "flag": "🇦🇺",
          "tags": ["一天", "自驾"],
          "title": "行程名称",
          "summary": "一段摘要",
          "published": true
        }
      ]
    }
  ]
}
```

`index.html` 读取这份清单后生成 `#yearTabs` 和 `#yearPanels`。

- `published: false` 的行程不显示。年份上的「N 段行程」只数已公开的记录。
- 卡片文字用 `textContent` 写入，不用 `innerHTML`。
- 年份顺序跟清单里的 `years` 顺序一致。
- 点击年份会更新地址为 `#2026` 这种形式。左右方向键切换年份。
- 没有 JavaScript 时，显示「开启 JavaScript 后可以按年份查看行程。」

每个年份目录里的 HTML 都必须在清单里有且只有一条记录。未公开的页面也要登记，并把 `published` 设为 `false`。

## 留在页面里的差异

这些内容各页可以不同，不要为了整齐而收进共享脚本：

- 页头统计、当天说明和底部提示。
- 地图中心、初始缩放，以及点选停点时的缩放。
- `flightStat`、`leg`、`optional` 和停点备注。
- 只在一页出现的标记。2026 年 Southern Highlands 的 Sea Cliff Bridge 标记就留在该页，文字用 `TripRender.escapeHtml`。

同一段逻辑在多个页面里重复出现时，再收进对应的共享脚本，并更新本文件。

## 改完怎么确认

运行：

```bash
node tools/check-trip-data.mjs
```

校验器会执行每页的 `prepareDays` 或 `prepareStops`，并确认清单里的链接存在、字段完整、没有重复，而且每个行程页都已登记。

改了页面、首页、样式或交互后，在本地站点里按真实用法点一遍：切换日期或年份、点停点、展开详情。改了某条路线策略，就打开使用该策略的一页，确认统计文字和线还在。改了清单，就看首页对应年份的段数和卡片。
