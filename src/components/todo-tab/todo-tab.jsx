// Atomic Editor 0.6.2 only uses hooks available in React 16.14. Keep it pinned and share
// Turbest's React runtime instead of loading a second, incompatible React tree.
import {AtomicCodeMirrorEditor} from '@atomic-editor/editor';
// Webpack 4 predates package.json "exports", so use the package's published stylesheet path directly.
// eslint-disable-next-line import/no-unresolved
import '@atomic-editor/editor/dist/styles/inline-preview.css';

import bindAll from 'lodash.bindall';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import {defineMessages, FormattedMessage, injectIntl, intlShape} from 'react-intl';

import Box from '../box/box.jsx';
import {ContextMenuTrigger} from 'react-contextmenu';
import {ContextMenu, DangerousMenuItem, MenuItem} from '../context-menu/context-menu.jsx';
import Modal from '../../containers/modal.jsx';
import Prompt from '../../containers/prompt.jsx';
import VM from 'scratch-vm';

import styles from './todo-tab.css';

const BOOKMARK_LINK_PATTERN = /^bookmark:/i;
const MARKDOWN_LINK_PATTERN = /^\[[\s\S]*\]\((bookmark:[\s\S]+)\)$/i;
const MARKDOWN_PREFIX_PATTERN = /^(?:#{1,6}\s+|[-*+]\s+|>\s*)/;

const messages = defineMessages({
    addNote: {
        id: 'gui.notes.add',
        defaultMessage: 'New note',
        description: 'Button that adds a new note'
    },
    untitledNote: {
        id: 'gui.notes.untitled',
        defaultMessage: 'Note {number}',
        description: 'Fallback title for a note without any text'
    },
    renameNote: {
        id: 'gui.notes.rename',
        defaultMessage: 'Rename',
        description: 'Right click menu item to rename a note'
    },
    renameNotePrompt: {
        id: 'gui.notes.renamePrompt',
        defaultMessage: 'Note name',
        description: 'Label in the note rename prompt'
    },
    duplicateNote: {
        id: 'gui.notes.duplicate',
        defaultMessage: 'Duplicate',
        description: 'Right click menu item to duplicate a note'
    },
    duplicateName: {
        id: 'gui.notes.duplicateName',
        defaultMessage: 'Copy of {name}',
        description: 'Default name for a duplicated note'
    },
    deleteNote: {
        id: 'gui.notes.delete',
        defaultMessage: 'Delete',
        description: 'Right click menu item to delete a note'
    },
    deleteNoteTitle: {
        id: 'gui.notes.deleteTitle',
        defaultMessage: 'Delete note?',
        description: 'Title of the dialog that confirms deletion of a note'
    },
    deleteNoteMessage: {
        id: 'gui.notes.deleteMessage',
        defaultMessage: 'Delete "{name}"? This cannot be undone.',
        description: 'Message in the dialog that confirms deletion of a note'
    }
});

const decodeBookmarkName = url => {
    const encodedName = url.replace(BOOKMARK_LINK_PATTERN, '');
    try {
        return decodeURIComponent(encodedName).trim();
    } catch {
        return encodedName.trim();
    }
};

const getNoteTitle = (note, index, intl) => {
    const firstLine = note.markdown
        .split(/\r?\n/)
        .map(line => line.trim())
        .find(Boolean);
    if (!firstLine) return intl.formatMessage(messages.untitledNote, {number: index + 1});
    const title = firstLine
        .replace(MARKDOWN_PREFIX_PATTERN, '')
        .replace(/[*_~`[\]]/g, '')
        .trim();
    return title || intl.formatMessage(messages.untitledNote, {number: index + 1});
};

class TodoTab extends React.Component {
    constructor (props) {
        super(props);
        this.editorSurfaceRef = React.createRef();
        bindAll(this, [
            'handleEditorClick',
            'handleLinkClick',
            'handleSelectNote',
            'handleRenameNote',
            'handleDuplicateNote',
            'handleDeleteNote',
            'handleConfirmRename',
            'handleConfirmDelete',
            'handleCloseModal'
        ]);
        this.state = {renamingNote: null, deletingNote: null};
    }
    componentDidMount () {
        this.editorSurfaceRef.current.addEventListener('click', this.handleEditorClick, true);
    }
    componentWillUnmount () {
        this.editorSurfaceRef.current.removeEventListener('click', this.handleEditorClick, true);
    }
    handleEditorClick (event) {
        const target = event.target;
        const link = target && target.closest ? target.closest('.cm-atomic-link') : null;
        if (!link) return;
        const match = link.textContent.match(MARKDOWN_LINK_PATTERN);
        if (!match) return;
        event.preventDefault();
        event.stopPropagation();
        this.handleLinkClick(match[1]);
    }
    handleLinkClick (url) {
        if (BOOKMARK_LINK_PATTERN.test(url)) {
            this.props.onJumpToBookmark(decodeBookmarkName(url));
            return;
        }
        try {
            window.open(url, '_blank', 'noopener,noreferrer');
        } catch {
            // Sandboxed embeds may reject opening a new window.
        }
    }
    handleSelectNote (event) {
        event.stopPropagation();
        this.props.onSelectNote(event.currentTarget.dataset.noteId);
    }
    handleRenameNote (event, data) {
        this.setState({renamingNote: data.note});
    }
    handleDuplicateNote (event, data) {
        const {intl, onDuplicateNote} = this.props;
        const name = getNoteTitle(data.note, data.index, intl);
        onDuplicateNote(data.note.id, intl.formatMessage(messages.duplicateName, {name}));
    }
    handleDeleteNote (event, data) {
        this.setState({deletingNote: data.note});
    }
    handleConfirmRename (name) {
        const {renamingNote} = this.state;
        if (renamingNote && name.trim()) this.props.onRenameNote(renamingNote.id, name);
        this.handleCloseModal();
    }
    handleConfirmDelete () {
        if (this.state.deletingNote) this.props.onDeleteNote(this.state.deletingNote.id);
        this.handleCloseModal();
    }
    handleCloseModal () {
        this.setState({renamingNote: null, deletingNote: null});
    }
    render () {
        const {
            activeNoteId,
            className,
            documentId,
            intl,
            isRtl,
            notes,
            onAddNote,
            onMarkdownChange
        } = this.props;
        const activeNote = notes.find(note => note.id === activeNoteId) || notes[0];
        const {renamingNote, deletingNote} = this.state;
        return (
            <Box
                className={classNames(
                    styles.wrapper,
                    className,
                    {[styles.rtl]: isRtl}
                )}
            >
                <aside className={styles.sidebar}>
                    <div
                        aria-orientation="vertical"
                        className={styles.noteList}
                        role="tablist"
                    >
                        {notes.map((note, index) => {
                            const noteTitle = note.name || getNoteTitle(note, index, intl);
                            const contextMenuId = `note-context-${note.id}`;
                            const contextData = {note, index};
                            return (
                                <ContextMenuTrigger
                                    attributes={{className: styles.noteContextTrigger}}
                                    id={contextMenuId}
                                    key={note.id}
                                >
                                    <button
                                        aria-selected={note.id === activeNoteId}
                                        className={classNames(styles.noteTab, {
                                            [styles.noteTabSelected]: note.id === activeNoteId
                                        })}
                                        data-note-id={note.id}
                                        role="tab"
                                        title={noteTitle}
                                        type="button"
                                        onClick={this.handleSelectNote}
                                    >
                                        {noteTitle}
                                    </button>
                                    <ContextMenu id={contextMenuId}>
                                        <MenuItem
                                            data={contextData}
                                            onClick={this.handleRenameNote}
                                        >
                                            {intl.formatMessage(messages.renameNote)}
                                        </MenuItem>
                                        <MenuItem
                                            data={contextData}
                                            onClick={this.handleDuplicateNote}
                                        >
                                            {intl.formatMessage(messages.duplicateNote)}
                                        </MenuItem>
                                        <DangerousMenuItem
                                            data={contextData}
                                            onClick={this.handleDeleteNote}
                                        >
                                            {intl.formatMessage(messages.deleteNote)}
                                        </DangerousMenuItem>
                                    </ContextMenu>
                                </ContextMenuTrigger>
                            );
                        })}
                    </div>
                    <button
                        className={styles.addNoteButton}
                        type="button"
                        onClick={onAddNote}
                    >
                        <span aria-hidden="true">{'＋'}</span>
                        {intl.formatMessage(messages.addNote)}
                    </button>
                </aside>
                <div
                    ref={this.editorSurfaceRef}
                    className={styles.editorSurface}
                    dir={isRtl ? 'rtl' : 'ltr'}
                >
                    {activeNote ? (
                        <AtomicCodeMirrorEditor
                            documentId={`note-${documentId}-${activeNote.id}`}
                            markdownSource={activeNote.markdown}
                            onLinkClick={this.handleLinkClick}
                            onMarkdownChange={onMarkdownChange}
                        />
                    ) : null}
                </div>
                {renamingNote ? (
                    <Prompt
                        defaultValue={renamingNote.name || getNoteTitle(
                            renamingNote,
                            notes.indexOf(renamingNote),
                            intl
                        )}
                        isStage={false}
                        label={intl.formatMessage(messages.renameNotePrompt)}
                        showCloudOption={false}
                        showListMessage={false}
                        showVariableOptions={false}
                        title={intl.formatMessage(messages.renameNote)}
                        vm={this.props.vm}
                        onCancel={this.handleCloseModal}
                        onOk={this.handleConfirmRename}
                    />
                ) : null}
                {deletingNote ? (
                    <Modal
                        className={styles.deleteModal}
                        contentLabel={intl.formatMessage(messages.deleteNoteTitle)}
                        id="deleteNoteModal"
                        onRequestClose={this.handleCloseModal}
                    >
                        <Box className={styles.deleteModalBody}>
                            <p>{intl.formatMessage(messages.deleteNoteMessage, {
                                name: deletingNote.name || getNoteTitle(
                                    deletingNote,
                                    notes.indexOf(deletingNote),
                                    intl
                                )
                            })}</p>
                            <Box className={styles.deleteModalButtons}>
                                <button
                                    type="button"
                                    onClick={this.handleCloseModal}
                                >
                                    <FormattedMessage
                                        defaultMessage="Cancel"
                                        description="Button to cancel deleting a note"
                                        id="gui.prompt.cancel"
                                    />
                                </button>
                                <button
                                    className={styles.deleteConfirmButton}
                                    type="button"
                                    onClick={this.handleConfirmDelete}
                                >
                                    {intl.formatMessage(messages.deleteNote)}
                                </button>
                            </Box>
                        </Box>
                    </Modal>
                ) : null}
            </Box>
        );
    }
}

TodoTab.propTypes = {
    activeNoteId: PropTypes.string,
    className: PropTypes.string,
    documentId: PropTypes.number.isRequired,
    intl: intlShape.isRequired,
    isRtl: PropTypes.bool,
    notes: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        markdown: PropTypes.string.isRequired
    })).isRequired,
    onAddNote: PropTypes.func.isRequired,
    onDeleteNote: PropTypes.func.isRequired,
    onDuplicateNote: PropTypes.func.isRequired,
    onJumpToBookmark: PropTypes.func.isRequired,
    onMarkdownChange: PropTypes.func.isRequired,
    onRenameNote: PropTypes.func.isRequired,
    onSelectNote: PropTypes.func.isRequired,
    vm: PropTypes.instanceOf(VM).isRequired
};

export default injectIntl(TodoTab);
