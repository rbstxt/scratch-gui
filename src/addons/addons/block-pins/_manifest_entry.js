const manifest = {
    editorOnly: true,
    name: 'Block Pinning',
    description: 'Pin frequently used blocks to the top of the toolbox.',
    credits: [
        {
            name: 'SharkPool',
            link: 'https://github.com/SharkPool-SP/'
        }
    ],
    info: [
        {
            type: 'notice',
            text: 'Pinned blocks with checkboxes may behave unexpectedly when checked.',
            id: 'checkbox-notice'
        }
    ],
    userscripts: [
        {
            url: 'userscript.js'
        }
    ],
    tags: [
        'editor'
    ],
    enabledByDefault: true,
    dynamicDisable: false
};

export default manifest;
