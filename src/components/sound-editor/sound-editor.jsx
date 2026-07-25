import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';
import {defineMessages, FormattedMessage, injectIntl, intlShape} from 'react-intl';

/* eslint-disable react/jsx-no-bind, react/no-multi-comp */

import Waveform from '../waveform/waveform.jsx';
import Meter from '../meter/meter.jsx';
import Label from '../forms/label.jsx';
import Input from '../forms/input.jsx';
import TWRenderRecoloredImage from '../../lib/tw-recolor/render.jsx';

import BufferedInputHOC from '../forms/buffered-input-hoc.jsx';
import AudioSelector from '../../containers/audio-selector.jsx';
import IconButton from '../icon-button/icon-button.jsx';
import {SOUND_BYTE_LIMIT} from '../../lib/audio/audio-util.js';

import styles from './sound-editor.css';

import playIcon from './icon--play.svg';
import pauseIcon from './icon--pause.svg';
import stopIcon from './icon--stop.svg';
import redoIcon from '!../../lib/tw-recolor/build!./icon--redo.svg';
import undoIcon from '!../../lib/tw-recolor/build!./icon--undo.svg';
import robotIcon from './icon--robot.svg';
import echoIcon from './icon--echo.svg';
import reverseIcon from './icon--reverse.svg';
import fadeOutIcon from './icon--fade-out.svg';
import fadeInIcon from './icon--fade-in.svg';
import lowPassIcon from './icon--lowpass.svg';
import highPassIcon from './icon--highpass.svg';
import modifyIcon from './icon--modify.svg';
import formatIcon from './icon--format.svg';
import flipIcon from './icon--flip.svg';
import bitcrushIcon from './icon--bitcrush.svg';
import trimIcon from './icon--trim.svg';

import deleteIcon from '!../../lib/tw-recolor/build!./icon--delete.svg';
import copyIcon from '!../../lib/tw-recolor/build!./icon--copy.svg';
import pasteIcon from '!../../lib/tw-recolor/build!./icon--paste.svg';
import copyToNewIcon from '!../../lib/tw-recolor/build!./icon--copy-to-new.svg';

const BufferedInput = BufferedInputHOC(Input);

const messages = defineMessages({
    sound: {
        id: 'gui.soundEditor.sound',
        description: 'Label for the name of the sound',
        defaultMessage: 'Sound'
    },
    play: {
        id: 'gui.soundEditor.play',
        description: 'Title of the button to start playing the sound',
        defaultMessage: 'Play'
    },
    stop: {
        id: 'gui.soundEditor.stop',
        description: 'Title of the button to stop the sound',
        defaultMessage: 'Stop'
    },
    pause: {
        id: 'gui.soundEditor.pause',
        description: 'Title of the button to pause the sound',
        defaultMessage: 'Pause'
    },
    trim: {
        id: 'turbest.soundEditor.trim',
        description: 'Title of the button to keep only the selected audio',
        defaultMessage: 'Trim'
    },
    copy: {
        id: 'gui.soundEditor.copy',
        description: 'Title of the button to copy the sound',
        defaultMessage: 'Copy'
    },
    paste: {
        id: 'gui.soundEditor.paste',
        description: 'Title of the button to paste the sound',
        defaultMessage: 'Paste'
    },
    copyToNew: {
        id: 'gui.soundEditor.copyToNew',
        description: 'Title of the button to copy the selection into a new sound',
        defaultMessage: 'Copy to New'
    },
    delete: {
        id: 'gui.soundEditor.delete',
        description: 'Title of the button to delete the sound',
        defaultMessage: 'Delete'
    },
    save: {
        id: 'gui.soundEditor.save',
        description: 'Title of the button to save trimmed sound',
        defaultMessage: 'Save'
    },
    undo: {
        id: 'gui.soundEditor.undo',
        description: 'Title of the button to undo',
        defaultMessage: 'Undo'
    },
    redo: {
        id: 'gui.soundEditor.redo',
        description: 'Title of the button to redo',
        defaultMessage: 'Redo'
    },
    faster: {
        id: 'gui.soundEditor.faster',
        description: 'Title of the button to apply the faster effect',
        defaultMessage: 'Faster'
    },
    slower: {
        id: 'gui.soundEditor.slower',
        description: 'Title of the button to apply the slower effect',
        defaultMessage: 'Slower'
    },
    echo: {
        id: 'gui.soundEditor.echo',
        description: 'Title of the button to apply the echo effect',
        defaultMessage: 'Echo'
    },
    robot: {
        id: 'gui.soundEditor.robot',
        description: 'Title of the button to apply the robot effect',
        defaultMessage: 'Robot'
    },
    louder: {
        id: 'gui.soundEditor.louder',
        description: 'Title of the button to apply the louder effect',
        defaultMessage: 'Louder'
    },
    softer: {
        id: 'gui.soundEditor.softer',
        description: 'Title of the button to apply thr.softer effect',
        defaultMessage: 'Softer'
    },
    reverse: {
        id: 'gui.soundEditor.reverse',
        description: 'Title of the button to apply the reverse effect',
        defaultMessage: 'Reverse'
    },
    fadeOut: {
        id: 'gui.soundEditor.fadeOut',
        description: 'Title of the button to apply the fade out effect',
        defaultMessage: 'Fade out'
    },
    fadeIn: {
        id: 'gui.soundEditor.fadeIn',
        description: 'Title of the button to apply the fade in effect',
        defaultMessage: 'Fade in'
    },
    mute: {
        id: 'gui.soundEditor.mute',
        description: 'Title of the button to apply the mute effect',
        defaultMessage: 'Mute'
    },
    lowPass: {
        id: 'turbest.soundEditor.lowPass',
        description: 'Title of the button to apply a low-pass filter',
        defaultMessage: 'Low Pass'
    },
    highPass: {
        id: 'turbest.soundEditor.highPass',
        description: 'Title of the button to apply a high-pass filter',
        defaultMessage: 'High Pass'
    },
    lowPassFadeIn: {
        id: 'turbest.soundEditor.lowPassFadeIn',
        description: 'Title of the button to fade a low-pass filter out',
        defaultMessage: 'Low Pass Fade In'
    },
    lowPassFadeOut: {
        id: 'turbest.soundEditor.lowPassFadeOut',
        description: 'Title of the button to fade a low-pass filter in',
        defaultMessage: 'Low Pass Fade Out'
    },
    highPassFadeIn: {
        id: 'turbest.soundEditor.highPassFadeIn',
        description: 'Title of the button to fade a high-pass filter out',
        defaultMessage: 'High Pass Fade In'
    },
    highPassFadeOut: {
        id: 'turbest.soundEditor.highPassFadeOut',
        description: 'Title of the button to fade a high-pass filter in',
        defaultMessage: 'High Pass Fade Out'
    },
    modify: {
        id: 'turbest.soundEditor.modify',
        description: 'Title of the button to modify pitch and volume',
        defaultMessage: 'Modify'
    },
    format: {
        id: 'turbest.soundEditor.format',
        description: 'Title of the button to change sample rate',
        defaultMessage: 'Format'
    },
    filters: {
        id: 'turbest.soundEditor.filters',
        description: 'Title of the menu containing audio filters',
        defaultMessage: 'Filters'
    },
    apply: {
        id: 'turbest.soundEditor.apply',
        description: 'Label for applying an audio filter',
        defaultMessage: 'Apply'
    },
    fadeFilterIn: {
        id: 'turbest.soundEditor.fadeFilterIn',
        description: 'Label for gradually removing an audio filter',
        defaultMessage: 'Fade out filter'
    },
    fadeFilterOut: {
        id: 'turbest.soundEditor.fadeFilterOut',
        description: 'Label for gradually applying an audio filter',
        defaultMessage: 'Fade in filter'
    },
    sampleRate: {
        id: 'turbest.soundEditor.sampleRate',
        description: 'Label for changing a sound sample rate',
        defaultMessage: 'Sample rate'
    },
    flip: {
        id: 'turbest.soundEditor.flip',
        description: 'Title of the button to swap stereo channels',
        defaultMessage: 'Flip L&R'
    },
    bitcrush: {
        id: 'turbest.soundEditor.bitcrush',
        description: 'Title of the bitcrush effect',
        defaultMessage: 'Bitcrush'
    },
    left: {
        id: 'turbest.soundEditor.left',
        description: 'Label for the left audio channel',
        defaultMessage: 'Left'
    },
    right: {
        id: 'turbest.soundEditor.right',
        description: 'Label for the right audio channel',
        defaultMessage: 'Right'
    },
    bitcrushSampleRate: {
        id: 'turbest.soundEditor.bitcrushSampleRate',
        description: 'Accessibility label for the bitcrush sample rate selector',
        defaultMessage: 'Bitcrush sample rate'
    },
    bitcrushBitDepth: {
        id: 'turbest.soundEditor.bitcrushBitDepth',
        description: 'Accessibility label for the bitcrush bit depth selector',
        defaultMessage: 'Bitcrush bit depth'
    }
});

const formatTime = timeSeconds => {
    const minutes = (Math.floor(timeSeconds / 60))
        .toString()
        .padStart(2, '0');
    const seconds = (timeSeconds % 60)
        .toFixed(2)
        .padStart(5, '0');
    return `${minutes}:${seconds}`;
};

const formatDuration = (playheadPercent, trimStartPercent, trimEndPercent, durationSeconds) => {
    // If no selection, the trim is the entire sound.
    trimStartPercent = trimStartPercent === null ? 0 : trimStartPercent;
    trimEndPercent = trimEndPercent === null ? 1 : trimEndPercent;

    // If the playhead doesn't exist, assume it's at the start of the selection.
    playheadPercent = playheadPercent === null ? trimStartPercent : playheadPercent;

    // If selection has zero length, treat it as the entire sound being selected.
    // This happens when the user first clicks to start making a selection.
    const trimSize = (trimEndPercent - trimStartPercent) || 1;
    const trimDuration = trimSize * durationSeconds;

    const progressInTrim = (playheadPercent - trimStartPercent) / trimSize;
    const currentTime = progressInTrim * trimDuration;

    return `${formatTime(currentTime)} / ${formatTime(trimDuration)}`;
};

const formatSoundSize = bytes => {
    if (bytes > 1000 * 1000) {
        return `${(bytes / 1000 / 1000).toFixed(2)}MB`;
    }
    return `${(bytes / 1000).toFixed(2)}KB`;
};

class FilterMenu extends React.Component {
    constructor (props) {
        super(props);
        this.state = {open: false};
        this.handleAction = this.handleAction.bind(this);
        this.handleDocumentMouseDown = this.handleDocumentMouseDown.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleToggle = this.handleToggle.bind(this);
        this.setMenuRef = this.setMenuRef.bind(this);
    }
    componentDidMount () {
        document.addEventListener('mousedown', this.handleDocumentMouseDown);
    }
    componentWillUnmount () {
        document.removeEventListener('mousedown', this.handleDocumentMouseDown);
    }
    setMenuRef (element) {
        this.menu = element;
    }
    handleDocumentMouseDown (event) {
        if (this.state.open && this.menu && !this.menu.contains(event.target)) {
            this.setState({open: false});
        }
    }
    handleKeyDown (event) {
        if (event.key === 'Escape') {
            this.setState({open: false});
        }
    }
    handleToggle () {
        this.setState(({open}) => ({open: !open}));
    }
    handleAction (event) {
        const actions = {
            format: this.props.onFormatSound,
            highPass: this.props.onHighPass,
            highPassFadeIn: this.props.onHighPassFadeIn,
            highPassFadeOut: this.props.onHighPassFadeOut,
            lowPass: this.props.onLowPass,
            lowPassFadeIn: this.props.onLowPassFadeIn,
            lowPassFadeOut: this.props.onLowPassFadeOut
        };
        const action = actions[event.currentTarget.dataset.action];
        this.setState({open: false}, action);
    }
    renderFilterGroup (icon, title, applyAction, fadeInAction, fadeOutAction) {
        const {intl} = this.props;
        return (
            <div className={styles.filterGroup}>
                <div className={styles.filterGroupTitle}>
                    <TWRenderRecoloredImage
                        draggable={false}
                        src={icon}
                    />
                    <span>{intl.formatMessage(title)}</span>
                </div>
                <div className={styles.filterActions}>
                    <button
                        data-action={applyAction}
                        onClick={this.handleAction}
                    >
                        {intl.formatMessage(messages.apply)}
                    </button>
                    <button
                        data-action={fadeInAction}
                        onClick={this.handleAction}
                    >
                        {intl.formatMessage(messages.fadeFilterIn)}
                    </button>
                    <button
                        data-action={fadeOutAction}
                        onClick={this.handleAction}
                    >
                        {intl.formatMessage(messages.fadeFilterOut)}
                    </button>
                </div>
            </div>
        );
    }
    render () {
        const {intl} = this.props;
        return (
            <div
                className={styles.filterMenu}
                ref={this.setMenuRef}
                onKeyDown={this.handleKeyDown}
            >
                <button
                    aria-expanded={this.state.open}
                    aria-haspopup="menu"
                    className={styles.filterMenuTrigger}
                    type="button"
                    onClick={this.handleToggle}
                >
                    <TWRenderRecoloredImage
                        draggable={false}
                        src={lowPassIcon}
                    />
                    <span>{intl.formatMessage(messages.filters)}</span>
                    <span className={styles.filterMenuChevron}>{'▴'}</span>
                </button>
                {this.state.open && (
                    <div
                        className={styles.filterMenuPopover}
                        role="menu"
                    >
                        <div className={styles.filterMenuHeading}>
                            {intl.formatMessage(messages.filters)}
                        </div>
                        {this.renderFilterGroup(
                            lowPassIcon,
                            messages.lowPass,
                            'lowPass',
                            'lowPassFadeIn',
                            'lowPassFadeOut'
                        )}
                        {this.renderFilterGroup(
                            highPassIcon,
                            messages.highPass,
                            'highPass',
                            'highPassFadeIn',
                            'highPassFadeOut'
                        )}
                        <button
                            className={styles.formatMenuItem}
                            data-action="format"
                            onClick={this.handleAction}
                        >
                            <TWRenderRecoloredImage
                                draggable={false}
                                src={formatIcon}
                            />
                            <span>{intl.formatMessage(messages.sampleRate)}</span>
                        </button>
                    </div>
                )}
            </div>
        );
    }
}

FilterMenu.propTypes = {
    intl: intlShape.isRequired,
    onFormatSound: PropTypes.func.isRequired,
    onHighPass: PropTypes.func.isRequired,
    onHighPassFadeIn: PropTypes.func.isRequired,
    onHighPassFadeOut: PropTypes.func.isRequired,
    onLowPass: PropTypes.func.isRequired,
    onLowPassFadeIn: PropTypes.func.isRequired,
    onLowPassFadeOut: PropTypes.func.isRequired
};

class BitcrushEffect extends React.Component {
    constructor (props) {
        super(props);
        this.state = {
            bitDepth: 4,
            sampleRate: 11025
        };
    }
    render () {
        const {intl} = this.props;
        return (
            <div className={styles.parameterEffect}>
                <IconButton
                    className={styles.effectButton}
                    img={bitcrushIcon}
                    title={this.props.title}
                    onClick={() => this.props.onApply(this.state.sampleRate, this.state.bitDepth)}
                />
                <div className={styles.bitcrushSettings}>
                    <select
                        aria-label={intl.formatMessage(messages.bitcrushSampleRate)}
                        className={styles.effectSelect}
                        value={this.state.sampleRate}
                        onChange={event => this.setState({sampleRate: Number(event.target.value)})}
                    >
                        {[22050, 11025, 8000, 4000].map(rate => (
                            <option
                                key={rate}
                                value={rate}
                            >
                                {`${rate} Hz`}
                            </option>
                        ))}
                    </select>
                    <select
                        aria-label={intl.formatMessage(messages.bitcrushBitDepth)}
                        className={styles.effectSelect}
                        value={this.state.bitDepth}
                        onChange={event => this.setState({bitDepth: Number(event.target.value)})}
                    >
                        {[8, 6, 4, 2].map(depth => (
                            <option
                                key={depth}
                                value={depth}
                            >
                                {`${depth} bit`}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        );
    }
}

BitcrushEffect.propTypes = {
    intl: intlShape.isRequired,
    onApply: PropTypes.func.isRequired,
    title: PropTypes.node.isRequired
};

const IntlBitcrushEffect = injectIntl(BitcrushEffect);

const getMeterLevel = props => {
    if (!props.chunkLevels.length || !props.chunkLevels[0].length) return 0;
    const chunkCount = props.chunkLevels[0].length;
    const index = Math.min(chunkCount - 1, Math.floor(props.playhead * chunkCount));
    return props.playing ? Math.max(...props.chunkLevels.map(channel => channel[index] || 0)) : 0;
};

const timeSteps = duration => Array.from({length: 11}, (_, index) => ({
    left: index * 10,
    time: duration * index / 10
}));

class SoundEditor extends React.Component {
    render () {
        const props = this.props;
        const channelCount = props.chunkLevels.length;
        return (
            <div
                className={styles.editorContainer}
                ref={props.setRef}
                onMouseDown={props.onContainerClick}
            >
                <div className={styles.row}>
                    <div className={styles.inputGroup}>
                        <Label text={props.intl.formatMessage(messages.sound)}>
                            <BufferedInput
                                className={styles.nameInput}
                                tabIndex="1"
                                type="text"
                                value={props.name}
                                onSubmit={props.onChangeName}
                            />
                        </Label>
                        <div className={styles.buttonGroup}>
                            <button
                                className={styles.button}
                                disabled={!props.canUndo}
                                title={props.intl.formatMessage(messages.undo)}
                                onClick={props.onUndo}
                            >
                                <TWRenderRecoloredImage
                                    className={styles.undoIcon}
                                    draggable={false}
                                    src={undoIcon}
                                />
                            </button>
                            <button
                                className={styles.button}
                                disabled={!props.canRedo}
                                title={props.intl.formatMessage(messages.redo)}
                                onClick={props.onRedo}
                            >
                                <TWRenderRecoloredImage
                                    className={styles.redoIcon}
                                    draggable={false}
                                    src={redoIcon}
                                />
                            </button>
                        </div>
                    </div>
                    <div className={styles.inputGroup}>
                        <IconButton
                            className={styles.toolButton}
                            img={copyIcon}
                            title={props.intl.formatMessage(messages.copy)}
                            onClick={props.onCopy}
                        />
                        <IconButton
                            className={styles.toolButton}
                            disabled={props.canPaste === false}
                            img={pasteIcon}
                            title={props.intl.formatMessage(messages.paste)}
                            onClick={props.onPaste}
                        />
                        <IconButton
                            className={classNames(styles.toolButton, styles.flipInRtl)}
                            img={copyToNewIcon}
                            title={props.intl.formatMessage(messages.copyToNew)}
                            onClick={props.onCopyToNew}
                        />
                    </div>
                    <IconButton
                        className={styles.toolButton}
                        disabled={props.trimStart === null}
                        img={deleteIcon}
                        title={props.intl.formatMessage(messages.delete)}
                        onClick={props.onDelete}
                    />
                    <IconButton
                        className={styles.toolButton}
                        disabled={props.trimStart === null}
                        img={trimIcon}
                        title={props.intl.formatMessage(messages.trim)}
                        onClick={props.onDeleteInverse}
                    />
                </div>
                <div className={styles.audioRow}>
                    <div className={styles.meter}>
                        <Meter
                            height={172}
                            level={getMeterLevel(props)}
                            width={20}
                        />
                    </div>
                    <div className={styles.audioContainer}>
                        <div
                            className={styles.timeSteps}
                            ref={props.setTimeStepsRef}
                            onMouseDown={props.onTimeStepMouseDown}
                            onMouseMove={props.onTimeStepMouseMove}
                        >
                            {timeSteps(props.duration).map(step => (
                                <div
                                    className={styles.timeStep}
                                    key={step.left}
                                    style={{left: `${step.left}%`}}
                                >
                                    <span>{formatTime(step.time)}</span>
                                </div>
                            ))}
                        </div>
                        <div className={styles.waveformContainer}>
                            <div className={styles.waveformInside}>
                                {props.chunkLevels.map((levels, channel) => (
                                    <div
                                        className={styles.waveformChannel}
                                        key={channel}
                                    >
                                        {channelCount > 1 && (
                                            <span className={styles.channelLabel}>
                                                {props.intl.formatMessage(
                                                    channel === 0 ? messages.left : messages.right
                                                )}
                                            </span>
                                        )}
                                        <Waveform
                                            data={levels}
                                            height={channelCount > 1 ? 80 : 160}
                                            preferences={props.preferences}
                                            width={600}
                                        />
                                    </div>
                                ))}
                            </div>
                            <AudioSelector
                                channelCount={channelCount}
                                playhead={props.playhead}
                                trimChannel={props.trimChannel}
                                trimEnd={props.trimEnd}
                                trimStart={props.trimStart}
                                onSetTrim={props.onSetTrim}
                                onSetTrimChannel={props.onSetTrimChannel}
                                onUpdatePlayhead={props.onUpdatePlayhead}
                            />
                        </div>
                    </div>
                </div>
                <div className={classNames(styles.row, styles.transportRow)}>
                    <div className={styles.transport}>
                        <button
                            className={styles.roundButton}
                            title={props.intl.formatMessage(props.playing ? messages.pause : messages.play)}
                            onClick={props.playing ? props.onPause : props.onPlay}
                        >
                            <img
                                draggable={false}
                                src={props.playing ? pauseIcon : playIcon}
                            />
                        </button>
                        <button
                            className={classNames(styles.roundButton, styles.stopButton)}
                            title={props.intl.formatMessage(messages.stop)}
                            onClick={props.onStop}
                        >
                            <img
                                draggable={false}
                                src={stopIcon}
                            />
                        </button>
                    </div>
                    <div className={styles.effects}>
                        <IconButton
                            className={styles.effectButton}
                            img={fadeInIcon}
                            title={<FormattedMessage {...messages.fadeIn} />}
                            onClick={props.onFadeIn}
                        />
                        <IconButton
                            className={styles.effectButton}
                            img={fadeOutIcon}
                            title={<FormattedMessage {...messages.fadeOut} />}
                            onClick={props.onFadeOut}
                        />
                        <IconButton
                            className={styles.effectButton}
                            img={reverseIcon}
                            title={<FormattedMessage {...messages.reverse} />}
                            onClick={props.onReverse}
                        />
                        <IconButton
                            className={styles.effectButton}
                            img={robotIcon}
                            title={<FormattedMessage {...messages.robot} />}
                            onClick={props.onRobot}
                        />
                        <IconButton
                            className={styles.effectButton}
                            img={echoIcon}
                            title={<FormattedMessage {...messages.echo} />}
                            onClick={props.onEcho}
                        />
                        <IconButton
                            className={styles.effectButton}
                            disabled={!props.isStereo}
                            img={flipIcon}
                            title={<FormattedMessage {...messages.flip} />}
                            onClick={props.onFlip}
                        />
                        <IntlBitcrushEffect
                            title={<FormattedMessage {...messages.bitcrush} />}
                            onApply={props.onBitcrush}
                        />
                        <IconButton
                            className={styles.effectButton}
                            img={modifyIcon}
                            title={<FormattedMessage {...messages.modify} />}
                            onClick={props.onModifySound}
                        />
                        <FilterMenu
                            intl={props.intl}
                            onFormatSound={props.onFormatSound}
                            onHighPass={props.onHighPass}
                            onHighPassFadeIn={props.onHighPassFadeIn}
                            onHighPassFadeOut={props.onHighPassFadeOut}
                            onLowPass={props.onLowPass}
                            onLowPassFadeIn={props.onLowPassFadeIn}
                            onLowPassFadeOut={props.onLowPassFadeOut}
                        />
                    </div>
                </div>
                <div className={styles.infoRow}>
                    <div className={styles.duration}>
                        {formatDuration(props.playhead, props.trimStart, props.trimEnd, props.duration)}
                    </div>
                    <div className={styles.advancedInfo}>
                        {`${Math.round(props.sampleRate)} Hz · `}
                        {props.isStereo ? (
                            <FormattedMessage
                                defaultMessage="Stereo"
                                description="Refers to a 'Stereo Sound' (2 channels)"
                                id="tw.stereo"
                            />
                        ) : (
                            <FormattedMessage
                                defaultMessage="Mono"
                                description="Refers to a 'Mono Sound' (1 channel)"
                                id="tw.mono"
                            />
                        )}
                        {` · ${formatSoundSize(props.size)}`}
                    </div>
                </div>
                {props.size >= SOUND_BYTE_LIMIT && (
                    <div className={classNames(styles.alert, styles.tooLarge)}>
                        <FormattedMessage
                            defaultMessage="This sound may be too large to upload to Scratch."
                            description="Message that appears when a sound exceeds the Scratch sound size limit."
                            id="tw.tooLarge"
                        />
                    </div>
                )}
            </div>
        );
    }
}

SoundEditor.propTypes = {
    isStereo: PropTypes.bool.isRequired,
    duration: PropTypes.number.isRequired,
    size: PropTypes.number.isRequired,
    canPaste: PropTypes.bool.isRequired,
    canRedo: PropTypes.bool.isRequired,
    canUndo: PropTypes.bool.isRequired,
    chunkLevels: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)).isRequired,
    intl: intlShape,
    name: PropTypes.string.isRequired,
    preferences: PropTypes.object, // eslint-disable-line react/forbid-prop-types
    onChangeName: PropTypes.func.isRequired,
    onContainerClick: PropTypes.func.isRequired,
    onCopy: PropTypes.func.isRequired,
    onCopyToNew: PropTypes.func.isRequired,
    onDelete: PropTypes.func,
    onDeleteInverse: PropTypes.func.isRequired,
    onBitcrush: PropTypes.func.isRequired,
    onEcho: PropTypes.func.isRequired,
    onFormatSound: PropTypes.func.isRequired,
    onFlip: PropTypes.func.isRequired,
    onFadeIn: PropTypes.func.isRequired,
    onFadeOut: PropTypes.func.isRequired,
    onFaster: PropTypes.func.isRequired,
    onHighPass: PropTypes.func.isRequired,
    onHighPassFadeIn: PropTypes.func.isRequired,
    onHighPassFadeOut: PropTypes.func.isRequired,
    onLouder: PropTypes.func.isRequired,
    onMute: PropTypes.func.isRequired,
    onLowPass: PropTypes.func.isRequired,
    onLowPassFadeIn: PropTypes.func.isRequired,
    onLowPassFadeOut: PropTypes.func.isRequired,
    onModifySound: PropTypes.func.isRequired,
    onPaste: PropTypes.func.isRequired,
    onPause: PropTypes.func.isRequired,
    onPlay: PropTypes.func.isRequired,
    onRedo: PropTypes.func.isRequired,
    onReverse: PropTypes.func.isRequired,
    onRobot: PropTypes.func.isRequired,
    onSetTrim: PropTypes.func,
    onSetTrimChannel: PropTypes.func.isRequired,
    onSlower: PropTypes.func.isRequired,
    onSofter: PropTypes.func.isRequired,
    onStop: PropTypes.func.isRequired,
    onTimeStepMouseDown: PropTypes.func.isRequired,
    onTimeStepMouseMove: PropTypes.func.isRequired,
    onUndo: PropTypes.func.isRequired,
    onUpdatePlayhead: PropTypes.func.isRequired,
    playhead: PropTypes.number,
    playing: PropTypes.bool.isRequired,
    sampleRate: PropTypes.number.isRequired,
    setRef: PropTypes.func,
    setTimeStepsRef: PropTypes.func,
    tooLoud: PropTypes.bool.isRequired,
    trimEnd: PropTypes.number,
    trimStart: PropTypes.number,
    trimChannel: PropTypes.arrayOf(PropTypes.bool).isRequired
};

export default injectIntl(SoundEditor);
