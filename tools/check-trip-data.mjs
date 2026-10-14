import { existsSync, readFileSync, readdirSync } from "node:fs";
import { Script, createContext } from "node:vm";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const context = createContext({ tokenColor: (value) => value, console });
context.globalThis = context;
new Script(readFileSync(join(root, "js/trip-model.js"), "utf8")).runInContext(context);
new Script(readFileSync(join(root, "js/trip-route.js"), "utf8")).runInContext(context);

function extractArray(source, name) {
    const needle = `TripModel.${name}(`;
    const start = source.indexOf(needle);
    if (start < 0) return null;
    const open = source.indexOf("[", start);
    let depth = 0;
    let quote = false;
    let escaped = false;
    for (let i = open; i < source.length; i += 1) {
        const char = source[i];
        if (quote) {
            if (escaped) escaped = false;
            else if (char === "\\") escaped = true;
            else if (char === "\"") quote = false;
            continue;
        }
        if (char === "\"") quote = true;
        else if (char === "[") depth += 1;
        else if (char === "]") {
            depth -= 1;
            if (depth === 0) return source.slice(open, i + 1);
        }
    }
    throw new Error(`无法解析 ${name}`);
}

const contentRoot = join(root, "trips");
const years = readdirSync(contentRoot).filter((name) => /^\d{4}$/.test(name));
const pages = [];
for (const year of years) {
    for (const file of readdirSync(join(contentRoot, year)).filter((name) => name.endsWith(".html"))) {
        const href = `trips/${year}/${file}`;
        const html = readFileSync(join(root, href), "utf8");
        const days = extractArray(html, "prepareDays");
        const stops = extractArray(html, "prepareStops");
        if (!days && !stops) throw new Error(`${href} 没有接入 TripModel`);
        if (days) new Script(`TripModel.prepareDays(${days})`).runInContext(context);
        if (stops) new Script(`TripModel.prepareStops(${stops})`).runInContext(context);
        const routeId = context.TripRoute.idFromHref(href);
        if (!routeId) throw new Error(`${href} 的文件名不能作为 hash`);
        if (!html.includes('<script src="../../js/trip-route.js"></script>')) {
            throw new Error(`${href} 没有在页头加载 trip-route.js`);
        }
        if (!html.includes('class="back-home" href="../../index.html" target="_top"')) {
            throw new Error(`${href} 的返回主页链接需要 target="_top"`);
        }
        pages.push({ href, routeId, html });
        console.log(`ok #${routeId} ${href}`);
    }
}

const DURATIONS = ["一日游", "两天一晚", "短途", "旅居"];
const TYPES = ["度假", "旅行", "自驾", "露营"];

function parseYYMMDD(value, href) {
    if (!/^\d{6}$/.test(value)) throw new Error(`${href} 的日期 ${value} 无效`);
    const year = 2000 + Number(value.slice(0, 2));
    const month = Number(value.slice(2, 4));
    const day = Number(value.slice(4, 6));
    const utc = Date.UTC(year, month - 1, day);
    const date = new Date(utc);
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
        throw new Error(`${href} 的日期 ${value} 无效`);
    }
    return utc;
}

function durationFromHref(href) {
    const name = href.split("/").pop().replace(/\.html$/, "");
    const matched = name.match(/_(\d{6})(?:_(\d{6}))?$/);
    if (!matched) throw new Error(`${href} 无法从文件名得到行程天数`);
    const start = parseYYMMDD(matched[1], href);
    const end = parseYYMMDD(matched[2] || matched[1], href);
    if (end < start) throw new Error(`${href} 结束日期早于开始日期`);
    const days = Math.round((end - start) / 86400000) + 1;
    if (days <= 1) return "一日游";
    if (days === 2) return "两天一晚";
    if (days <= 14) return "短途";
    return "旅居";
}

const catalog = JSON.parse(readFileSync(join(contentRoot, "data/trips.json"), "utf8"));
const listed = new Set();
const routeIds = new Map();
for (const group of catalog.years) {
    if (!Number.isInteger(group.year)) throw new Error("年份无效");
    for (const trip of group.trips) {
        for (const field of ["href", "flag", "title", "summary"]) {
            if (typeof trip[field] !== "string" || !trip[field].trim()) throw new Error(`${trip.href || group.year} 缺少 ${field}`);
        }
        if ("tags" in trip || "types" in trip) throw new Error(`${trip.href} 还在使用 tags 或 types，请改成单个 type`);
        if (typeof trip.country !== "string" || !trip.country.trim()) throw new Error(`${trip.href} 缺少 country`);
        const duration = durationFromHref(trip.href);
        if (!DURATIONS.includes(duration) || trip.duration !== duration) throw new Error(`${trip.href} 的时长应为 ${duration}`);
        if (!TYPES.includes(trip.type)) throw new Error(`${trip.href} 的类型无效：${trip.type}`);
        if (typeof trip.published !== "boolean") throw new Error(`${trip.href} 缺少 published`);
        if (!existsSync(join(root, trip.href))) throw new Error(`${trip.href} 文件不存在`);
        if (listed.has(trip.href)) throw new Error(`${trip.href} 在清单里重复`);
        const routeId = context.TripRoute.idFromHref(trip.href);
        if (!routeId) throw new Error(`${trip.href} 的文件名不能作为 hash`);
        if (routeIds.has(routeId)) throw new Error(`#${routeId} 同时对应 ${routeIds.get(routeId)} 和 ${trip.href}`);
        listed.add(trip.href);
        routeIds.set(routeId, trip.href);
    }
}
function decodeText(value) {
    return value
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, "\"");
}

function headerTags(html) {
    const block = html.match(/<p class="kicker"[^>]*>([\s\S]*?)<\/p>/);
    if (!block) return null;
    return [...block[1].matchAll(/<span class="([^"]+)">([^<]*)<\/span>/g)].map((match) => ({
        className: match[1],
        text: decodeText(match[2]).trim()
    }));
}

for (const page of pages) {
    const tags = headerTags(page.html);
    const trip = catalog.years.flatMap((group) => group.trips).find((item) => item.href === page.href);
    const year = page.href.split("/")[1];
    if (!tags) throw new Error(`${page.href} 的页头缺少眉题`);
    if (/<p class="trip-tags"/.test(page.html)) throw new Error(`${page.href} 的分类标签应写在眉题里`);
    const [flag, label, duration, type] = tags;
    const sameTags = tags.length === 4
        && flag.className === "trip-tag trip-tag--flag" && flag.text === trip.flag
        && label.className === "kicker-label" && label.text === `${year} · ${trip.country}`
        && duration.className === "trip-tag" && duration.text === trip.duration
        && type.className === "trip-tag" && type.text === trip.type;
    if (!sameTags) throw new Error(`${page.href} 的眉题应为国旗、${year} · ${trip.country}、${trip.duration}、${trip.type}`);
    const docTitle = decodeText((page.html.match(/<title>([^<]*)<\/title>/) || ["", ""])[1]).trim();
    const heading = decodeText((page.html.match(/<h1>([^<]*)<\/h1>/) || ["", ""])[1]).trim();
    if (docTitle !== trip.title || heading !== trip.title) throw new Error(`${page.href} 的标题、h1 和清单 title 要一致`);
    if (trip.title.startsWith(trip.country)) throw new Error(`${page.href} 的行程名称不要重复国家`);
    const line = page.html.match(/<div class="trip-line">([\s\S]*?)<\/div>/);
    if (!line || !/<h1>[^<]*<\/h1>\s*<p class="kicker">/.test(line[1])) throw new Error(`${page.href} 的标题要和眉题在同一行，标题在前`);
    if (!page.html.includes('class="stat-scroller"')) throw new Error(`${page.href} 的特色标签要放进可滚动的一行`);
    if (!page.html.includes('class="stat-arrow" data-dir="-1"') || !page.html.includes('class="stat-arrow" data-dir="1"')) {
        throw new Error(`${page.href} 的特色标签需要左右滑动按钮`);
    }
    if (!page.html.includes('href="../../css/tags.css"')) throw new Error(`${page.href} 的分类标签要复用 css/tags.css`);
    const stats = [...page.html.matchAll(/<span class="stat">([^<]*)<\/span>/g)].map((match) => decodeText(match[1]).trim());
    if (!stats.length || stats.length > 8) throw new Error(`${page.href} 的特色标签需要 1 到 8 个`);
    if (stats.some((stat) => !stat)) throw new Error(`${page.href} 有空的特色标签`);
    if (new Set(stats).size !== stats.length) throw new Error(`${page.href} 的特色标签重复`);
}

const home = readFileSync(join(root, "index.html"), "utf8");
if (!existsSync(join(root, "favicon.png"))) throw new Error("缺少 favicon.png");
if (!home.includes('<link rel="icon" href="favicon.png" type="image/png">')) {
    throw new Error("首页要使用 favicon.png 作为网站图标");
}

const missing = pages.filter((page) => !listed.has(page.href));
if (missing.length) throw new Error(`这些页面还没写进 trips/data/trips.json：${missing.map((page) => page.href).join(", ")}`);
console.log(`checked ${pages.length}`);
