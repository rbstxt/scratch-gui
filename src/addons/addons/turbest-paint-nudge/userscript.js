export default async function ({addon}) {
    const apply = () => addon.tab.redux.dispatch({
        type: 'scratch-gui/preferences/SET_PREFERENCE',
        key: 'paint-nudge-multiplier',
        value: addon.self.disabled ? null : addon.settings.get('multiplier')
    });
    apply();
    addon.settings.addEventListener('change', apply);
    addon.self.addEventListener('disabled', apply);
    addon.self.addEventListener('reenabled', apply);
}
