import {ACCENT_TURBEST, Theme} from '../../../src/lib/themes';

test('normalizes the legacy unsand accent to turbest', () => {
    const legacy = new Theme('unsand', 'light', 'three');
    const current = new Theme('turbest', 'light', 'three');

    expect(legacy.accent).toBe(ACCENT_TURBEST);
    expect(legacy.getGuiColors()).toEqual(current.getGuiColors());
});

test('loads a persisted legacy accent as turbest', () => {
    global.window = {
        matchMedia: () => ({matches: false})
    };
    global.localStorage = {
        getItem: () => JSON.stringify({accent: 'unsand'})
    };
    jest.resetModules();
    const {detectTheme} = require('../../../src/lib/themes/themePersistance');
    expect(detectTheme().accent).toBe(ACCENT_TURBEST);
});

test('uses red for the Rainbow paint accent', () => {
    const theme = new Theme('rainbow', 'light', 'three');
    expect(theme.getGuiColors()['looks-secondary']).toBe('#ff4c4c');
});
