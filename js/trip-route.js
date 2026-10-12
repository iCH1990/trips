/* 公开地址是文件名去掉 .html。#los_angeles_las_vegas_260207_260208 对应同名 html。 */
(function () {
    function idFromFile(file) {
        const name = String(file || "").split("?")[0].split("#")[0].split("/").pop();
        if (!/^[a-z0-9]+(?:_[a-z0-9]+)*_\d{6}(?:_\d{6})?\.html$/.test(name)) return "";
        return name.slice(0, -".html".length);
    }

    function idFromHref(href) {
        return idFromFile(href);
    }

    function hashValue(value) {
        const raw = String(value || "").replace(/^#/, "");
        try {
            return decodeURIComponent(raw);
        } catch (error) {
            return raw;
        }
    }

    function isTripId(value) {
        return /^[a-z0-9]+(?:_[a-z0-9]+)*_\d{6}(?:_\d{6})?$/.test(hashValue(value));
    }

    const pageLocation = globalThis.location;
    if (pageLocation && pageLocation.pathname) {
        let file = pageLocation.pathname.split("/").pop();
        try {
            file = decodeURIComponent(file);
        } catch (error) {
            file = pageLocation.pathname.split("/").pop();
        }
        const id = idFromFile(file);
        if (id && globalThis.window && globalThis.window.top === globalThis.window) {
            const home = new URL("../../", pageLocation.href);
            home.hash = id;
            pageLocation.replace(home.href);
        } else if (!id && isTripId(pageLocation.hash) && globalThis.document) {
            globalThis.document.documentElement.classList.add("is-trip-route");
        }
    }

    globalThis.TripRoute = { idFromFile, idFromHref, hashValue, isTripId };
})();
