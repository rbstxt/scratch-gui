import twTranslations from './generated-translations.json';
import unsandTranslations from './unsand';

const addAdditionalTranslations = editorMessages => {
    for (const locale of Object.keys(editorMessages)) {
        const toMixIn = twTranslations[locale.toLowerCase()];
        if (toMixIn) {
            Object.assign(editorMessages[locale], toMixIn);
        }
        const unsandMessages = unsandTranslations[locale.toLowerCase()];
        if (unsandMessages) {
            Object.assign(editorMessages[locale], unsandMessages);
        }
    }

    // We reuse our `es` translations for `es-419` instead of maintaining separate translations.
    Object.assign(editorMessages['es-419'], twTranslations.es, unsandTranslations.es);
};

export default addAdditionalTranslations;
