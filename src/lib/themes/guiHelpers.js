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

// CSS Modules generates hashed class names like `blocks-wrapper_HASH`.
// Match the prefix so the selector is stable across builds (the hash itself
// changes per webpack epoch per AGENTS.md).
const BLOCKS_WRAPPER_SELECTOR = "[class*='blocks-wrapper_']";

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
 * Convert a CSS color (hex or rgb/rgba) to an rgba() string with the given
 * alpha. Falls back to a neutral color when the input is not parseable.
 * @param {string} value CSS color value.
 * @param {number} alpha 0..1 opacity.
 * @returns {string} rgba() string.
 */
const toRgba = (value, alpha) => {
    if (typeof value !== 'string') {
        return `rgba(229, 240, 255, ${alpha})`;
    }
    const trimmed = value.trim();
    const hexMatch = trimmed.match(/^#([0-9a-f]{3,8})$/i);
    if (hexMatch) {
        let digits = hexMatch[1];
        if (digits.length === 3 || digits.length === 4) {
            digits = digits
                .split('')
                .map(c => c + c)
                .join('');
        }
        if (digits.length < 6) {
            return `rgba(229, 240, 255, ${alpha})`;
        }
        const r = parseInt(digits.substr(0, 2), 16);
        const g = parseInt(digits.substr(2, 2), 16);
        const b = parseInt(digits.substr(4, 2), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    const rgbMatch = trimmed.match(/^rgba?\(([^)]+)\)$/i);
    if (rgbMatch) {
        const parts = rgbMatch[1].split(/[\s,/]+/).filter(Boolean);
        if (parts.length >= 3) {
            const r = parseFloat(parts[0]);
            const g = parseFloat(parts[1]);
            const b = parseFloat(parts[2]);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
    }
    return `rgba(229, 240, 255, ${alpha})`;
};

/**
 * Clear every wallpaper-related inline style we ever set on the blocks wrapper.
 * @param {HTMLElement} target the blocks-wrapper element
 */
const clearWallpaperStyles = target => {
    target.style.backgroundImage = '';
    target.style.backgroundSize = '';
    target.style.backgroundPosition = '';
    target.style.backgroundRepeat = '';
    target.style.backgroundAttachment = '';
};

/**
 * Apply transparency tinting to the Blockly workspace SVG so the wallpaper
 * shows through. We pick the GUI's primary color so the overlay matches the
 * surrounding chrome (e.g. menus, modals). Mirrors the approach used by
 * MistWarp (`applyBlocksWorkspaceTransparency`).
 * @param {boolean} active whether wallpaper is currently active
 * @param {number} wallpaperOpacity user-selected wallpaper opacity (0.1..1.0)
 */
const applyBlocksWorkspaceTransparency = (active, wallpaperOpacity) => {
    const blocksSvg = document.querySelector('svg.blocklySvg');
    if (!blocksSvg) {
        return;
    }
    if (active) {
        // Higher wallpaper opacity means we want the SVG more transparent so the
        // wallpaper is more visible. Clamp to keep some readability.
        const overlayOpacity = Math.max(0.2, Math.min(0.85, 1 - wallpaperOpacity + 0.1));
        const guiPrimary = document.documentElement.style.getPropertyValue('--ui-primary') ||
            document.documentElement.style.getPropertyValue('--ui-primary-default') ||
            '#e5f0ff';
        blocksSvg.style.backgroundColor = toRgba(guiPrimary, overlayOpacity);
    } else {
        blocksSvg.style.backgroundColor = '';
    }
};

/**
 * Make every Blockly-related layer in the blocks-wrapper transparent enough
 * that a wallpaper set on the wrapper is actually visible. We touch the
 * workspace SVG bg, the main-background rect's fill, and the
 * relativeWrapper/injectionDiv so no opaque layer sits between the wallpaper
 * image and the blocks.
 * @param {boolean} active whether wallpaper is currently active
 */
const clearBlocklyWorkspaceOpaqueLayers = active => {
    const blocksSvg = document.querySelector('svg.blocklySvg');
    if (blocksSvg) {
        // Blockly's stylesheet sets .blocklySvg background-color to an opaque
        // workspace colour. Inline-style overrides win, but only when set.
        if (active) {
            if (blocksSvg.style.backgroundColor === '') {
                blocksSvg.style.backgroundColor = 'transparent';
            }
        } else {
            blocksSvg.style.backgroundColor = '';
        }
    }
    // The wrapper inside the SVG also has an opaque background in some themes.
    // Make sure it is transparent when a wallpaper is active.
    const wrappers = document.querySelectorAll('svg.blocklySvg .blocklyRelativeWrapper');
    for (const wrapper of wrappers) {
        if (active) {
            wrapper.style.backgroundColor = 'transparent';
        } else {
            wrapper.style.backgroundColor = '';
        }
    }
};

// Active state tracked for the MutationObserver re-application.
let currentWallpaperState = {active: false, opacity: 0.3};
let observerHandle = null;
let pendingRetryTimer = null;

/**
 * Attempt to apply the wallpaper right now.
 * @param {object} wallpaper theme.wallpaper snapshot.
 * @returns {boolean} true if the wallpaper was applied (target found), false otherwise.
 */
const tryApplyWallpaper = wallpaper => {
    const target = document.querySelector(BLOCKS_WRAPPER_SELECTOR);
    if (!target) {
        return false;
    }
    if (wallpaper && wallpaper.url) {
        const darkness = Math.max(0, Math.min(0.8, wallpaper.darkness || 0));
        if (darkness > 0) {
            target.style.backgroundImage =
                `linear-gradient(rgba(0, 0, 0, ${darkness}), rgba(0, 0, 0, ${darkness})), ` +
                `url("${wallpaper.url}")`;
        } else {
            target.style.backgroundImage = `url("${wallpaper.url}")`;
        }
        target.style.backgroundSize = 'cover';
        target.style.backgroundPosition = 'center';
        target.style.backgroundRepeat = 'no-repeat';
        target.style.backgroundAttachment = 'fixed';
    } else {
        clearWallpaperStyles(target);
    }
    return true;
};

/**
 * Re-apply transparency once the Blockly SVG has been mounted.
 * @param {boolean} active whether wallpaper is active.
 * @param {number} opacity wallpaper opacity 0..1.
 * @returns {void}
 */
const tryApplyTransparency = (active, opacity) => {
    applyBlocksWorkspaceTransparency(active, opacity);
};

/**
 * Stop any pending retry / observer. Safe to call multiple times.
 */
const stopWallpaperScheduler = () => {
    if (pendingRetryTimer !== null) {
        clearTimeout(pendingRetryTimer);
        pendingRetryTimer = null;
    }
    if (observerHandle) {
        observerHandle.disconnect();
        observerHandle = null;
    }
};

/**
 * Schedule wallpaper re-application: a polling retry (in case Blocks hasn't
 * mounted yet) combined with a MutationObserver so we re-apply after the
 * Blockly SVG is recreated during normal workspace updates.
 * @param {object} wallpaper theme.wallpaper snapshot.
 * @returns {void}
 */
const scheduleWallpaperApply = wallpaper => {
    stopWallpaperScheduler();

    // Polling fallback for the initial mount window.
    let attempts = 0;
    const maxAttempts = 40; // ~10s with the delay below
    const tick = () => {
        attempts += 1;
        if (tryApplyWallpaper(wallpaper)) {
            tryApplyTransparency(currentWallpaperState.active, currentWallpaperState.opacity);
            return;
        }
        if (attempts >= maxAttempts) {
            return;
        }
        // Exponential backoff capped at 1s.
        const delay = Math.min(1000, 100 * Math.pow(1.4, attempts - 1));
        pendingRetryTimer = setTimeout(tick, delay);
    };
    pendingRetryTimer = setTimeout(tick, 0);

    // Re-apply transparency whenever the Blockly SVG is recreated.
    if (typeof MutationObserver === 'function' && document.body) {
        observerHandle = new MutationObserver(() => {
            if (!currentWallpaperState.active) {
                return;
            }
            if (document.querySelector('svg.blocklySvg')) {
                tryApplyTransparency(true, currentWallpaperState.opacity);
                clearBlocklyWorkspaceOpaqueLayers(true);
            }
        });
        observerHandle.observe(document.body, {childList: true, subtree: true});
    }
};

/**
 * Apply the configured wallpaper (or clear it) to the blocks workspace area.
 * Adapted from MistWarp's `applyWallpaper` but tightened to operate only on
 * the blocks-wrapper element; we no longer paint the body as a fallback
 * because doing so puts the wallpaper behind the menu bar / stage area
 * where it is never visible.
 * @param {object} wallpaper theme.wallpaper snapshot
 */
const applyWallpaper = wallpaper => {
    const opacity = Math.max(0.1, Math.min(1, (wallpaper && wallpaper.opacity) || 0.3));
    currentWallpaperState = {
        active: Boolean(wallpaper && wallpaper.url),
        opacity
    };
    if (currentWallpaperState.active) {
        document.documentElement.style.setProperty('--turbest-wallpaper-opacity', String(opacity));
        document.documentElement.style.setProperty('--wallpaper-opacity', String(opacity));
    } else {
        document.documentElement.style.removeProperty('--turbest-wallpaper-opacity');
        document.documentElement.style.removeProperty('--wallpaper-opacity');
    }

    if (tryApplyWallpaper(wallpaper)) {
        tryApplyTransparency(currentWallpaperState.active, opacity);
        clearBlocklyWorkspaceOpaqueLayers(currentWallpaperState.active);
        stopWallpaperScheduler();
    } else {
        // The blocks wrapper hasn't mounted yet. Schedule re-application; the
        // existing call from the constructor will be replaced with the new
        // wallpaper settings once Blocks comes up.
        scheduleWallpaperApply(wallpaper);
    }
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

    applyWallpaper(theme.wallpaper || {});

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
    applyGuiColors,
    applyWallpaper,
    applyBlocksWorkspaceTransparency,
    clearBlocklyWorkspaceOpaqueLayers,
    BLOCKS_WRAPPER_SELECTOR
};
