/* 行程页共用交互：日期条滚动、左右键切换、详情展开与收起。 */
(function () {
    const tabs = document.getElementById("dayTabs");
    const arrows = Array.from(document.querySelectorAll(".day-arrow"));

    if (tabs && arrows.length) {
        const updateArrows = () => {
            const max = tabs.scrollWidth - tabs.clientWidth;
            const overflow = max > 4;
            arrows.forEach((arrow) => {
                arrow.hidden = !overflow;
                const dir = Number(arrow.dataset.dir);
                arrow.disabled = dir < 0 ? tabs.scrollLeft <= 2 : tabs.scrollLeft >= max - 2;
            });
        };
        arrows.forEach((arrow) => {
            arrow.addEventListener("click", () => {
                const amount = Math.max(tabs.clientWidth * 0.72, 96);
                tabs.scrollBy({ left: Number(arrow.dataset.dir) * amount, behavior: "smooth" });
            });
        });
        tabs.addEventListener("scroll", updateArrows, { passive: true });
        window.addEventListener("resize", updateArrows);
        updateArrows();
    }

    if (tabs) {
        const dayTabs = () => Array.from(tabs.querySelectorAll(".day-tab"));
        const syncDayTabs = () => {
            dayTabs().forEach((tab) => {
                const active = tab.classList.contains("is-active");
                tab.setAttribute("role", "tab");
                tab.setAttribute("aria-selected", String(active));
                tab.tabIndex = active ? 0 : -1;
            });
        };

        tabs.setAttribute("role", "tablist");
        tabs.setAttribute("aria-orientation", "horizontal");
        tabs.addEventListener("keydown", (event) => {
            const items = dayTabs();
            if (!items.length) return;
            const focused = items.findIndex((tab) => tab === document.activeElement);
            const selected = items.findIndex((tab) => tab.classList.contains("is-active"));
            const current = focused >= 0 ? focused : Math.max(selected, 0);
            let nextIndex = -1;
            if (event.key === "ArrowRight") nextIndex = (current + 1) % items.length;
            if (event.key === "ArrowLeft") nextIndex = (current - 1 + items.length) % items.length;
            if (event.key === "Home") nextIndex = 0;
            if (event.key === "End") nextIndex = items.length - 1;
            if (nextIndex < 0 || nextIndex === current) return;
            event.preventDefault();
            items[nextIndex].click();
            items[nextIndex].focus();
        });
        new MutationObserver(syncDayTabs).observe(tabs, {
            subtree: true,
            attributes: true,
            attributeFilter: ["class"]
        });
        syncDayTabs();
    }

    const root = document.documentElement;
    const button = document.getElementById("detailExpand");
    const detail = document.querySelector(".detail");
    if (!button || !detail) return;
    button.addEventListener("click", () => {
        const expanded = !root.classList.contains("is-page-scroll");
        root.classList.toggle("is-page-scroll", expanded);
        button.setAttribute("aria-expanded", expanded ? "true" : "false");
        button.textContent = expanded ? "收起" : "展开";
        if (expanded) {
            requestAnimationFrame(() => {
                detail.scrollIntoView({ behavior: "smooth", block: "start" });
            });
        } else {
            const timeline = document.querySelector(".timeline");
            if (timeline) timeline.scrollTop = 0;
            window.scrollTo(0, 0);
        }
        window.dispatchEvent(new Event("resize"));
    });
})();
