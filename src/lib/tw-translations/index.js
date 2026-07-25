import twTranslations from './generated-translations.json';
import turbestTranslations from './turbest';

const addAdditionalTranslations = editorMessages => {
    for (const locale of Object.keys(editorMessages)) {
        const toMixIn = twTranslations[locale.toLowerCase()];
        if (toMixIn) {
            Object.assign(editorMessages[locale], toMixIn);
        }
        const localeKey = locale.toLowerCase();
        const turbestMessages = turbestTranslations[localeKey];
        if (turbestMessages) {
            Object.assign(editorMessages[locale], turbestMessages);
        }
    }

    // We reuse our `es` translations for `es-419` instead of maintaining separate translations.
    Object.assign(editorMessages['es-419'], twTranslations.es, turbestTranslations.es);
};

export default addAdditionalTranslations;
