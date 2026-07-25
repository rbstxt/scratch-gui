import React from 'react';
import PropTypes from 'prop-types';
import bindAll from 'lodash.bindall';
import AudioSelectorComponent from '../components/audio-trimmer/audio-selector.jsx';
import {getEventXY} from '../lib/touch-utils';
import DragRecognizer from '../lib/drag-recognizer';

const MIN_LENGTH = 0.01;

class AudioSelector extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleNewSelectionClick',
            'handleNewSelectionMouseDown',
            'handleTrimStartMouseDown',
            'handleTrimEndMouseDown',
            'handleTrimStartMouseMove',
            'handleTrimEndMouseMove',
            'handleTrimStartMouseUp',
            'handleTrimEndMouseUp',
            'storeRef'
        ]);

        this.state = {
            trimStart: props.trimStart,
            trimEnd: props.trimEnd
        };

        this.creatingNewSelection = false;
        this.newSelectionWasDragged = false;

        this.trimStartDragRecognizer = new DragRecognizer({
            onDrag: this.handleTrimStartMouseMove,
            onDragEnd: this.handleTrimStartMouseUp,
            touchDragAngle: 90
        });
        this.trimEndDragRecognizer = new DragRecognizer({
            onDrag: this.handleTrimEndMouseMove,
            onDragEnd: this.handleTrimEndMouseUp,
            touchDragAngle: 90
        });
    }
    componentWillReceiveProps (newProps) {
        if (this.creatingNewSelection ||
            this.trimStartDragRecognizer.gestureInProgress() ||
            this.trimEndDragRecognizer.gestureInProgress()) {
            return;
        }
        if (newProps.trimStart === this.state.trimStart && newProps.trimEnd === this.state.trimEnd) return;
        this.setState({
            trimStart: newProps.trimStart,
            trimEnd: newProps.trimEnd
        });
    }
    clearSelection () {
        this.props.onSetTrim(null, null);
    }
    handleNewSelectionClick () {
        // DragRecognizer normally finishes on window.mouseup. Keep an onClick
        // fallback for environments where that event is not delivered.
        if (this.creatingNewSelection) {
            this.trimEndDragRecognizer.reset();
            this.handleTrimEndMouseUp();
        }
    }
    handleNewSelectionMouseDown (e) {
        const {width, height, left, top} = this.containerElement.getBoundingClientRect();
        const {x, y} = getEventXY(e);
        this.initialTrimEnd = (x - left) / width;
        this.initialTrimStart = this.initialTrimEnd;
        this.props.onUpdatePlayhead(this.initialTrimStart);
        this.props.onSetTrimChannel(this.props.channelCount === 1 ? [false, false] : [
            y - top < height / 3,
            y - top > height * (2 / 3)
        ]);

        this.creatingNewSelection = true;
        this.newSelectionWasDragged = false;

        this.containerSize = width;
        this.trimEndDragRecognizer.start(e);

        e.preventDefault();
    }
    handleTrimStartMouseMove (currentOffset, initialOffset) {
        const dx = (currentOffset.x - initialOffset.x) / this.containerSize;
        const newTrim = Math.max(0, Math.min(1, this.initialTrimStart + dx));
        if (newTrim > this.initialTrimEnd) {
            this.setState({
                trimStart: this.initialTrimEnd,
                trimEnd: newTrim
            });
        } else {
            this.setState({
                trimStart: newTrim,
                trimEnd: this.initialTrimEnd
            });
        }
    }
    handleTrimEndMouseMove (currentOffset, initialOffset) {
        if (this.creatingNewSelection) {
            this.newSelectionWasDragged = true;
        }
        const dx = (currentOffset.x - initialOffset.x) / this.containerSize;
        const newTrim = Math.min(1, Math.max(0, this.initialTrimEnd + dx));
        if (newTrim < this.initialTrimStart) {
            this.setState({
                trimStart: newTrim,
                trimEnd: this.initialTrimStart
            });
        } else {
            this.setState({
                trimStart: this.initialTrimStart,
                trimEnd: newTrim
            });
        }
    }
    handleTrimStartMouseUp () {
        this.props.onSetTrim(this.state.trimStart, this.state.trimEnd);
    }
    handleTrimEndMouseUp () {
        const selectionIsTooShort = this.state.trimStart === null ||
            (this.state.trimEnd - this.state.trimStart) < MIN_LENGTH;
        if (this.creatingNewSelection && (!this.newSelectionWasDragged || selectionIsTooShort)) {
            this.setState({
                trimStart: null,
                trimEnd: null
            });
            this.clearSelection();
            this.props.onUpdatePlayhead(this.initialTrimStart);
        } else {
            this.props.onSetTrim(this.state.trimStart, this.state.trimEnd);
        }
        this.creatingNewSelection = false;
        this.newSelectionWasDragged = false;
    }
    handleTrimStartMouseDown (e) {
        this.creatingNewSelection = false;
        this.containerSize = this.containerElement.getBoundingClientRect().width;
        this.trimStartDragRecognizer.start(e);
        this.initialTrimStart = this.props.trimStart;
        this.initialTrimEnd = this.props.trimEnd;
        e.stopPropagation();
        e.preventDefault();
    }
    handleTrimEndMouseDown (e) {
        this.creatingNewSelection = false;
        this.containerSize = this.containerElement.getBoundingClientRect().width;
        this.trimEndDragRecognizer.start(e);
        this.initialTrimEnd = this.props.trimEnd;
        this.initialTrimStart = this.props.trimStart;
        e.stopPropagation();
        e.preventDefault();
    }
    storeRef (el) {
        this.containerElement = el;
    }
    render () {
        return (
            <AudioSelectorComponent
                containerRef={this.storeRef}
                playhead={this.props.playhead}
                trimEnd={this.state.trimEnd}
                trimStart={this.state.trimStart}
                trimChannel={this.props.trimChannel}
                onNewSelectionClick={this.handleNewSelectionClick}
                onNewSelectionMouseDown={this.handleNewSelectionMouseDown}
                onTrimEndMouseDown={this.handleTrimEndMouseDown}
                onTrimStartMouseDown={this.handleTrimStartMouseDown}
            />
        );
    }
}

AudioSelector.propTypes = {
    channelCount: PropTypes.number.isRequired,
    onSetTrim: PropTypes.func,
    onSetTrimChannel: PropTypes.func.isRequired,
    onUpdatePlayhead: PropTypes.func.isRequired,
    playhead: PropTypes.number,
    trimEnd: PropTypes.number,
    trimStart: PropTypes.number,
    trimChannel: PropTypes.arrayOf(PropTypes.bool).isRequired
};

export default AudioSelector;
