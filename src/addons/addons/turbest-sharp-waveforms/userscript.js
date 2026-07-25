export default async function ({addon}) {
    const apply = () => addon.tab.redux.dispatch({
        type: 'scratch-gui/preferences/SET_PREFERENCE',
        key: 'waveform-render-type',
        value: addon.self.disabled ? 'soft' : 'sharp'
    });
    apply();
    addon.self.addEventListener('disabled', apply);
    addon.self.addEventListener('reenabled', apply);
}
