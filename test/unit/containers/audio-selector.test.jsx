import React from 'react';
import {shallow} from 'enzyme';

import AudioSelector from '../../../src/containers/audio-selector.jsx';

jest.mock('../../../src/lib/drag-recognizer', () => class MockDragRecognizer {
    constructor ({onDrag, onDragEnd}) {
        this.onDrag = onDrag;
        this.onDragEnd = onDragEnd;
    }
    start () {}
    reset () {}
    gestureInProgress () {
        return false;
    }
});

describe('Audio Selector Container', () => {
    let props;
    let wrapper;

    beforeEach(() => {
        props = {
            channelCount: 2,
            onSetTrim: jest.fn(),
            onSetTrimChannel: jest.fn(),
            onUpdatePlayhead: jest.fn(),
            playhead: 0,
            trimChannel: [false, false],
            trimEnd: 0.8,
            trimStart: 0.2
        };
        wrapper = shallow(<AudioSelector {...props} />);
        wrapper.instance().containerElement = {
            getBoundingClientRect: () => ({
                height: 90,
                left: 0,
                top: 0,
                width: 100
            })
        };
    });

    afterEach(() => {
        wrapper.instance().trimStartDragRecognizer.reset();
        wrapper.instance().trimEndDragRecognizer.reset();
    });

    test('click seeks without creating a selection', () => {
        wrapper.instance().handleNewSelectionMouseDown({
            button: 0,
            clientX: 70,
            clientY: 20,
            preventDefault: jest.fn()
        });
        wrapper.instance().handleNewSelectionClick();

        expect(props.onUpdatePlayhead).toHaveBeenCalledWith(0.7);
        expect(props.onUpdatePlayhead).toHaveBeenLastCalledWith(0.7);
        expect(props.onSetTrimChannel).toHaveBeenCalledWith([true, false]);
        expect(props.onSetTrim).toHaveBeenCalledWith(null, null);
        expect(wrapper.state()).toEqual({
            trimStart: null,
            trimEnd: null
        });
    });

    test('drag creates a selection', () => {
        wrapper.instance().handleNewSelectionMouseDown({
            button: 0,
            clientX: 20,
            clientY: 70,
            preventDefault: jest.fn()
        });
        wrapper.instance().handleTrimEndMouseMove(
            {x: 60, y: 70},
            {x: 20, y: 70}
        );
        wrapper.instance().handleTrimEndMouseUp();

        expect(props.onSetTrimChannel).toHaveBeenCalledWith([false, true]);
        expect(props.onSetTrim.mock.calls[0][0]).toBeCloseTo(0.2);
        expect(props.onSetTrim.mock.calls[0][1]).toBeCloseTo(0.6);
    });

    test('tiny pointer movement still seeks without creating a selection', () => {
        wrapper.instance().handleNewSelectionMouseDown({
            button: 0,
            clientX: 40,
            clientY: 45,
            preventDefault: jest.fn()
        });
        wrapper.instance().handleTrimEndMouseMove(
            {x: 40.5, y: 45},
            {x: 40, y: 45}
        );
        wrapper.instance().handleTrimEndMouseUp();

        expect(props.onSetTrim).toHaveBeenCalledWith(null, null);
        expect(props.onUpdatePlayhead).toHaveBeenLastCalledWith(0.4);
        expect(wrapper.state()).toEqual({
            trimStart: null,
            trimEnd: null
        });
    });

    test('resynchronizes a stale local selection from props', () => {
        wrapper.setProps({
            trimStart: null,
            trimEnd: null
        });
        wrapper.setState({
            trimStart: 0.4,
            trimEnd: 0.4
        });
        wrapper.setProps({
            trimStart: null,
            trimEnd: null
        });

        expect(wrapper.state()).toEqual({
            trimStart: null,
            trimEnd: null
        });
    });
});
