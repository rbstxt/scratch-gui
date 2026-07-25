export default async function ({addon}) {
    const apply = () => addon.tab.redux.dispatch({
        type: 'scratch-gui/preferences/SET_PREFERENCE',
        key: 'waveform-color',
        value: addon.self.disabled ? null : 'volume'
    });
    apply();
    addon.self.addEventListener('disabled', apply);
    addon.self.addEventListener('reenabled', apply);
}
