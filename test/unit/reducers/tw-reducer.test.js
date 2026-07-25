import reducer, {initialState, setDeveloperMode} from '../../../src/reducers/tw';

describe('TurboWarp settings reducer', () => {
    test('developer mode is disabled by default', () => {
        expect(reducer(undefined, {}).developerMode).toBe(false);
    });

    test('developer mode can be enabled and disabled', () => {
        const enabled = reducer(initialState, setDeveloperMode(true));
        expect(enabled.developerMode).toBe(true);
        expect(reducer(enabled, setDeveloperMode(false)).developerMode).toBe(false);
    });
});
