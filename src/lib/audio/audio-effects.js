/* global globalThis */

import EchoEffect from './effects/echo-effect.js';
import RobotEffect from './effects/robot-effect.js';
import VolumeEffect from './effects/volume-effect.js';
import FadeEffect from './effects/fade-effect.js';
import MuteEffect from './effects/mute-effect.js';
import FilterEffect from './effects/filter-effect.js';

const effectTypes = {
    ROBOT: 'robot',
    REVERSE: 'reverse',
    LOUDER: 'higher',
    SOFTER: 'lower',
    FASTER: 'faster',
    SLOWER: 'slower',
    ECHO: 'echo',
    FADEIN: 'fade in',
    FADEOUT: 'fade out',
    MUTE: 'mute',
    LOWPASS: 'low pass',
    HIGHPASS: 'high pass',
    LOWPASS_FADEIN: 'low pass fade in',
    LOWPASS_FADEOUT: 'low pass fade out',
    HIGHPASS_FADEIN: 'high pass fade in',
    HIGHPASS_FADEOUT: 'high pass fade out',
    MODIFY: 'modify',
    FLIP: 'flip',
    BITCRUSH: 'bitcrush'
};

class AudioEffects {
    static get effectTypes () {
        return effectTypes;
    }
    constructor (buffer, effect, trimStart, trimEnd, trimChannels = [false, false]) {
        this.options = typeof effect === 'string' ? {preset: effect} : effect;
        const name = this.options.preset;
        this.selectedChannel = trimChannels[0] === trimChannels[1] ? null : Number(trimChannels[1]);
        this.trimStartSeconds = (trimStart * buffer.length) / buffer.sampleRate;
        this.trimEndSeconds = (trimEnd * buffer.length) / buffer.sampleRate;
        this.adjustedTrimStartSeconds = this.trimStartSeconds;
        this.adjustedTrimEndSeconds = this.trimEndSeconds;

        // Some effects will modify the playback rate and/or number of samples.
        // Need to precompute those values to create the offline audio context.
        const pitchRatio = Math.pow(2, 4 / 12); // A major third
        let sampleCount = buffer.length;
        const affectedSampleCount = Math.floor((this.trimEndSeconds - this.trimStartSeconds) *
            buffer.sampleRate);
        let adjustedAffectedSampleCount = affectedSampleCount;
        const unaffectedSampleCount = sampleCount - affectedSampleCount;

        this.playbackRate = 1;
        switch (name) {
        case effectTypes.ECHO:
            sampleCount = Math.max(sampleCount,
                Math.floor((this.trimEndSeconds + EchoEffect.TAIL_SECONDS) * buffer.sampleRate));
            break;
        case effectTypes.FASTER:
            this.playbackRate = pitchRatio;
            adjustedAffectedSampleCount = Math.floor(affectedSampleCount / this.playbackRate);
            sampleCount = unaffectedSampleCount + adjustedAffectedSampleCount;

            break;
        case effectTypes.SLOWER:
            this.playbackRate = 1 / pitchRatio;
            adjustedAffectedSampleCount = Math.floor(affectedSampleCount / this.playbackRate);
            sampleCount = unaffectedSampleCount + adjustedAffectedSampleCount;
            break;
        case effectTypes.MODIFY:
            this.playbackRate = Math.pow(2, (this.options.pitch || 0) / 1200);
            adjustedAffectedSampleCount = Math.floor(affectedSampleCount / this.playbackRate);
            sampleCount = unaffectedSampleCount + adjustedAffectedSampleCount;
            break;
        }

        const durationSeconds = sampleCount / buffer.sampleRate;
        this.adjustedTrimEndSeconds = this.trimStartSeconds +
            (adjustedAffectedSampleCount / buffer.sampleRate);
        this.adjustedTrimStart = this.adjustedTrimStartSeconds / durationSeconds;
        this.adjustedTrimEnd = this.adjustedTrimEndSeconds / durationSeconds;

        if (globalThis.OfflineAudioContext) {
            this.audioContext = new globalThis.OfflineAudioContext(
                buffer.numberOfChannels,
                sampleCount,
                buffer.sampleRate
            );
        } else {
            // Need to use webkitOfflineAudioContext, which doesn't support all sample rates.
            // Resample by adjusting sample count to make room and set offline context to desired sample rate.
            const sampleScale = 44100 / buffer.sampleRate;
            this.audioContext = new globalThis.webkitOfflineAudioContext(
                buffer.numberOfChannels,
                sampleScale * sampleCount,
                44100
            );
        }

        // For the reverse effect we need to manually reverse the data into a new audio buffer
        // to prevent overwriting the original, so that the undo stack works correctly.
        // Doing buffer.reverse() would mutate the original data.
        if (name === effectTypes.REVERSE || name === effectTypes.FLIP || name === effectTypes.BITCRUSH) {
            const newBuffer = this.audioContext.createBuffer(
                buffer.numberOfChannels,
                buffer.length,
                buffer.sampleRate
            );
            const bufferLength = buffer.length;

            const startSamples = Math.floor(this.trimStartSeconds * buffer.sampleRate);
            const endSamples = Math.floor(this.trimEndSeconds * buffer.sampleRate);
            const crushStep = Math.max(1, Math.round(buffer.sampleRate / (this.options.sampleRate || 11025)));
            const crushScale = Math.max(1, Math.pow(2, this.options.bitDepth || 4) - 1);
            for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
                const originalBufferData = buffer.getChannelData(channel);
                const newBufferData = newBuffer.getChannelData(channel);
                let counter = 0;
                for (let i = 0; i < bufferLength; i++) {
                    if (name === effectTypes.REVERSE && i >= startSamples && i < endSamples &&
                        (this.selectedChannel === null || this.selectedChannel === channel)) {
                        newBufferData[i] = originalBufferData[endSamples - counter - 1];
                        counter++;
                    } else if (name === effectTypes.FLIP && i >= startSamples && i < endSamples &&
                        buffer.numberOfChannels > 1) {
                        newBufferData[i] = buffer.getChannelData(buffer.numberOfChannels - channel - 1)[i];
                    } else if (name === effectTypes.BITCRUSH && i >= startSamples && i < endSamples &&
                        (this.selectedChannel === null || this.selectedChannel === channel)) {
                        const heldSample = originalBufferData[startSamples +
                            (Math.floor((i - startSamples) / crushStep) * crushStep)];
                        newBufferData[i] = Math.round(heldSample * crushScale) / crushScale;
                    } else {
                        newBufferData[i] = originalBufferData[i];
                    }
                }
            }
            this.buffer = newBuffer;
        } else {
            // All other effects use the original buffer because it is not modified.
            this.buffer = buffer;
        }

        this.source = this.audioContext.createBufferSource();
        this.source.buffer = this.buffer;
        this.name = name;
    }
    process (done) {
        // Some effects need to use more nodes and must expose an input and output
        let input;
        let output;
        switch (this.name) {
        case effectTypes.FASTER:
        case effectTypes.SLOWER:
        case effectTypes.MODIFY:
            this.source.playbackRate.setValueAtTime(this.playbackRate, this.adjustedTrimStartSeconds);
            this.source.playbackRate.setValueAtTime(1.0, this.adjustedTrimEndSeconds);
            if (this.name === effectTypes.MODIFY && this.options.volume !== 1) {
                ({input, output} = new VolumeEffect(this.audioContext, this.options.volume,
                    this.adjustedTrimStartSeconds, this.adjustedTrimEndSeconds));
            }
            break;
        case effectTypes.LOUDER:
            ({input, output} = new VolumeEffect(this.audioContext, 1.25,
                this.adjustedTrimStartSeconds, this.adjustedTrimEndSeconds));
            break;
        case effectTypes.SOFTER:
            ({input, output} = new VolumeEffect(this.audioContext, 0.75,
                this.adjustedTrimStartSeconds, this.adjustedTrimEndSeconds));
            break;
        case effectTypes.ECHO:
            ({input, output} = new EchoEffect(this.audioContext,
                this.adjustedTrimStartSeconds, this.adjustedTrimEndSeconds));
            break;
        case effectTypes.ROBOT:
            ({input, output} = new RobotEffect(this.audioContext,
                this.adjustedTrimStartSeconds, this.adjustedTrimEndSeconds));
            break;
        case effectTypes.FADEIN:
            ({input, output} = new FadeEffect(this.audioContext, true,
                this.adjustedTrimStartSeconds, this.adjustedTrimEndSeconds));
            break;
        case effectTypes.FADEOUT:
            ({input, output} = new FadeEffect(this.audioContext, false,
                this.adjustedTrimStartSeconds, this.adjustedTrimEndSeconds));
            break;
        case effectTypes.MUTE:
            ({input, output} = new MuteEffect(this.audioContext,
                this.adjustedTrimStartSeconds, this.adjustedTrimEndSeconds));
            break;
        case effectTypes.LOWPASS:
            ({input, output} = new FilterEffect(this.audioContext, 'lowpass', null,
                this.adjustedTrimStartSeconds, this.adjustedTrimEndSeconds));
            break;
        case effectTypes.HIGHPASS:
            ({input, output} = new FilterEffect(this.audioContext, 'highpass', null,
                this.adjustedTrimStartSeconds, this.adjustedTrimEndSeconds));
            break;
        case effectTypes.LOWPASS_FADEIN:
            ({input, output} = new FilterEffect(this.audioContext, 'lowpass', 'fadeIn',
                this.adjustedTrimStartSeconds, this.adjustedTrimEndSeconds));
            break;
        case effectTypes.LOWPASS_FADEOUT:
            ({input, output} = new FilterEffect(this.audioContext, 'lowpass', 'fadeOut',
                this.adjustedTrimStartSeconds, this.adjustedTrimEndSeconds));
            break;
        case effectTypes.HIGHPASS_FADEIN:
            ({input, output} = new FilterEffect(this.audioContext, 'highpass', 'fadeIn',
                this.adjustedTrimStartSeconds, this.adjustedTrimEndSeconds));
            break;
        case effectTypes.HIGHPASS_FADEOUT:
            ({input, output} = new FilterEffect(this.audioContext, 'highpass', 'fadeOut',
                this.adjustedTrimStartSeconds, this.adjustedTrimEndSeconds));
            break;
        }

        if (input && output && this.selectedChannel !== null && this.buffer.numberOfChannels > 1) {
            const splitter = this.audioContext.createChannelSplitter(2);
            const merger = this.audioContext.createChannelMerger(2);
            this.source.connect(splitter);
            splitter.connect(input, this.selectedChannel);
            output.connect(merger, 0, this.selectedChannel);
            splitter.connect(merger, 1 - this.selectedChannel, 1 - this.selectedChannel);
            merger.connect(this.audioContext.destination);
        } else if (input && output) {
            this.source.connect(input);
            output.connect(this.audioContext.destination);
        } else {
            // No effects nodes are needed, wire directly to the output
            this.source.connect(this.audioContext.destination);
        }

        this.source.start();

        this.audioContext.startRendering();
        this.audioContext.oncomplete = ({renderedBuffer}) => {
            done(renderedBuffer, this.adjustedTrimStart, this.adjustedTrimEnd);
        };

    }
}

export default AudioEffects;
