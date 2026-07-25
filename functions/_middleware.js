const REDIRECT_HOSTS = {
    'unsand.pages.dev': 'turbest.pages.dev',
    'unsand.1zworks.com': 'turbest.1zworks.com'
};

export const onRequest = context => {
    const url = new URL(context.request.url);
    const targetHost = REDIRECT_HOSTS[url.hostname];
    if (!targetHost) return context.next();

    url.hostname = targetHost;
    url.protocol = 'https:';
    url.port = '';
    return Response.redirect(url.toString(), 308);
};
