/* eslint-disable valid-jsdoc */

import {useCallback, useEffect} from 'react';

const isMacOS = () => typeof navigator !== 'undefined' &&
    /Mac|iPhone|iPad|iPod/.test(
        (navigator.userAgentData && navigator.userAgentData.platform) ||
        navigator.platform ||
        navigator.userAgent ||
        ''
    );

/**
 * @type {{[key: string]: Object}}
 */
export const defaultKeyboardShortcuts = {
    'change-sprite-name': {key: 'F2'},
    'open-backpack': {ctrl: true, key: 'b'},
    'open-editor-settings': {ctrl: true, key: ','},
    'open-extensions': {ctrl: true, key: 'e'},
    'project-full-screen': {alt: true, key: 'Enter'},
    'start-project': {ctrl: true, key: 'Enter'},
    'stop-project': {ctrl: true, shift: true, key: 'Enter'},
    'toggle-sprite-visibility': {ctrl: true, key: 'h'}
};

export const registerKeyboardShortcut = (shortcut, callback) => {
    const handleKeyboardEvent = useCallback(event => {
        // eslint-disable-next-line no-undefined
        if ([null, undefined].includes(shortcut)) return;

        const ctrl = isMacOS() ? event.metaKey : event.ctrlKey;

        if (
            !shortcut.ctrl &&
            !shortcut.alt &&
            event.key !== 'Escape' &&
            ['INPUT', 'TEXTAREA'].includes(event.target.tagName)
        ) return;

        if (
            shortcut.key === event.key &&
            Boolean(shortcut.ctrl) === ctrl &&
            Boolean(shortcut.alt) === event.altKey &&
            Boolean(shortcut.shift) === event.shiftKey
        ) {
            event.preventDefault();
            callback(event);
        }
    }, [shortcut, callback]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyboardEvent);
        return () => document.removeEventListener('keydown', handleKeyboardEvent);
    }, [handleKeyboardEvent]);
};
