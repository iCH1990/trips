# 行程站点开发规范

本文件是这个仓库的开发规范。新增行程、改交互、做架构调整，都按这里做。

架构变了，就在同一次改动里更新本文件。包括共享脚本的职责、数据字段、颜色令牌、路线策略、首页清单、页面接入方式和校验器。规范和代码不一致时，两边一起改，不要只改一边。

`README.md` 只保留站点简介和新增一页的最短步骤。字段、策略和接入方式以本文件为准。

## 站点约束

站点部署在 GitHub Pages，是纯静态页面。不引入框架，不加构建或打包。

公开地址用 hash，这样刷新和直接打开都不依赖服务端重写：

- 首页年份是 `#2026` 这种四位年份。
- 行程 hash 就是文件名去掉 `.html`。一天的 Miami 是 `#miami_240203`。跨天的 Tokyo 是 `#tokyo_260808_260809`，Los Angeles 到 Las Vegas 是 `#los_angeles_las_vegas_260207_260208`。地点可以有下划线。

共享脚本用普通 `<script>`，不用 `type="module"`。`TripModel`、`TripRender`、`TripRouting`、`TripRoute` 挂在 `globalThis` 上，页面里的后续脚本可以直接调用。

行程页放在 `trips/{年份}/`，样式和脚本都用 `../../`。用本地静态服务器打开，不要直接双击 HTML。已有服务占着 `8765` 时，继续用那个地址，不要再起一份。

Leaflet 和 ECharts 不能直接使用 CSS 变量。数据里的路线色写 `var(--route-N)`，交给 `TripModel` 或 `tokenColor` 解析成色值后再传给地图。

## 文件职责

| 路径 | 职责 |
| --- | --- |
| `css/tokens.css` | 全站颜色。页面不另写一套色值 |
| `css/tags.css` | 首页卡片和行程页页头共用的分类标签 |
| `css/home.css`、`css/trip.css` | 首页和行程页的布局 |
| `css/home-noscript.css` | 只在没有 JavaScript 时加载 |
| `js/color.js` | `tokenColor`，把 `var(--token)` 解析成色值 |
| `js/trip-model.js` | 校验天数、停点和路线色 |
| `js/trip-render.js` | 地图、日期标签、停点标记、总览列表和时间线 |
| `js/trip-routing.js` | 路线策略。页面只选择策略，不自己请求 OSRM |
| `js/trip-route.js` | 用文件名（去掉 `.html`）作为 hash。直接打开行程文件时换到这个 hash；首页据此识别地址 |
| `js/trip-chrome.js` | 日期条和特色标签的滚动、方向键、展开和收起 |
| `trips/data/trip.schema.json` | 天和停点的字段契约，与 `trip-model.js` 保持一致 |
| `trips/data/trips.json` | 首页行程的国家、时长、类型和发布状态 |
| `trips/{年份}/` | 各年的行程页 |
| `tools/check-trip-data.mjs` | 校验全部行程页和首页清单 |
| `favicon.png` | 网站图标。首页用 `<link rel="icon" href="favicon.png" type="image/png">` |
| `index.html` | 足迹图和首页结构。行程卡片不写死在这里 |

足迹图的国家列表仍写在 `index.html` 的 `places` 数组里。那不是行程卡片，不要放进 `trips/data/trips.json`。

## 视觉

颜色只加在 `css/tokens.css`。

- `--warm` 是重点，`--stay` 是住宿。
- `--route-1` 到 `--route-9` 只给当天路线和普通停靠点，按当天顺序使用。
- 路线色不用暖橙，也不用紫色。重点和住宿用 `kind`，不用路线色表达。

首页筛选条是四列：时长、类型、年份、国家。窄屏改成两列。新增一年或一个国家时不要为了列数去改 CSS。

## 行程页

### 文件名

放在 `trips/` 下的对应年份目录。地点用小写英文和下划线，日期是行程真实起止，格式 `YYMMDD`。

- 一天：`{地点}_{YYMMDD}.html`
- 跨天：`{地点}_{YYMMDD}_{YYMMDD}.html`

页面标题、`h1` 和首页卡片的 `title` 使用同一个行程名称。名称写地点和日期，不重复国家。国家已经在眉题和首页卡片标签里。

每张行程页的页头只有两行。第一行是标题，后面紧跟眉题，放在 `trip-line` 里。眉题复用 `css/tags.css`，不另写一套。顺序是国旗、年份、国家、时长、类型，与首页卡片一致。国旗、国家、时长、类型与 `trips.json` 里同一条记录一致：

- 国旗，使用 `trip-tag trip-tag--flag`，和年份、中文国家名包在 `kicker-place` 里
- 年份和中文国家名，写在 `kicker-label` 里，中间用 ` · `，例如 `2026 · 澳大利亚`。国家用 `country`，年份与目录一致
- 时长，使用 `trip-tag`
- 类型，使用 `trip-tag`

第二行是特色标签，`.stat` 样式不变。每页 1 到 8 个，手动挑选，不重复，大致按行程顺序排。标签放在 `.stats` 里，外包 `.stat-scroller`。放不下一行时出现左右箭头，和日期条一样滚动；放得下就隐藏。箭头使用 `.stat-arrow`，`data-dir` 为 `-1` 和 `1`。

- 写这段旅行最有代表性的地方或体验，可以是景点、区域、活动，例如「Great Ocean Road」「沙漠观星」「奈良喂鹿」「四城旅居」。
- 不必等于停点名，也不从 `kind: "highlight"` 或 `kind: "stay"` 自动生成。停点上的重点和住宿标签只管时间线。
- 住宿只有本身就是特色时才写，例如海岛度假酒店或动物园里的 lodge。
- 不写天数、里程、出发地、普通吃饭、咖啡、交通和航班号。
- 文字要短，尽量用常见叫法。

### 页面结构

多日页保留这些节点，脚本和 `trip-chrome.js` 按 id 查找：

- `#map`
- `#dayTabs`，左右箭头使用 `.day-arrow`，`data-dir` 为 `-1` 和 `1`
- `#daySummary`、`#glance`、`#routeStat`
- `#detailTitle`、`#detailNote`、`#itinerary`
- `#detailExpand`，按钮文案初始为「展开」

没有日期切换的一日页可以不放 `#dayTabs`。`trip-chrome.js` 仍放在 `body` 末尾，展开和收起继续生效。

页头左侧是返回按钮，高度和这两行一致，保持方形，不单独占一行。按钮里面是房子图标，表示回到首页。文字「返回主页」留给读屏。链接是 `<a class="back-home" href="../../index.html" target="_top">`。`target="_top"` 让首页 iframe 里的这枚链接回到主页，而不是在 iframe 里面再打开一层首页。

`<head>` 里，`../../js/trip-route.js` 紧跟在 charset 后面。直接打开行程文件时，它会在画出页面前换到同名 hash。在首页 iframe 里打开时不换地址。

其余脚本顺序固定：

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
| `kind` | `highlight` 或 `stay`，见下面的停点标签 |
| `leg` | `flight`、`taxi`、`metro`、`slide`。不写则按所选策略的默认走法 |
| `optional` | `true` 时显示「可选」，见下面的停点标签 |
| `note` | 地址或其他补充，显示为备注 |

每个停点最多一个标签。不写 `kind`，也不写 `optional`，就是普通停靠，编号用当天的路线色。

| 标签 | 写法 | 什么时候用 |
| --- | --- | --- |
| 重点 | `kind: "highlight"` | 这一站是特意要去的景点。吃饭、喝咖啡、休息、出发和到家不标重点，除非这个地方本身就是这一站的目的 |
| 住宿 | `kind: "stay"` | 当晚过夜的地方。当天出门再回到同一家酒店，酒店仍是住宿。早上出发、晚上回到的家不是住宿 |
| 可选 | `optional: true` | 可能不去的一站。不要同时写 `kind` |

重点用 `--warm`，住宿用 `--stay`。可选是暖色虚线框、白底。这三种都不使用路线色。`optional` 为真时，编号按可选画，不再套重点或住宿的颜色。

新增字段时，同时改 `js/trip-model.js`、`trips/data/trip.schema.json` 和本文件。校验器靠执行 `prepareDays` / `prepareStops` 检查这些字段。

### 路线策略

页面按行程的走法选择一个策略。新的走法加到 `js/trip-routing.js`，不要把请求逻辑复制进页面。

| 策略 | 适用 | 现在的页面 |
| --- | --- | --- |
| `road` | 自驾，或 `mode: "foot"` 的步行。`leg: "flight"` 画虚线，其余向 OSRM 请求 | 京都、普吉、黄金海岸、洛杉矶、迈阿密、蓝山、Orange、珀斯、南高地与堪培拉、阿德莱德、海曼岛、洛杉矶至拉斯维加斯、墨尔本、云南、Wollongong 与 Kiama、三亚 |
| `drive` | 一整天一条驾驶线，不按航班拆段 | Dubbo、Lake St Clair、Hunter Valley |
| `city` | 步行。地铁、打车、航班、滑道画虚线 | 长沙、曼谷 |
| `walk` | 步行。地铁、打车画虚线 | 东京、香港 |
| `visit` | `mode: "eurostar"` 时直接显示固定文字；步行距离用公里和分钟，分钟不换算成小时 | 巴黎 |
| `drivingLine` | 没有日期条的去程和返程，各一条驾驶线 | 2026 年 Southern Highlands |

调用 `road`、`city`、`walk`、`drive`、`visit` 时传入 `isCurrent: () => activeDay === dayIndex`。过期的请求返回后必须停住，不能画到已经切换走的那一天。

先放一条虚线作为退路，请求成功后再换成实际路线。`visit` 的 Eurostar 文案现在是 `Eurostar · 约 2 小时 15 分（示意线）`。要改这句话时改策略，并同步本文件。

`drivingLine` 由页面传入 `label`，两条线各自写入自己的统计节点。

### 交互

`trip-chrome.js` 负责：

- 日期条溢出时显示左右箭头。特色标签溢出时同样显示左右箭头。
- 日期标签是横向 tab。方向键切换，Home 到第一天，End 到最后一天。
- 「展开」给 `html` 加上 `is-page-scroll`，按钮改为「收起」。收起时回到页顶。

首页筛选和 `#年份` 地址写在 `index.html`，不要搬进行程页的 chrome。

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
          "country": "澳大利亚",
          "duration": "一日游",
          "type": "自驾",
          "title": "行程名称",
          "summary": "一段摘要",
          "published": true
        }
      ]
    }
  ]
}
```

时长按文件名里的起止日计算，含首尾。超过两周是旅居，两周以内、多于两天的是短途。

| 时长 | 天数 |
| --- | --- |
| 一日游 | 1 天 |
| 两天一晚 | 2 天 |
| 短途 | 3 到 14 天 |
| 旅居 | 超过 14 天 |

类型只写一个：度假、旅行、自驾、露营。露营不再同时写自驾。城市步行记成旅行，野餐记成露营。`country` 用足迹图里的中文名，例如澳大利亚、中国香港。年份用分组上的 `year`。

`index.html` 读取这份清单后生成筛选条和 `#tripList`。

- `published: false` 的行程不显示，也不进入年份和国家选项。知道 hash 时仍然可以打开。
- 卡片文字用 `textContent` 写入，不用 `innerHTML`。卡片上的标签依次是国旗、年份、国家、时长、类型，与行程页眉题的顺序一致。卡片链接是文件名去掉 `.html` 的 hash。年份目录仍写在 `href` 里，首页用这个 hash 找到对应文件。
- 筛选项是时长、类型、年份、国家，默认都是「所有」。选中一项后，另外三项只保留当前结果里还存在的选项；刚选中的那一项仍列出其他条件允许的全部选项。已经选中、但和新选择对不上的项回到「所有」。时长顺序是一日游、两天一晚、短途、旅居，类型顺序是度假、旅行、自驾、露营，年份和国家按清单顺序。
- 清单顺序不变：先按 `years` 的顺序，再按该年里面的顺序。筛选后仍按这个顺序。
- 默认先画 5 张卡片。继续下滑到「加载更多」，或点这个按钮，再画 5 张。
- 选择年份会把地址更新为 `#2026`。选回「所有」时去掉这个 hash。打开 `#2026` 时，年份筛选项选中这一年。时长、类型和国家不写进地址。
- 打开行程 hash 时，首页藏起清单，用 iframe 载入 `href` 指向的行程文件。地址留在首页的 hash 上，刷新不会 404。
- 对不上任何行程或年份的 hash，显示「没有找到这段行程。」
- 没有 JavaScript 时，显示「开启 JavaScript 后可以筛选并查看行程。」

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

校验器会执行每页的 `prepareDays` 或 `prepareStops`，并确认清单里的链接存在、字段完整、没有重复，每个行程页都已登记，而且文件名 hash 不会撞车。首页要链到根目录的 `favicon.png`。行程页还要带上 `trip-route.js` 和带 `target="_top"` 的返回链接。每张行程页的页头都会核对国旗、时长、类型，标题与清单一致且不重复国家，以及 1 到 8 个不重复的特色标签。特色标签的内容由人挑选，校验器不判断写得好不好。

改了页面、首页、样式或交互后，在本地站点里按真实用法点一遍：切换日期或筛选、点停点、展开详情。从首页卡片进入行程，地址应是文件名去掉 `.html`；再直接打开行程文件，确认也会落到同一个 hash。改了某条路线策略，就打开使用该策略的一页，确认统计文字和线还在。改了清单，就看首页筛选后的段数和卡片。
