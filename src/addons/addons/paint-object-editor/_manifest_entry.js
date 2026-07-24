const manifest = {
    name: 'Object Editor',
    description: 'Edit costume object transforms, layering, blending, and stroke properties with precise values.',
    credits: [
        {
            name: 'SharkPool',
            link: 'https://github.com/SharkPool-SP/'
        },
        {
            name: 'DogeisCut',
            link: 'https://github.com/DogeisCut/'
        }
    ],
    tags: [],
    enabledByDefault: true,
    userscripts: [
        {
            url: 'userscript.js'
        }
    ],
    userstyles: [
        {
            url: 'userstyle.css'
        }
    ],
    dynamicDisable: false
};

export default manifest;
