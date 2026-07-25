const manifest = {
    editorOnly: true,
    name: 'Sound encoding bit rate',
    description: 'Changes the MP3 bit rate used when edited sounds are encoded.',
    tags: ['Turbest', 'editor'],
    credits: [{name: 'NitroBolt'}],
    userscripts: [{url: 'userscript.js'}],
    settings: [{
        id: 'bitRate',
        type: 'integer',
        name: 'Bit rate (kbps)',
        default: 128,
        min: 1,
        max: 320
    }],
    dynamicDisable: true,
    enabledByDefault: false
};
export default manifest;
