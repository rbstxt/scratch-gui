const QUALITY_OPTIONS = [
    ['0.25', 'x0.25'],
    ['0.5', 'x0.5'],
    ['0.75', 'x0.75'],
    ['1', 'x1'],
    ['1.5', 'x1.5'],
    ['2', 'x2']
];

export default async function ({addon}) {
    const vm = addon.tab.traps.vm;
    const renderer = vm.renderer;
    if (!renderer || !renderer.canvas) return;

    let quality = 1;
    const originalResize = renderer.resize.bind(renderer);
    renderer.resize = (width, height) => originalResize(width * quality, height * quality);

    const picker = document.createElement('select');
    picker.className = 'turbest-project-quality-picker';
    picker.title = 'Project quality';
    for (const [value, label] of QUALITY_OPTIONS) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        picker.appendChild(option);
    }

    const resizeForQuality = () => {
        const rect = renderer.canvas.getBoundingClientRect();
        originalResize(rect.width * quality, rect.height * quality);
    };
    picker.addEventListener('change', () => {
        quality = Number(picker.value);
        resizeForQuality();
    });
    addon.tab.displayNoneWhileDisabled(picker, {display: 'inline-block'});
    addon.self.addEventListener('disabled', () => {
        quality = 1;
        picker.value = '1';
        resizeForQuality();
    });

    while (true) {
        await addon.tab.waitForElement('[class^="controls_controls-container"]', {
            markAsSeen: true,
            reduxEvents: [
                'scratch-gui/mode/SET_PLAYER',
                'fontsLoaded/SET_FONTS_LOADED',
                'scratch-gui/locales/SELECT_LOCALE'
            ]
        });
        addon.tab.appendToSharedSpace({
            space: 'afterStopButton',
            element: picker,
            order: 3
        });
        resizeForQuality();
    }
}
