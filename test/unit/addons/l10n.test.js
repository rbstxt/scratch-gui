import addonMessages, {
    addAddonLocaleChangeListener,
    getAddonLanguage,
    loadAddonLocale,
    resolveAddonLanguage
} from '../../../src/addons/l10n';

describe('addon localization', () => {
    afterEach(async () => {
        await loadAddonLocale('en');
    });

    test('resolves exact, base, and unsupported locales', () => {
        expect(resolveAddonLanguage('pt-BR')).toBe('pt-br');
        expect(resolveAddonLanguage('ja-JP')).toBe('ja');
        expect(resolveAddonLanguage('not-a-locale')).toBe('en');
    });

    test('replaces messages when switching languages without a reload', async () => {
        await loadAddonLocale('ja');
        expect(getAddonLanguage()).toBe('ja');
        expect(addonMessages['mediarecorder/record']).toBe('録画');

        await loadAddonLocale('en');
        expect(getAddonLanguage()).toBe('en');
        expect(addonMessages['mediarecorder/record']).toBe('Record');
    });

    test('notifies listeners after the locale is ready', async () => {
        const listener = jest.fn();
        const removeListener = addAddonLocaleChangeListener(listener);

        await loadAddonLocale('ja');
        expect(listener).toHaveBeenCalledWith('ja');

        removeListener();
        await loadAddonLocale('en');
        expect(listener).toHaveBeenCalledTimes(1);
    });
});
