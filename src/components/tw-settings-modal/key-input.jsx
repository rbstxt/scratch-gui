import React from 'react';
import PropTypes from 'prop-types';
import bindAll from 'lodash.bindall';
import {FormattedMessage} from 'react-intl';
import styles from './key-input.css';

const isMacOS = () => typeof navigator !== 'undefined' &&
    /Mac|iPhone|iPad|iPod/.test(
        (navigator.userAgentData && navigator.userAgentData.platform) ||
        navigator.platform ||
        navigator.userAgent ||
        ''
    );

const formatKey = key => key.toUpperCase()
    .replace('ENTER', 'Enter')
    .replace(' ', 'Space');

class Shortcut {
    constructor (object) {
        this.ctrl = object.ctrl;
        this.shift = object.shift;
        this.alt = object.alt;
        this.key = object.key;
    }

    toString () {
        if (isMacOS()) {
            return [
                this.shift ? '⇧' : false,
                this.ctrl ? '⌘' : false,
                this.alt ? '⌥' : false,
                formatKey(this.key)
            ].filter(Boolean).join('+');
        }
        return [
            this.shift ? 'Shift' : false,
            this.ctrl ? 'Ctrl' : false,
            this.alt ? 'Alt' : false,
            formatKey(this.key)
        ].filter(Boolean).join('+');
    }

    toJSON () {
        return {
            ctrl: this.ctrl,
            shift: this.shift,
            alt: this.alt,
            key: this.key
        };
    }
}

class KeyInput extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleChange',
            'handleClick'
        ]);
        this.state = {
            listening: false,
            shortcut: props.shortcut ? new Shortcut(props.shortcut) : null
        };
    }

    handleChange (e) {
        let shortcut;
        if (e.key === 'Backspace') {
            shortcut = null;
        } else if (e.key !== 'Escape') {
            shortcut = new Shortcut({
                // `ctrl` is the platform's primary shortcut modifier: Ctrl on
                // Windows/Linux and Command on macOS. Existing keymaps keep the
                // same JSON schema while becoming native to each platform.
                ctrl: isMacOS() ? e.metaKey : e.ctrlKey,
                shift: e.shiftKey,
                alt: e.altKey,
                key: e.key
            });
        }
        if (!['Backspace', 'Escape'].includes(e.key)) this.props.onChange(shortcut);
        this.setState({listening: false, shortcut});
    }

    handleClick () {
        const listener = e => {
            e.preventDefault();
            if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;
            document.removeEventListener('keydown', listener);
            this.handleChange(e);
        };

        this.setState({listening: true});
        document.addEventListener('keydown', listener);
    }

    render () {
        return (
            <button
                className={styles.container}
                onClick={this.handleClick}
            >
                {this.state.listening ? (
                    <FormattedMessage
                        defaultMessage="Listening..."
                        id="nb.keyInput.listening"
                    />
                ) : this.state.shortcut ? (
                    <span>{this.state.shortcut.toString()}</span>
                ) : (
                    <FormattedMessage
                        defaultMessage="Not set"
                        id="nb.keyInput.none"
                    />
                )}
            </button>
        );
    }
}

KeyInput.propTypes = {
    shortcut: PropTypes.object, // eslint-disable-line react/forbid-prop-types
    onChange: PropTypes.func
};

export default KeyInput;
