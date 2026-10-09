/* 行程页共用渲染：地图、日期标签、停点标记、侧栏和时间线。 */
function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function createMap(elementId, center, zoom) {
    const map = L.map(elementId, { zoomControl: true }).setView(center, zoom);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);
    return map;
}

function createDayTabs(tabsEl, days, onSelect) {
    days.forEach((day, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "day-tab";
        button.innerHTML = `${escapeHtml(day.date)}<br>${escapeHtml(day.weekday)}`;
        button.addEventListener("click", () => onSelect(index));
        tabsEl.appendChild(button);
    });
}

function selectDayTab(tabsEl, dayIndex) {
    tabsEl.querySelectorAll(".day-tab").forEach((tab, index) => {
        tab.classList.toggle("is-active", index === dayIndex);
        if (index !== dayIndex) return;
        const tabsRect = tabsEl.getBoundingClientRect();
        const tabRect = tab.getBoundingClientRect();
        if (tabRect.left < tabsRect.left) {
            tabsEl.scrollLeft -= tabsRect.left - tabRect.left;
        } else if (tabRect.right > tabsRect.right) {
            tabsEl.scrollLeft += tabRect.right - tabsRect.right;
        }
    });
}

function highlightStop(index) {
    document.querySelectorAll(".stop").forEach((el) => {
        el.classList.toggle("is-active", Number(el.dataset.index) === index);
    });
    document.querySelectorAll(".stop-card").forEach((card, i) => {
        card.classList.toggle("is-active", i === index);
    });
}

function focusStop({ map, markers, itineraryEl, index, zoom, scroll = false }) {
    highlightStop(index);
    map.flyTo(markers[index].getLatLng(), zoom, { duration: 0.7 });
    markers[index].openPopup();
    if (scroll) {
        itineraryEl.children[index].scrollIntoView({ behavior: "smooth", block: "center" });
    }
}

function bindStopClicks(containers, onFocus) {
    containers.forEach((container) => {
        container.addEventListener("click", (event) => {
            const button = event.target.closest(".stop");
            if (!button) return;
            onFocus(Number(button.dataset.index), { scroll: container.classList.contains("glance") });
        });
    });
}

function stopLabel(stop) {
    if (stop.kind === "stay") return '<span class="tag tag--stay">住宿</span>';
    if (stop.kind === "highlight") return '<span class="tag">重点</span>';
    if (stop.optional) return '<span class="stop-tag">可选</span>';
    return "";
}

function renderStops({ map, stops, color, glanceEl, itineraryEl, onMarkerClick = highlightStop }) {
    const markers = [];
    stops.forEach((stop, index) => {
        const number = index + 1;
        const kindClass = stop.optional ? " is-optional" : stop.kind ? ` is-${stop.kind}` : "";
        const label = stopLabel(stop);
        const activityRows = (stop.activities || []).map((activity) => `
                    <li class="activity">
                        <span class="activity-time">${escapeHtml(activity.time)}</span>
                        <span class="activity-text">${escapeHtml(activity.text)}</span>
                    </li>`).join("");
        const meta = [stop.drive, stop.time].filter(Boolean).join(" · ");
        const note = stop.note ? `<span class="note">${escapeHtml(stop.note)}</span>` : "";
        const colored = Boolean(color) && !kindClass;
        const badgeStyle = colored ? ` style="background:${color}"` : "";

        const marker = L.marker([stop.lat, stop.lng], {
            icon: L.divIcon({
                className: "",
                html: `<div class="num-marker${kindClass}"${badgeStyle}>${number}</div>`,
                iconSize: [29, 29],
                iconAnchor: [14, 14],
                popupAnchor: [0, -16]
            })
        }).addTo(map);
        marker.bindPopup(`
                    <p class="popup-title">${number}. ${escapeHtml(stop.name)}${label}</p>
                    <p class="popup-meta">${escapeHtml(meta)}</p>
                    ${note}
                    <ul class="activities activities--popup">${activityRows}</ul>`);
        marker.on("click", () => onMarkerClick(index));
        markers.push(marker);

        const glanceItem = document.createElement("li");
        glanceItem.className = "glance-item";
        glanceItem.innerHTML = `
                    <button class="stop" type="button" data-index="${index}">
                        <span class="badge${kindClass}"${badgeStyle}>${number}</span>
                        <span>
                            <span class="stop-title">${escapeHtml(stop.name)}${label}</span>
                            <span class="stop-meta">${escapeHtml(stop.time || "")}</span>
                        </span>
                    </button>`;
        glanceEl.appendChild(glanceItem);

        const item = document.createElement("li");
        item.className = "timeline-item";
        item.innerHTML = `
                    ${stop.drive ? `<p class="leg-row">${escapeHtml(stop.drive)}</p>` : ""}
                    <article class="stop-card">
                        <button class="stop" type="button" data-index="${index}">
                            <span class="badge${kindClass}"${badgeStyle}>${number}</span>
                            <span>
                                <span class="stop-title">${escapeHtml(stop.name)}${label}</span>
                                <span class="stop-meta">${escapeHtml(stop.time || "")}</span>
                            </span>
                        </button>
                        <ul class="activities">${activityRows}</ul>
                        ${note}
                    </article>`;
        itineraryEl.appendChild(item);
    });
    return markers;
}

const TripRender = {
    escapeHtml,
    createMap,
    createDayTabs,
    selectDayTab,
    highlightStop,
    focusStop,
    bindStopClicks,
    renderStops
};
