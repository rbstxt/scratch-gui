const manifest = {
    editorOnly: true,
    name: 'Paint nudge multiplier',
    description: 'Changes how far selected paint objects move while holding Shift.',
    tags: ['Turbest', 'editor'],
    credits: [{name: 'NitroBolt'}],
    userscripts: [{url: 'userscript.js'}],
    settings: [{
        id: 'multiplier',
        type: 'integer',
        name: 'Multiplier',
        default: 15,
        min: 1
    }],
    dynamicDisable: true,
    enabledByDefault: false
};
export default manifest;
