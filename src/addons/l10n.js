import englishMessages from './addons-l10n/en.json';
import l10nEntries from './generated/l10n-entries';

const addonMessages = {...englishMessages};
let addonLanguage = 'en';
let loadVersion = 0;
const localeChangeListeners = new Set();

const resolveAddonLanguage = locale => {
    const exactMatch = Object.keys(l10nEntries).find(
        candidate => candidate.toLowerCase() === locale.toLowerCase()
    );
    if (exactMatch) return exactMatch;

    const baseLanguage = locale.split('-')[0].toLowerCase();
    return Object.prototype.hasOwnProperty.call(l10nEntries, baseLanguage) ?
        baseLanguage : 'en';
};

const loadAddonLocale = async locale => {
    const version = ++loadVersion;
    const language = resolveAddonLanguage(locale);
    const localizedMessages = language === 'en' ? {} : await l10nEntries[language]();

    // A slower import for an earlier language must not overwrite a newer choice.
    if (version !== loadVersion) return false;

    for (const key of Object.keys(addonMessages)) {
        delete addonMessages[key];
    }
    Object.assign(addonMessages, englishMessages, localizedMessages);
    addonLanguage = language;
    for (const listener of localeChangeListeners) {
        listener(language);
    }
    return true;
};

const getAddonLanguage = () => addonLanguage;

const addAddonLocaleChangeListener = listener => {
    localeChangeListeners.add(listener);
    return () => localeChangeListeners.delete(listener);
};

export {
    addonMessages as default,
    addAddonLocaleChangeListener,
    getAddonLanguage,
    loadAddonLocale,
    resolveAddonLanguage
};
