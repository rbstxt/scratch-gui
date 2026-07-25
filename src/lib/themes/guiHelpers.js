import {Theme} from '.';
import AddonHooks from '../../addons/hooks';
import './global-styles.css';

const BLOCK_COLOR_NAMES = [
    // Corresponds to the name of the object in blockColors
    'motion',
    'looks',
    'sounds',
    'control',
    'event',
    'sensing',
    'pen',
    'operators',
    'data',
    'data_lists',
    'more',
    'addons'
];

/**
 * @param {string} css CSS color or var(--...)
 * @returns {string} evaluated CSS
 */
const evaluateCSS = css => {
    const variableMatch = css.match(/^var\(([\w-]+)\)$/);
    if (variableMatch) {
        return document.documentElement.style.getPropertyValue(variableMatch[1]);
    }
    return css;
};

/**
 * @param {Theme} theme the theme
 */
const applyGuiColors = theme => {
    const doc = document.documentElement;

    const defaultGuiColors = Theme.light.getGuiColors();
    for (const [name, value] of Object.entries(defaultGuiColors)) {
        doc.style.setProperty(`--${name}-default`, value);
    }

    const guiColors = theme.getGuiColors();
    for (const [name, value] of Object.entries(guiColors)) {
        doc.style.setProperty(`--${name}`, value);
    }

    const blockColors = theme.getBlockColors();
    doc.style.setProperty('--editorTheme3-blockText', blockColors.text);
    doc.style.setProperty('--editorTheme3-inputColor', blockColors.textField);
    doc.style.setProperty('--editorTheme3-inputColor-text', blockColors.textFieldText);
    for (const color of BLOCK_COLOR_NAMES) {
        doc.style.setProperty(`--editorTheme3-${color}-primary`, blockColors[color].primary);
        doc.style.setProperty(`--editorTheme3-${color}-secondary`, blockColors[color].secondary);
        doc.style.setProperty(`--editorTheme3-${color}-tertiary`, blockColors[color].tertiary);
        doc.style.setProperty(`--editorTheme3-${color}-field-background`, blockColors[color].quaternary);
    }

    // Some browsers will color their interfaces to match theme-color, so if we make it the same color as our
    // menu bar, it'll look pretty cool.
    let metaThemeColor = document.head.querySelector('meta[name=theme-color]');
    if (!metaThemeColor) {
        metaThemeColor = document.createElement('meta');
        metaThemeColor.setAttribute('name', 'theme-color');
        document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute('content', evaluateCSS(guiColors['menu-bar-background']));

    // a horrible hack for icons...
    window.Recolor = {
        primary: guiColors['looks-secondary']
    };
    AddonHooks.recolorCallbacks.forEach(i => i());

    const wallpaper = theme.wallpaper;
    const wallpaperTarget = document.querySelector("[class*='blocks-wrapper_']") || document.body;
    if (wallpaper.url) {
        const darkness = Math.max(0, Math.min(0.8, wallpaper.darkness || 0));
        wallpaperTarget.style.backgroundImage =
            `linear-gradient(rgba(0,0,0,${darkness}), rgba(0,0,0,${darkness})), url("${wallpaper.url}")`;
        wallpaperTarget.style.backgroundSize = 'cover';
        wallpaperTarget.style.backgroundPosition = 'center';
        wallpaperTarget.style.backgroundAttachment = 'fixed';
        document.body.style.setProperty('--turbest-wallpaper-opacity', wallpaper.opacity || 0.3);
        const blocksSvg = document.querySelector('svg.blocklySvg');
        if (blocksSvg) blocksSvg.style.fillOpacity = 1 - (wallpaper.opacity || 0.3);
    } else {
        wallpaperTarget.style.backgroundImage = '';
        document.body.style.removeProperty('--turbest-wallpaper-opacity');
        const blocksSvg = document.querySelector('svg.blocklySvg');
        if (blocksSvg) blocksSvg.style.fillOpacity = '';
    }

    const font = theme.fonts.google[0] || theme.fonts.system[0];
    let fontLink = document.getElementById('turbest-theme-google-font');
    if (theme.fonts.google[0]) {
        if (!fontLink) {
            fontLink = document.createElement('link');
            fontLink.id = 'turbest-theme-google-font';
            fontLink.rel = 'stylesheet';
            document.head.appendChild(fontLink);
        }
        fontLink.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font).replace(/%20/g, '+')}`;
    } else if (fontLink) {
        fontLink.remove();
    }
    document.documentElement.style.setProperty('--turbest-theme-font', font ? `"${font}", sans-serif` : 'inherit');
};

export {
    applyGuiColors
};
