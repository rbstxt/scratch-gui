import PropTypes from 'prop-types';
import React from 'react';
import {defineMessages, injectIntl, intlShape} from 'react-intl';
import Box from '../box/box.jsx';
import FancyCheckbox from '../tw-fancy-checkbox/checkbox.jsx';
import styles from './extension-manager.css';

const messages = defineMessages({
    loadedNone: {
        defaultMessage: 'No extensions loaded',
        id: 'nb.extensionManager.loadedNone'
    },
    loadedOne: {
        defaultMessage: '1 loaded extension',
        id: 'nb.extensionManager.loadedOne'
    },
    loadedMany: {
        defaultMessage: '{count} loaded extensions',
        id: 'nb.extensionManager.loadedMany'
    },
    selectMultiple: {
        defaultMessage: 'Select Multiple',
        id: 'nb.extensionManager.selectMultiple'
    },
    cancel: {
        defaultMessage: 'Cancel',
        id: 'gui.prompt.cancel'
    },
    delete: {
        defaultMessage: 'Delete',
        id: 'gui.library.delete'
    },
    remove: {
        defaultMessage: 'Remove extension',
        id: 'nb.extensionManager.remove'
    }
});

const ExtensionManager = props => {
    const {extensions, intl} = props;
    const loadedAmountText = extensions.length === 0 ?
        intl.formatMessage(messages.loadedNone) :
        extensions.length === 1 ?
            intl.formatMessage(messages.loadedOne) :
            intl.formatMessage(messages.loadedMany, {count: extensions.length});

    return (
        <Box className={styles.body}>
            <p>{loadedAmountText}</p>
            {extensions.map(([id], index) => (
                <div
                    className={styles.extensionCard}
                    key={id}
                    draggable={!props.multiSelect}
                    onDragStart={() => props.onDragStart(index)}
                    onDragEnd={props.onDragEnd}
                    onDragOver={event => event.preventDefault()}
                    onDrop={() => props.onDrop(index)}
                >
                    <p>{id}</p>
                    {!props.multiSelect ? (
                        <button
                            aria-label={intl.formatMessage(messages.remove, {extension: id})}
                            className={styles.deleteOption}
                            onClick={() => props.onRemove(id)}
                        />
                    ) : (
                        <FancyCheckbox
                            className={styles.checkboxOption}
                            checked={props.selectedExtensions.includes(id)}
                            onChange={event => props.onSelectionChange(id, event.target.checked)}
                        />
                    )}
                </div>
            ))}
            {extensions.length > 0 && (
                <Box className={styles.multiSelectRow}>
                    {!props.multiSelect ? (
                        <button
                            className={styles.multiSelectNormal}
                            onClick={props.onToggleMultiSelect}
                        >
                            {intl.formatMessage(messages.selectMultiple)}
                        </button>
                    ) : (
                        <React.Fragment>
                            <button
                                className={styles.multiSelectNormal}
                                onClick={props.onToggleMultiSelect}
                            >
                                {intl.formatMessage(messages.cancel)}
                            </button>
                            <button
                                className={styles.multiSelectDelete}
                                disabled={props.selectedExtensions.length === 0}
                                onClick={props.onRemoveSelected}
                            >
                                {intl.formatMessage(messages.delete)}
                            </button>
                        </React.Fragment>
                    )}
                </Box>
            )}
        </Box>
    );
};

ExtensionManager.propTypes = {
    extensions: PropTypes.arrayOf(PropTypes.array).isRequired,
    intl: intlShape.isRequired,
    multiSelect: PropTypes.bool.isRequired,
    onDragEnd: PropTypes.func.isRequired,
    onDragStart: PropTypes.func.isRequired,
    onDrop: PropTypes.func.isRequired,
    onRemove: PropTypes.func.isRequired,
    onRemoveSelected: PropTypes.func.isRequired,
    onSelectionChange: PropTypes.func.isRequired,
    onToggleMultiSelect: PropTypes.func.isRequired,
    selectedExtensions: PropTypes.arrayOf(PropTypes.string).isRequired
};

export default injectIntl(ExtensionManager);
