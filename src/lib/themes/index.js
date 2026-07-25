import defaultsDeep from 'lodash.defaultsdeep';

import * as accentPurple from './accent/purple';
import * as accentBlue from './accent/blue';
import * as accentRed from './accent/red';
import * as accentRainbow from './accent/rainbow';
import * as accentTurbest from './accent/turbest';

import * as guiLight from './gui/light';
import * as guiDark from './gui/dark';

import * as blocksThree from './blocks/three';
import * as blocksHighContrast from './blocks/high-contrast';
import * as blocksDark from './blocks/dark';

const ACCENT_PURPLE = 'purple';
const ACCENT_BLUE = 'blue';
const ACCENT_RED = 'red';
const ACCENT_RAINBOW = 'rainbow';
const ACCENT_TURBEST = 'turbest';
const ACCENT_UNSAND = 'unsand';
const ACCENT_MAP = {
    [ACCENT_PURPLE]: accentPurple,
    [ACCENT_BLUE]: accentBlue,
    [ACCENT_RED]: accentRed,
    [ACCENT_RAINBOW]: accentRainbow,
    [ACCENT_TURBEST]: accentTurbest,
    // Keep the old value readable for at least one release.
    [ACCENT_UNSAND]: accentTurbest
};
const ACCENT_DEFAULT = ACCENT_TURBEST;

const GUI_LIGHT = 'light';
const GUI_DARK = 'dark';
const GUI_MAP = {
    [GUI_LIGHT]: guiLight,
    [GUI_DARK]: guiDark
};
const GUI_DEFAULT = GUI_LIGHT;

const BLOCKS_THREE = 'three';
const BLOCKS_DARK = 'dark';
const BLOCKS_HIGH_CONTRAST = 'high-contrast';
const BLOCKS_CUSTOM = 'custom';
const BLOCKS_DEFAULT = BLOCKS_THREE;
const defaultBlockColors = blocksThree.blockColors;
const BLOCKS_MAP = {
    [BLOCKS_THREE]: {
        blocksMediaFolder: 'blocks-media/default',
        colors: blocksThree.blockColors,
        extensions: blocksThree.extensions,
        customExtensionColors: {},
        useForStage: true
    },
    [BLOCKS_HIGH_CONTRAST]: {
        blocksMediaFolder: 'blocks-media/high-contrast',
        colors: defaultsDeep({}, blocksHighContrast.blockColors, defaultBlockColors),
        extensions: blocksHighContrast.extensions,
        customExtensionColors: blocksHighContrast.customExtensionColors,
        useForStage: true
    },
    [BLOCKS_DARK]: {
        blocksMediaFolder: 'blocks-media/default',
        colors: defaultsDeep({}, blocksDark.blockColors, defaultBlockColors),
        extensions: blocksDark.extensions,
        customExtensionColors: blocksDark.customExtensionColors,
        useForStage: false
    },
    [BLOCKS_CUSTOM]: {
        // to be filled by editor-theme3 addon
        blocksMediaFolder: 'blocks-media/default',
        colors: blocksThree.blockColors,
        extensions: {},
        customExtensionColors: {},
        useForStage: false
    }
};

let themeObjectsCreated = 0;

class Theme {
    constructor (accent, gui, blocks, wallpaper, fonts) {
        if (accent === ACCENT_UNSAND) accent = ACCENT_TURBEST;
        // do not modify these directly
        /** @readonly */
        this.id = ++themeObjectsCreated;
        /** @readonly */
        this.accent = Object.prototype.hasOwnProperty.call(ACCENT_MAP, accent) ? accent : ACCENT_DEFAULT;
        /** @readonly */
        this.gui = Object.prototype.hasOwnProperty.call(GUI_MAP, gui) ? gui : GUI_DEFAULT;
        /** @readonly */
        this.blocks = Object.prototype.hasOwnProperty.call(BLOCKS_MAP, blocks) ? blocks : BLOCKS_DEFAULT;
        /** @readonly */
        this.wallpaper = wallpaper || {url: '', opacity: 0.3, darkness: 0, gridVisible: true, history: []};
        /** @readonly */
        this.fonts = fonts || {system: [], google: [], history: []};
    }

    static light = new Theme(ACCENT_DEFAULT, GUI_LIGHT, BLOCKS_DEFAULT);
    static dark = new Theme(ACCENT_DEFAULT, GUI_DARK, BLOCKS_DEFAULT);
    static highContrast = new Theme(ACCENT_DEFAULT, GUI_DEFAULT, BLOCKS_HIGH_CONTRAST);

    set (what, to) {
        if (what === 'accent') {
            return new Theme(to, this.gui, this.blocks, this.wallpaper, this.fonts);
        } else if (what === 'gui') {
            return new Theme(this.accent, to, this.blocks, this.wallpaper, this.fonts);
        } else if (what === 'blocks') {
            return new Theme(this.accent, this.gui, to, this.wallpaper, this.fonts);
        } else if (what === 'wallpaper') {
            return new Theme(this.accent, this.gui, this.blocks, to, this.fonts);
        } else if (what === 'fonts') {
            return new Theme(this.accent, this.gui, this.blocks, this.wallpaper, to);
        }
        throw new Error(`Unknown theme property: ${what}`);
    }

    getBlocksMediaFolder () {
        return BLOCKS_MAP[this.blocks].blocksMediaFolder;
    }

    getGuiColors () {
        return defaultsDeep(
            {},
            ACCENT_MAP[this.accent].guiColors,
            GUI_MAP[this.gui].guiColors,
            guiLight.guiColors
        );
    }

    getBlockColors () {
        return defaultsDeep(
            {},
            ACCENT_MAP[this.accent].blockColors,
            GUI_MAP[this.gui].blockColors,
            BLOCKS_MAP[this.blocks].colors
        );
    }

    getExtensions () {
        return BLOCKS_MAP[this.blocks].extensions;
    }

    isDark () {
        return this.getGuiColors()['color-scheme'] === 'dark';
    }

    getStageBlockColors () {
        if (BLOCKS_MAP[this.blocks].useForStage) {
            return this.getBlockColors();
        }
        return Theme.light.getBlockColors();
    }

    getCustomExtensionColors () {
        return BLOCKS_MAP[this.blocks].customExtensionColors;
    }
}

export {
    Theme,
    defaultBlockColors,

    ACCENT_RED,
    ACCENT_PURPLE,
    ACCENT_BLUE,
    ACCENT_RAINBOW,
    ACCENT_TURBEST,
    ACCENT_UNSAND,
    ACCENT_MAP,

    GUI_LIGHT,
    GUI_DARK,
    GUI_MAP,

    BLOCKS_THREE,
    BLOCKS_DARK,
    BLOCKS_HIGH_CONTRAST,
    BLOCKS_CUSTOM,
    BLOCKS_MAP
};
