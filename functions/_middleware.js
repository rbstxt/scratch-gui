// Cloudflare Pages middleware for wildcard routing
// Rewrites URLs like /123/editor to /editor.html, /123/fullscreen to /fullscreen.html, etc.

const HTML_MAP = {
    '/editor.html': /^\/\d+\/editor\/?$/,
    '/fullscreen.html': /^\/\d+\/fullscreen\/?$/,
    '/embed.html': /^\/\d+\/embed\/?$/,
    '/index.html': /^\/\d+\/?$/
};

const STATIC_ROUTES = {
    '/editor': '/editor.html',
    '/fullscreen': '/fullscreen.html',
    '/embed': '/embed.html',
    '/addons': '/addons.html'
};

export const onRequest = context => {
    const {request, next, env} = context;
    const url = new URL(request.url);
    const path = url.pathname;

    // Check if this is a static asset (has a file extension)
    if (/\.[a-zA-Z0-9]+$/.test(path)) {
        return next();
    }

    // Check static routes like /editor, /fullscreen
    if (STATIC_ROUTES[path] || STATIC_ROUTES[path.replace(/\/$/, '')]) {
        const target = STATIC_ROUTES[path] || STATIC_ROUTES[path.replace(/\/$/, '')];
        const newUrl = new URL(target, url.origin);
        newUrl.search = url.search;
        newUrl.hash = url.hash;
        return env.ASSETS.fetch(new Request(newUrl, request));
    }

    // Check wildcard routes like /12345/editor, /12345/fullscreen
    for (const [htmlFile, pattern] of Object.entries(HTML_MAP)) {
        if (pattern.test(path)) {
            const newUrl = new URL(htmlFile, url.origin);
            newUrl.search = url.search;
            newUrl.hash = url.hash;
            return env.ASSETS.fetch(new Request(newUrl, request));
        }
    }

    return next();
};
