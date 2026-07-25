import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import VM from 'scratch-vm';

import {connect} from 'react-redux';

import {
    computeChunkedRMSByChannel,
    encodeAndAddSoundToVM,
    dropEveryOtherSample
} from '../lib/audio/audio-util.js';
import AudioEffects from '../lib/audio/audio-effects.js';
import SoundEditorComponent from '../components/sound-editor/sound-editor.jsx';
import AudioEffectDialog from '../components/sound-editor/audio-effect-dialog.jsx';
import AudioBufferPlayer from '../lib/audio/audio-buffer-player.js';
import log from '../lib/log.js';
// eslint-disable-next-line import/default
import EncoderWorker from 'worker-loader!../lib/nb-encode-mp3-worker.js';

const UNDO_STACK_SIZE = 99;

const MAX_RMS = 1.2;

class SoundEditor extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'copy',
            'copyCurrentBuffer',
            'handleCopyToNew',
            'handleStoppedPlaying',
            'handleChangeName',
            'handlePlay',
            'handlePause',
            'handleStopPlaying',
            'handleUpdatePlayhead',
            'handleDelete',
            'handleDeleteInverse',
            'handleUpdateTrim',
            'handleSetTrimChannel',
            'handleTimeStepMouseDown',
            'handleTimeStepMouseMove',
            'handleBitcrush',
            'handleEffect',
            'handleModifyMenu',
            'handleFormatMenu',
            'handleCloseEffectDialog',
            'handleSubmitModify',
            'handleSubmitFormat',
            'handleUndo',
            'handleRedo',
            'submitNewSamples',
            'handleCopy',
            'handlePaste',
            'paste',
            'handleKeyPress',
            'handleContainerClick',
            'setRef',
            'setTimeStepsRef',
            'resampleBufferToRate'
        ]);
        this.state = {
            copyBuffer: null,
            chunkLevels: computeChunkedRMSByChannel(this.props.channelData),
            effectDialog: null,
            playhead: 0,
            playing: false,
            trimChannel: [false, false],
            trimStart: null,
            trimEnd: null
        };

        this.redoStack = [];
        this.undoStack = [];

        this.ref = null;
        this.timeStepsRef = null;
    }
    componentDidMount () {
        this.audioBufferPlayer = new AudioBufferPlayer(this.props.channelData, this.props.sampleRate);

        document.addEventListener('keydown', this.handleKeyPress);
    }
    componentWillReceiveProps (newProps) {
        if (newProps.soundId !== this.props.soundId) { // A different sound has been selected
            this.redoStack = [];
            this.undoStack = [];
            this.resetState(newProps.channelData, newProps.sampleRate);
            this.setState({
                playhead: 0,
                playing: false,
                trimChannel: [false, false],
                trimStart: null,
                trimEnd: null
            });
        }
    }
    componentWillUnmount () {
        this.audioBufferPlayer.stop();

        document.removeEventListener('keydown', this.handleKeyPress);
    }
    handleKeyPress (event) {
        if (event.target instanceof HTMLInputElement) {
            // Ignore keyboard shortcuts if a text input field is focused
            return;
        }
        if (this.props.isFullScreen) {
            // Ignore keyboard shortcuts if the stage is fullscreen mode
            return;
        }
        if (event.key === ' ') {
            event.preventDefault();
            if (this.state.playing) {
                this.handlePause();
            } else {
                this.handlePlay();
            }
        }
        if (event.key === 'Delete' || event.key === 'Backspace') {
            event.preventDefault();
            if (event.shiftKey) {
                this.handleDeleteInverse();
            } else {
                this.handleDelete();
            }
        }
        if (event.key === 'Escape') {
            event.preventDefault();
            this.handleUpdateTrim(null, null);
        }
        if (event.metaKey || event.ctrlKey) {
            if (event.shiftKey && event.key.toLowerCase() === 'z') {
                event.preventDefault();
                if (this.redoStack.length > 0) {
                    this.handleRedo();
                }
            } else if (event.key === 'z') {
                if (this.undoStack.length > 0) {
                    event.preventDefault();
                    this.handleUndo();
                }
            } else if (event.key === 'c') {
                event.preventDefault();
                this.handleCopy();
            } else if (event.key === 'v') {
                event.preventDefault();
                this.handlePaste();
            } else if (event.key === 'a') {
                event.preventDefault();
                this.handleUpdateTrim(0, 1);
            }
        }
    }
    resetState (channelData, sampleRate) {
        this.audioBufferPlayer.stop();
        this.audioBufferPlayer = new AudioBufferPlayer(channelData, sampleRate);
        this.setState({
            chunkLevels: computeChunkedRMSByChannel(channelData),
            playhead: 0,
            playing: false
        });
    }
    submitNewSamples (channelData, sampleRate, skipUndo) {
        return new Promise((resolve, reject) => {
            const encoderWorker = new EncoderWorker();
            encoderWorker.onerror = reject;
            encoderWorker.onmessage = ({data}) => {
                encoderWorker.terminate();
                resolve(data);
            };
            encoderWorker.postMessage({
                channel1Samples: channelData[0],
                channel2Samples: channelData[1] || null,
                sampleRate,
                bitRate: this.props.preferences['encoding-bit-rate'] ?? 128
            });
        })
            .then(mp3Buffer => {
                if (!skipUndo) {
                    this.redoStack = [];
                    if (this.undoStack.length >= UNDO_STACK_SIZE) {
                        this.undoStack.shift(); // Drop the first element off the array
                    }
                    this.undoStack.push(this.getUndoItem());
                }
                this.resetState(channelData, sampleRate);
                this.props.vm.updateSoundBuffer(
                    this.props.soundIndex,
                    this.audioBufferPlayer.buffer,
                    new Uint8Array(mp3Buffer));
                return true; // Edit was successful
            })
            .catch(e => {
                // Encoding failed, or the sound was too large to save so edit is rejected
                log.error(`Encountered error while trying to encode sound update: ${e.message}`);
                return false; // Edit was not applied
            });
    }
    handlePlay () {
        this.audioBufferPlayer.stop();
        const selectionStart = this.state.trimStart === null ? 0 : this.state.trimStart;
        const selectionEnd = this.state.trimEnd === null ? 1 : this.state.trimEnd;
        const clampedPlayhead = Math.max(selectionStart, Math.min(selectionEnd, this.state.playhead));
        const playhead = clampedPlayhead >= selectionEnd ? selectionStart : clampedPlayhead;
        this.audioBufferPlayer.play(
            playhead,
            selectionEnd,
            this.handleUpdatePlayhead,
            this.handleStoppedPlaying);
        this.setState({playing: true, playhead});
    }
    handlePause () {
        this.audioBufferPlayer.stop();
        this.setState({playing: false});
    }
    handleStopPlaying () {
        this.audioBufferPlayer.stop();
        this.setState({
            playing: false,
            playhead: this.state.trimStart === null ? 0 : this.state.trimStart
        });
    }
    handleStoppedPlaying () {
        this.setState({
            playing: false,
            playhead: this.state.trimStart === null ? 0 : this.state.trimStart
        });
    }
    handleUpdatePlayhead (playhead) {
        this.setState({playhead});
    }
    handleChangeName (name) {
        this.props.vm.renameSound(this.props.soundIndex, name);
    }
    handleDelete () {
        const {channelData, sampleRate} = this.copyCurrentBuffer();
        const sampleCount = channelData[0].length;
        const startIndex = Math.floor(this.state.trimStart * sampleCount);
        const endIndex = Math.floor(this.state.trimEnd * sampleCount);
        const newChannelData = channelData.map(samples => {
            const firstPart = samples.slice(0, startIndex);
            const secondPart = samples.slice(endIndex, sampleCount);
            const newLength = firstPart.length + secondPart.length;
            const newSamples = new Float32Array(Math.max(1, newLength));
            newSamples.set(firstPart, 0);
            newSamples.set(secondPart, firstPart.length);
            return newSamples;
        });
        this.submitNewSamples(newChannelData, sampleRate).then(() => {
            this.setState({
                trimStart: null,
                trimEnd: null
            });
        });
    }
    handleDeleteInverse () {
        // Delete everything outside of the trimmers
        const {channelData, sampleRate} = this.copyCurrentBuffer();
        const sampleCount = channelData[0].length;
        const startIndex = Math.floor(this.state.trimStart * sampleCount);
        const endIndex = Math.floor(this.state.trimEnd * sampleCount);
        const clippedChannelData = channelData.map(samples => {
            const clippedSamples = samples.slice(startIndex, endIndex);
            return clippedSamples.length === 0 ? new Float32Array(1) : clippedSamples;
        });
        this.submitNewSamples(clippedChannelData, sampleRate).then(success => {
            if (success) {
                this.setState({
                    trimStart: null,
                    trimEnd: null
                });
            }
        });
    }
    handleUpdateTrim (trimStart, trimEnd) {
        this.audioBufferPlayer.stop();
        this.setState({
            trimStart,
            trimEnd,
            playhead: trimStart === null ? 0 : trimStart,
            playing: false
        });
    }
    handleSetTrimChannel (trimChannel) {
        this.setState({trimChannel});
    }
    handleTimeStepMouseDown (event) {
        if (!this.timeStepsRef) return;
        const {left, width} = this.timeStepsRef.getBoundingClientRect();
        const selectionStart = this.state.trimStart === null ? 0 : this.state.trimStart;
        const selectionEnd = this.state.trimEnd === null ? 1 : this.state.trimEnd;
        const playhead = Math.max(selectionStart, Math.min(
            selectionEnd,
            (event.clientX - left) / width
        ));
        const wasPlaying = this.state.playing;
        this.audioBufferPlayer.stop();
        this.setState({playhead, playing: false}, wasPlaying ? this.handlePlay : null);
    }
    handleTimeStepMouseMove (event) {
        if (event.buttons === 1) {
            this.handleTimeStepMouseDown(event);
        }
    }
    handleBitcrush (sampleRate, bitDepth) {
        this.handleEffect({
            preset: AudioEffects.effectTypes.BITCRUSH,
            sampleRate,
            bitDepth
        });
    }
    effectFactory (name) {
        return () => this.handleEffect(name);
    }
    handleModifyMenu () {
        this.setState({effectDialog: 'modify'});
    }
    handleFormatMenu () {
        this.setState({effectDialog: 'format'});
    }
    handleCloseEffectDialog () {
        this.setState({effectDialog: null});
    }
    handleSubmitModify ({pitch, volume}) {
        this.setState({effectDialog: null});
        this.handleEffect({
            preset: AudioEffects.effectTypes.MODIFY,
            pitch: pitch * 10,
            volume: volume / 100
        });
    }
    handleSubmitFormat ({sampleRate, wholeSound}) {
        this.setState({effectDialog: null});
        const currentBuffer = this.copyCurrentBuffer();
        if (wholeSound || this.state.trimStart === null) {
            this.resampleBufferToRate(currentBuffer, sampleRate)
                .then(buffer => this.submitNewSamples(buffer.channelData, buffer.sampleRate));
            return;
        }

        const currentRate = currentBuffer.sampleRate;
        const sampleCount = currentBuffer.channelData[0].length;
        const startIndex = Math.floor(this.state.trimStart * sampleCount);
        const endIndex = Math.floor(this.state.trimEnd * sampleCount);
        const selection = {
            channelData: currentBuffer.channelData.map(samples => samples.slice(startIndex, endIndex)),
            sampleRate: currentRate
        };
        this.resampleBufferToRate(selection, sampleRate)
            .then(buffer => this.resampleBufferToRate(buffer, currentRate))
            .then(buffer => {
                const formattedChannelData = currentBuffer.channelData.map((samples, channel) => {
                    const formatted = new Float32Array(samples);
                    const replacement = buffer.channelData[channel];
                    formatted.set(replacement.subarray(0, endIndex - startIndex), startIndex);
                    return formatted;
                });
                return this.submitNewSamples(formattedChannelData, currentRate);
            });
    }
    copyCurrentBuffer () {
        // Cannot reliably use prop channel data because it gets detached by Firefox.
        return {
            channelData: Array.from(
                {length: this.audioBufferPlayer.buffer.numberOfChannels},
                (_, channel) => this.audioBufferPlayer.buffer.getChannelData(channel)
            ),
            sampleRate: this.audioBufferPlayer.buffer.sampleRate
        };
    }
    handleEffect (name) {
        const trimStart = this.state.trimStart === null ? 0.0 : this.state.trimStart;
        const trimEnd = this.state.trimEnd === null ? 1.0 : this.state.trimEnd;

        // Offline audio context needs at least 2 samples
        if (this.audioBufferPlayer.buffer.length < 2) {
            return;
        }

        const effects = new AudioEffects(
            this.audioBufferPlayer.buffer,
            name,
            trimStart,
            trimEnd,
            this.state.trimChannel
        );
        effects.process((renderedBuffer, adjustedTrimStart, adjustedTrimEnd) => {
            const channelData = Array.from(
                {length: renderedBuffer.numberOfChannels},
                (_, channel) => renderedBuffer.getChannelData(channel)
            );
            const sampleRate = renderedBuffer.sampleRate;
            this.submitNewSamples(channelData, sampleRate).then(success => {
                if (success) {
                    if (this.state.trimStart === null) {
                        this.handlePlay();
                    } else {
                        this.setState({trimStart: adjustedTrimStart, trimEnd: adjustedTrimEnd}, this.handlePlay);
                    }
                }
            });
        });
    }
    tooLoud () {
        const numChunks = this.state.chunkLevels[0].length;
        const startIndex = this.state.trimStart === null ?
            0 : Math.floor(this.state.trimStart * numChunks);
        const endIndex = this.state.trimEnd === null ?
            numChunks - 1 : Math.ceil(this.state.trimEnd * numChunks);
        const trimChunks = this.state.chunkLevels.map(channel => channel.slice(startIndex, endIndex));
        let max = 0;
        for (const channel of trimChunks) {
            for (const level of channel) {
                if (level > max) {
                    max = level;
                }
            }
        }
        return max > MAX_RMS;
    }
    getUndoItem () {
        return {
            ...this.copyCurrentBuffer(),
            trimStart: this.state.trimStart,
            trimEnd: this.state.trimEnd
        };
    }
    handleUndo () {
        this.redoStack.push(this.getUndoItem());
        const {channelData, sampleRate, trimStart, trimEnd} = this.undoStack.pop();
        if (channelData) {
            return this.submitNewSamples(channelData, sampleRate, true).then(success => {
                if (success) {
                    this.setState({trimStart: trimStart, trimEnd: trimEnd}, this.handlePlay);
                }
            });
        }
    }
    handleRedo () {
        const {channelData, sampleRate, trimStart, trimEnd} = this.redoStack.pop();
        if (channelData) {
            this.undoStack.push(this.getUndoItem());
            return this.submitNewSamples(channelData, sampleRate, true).then(success => {
                if (success) {
                    this.setState({trimStart: trimStart, trimEnd: trimEnd}, this.handlePlay);
                }
            });
        }
    }
    handleCopy () {
        this.copy();
    }
    copy (callback) {
        const trimStart = this.state.trimStart === null ? 0.0 : this.state.trimStart;
        const trimEnd = this.state.trimEnd === null ? 1.0 : this.state.trimEnd;

        const newCopyBuffer = this.copyCurrentBuffer();
        const trimStartSamples = trimStart * newCopyBuffer.channelData[0].length;
        const trimEndSamples = trimEnd * newCopyBuffer.channelData[0].length;
        newCopyBuffer.channelData = newCopyBuffer.channelData.map(samples =>
            samples.slice(trimStartSamples, trimEndSamples));

        this.setState({
            copyBuffer: newCopyBuffer
        }, callback);
    }
    handleCopyToNew () {
        this.copy(() => {
            encodeAndAddSoundToVM(this.props.vm, this.state.copyBuffer.channelData,
                this.state.copyBuffer.sampleRate, this.props.name);
        });
    }
    resampleBufferToRate (buffer, newRate) {
        return new Promise((resolve, reject) => {
            const sampleRateRatio = newRate / buffer.sampleRate;
            const newLength = Math.max(1, Math.floor(sampleRateRatio * buffer.channelData[0].length));
            const numberOfChannels = buffer.channelData.length;
            let offlineContext;
            // Try to use either OfflineAudioContext or webkitOfflineAudioContext to resample
            // The constructors will throw if trying to resample at an unsupported rate
            // (e.g. Safari/webkitOAC does not support lower than 44khz).
            try {
                if (window.OfflineAudioContext) {
                    offlineContext = new window.OfflineAudioContext(numberOfChannels, newLength, newRate);
                } else if (window.webkitOfflineAudioContext) {
                    offlineContext = new window.webkitOfflineAudioContext(numberOfChannels, newLength, newRate);
                }
            } catch {
                // If no OAC available and downsampling by 2, downsample by dropping every other sample.
                if (newRate === buffer.sampleRate / 2) {
                    return resolve(dropEveryOtherSample(buffer));
                }
                return reject(new Error('Could not resample'));
            }
            const source = offlineContext.createBufferSource();
            const audioBuffer = offlineContext.createBuffer(
                numberOfChannels,
                buffer.channelData[0].length,
                buffer.sampleRate
            );
            for (let channel = 0; channel < numberOfChannels; channel++) {
                audioBuffer.getChannelData(channel).set(buffer.channelData[channel]);
            }
            source.buffer = audioBuffer;
            source.connect(offlineContext.destination);
            source.start();
            offlineContext.startRendering();
            offlineContext.oncomplete = ({renderedBuffer}) => {
                resolve({
                    channelData: Array.from(
                        {length: renderedBuffer.numberOfChannels},
                        (_, channel) => renderedBuffer.getChannelData(channel)
                    ),
                    sampleRate: newRate
                });
            };
        });
    }
    paste () {
        // If there's no selection, paste at the end of the sound
        const {channelData, sampleRate} = this.copyCurrentBuffer();
        const copiedChannelData = this.state.copyBuffer.channelData;
        const numberOfChannels = Math.max(channelData.length, copiedChannelData.length);
        const getChannel = (channels, channel) => channels[Math.min(channel, channels.length - 1)];
        const sampleCount = channelData[0].length;
        const copiedSampleCount = copiedChannelData[0].length;
        if (this.state.trimStart === null) {
            const newChannelData = Array.from({length: numberOfChannels}, (_, channel) => {
                const samples = getChannel(channelData, channel);
                const copiedSamples = getChannel(copiedChannelData, channel);
                const newSamples = new Float32Array(sampleCount + copiedSampleCount);
                newSamples.set(samples, 0);
                newSamples.set(copiedSamples, sampleCount);
                return newSamples;
            });
            this.submitNewSamples(newChannelData, sampleRate, false).then(success => {
                if (success) {
                    this.handlePlay();
                }
            });
        } else {
            // else replace the selection with the pasted sound
            const trimStartSamples = this.state.trimStart * sampleCount;
            const trimEndSamples = this.state.trimEnd * sampleCount;
            const newChannelData = Array.from({length: numberOfChannels}, (_, channel) => {
                const samples = getChannel(channelData, channel);
                const copiedSamples = getChannel(copiedChannelData, channel);
                const firstPart = samples.slice(0, trimStartSamples);
                const lastPart = samples.slice(trimEndSamples);
                const newSamples = new Float32Array(firstPart.length + copiedSampleCount + lastPart.length);
                newSamples.set(firstPart, 0);
                newSamples.set(copiedSamples, firstPart.length);
                newSamples.set(lastPart, firstPart.length + copiedSampleCount);
                return newSamples;
            });

            const trimStartSeconds = trimStartSamples / sampleRate;
            const trimEndSeconds = trimStartSeconds +
                (copiedSampleCount / this.state.copyBuffer.sampleRate);
            const newDurationSeconds = newChannelData[0].length / sampleRate;
            const adjustedTrimStart = trimStartSeconds / newDurationSeconds;
            const adjustedTrimEnd = trimEndSeconds / newDurationSeconds;
            this.submitNewSamples(newChannelData, sampleRate, false).then(success => {
                if (success) {
                    this.setState({
                        trimStart: adjustedTrimStart,
                        trimEnd: adjustedTrimEnd
                    }, this.handlePlay);
                }
            });
        }
    }
    handlePaste () {
        if (!this.state.copyBuffer) return;
        const currentSampleRate = this.audioBufferPlayer.buffer.sampleRate;
        if (this.state.copyBuffer.sampleRate === currentSampleRate) {
            this.paste();
        } else {
            this.resampleBufferToRate(this.state.copyBuffer, currentSampleRate).then(buffer => {
                this.setState({
                    copyBuffer: buffer
                }, this.paste);
            });
        }
    }
    setRef (element) {
        this.ref = element;
    }
    setTimeStepsRef (element) {
        this.timeStepsRef = element;
    }
    handleContainerClick (e) {
        // If the click is on the sound editor's div (and not any other element), delesect
        if (e.target === this.ref && this.state.trimStart !== null) {
            this.handleUpdateTrim(null, null);
        }
    }
    render () {
        const {effectTypes} = AudioEffects;
        return (
            <React.Fragment>
                <SoundEditorComponent
                    isStereo={this.props.isStereo}
                    duration={this.props.duration}
                    sampleRate={this.props.sampleRate}
                    size={this.props.size}
                    canPaste={this.state.copyBuffer !== null}
                    canRedo={this.redoStack.length > 0}
                    canUndo={this.undoStack.length > 0}
                    chunkLevels={this.state.chunkLevels}
                    name={this.props.name}
                    preferences={this.props.preferences}
                    playhead={this.state.playhead}
                    playing={this.state.playing}
                    setRef={this.setRef}
                    setTimeStepsRef={this.setTimeStepsRef}
                    tooLoud={this.tooLoud()}
                    trimChannel={this.state.trimChannel}
                    trimEnd={this.state.trimEnd}
                    trimStart={this.state.trimStart}
                    onChangeName={this.handleChangeName}
                    onContainerClick={this.handleContainerClick}
                    onCopy={this.handleCopy}
                    onCopyToNew={this.handleCopyToNew}
                    onDelete={this.handleDelete}
                    onDeleteInverse={this.handleDeleteInverse}
                    onEcho={this.effectFactory(effectTypes.ECHO)}
                    onFadeIn={this.effectFactory(effectTypes.FADEIN)}
                    onFadeOut={this.effectFactory(effectTypes.FADEOUT)}
                    onFaster={this.effectFactory(effectTypes.FASTER)}
                    onLouder={this.effectFactory(effectTypes.LOUDER)}
                    onMute={this.effectFactory(effectTypes.MUTE)}
                    onLowPass={this.effectFactory(effectTypes.LOWPASS)}
                    onHighPass={this.effectFactory(effectTypes.HIGHPASS)}
                    onLowPassFadeIn={this.effectFactory(effectTypes.LOWPASS_FADEIN)}
                    onLowPassFadeOut={this.effectFactory(effectTypes.LOWPASS_FADEOUT)}
                    onHighPassFadeIn={this.effectFactory(effectTypes.HIGHPASS_FADEIN)}
                    onHighPassFadeOut={this.effectFactory(effectTypes.HIGHPASS_FADEOUT)}
                    onModifySound={this.handleModifyMenu}
                    onFormatSound={this.handleFormatMenu}
                    onFlip={this.effectFactory(effectTypes.FLIP)}
                    onPaste={this.handlePaste}
                    onPause={this.handlePause}
                    onPlay={this.handlePlay}
                    onRedo={this.handleRedo}
                    onReverse={this.effectFactory(effectTypes.REVERSE)}
                    onRobot={this.effectFactory(effectTypes.ROBOT)}
                    onSetTrim={this.handleUpdateTrim}
                    onSetTrimChannel={this.handleSetTrimChannel}
                    onSlower={this.effectFactory(effectTypes.SLOWER)}
                    onSofter={this.effectFactory(effectTypes.SOFTER)}
                    onStop={this.handleStopPlaying}
                    onTimeStepMouseDown={this.handleTimeStepMouseDown}
                    onTimeStepMouseMove={this.handleTimeStepMouseMove}
                    onUpdatePlayhead={this.handleUpdatePlayhead}
                    onBitcrush={this.handleBitcrush}
                    onUndo={this.handleUndo}
                />
                {this.state.effectDialog && (
                    <AudioEffectDialog
                        hasSelection={this.state.trimStart !== null}
                        mode={this.state.effectDialog}
                        sampleRate={this.audioBufferPlayer.buffer.sampleRate}
                        onCancel={this.handleCloseEffectDialog}
                        onSubmit={this.state.effectDialog === 'modify' ?
                            this.handleSubmitModify : this.handleSubmitFormat}
                    />
                )}
            </React.Fragment>
        );
    }
}

SoundEditor.propTypes = {
    channelData: PropTypes.arrayOf(PropTypes.instanceOf(Float32Array)).isRequired,
    isStereo: PropTypes.bool,
    duration: PropTypes.number,
    size: PropTypes.number,
    isFullScreen: PropTypes.bool,
    name: PropTypes.string.isRequired,
    sampleRate: PropTypes.number,
    soundId: PropTypes.string,
    soundIndex: PropTypes.number,
    preferences: PropTypes.shape({
        'encoding-bit-rate': PropTypes.number
    }).isRequired,
    vm: PropTypes.instanceOf(VM).isRequired
};

const mapStateToProps = (state, {soundIndex}) => {
    const sprite = state.scratchGui.vm.editingTarget.sprite;
    // Make sure the sound index doesn't go out of range.
    const index = soundIndex < sprite.sounds.length ? soundIndex : sprite.sounds.length - 1;
    const sound = state.scratchGui.vm.editingTarget.sprite.sounds[index];
    const audioBuffer = state.scratchGui.vm.getSoundBuffer(index);
    return {
        isStereo: audioBuffer.numberOfChannels !== 1,
        duration: sound.sampleCount / sound.rate,
        size: sound.asset ? sound.asset.data.byteLength : 0,
        soundId: sound.soundId,
        sampleRate: audioBuffer.sampleRate,
        channelData: Array.from(
            {length: audioBuffer.numberOfChannels},
            (_, channel) => audioBuffer.getChannelData(channel)
        ),
        isFullScreen: state.scratchGui.mode.isFullScreen,
        name: sound.name,
        preferences: state.scratchGui.preferences,
        vm: state.scratchGui.vm
    };
};

export default connect(
    mapStateToProps
)(SoundEditor);
