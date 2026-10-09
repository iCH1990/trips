function tokenColor(value) {
    const raw = String(value).trim();
    const wrapped = /^var\((--[\w-]+)\)$/.exec(raw);
    const name = wrapped ? wrapped[1] : raw;
    if (!name.startsWith("--")) return value;
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || value;
}
