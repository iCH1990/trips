import { existsSync, readFileSync, readdirSync } from "node:fs";
import { Script, createContext } from "node:vm";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const context = createContext({ tokenColor: (value) => value, console });
context.globalThis = context;
new Script(readFileSync(join(root, "js/trip-model.js"), "utf8")).runInContext(context);

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
        pages.push(href);
        console.log(`ok ${href}`);
    }
}

const catalog = JSON.parse(readFileSync(join(contentRoot, "data/trips.json"), "utf8"));
const listed = new Set();
for (const group of catalog.years) {
    if (!Number.isInteger(group.year)) throw new Error("年份无效");
    for (const trip of group.trips) {
        for (const field of ["href", "flag", "title", "summary"]) {
            if (typeof trip[field] !== "string" || !trip[field].trim()) throw new Error(`${trip.href || group.year} 缺少 ${field}`);
        }
        if (!Array.isArray(trip.tags) || trip.tags.some((tag) => typeof tag !== "string")) throw new Error(`${trip.href} 的 tags 无效`);
        if (typeof trip.published !== "boolean") throw new Error(`${trip.href} 缺少 published`);
        if (!existsSync(join(root, trip.href))) throw new Error(`${trip.href} 文件不存在`);
        if (listed.has(trip.href)) throw new Error(`${trip.href} 在清单里重复`);
        listed.add(trip.href);
    }
}
const missing = pages.filter((href) => !listed.has(href));
if (missing.length) throw new Error(`这些页面还没写进 trips/data/trips.json：${missing.join(", ")}`);
console.log(`checked ${pages.length}`);
