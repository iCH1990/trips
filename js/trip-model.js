/* 行程数据契约。页面保留各自的内容，颜色和字段在这里统一校验、解析。 */
const TRIP_KINDS = new Set(["stay", "highlight"]);
const TRIP_LEGS = new Set(["flight", "taxi", "metro", "slide"]);
const TRIP_MODES = new Set(["foot", "eurostar"]);

function invalidTrip(message) {
    throw new Error(`行程数据无效：${message}`);
}

function requireText(value, message) {
    if (typeof value !== "string" || !value.trim()) invalidTrip(message);
}

function resolveTripColor(color, label) {
    requireText(color, `${label} 缺少路线色`);
    if (color.startsWith("var(--route-")) return tokenColor(color);
    if (/^#[0-9a-fA-F]{6}$/.test(color)) return color;
    invalidTrip(`${label} 的路线色必须使用 var(--route-1) 到 var(--route-9)`);
}

function prepareStop(stop, label) {
    if (!stop || typeof stop !== "object") invalidTrip(`${label} 无效`);
    requireText(stop.name, `${label} 缺少名称`);
    if (!Number.isFinite(stop.lat) || !Number.isFinite(stop.lng)) invalidTrip(`${label} ${stop.name} 坐标无效`);
    if (stop.kind !== undefined && !TRIP_KINDS.has(stop.kind)) invalidTrip(`${label} ${stop.name} 的标记类型无效`);
    if (stop.leg !== undefined && !TRIP_LEGS.has(stop.leg)) invalidTrip(`${label} ${stop.name} 的交通方式无效`);
    if (stop.optional !== undefined && typeof stop.optional !== "boolean") invalidTrip(`${label} ${stop.name} 的 optional 必须是布尔值`);
    if (!Array.isArray(stop.activities) || !stop.activities.length) invalidTrip(`${label} ${stop.name} 缺少活动`);
    stop.activities.forEach((activity, index) => {
        requireText(activity && activity.time, `${label} ${stop.name} 的第 ${index + 1} 个活动缺少时间`);
        requireText(activity.text, `${label} ${stop.name} 的第 ${index + 1} 个活动缺少内容`);
    });
    return stop;
}

function prepareDays(days) {
    if (!Array.isArray(days) || !days.length) invalidTrip("至少需要一天");
    return days.map((day, index) => {
        const label = `第 ${index + 1} 天`;
        if (!day || typeof day !== "object") invalidTrip(`${label} 无效`);
        requireText(day.date, `${label} 缺少日期`);
        requireText(day.weekday, `${label} 缺少星期`);
        if (day.mode !== undefined && !TRIP_MODES.has(day.mode)) invalidTrip(`${label} 的出行方式无效`);
        if (day.zoom !== undefined && !Number.isFinite(day.zoom)) invalidTrip(`${label} 的缩放无效`);
        if (!Array.isArray(day.stops) || !day.stops.length) invalidTrip(`${label} 缺少停点`);
        return {
            ...day,
            color: resolveTripColor(day.color, label),
            stops: day.stops.map((stop, stopIndex) => prepareStop(stop, `${label} 第 ${stopIndex + 1} 个停点`))
        };
    });
}

function prepareStops(stops) {
    if (!Array.isArray(stops) || !stops.length) invalidTrip("至少需要一个停点");
    return stops.map((stop, index) => prepareStop(stop, `第 ${index + 1} 个停点`));
}

const TripModel = { prepareDays, prepareStops };
globalThis.TripModel = TripModel;
