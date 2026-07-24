/**
 * @fileoverview
 * Utility function to detect locale from the browser setting or paramenter on the URL.
 */

import queryString from 'query-string';

// tw: read language from localStorage
export const LANGUAGE_KEY = 'tw:language';

/**
 * look for language setting in the browser. Check against supported locales.
 * If there's a parameter in the URL, override the browser setting
 * @param {Array.string} supportedLocales An array of supported locale codes.
 * @return {string} the preferred locale
 */
const detectLocale = supportedLocales => {
    const getSupportedLocale = candidate => supportedLocales.find(
        supported => supported.toLowerCase() === candidate.toLowerCase()
    );
    // tw: read language from localStorage
    try {
        const storedLanguage = localStorage.getItem(LANGUAGE_KEY);
        const supportedStoredLanguage = storedLanguage && getSupportedLocale(storedLanguage);
        if (supportedStoredLanguage) {
            return supportedStoredLanguage;
        }
    } catch (e) { /* ignore */ }

    let locale = 'en'; // default
    let browserLocale = window.navigator.userLanguage || window.navigator.language;
    browserLocale = browserLocale.toLowerCase();
    // try to set locale from browserLocale
    const supportedBrowserLocale = getSupportedLocale(browserLocale);
    if (supportedBrowserLocale) {
        locale = supportedBrowserLocale;
    } else {
        browserLocale = browserLocale.split('-')[0];
        const supportedBaseLocale = getSupportedLocale(browserLocale);
        if (supportedBaseLocale) {
            locale = supportedBaseLocale;
        }
    }

    const queryParams = queryString.parse(location.search);
    // Flatten potential arrays and remove falsy values
    const potentialLocales = [].concat(queryParams.locale, queryParams.lang).filter(l => l);
    if (!potentialLocales.length) {
        return locale;
    }

    const urlLocale = potentialLocales[0].toLowerCase();
    const supportedUrlLocale = getSupportedLocale(urlLocale);
    if (supportedUrlLocale) {
        return supportedUrlLocale;
    }

    return locale;
};

export {
    detectLocale
};
