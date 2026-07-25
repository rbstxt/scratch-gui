import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';
import Box from '../box/box.jsx';
import styles from './audio-trimmer.css';
import SelectionHandle from './selection-handle.jsx';
import Playhead from './playhead.jsx';

const getChannelStyle = trimChannel => ({
    top: `${50 * Math.max(0, Number(trimChannel[1]) - Number(trimChannel[0]))}%`,
    height: `${50 * (1 + Number(trimChannel[0] === trimChannel[1]))}%`
});

const AudioSelector = props => {
    const channelStyle = getChannelStyle(props.trimChannel);
    return (
        <div
            className={classNames(styles.absolute, styles.selector)}
            ref={props.containerRef}
            onClick={props.onNewSelectionClick}
            onMouseDown={props.onNewSelectionMouseDown}
            onTouchStart={props.onNewSelectionMouseDown}
        >
            {props.trimStart === null ? null : (
                <React.Fragment>
                    <Box
                        className={classNames(styles.absolute, styles.selectionBackground)}
                        style={{
                            ...channelStyle,
                            left: `${props.trimStart * 100}%`,
                            width: `${100 * (props.trimEnd - props.trimStart)}%`
                        }}
                    />
                    <Box
                        className={classNames(styles.absolute)}
                        style={{
                            ...channelStyle,
                            left: `${props.trimStart * 100}%`,
                            width: `${100 * (props.trimEnd - props.trimStart)}%`
                        }}
                    >
                        <SelectionHandle
                            compact
                            handleStyle={styles.leftHandle}
                            onMouseDown={props.onTrimStartMouseDown}
                        />
                        <SelectionHandle
                            compact
                            handleStyle={styles.rightHandle}
                            onMouseDown={props.onTrimEndMouseDown}
                        />
                    </Box>
                </React.Fragment>
            )}
            {props.playhead === null ? null : (
                <Playhead
                    playbackPosition={props.playhead}
                />
            )}
        </div>
    );
};

AudioSelector.propTypes = {
    containerRef: PropTypes.func,
    onNewSelectionClick: PropTypes.func.isRequired,
    onNewSelectionMouseDown: PropTypes.func.isRequired,
    onTrimEndMouseDown: PropTypes.func.isRequired,
    onTrimStartMouseDown: PropTypes.func.isRequired,
    playhead: PropTypes.number,
    trimEnd: PropTypes.number,
    trimStart: PropTypes.number,
    trimChannel: PropTypes.arrayOf(PropTypes.bool).isRequired
};

export default AudioSelector;
