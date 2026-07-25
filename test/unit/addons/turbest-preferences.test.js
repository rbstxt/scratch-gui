const createAddon = (settings = {}) => {
    const listeners = {};
    const settingListeners = {};
    const dispatch = jest.fn();
    const addon = {
        self: {
            disabled: false,
            addEventListener: (name, callback) => {
                listeners[name] = callback;
            }
        },
        settings: {
            get: key => settings[key],
            addEventListener: (name, callback) => {
                settingListeners[name] = callback;
            }
        },
        tab: {
            redux: {dispatch}
        }
    };
    return {addon, dispatch, listeners, settingListeners};
};

const cases = [
    ['compact tabs', '../../../src/addons/addons/turbest-compact-tabs/userscript.js',
        {}, 'compact-tabs', true, false],
    ['sharp waveforms', '../../../src/addons/addons/turbest-sharp-waveforms/userscript.js',
        {}, 'waveform-render-type', 'sharp', 'soft'],
    ['waveform gradient', '../../../src/addons/addons/turbest-waveform-gradient/userscript.js',
        {}, 'waveform-color', 'volume', null],
    ['sound bit rate', '../../../src/addons/addons/turbest-sound-bitrate/userscript.js',
        {bitRate: 192}, 'encoding-bit-rate', 192, null],
    ['paint nudge', '../../../src/addons/addons/turbest-paint-nudge/userscript.js',
        {multiplier: 24}, 'paint-nudge-multiplier', 24, null]
];

describe('Turbest NitroBolt preference addons', () => {
    test.each(cases)('%s applies and removes its preference', async (
        _name,
        modulePath,
        settings,
        key,
        enabledValue,
        disabledValue
    ) => {
        const userscript = require(modulePath).default;
        const {addon, dispatch, listeners} = createAddon(settings);
        await userscript({addon});
        expect(dispatch).toHaveBeenLastCalledWith({
            type: 'scratch-gui/preferences/SET_PREFERENCE',
            key,
            value: enabledValue
        });
        addon.self.disabled = true;
        listeners.disabled();
        expect(dispatch).toHaveBeenLastCalledWith({
            type: 'scratch-gui/preferences/SET_PREFERENCE',
            key,
            value: disabledValue
        });
    });
});
