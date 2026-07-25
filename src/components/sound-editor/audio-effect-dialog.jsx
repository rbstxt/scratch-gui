import PropTypes from 'prop-types';
import React from 'react';
import {defineMessages, FormattedMessage, injectIntl, intlShape} from 'react-intl';

import Modal from '../../containers/modal.jsx';
import Input from '../forms/input.jsx';

import styles from './audio-effect-dialog.css';

const messages = defineMessages({
    modifyTitle: {
        id: 'turbest.soundEditor.modifyTitle',
        description: 'Title of the sound pitch and volume dialog',
        defaultMessage: 'Adjust sound'
    },
    pitch: {
        id: 'turbest.soundEditor.pitch',
        description: 'Label for sound pitch input',
        defaultMessage: 'Pitch'
    },
    volume: {
        id: 'turbest.soundEditor.volume',
        description: 'Label for sound volume input',
        defaultMessage: 'Volume'
    },
    sampleRateTitle: {
        id: 'turbest.soundEditor.sampleRateTitle',
        description: 'Title of the sound sample rate dialog',
        defaultMessage: 'Sample rate'
    },
    sampleRate: {
        id: 'turbest.soundEditor.sampleRateInput',
        description: 'Label for sound sample rate input',
        defaultMessage: 'Sample rate'
    },
    range: {
        id: 'turbest.soundEditor.range',
        description: 'Label for choosing which part of a sound to modify',
        defaultMessage: 'Apply to'
    },
    wholeSound: {
        id: 'turbest.soundEditor.wholeSound',
        description: 'Option to modify an entire sound',
        defaultMessage: 'Entire sound'
    },
    selection: {
        id: 'turbest.soundEditor.selection',
        description: 'Option to modify only the selected part of a sound',
        defaultMessage: 'Selection only'
    },
    invalidValue: {
        id: 'turbest.soundEditor.invalidValue',
        description: 'Error shown when a sound setting is outside its allowed range',
        defaultMessage: 'Enter a value within the allowed range.'
    }
});

class AudioEffectDialog extends React.Component {
    constructor (props) {
        super(props);
        this.state = {
            pitch: '0',
            volume: '100',
            sampleRate: String(props.sampleRate),
            wholeSound: true
        };
        this.handleChange = this.handleChange.bind(this);
        this.handleSelectSelection = this.handleSelectSelection.bind(this);
        this.handleSelectWholeSound = this.handleSelectWholeSound.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }
    handleChange (event) {
        const {name, value} = event.target;
        this.setState({[name]: value});
    }
    handleSelectSelection () {
        this.setState({wholeSound: false});
    }
    handleSelectWholeSound () {
        this.setState({wholeSound: true});
    }
    handleSubmit (event) {
        event.preventDefault();
        if (!this.isValid()) return;

        if (this.props.mode === 'modify') {
            this.props.onSubmit({
                pitch: Number(this.state.pitch),
                volume: Number(this.state.volume)
            });
        } else {
            this.props.onSubmit({
                sampleRate: Math.floor(Number(this.state.sampleRate)),
                wholeSound: this.state.wholeSound
            });
        }
    }
    isValid () {
        if (this.props.mode === 'modify') {
            const pitch = Number(this.state.pitch);
            const volume = Number(this.state.volume);
            return this.state.pitch !== '' && this.state.volume !== '' &&
                Number.isFinite(pitch) && pitch >= -360 && pitch <= 360 &&
                Number.isFinite(volume) && volume >= 0 && volume <= 200;
        }
        const sampleRate = Number(this.state.sampleRate);
        return this.state.sampleRate !== '' && Number.isFinite(sampleRate) &&
            sampleRate >= 3000 && sampleRate <= 384000;
    }
    renderNumberField (name, label, min, max, unit, autoFocus) {
        return (
            <label className={styles.field}>
                <span className={styles.fieldLabel}>{label}</span>
                <div className={styles.inputRow}>
                    <Input
                        autoFocus={autoFocus}
                        className={styles.numberInput}
                        max={max}
                        min={min}
                        name={name}
                        step="1"
                        type="number"
                        value={this.state[name]}
                        onChange={this.handleChange}
                    />
                    <span className={styles.unit}>{unit}</span>
                </div>
                <span className={styles.hint}>{`${min}–${max} ${unit}`}</span>
            </label>
        );
    }
    render () {
        const {intl, mode} = this.props;
        const valid = this.isValid();
        const title = intl.formatMessage(mode === 'modify' ? messages.modifyTitle : messages.sampleRateTitle);
        return (
            <Modal
                className={styles.modalContent}
                contentLabel={title}
                id="audioEffectDialog"
                onRequestClose={this.props.onCancel}
            >
                <form
                    className={styles.body}
                    onSubmit={this.handleSubmit}
                >
                    {mode === 'modify' ? (
                        <React.Fragment>
                            {this.renderNumberField(
                                'pitch', intl.formatMessage(messages.pitch), -360, 360, '', true
                            )}
                            {this.renderNumberField(
                                'volume', intl.formatMessage(messages.volume), 0, 200, '%', false
                            )}
                        </React.Fragment>
                    ) : (
                        <React.Fragment>
                            {this.renderNumberField(
                                'sampleRate', intl.formatMessage(messages.sampleRate), 3000, 384000, 'Hz', true
                            )}
                            {this.props.hasSelection && (
                                <fieldset className={styles.rangeGroup}>
                                    <legend>{intl.formatMessage(messages.range)}</legend>
                                    <label>
                                        <input
                                            checked={this.state.wholeSound}
                                            name="wholeSound"
                                            type="radio"
                                            onChange={this.handleSelectWholeSound}
                                        />
                                        <span>{intl.formatMessage(messages.wholeSound)}</span>
                                    </label>
                                    <label>
                                        <input
                                            checked={!this.state.wholeSound}
                                            name="wholeSound"
                                            type="radio"
                                            onChange={this.handleSelectSelection}
                                        />
                                        <span>{intl.formatMessage(messages.selection)}</span>
                                    </label>
                                </fieldset>
                            )}
                        </React.Fragment>
                    )}
                    {!valid && (
                        <div className={styles.error}>
                            {intl.formatMessage(messages.invalidValue)}
                        </div>
                    )}
                    <div className={styles.buttonRow}>
                        <button
                            className={styles.cancelButton}
                            type="button"
                            onClick={this.props.onCancel}
                        >
                            <FormattedMessage
                                defaultMessage="Cancel"
                                description="Button in prompt for cancelling the dialog"
                                id="gui.prompt.cancel"
                            />
                        </button>
                        <button
                            className={styles.okButton}
                            disabled={!valid}
                            type="submit"
                        >
                            <FormattedMessage
                                defaultMessage="OK"
                                description="Button in prompt for confirming the dialog"
                                id="gui.prompt.ok"
                            />
                        </button>
                    </div>
                </form>
            </Modal>
        );
    }
}

AudioEffectDialog.propTypes = {
    hasSelection: PropTypes.bool.isRequired,
    intl: intlShape.isRequired,
    mode: PropTypes.oneOf(['modify', 'format']).isRequired,
    onCancel: PropTypes.func.isRequired,
    onSubmit: PropTypes.func.isRequired,
    sampleRate: PropTypes.number.isRequired
};

export default injectIntl(AudioEffectDialog);
