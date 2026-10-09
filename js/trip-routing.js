/* 行程页共用路线策略。页面只声明使用哪一种，具体请求和失败降级集中在这里。 */
function tripMinutes(total) {
    const minutes = Math.round(total);
    return minutes >= 60
        ? `${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分`
        : `${minutes} 分`;
}

function splitLegs(stops, coords, initialType, classify) {
    const groups = [];
    let current = { type: initialType, points: [coords[0]] };
    for (let index = 1; index < stops.length; index += 1) {
        const type = classify(stops[index]);
        if (type === current.type) current.points.push(coords[index]);
        else {
            groups.push(current);
            current = { type, points: [coords[index - 1], coords[index]] };
        }
    }
    groups.push(current);
    return groups.filter((group) => group.points.length > 1);
}

async function fetchOsrm(profile, points) {
    const path = points.map(([lat, lng]) => `${lng},${lat}`).join(";");
    const response = await fetch(`https://router.project-osrm.org/route/v1/${profile}/${path}?overview=full&geometries=geojson`);
    if (!response.ok) throw new Error("route request failed");
    const data = await response.json();
    const route = data.routes && data.routes[0];
    if (!route) throw new Error("no route returned");
    return route;
}

function routeLatLngs(route) {
    return route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
}

function dropLine(lines, line) {
    if (!line) return;
    line.remove();
    const index = lines.indexOf(line);
    if (index >= 0) lines.splice(index, 1);
}

function fitLines(map, lines) {
    const bounds = lines.reduce((acc, line) => acc.extend(line.getBounds()), lines[0].getBounds());
    map.fitBounds(bounds.pad(0.15));
}

async function road({ map, day, coords, lines, fallback, isCurrent, statEl }) {
    const groups = splitLegs(day.stops, coords, "drive", (stop) => stop.leg === "flight" ? "flight" : "drive");
    const profile = day.mode === "foot" ? "foot" : "driving";
    statEl.textContent = day.mode === "foot" ? "正在规划步行路线…" : "正在规划当日路线…";
    let distance = 0;
    let duration = 0;
    let hasFlight = false;
    let routed = false;

    for (const group of groups) {
        if (group.type === "flight") {
            hasFlight = true;
            lines.push(L.polyline(group.points, {
                color: day.color,
                weight: 3,
                opacity: 0.75,
                dashArray: "8, 8"
            }).addTo(map));
            continue;
        }
        try {
            const route = await fetchOsrm(profile, group.points);
            if (!isCurrent()) return;
            lines.push(L.polyline(routeLatLngs(route), {
                color: day.color,
                weight: 4,
                opacity: 0.85
            }).addTo(map));
            distance += route.distance / 1000;
            duration += route.duration / 60;
            routed = true;
        } catch (error) {
            lines.push(L.polyline(group.points, {
                color: day.color,
                weight: 4,
                opacity: 0.82,
                dashArray: "8, 8"
            }).addTo(map));
        }
    }

    if (!isCurrent()) return;
    dropLine(lines, fallback);
    const parts = [];
    if (hasFlight) parts.push(day.flightStat || "航班示意线");
    if (routed) {
        const km = profile === "foot" ? distance.toFixed(1) : Math.round(distance);
        const label = profile === "foot" ? "步行" : "自驾";
        parts.push(`${label}约 ${km} km · ${tripMinutes(duration)}`);
    } else if (!hasFlight) {
        parts.push(profile === "foot" ? "步行路线暂不可用，显示直线示意" : "路线暂不可用，显示直线示意");
    }
    statEl.textContent = parts.join(" · ");
    fitLines(map, lines);
}

async function footSegments({ map, day, coords, lines, fallback, isCurrent, statEl, directTypes, summarize }) {
    statEl.textContent = "正在规划当日路线…";
    const groups = splitLegs(day.stops, coords, "walk", (stop) => stop.leg || "walk");
    const seen = new Set();
    let distance = 0;
    let duration = 0;
    let walked = false;

    for (const group of groups) {
        if (directTypes.has(group.type)) {
            seen.add(group.type);
            lines.push(L.polyline(group.points, {
                color: day.color,
                weight: 3,
                opacity: 0.75,
                dashArray: "8, 8"
            }).addTo(map));
            continue;
        }
        try {
            const route = await fetchOsrm("foot", group.points);
            if (!isCurrent()) return;
            lines.push(L.polyline(routeLatLngs(route), {
                color: day.color,
                weight: 4,
                opacity: 0.85
            }).addTo(map));
            distance += route.distance / 1000;
            duration += route.duration / 60;
            walked = true;
        } catch (error) {
            lines.push(L.polyline(group.points, {
                color: day.color,
                weight: 4,
                opacity: 0.82,
                dashArray: "8, 8"
            }).addTo(map));
        }
    }

    if (!isCurrent()) return;
    dropLine(lines, fallback);
    statEl.textContent = summarize({ day, seen, walked, distance, duration });
    fitLines(map, lines);
}

function city(context) {
    return footSegments({
        ...context,
        directTypes: new Set(["metro", "taxi", "flight", "slide"]),
        summarize({ day, seen, walked, distance, duration }) {
            const parts = [];
            if (walked) parts.push(`步行约 ${distance.toFixed(1)} km · ${tripMinutes(duration)}`);
            if (seen.has("flight")) parts.push(day.flightStat || "航班示意线");
            if (seen.has("slide")) parts.push("滑道为示意线");
            if (seen.has("metro") || seen.has("taxi")) parts.push("打车为示意线");
            if (!parts.length) parts.push("路线暂不可用，显示直线示意");
            return parts.join(" · ");
        }
    });
}

function walk(context) {
    return footSegments({
        ...context,
        directTypes: new Set(["metro", "taxi"]),
        summarize({ walked, distance, duration, seen }) {
            const parts = [];
            if (walked) parts.push(`步行约 ${distance.toFixed(1)} km · ${tripMinutes(duration)}`);
            if (seen.has("metro") || seen.has("taxi")) parts.push("地铁 / 打车为示意线");
            if (!parts.length) parts.push("路线暂不可用，显示直线示意");
            return parts.join(" · ");
        }
    });
}

async function followLine({ map, coords, line, profile, isCurrent, statEl, waiting, success, failure }) {
    statEl.textContent = waiting;
    try {
        const route = await fetchOsrm(profile, coords);
        if (!isCurrent()) return;
        line.setLatLngs(routeLatLngs(route));
        line.setStyle({ dashArray: null });
        statEl.textContent = success(route);
        map.fitBounds(line.getBounds().pad(0.15));
    } catch (error) {
        if (isCurrent()) statEl.textContent = failure;
    }
}

function drive(context) {
    return followLine({
        ...context,
        profile: "driving",
        waiting: "正在规划当日路线…",
        failure: "路线暂不可用，显示直线示意",
        success(route) {
            const km = Math.round(route.distance / 1000);
            return `当日 ${km} km · ${tripMinutes(route.duration / 60)}`;
        }
    });
}

function visit({ map, day, coords, line, isCurrent, statEl }) {
    if (day.mode === "eurostar") {
        statEl.textContent = "Eurostar · 约 2 小时 15 分（示意线）";
        return Promise.resolve();
    }
    return followLine({
        map,
        coords,
        line,
        isCurrent,
        statEl,
        profile: "foot",
        waiting: "正在规划步行路线…",
        failure: "步行路线暂不可用，显示直线示意",
        success(route) {
            const km = (route.distance / 1000).toFixed(1);
            const minutes = Math.round(route.duration / 60);
            return `步行约 ${km} km · ${minutes} 分`;
        }
    });
}

async function drivingLine({ coords, line, statEl, label }) {
    try {
        const route = await fetchOsrm("driving", coords);
        line.setLatLngs(routeLatLngs(route));
        line.setStyle({ dashArray: null, opacity: 0.85 });
        const km = (route.distance / 1000).toFixed(0);
        const hours = Math.floor(route.duration / 3600);
        const mins = Math.round((route.duration % 3600) / 60);
        const time = hours ? `${hours} 小时 ${mins} 分` : `${mins} 分`;
        statEl.textContent = `${label} ${km} km · ${time}`;
    } catch (error) {
        statEl.textContent = `${label}路线暂不可用，显示直线示意`;
    }
}

const TripRouting = { road, city, walk, drive, visit, drivingLine };
globalThis.TripRouting = TripRouting;
