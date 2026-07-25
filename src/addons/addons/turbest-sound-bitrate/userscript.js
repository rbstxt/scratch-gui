export default async function ({addon}) {
    const apply = () => addon.tab.redux.dispatch({
        type: 'scratch-gui/preferences/SET_PREFERENCE',
        key: 'encoding-bit-rate',
        value: addon.self.disabled ? null : addon.settings.get('bitRate')
    });
    apply();
    addon.settings.addEventListener('change', apply);
    addon.self.addEventListener('disabled', apply);
    addon.self.addEventListener('reenabled', apply);
}
