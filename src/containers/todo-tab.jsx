import bindAll from 'lodash.bindall';
import React from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import {defineMessages, injectIntl, intlShape} from 'react-intl';

import VM from 'scratch-vm';

import TodoTabComponent from '../components/todo-tab/todo-tab.jsx';
import {
    hydrateNotes,
    selectNote,
    addNote,
    updateNote,
    renameNote,
    duplicateNote,
    deleteNote
} from '../reducers/todo-tab';
import {
    activateTab,
    BLOCKS_TAB_INDEX
} from '../reducers/editor-tab';
import {
    DEFAULT_NOTE_MARKDOWN,
    createNote,
    normalizeNotesDocument,
    readNotesFromStage,
    writeNotesToStage
} from '../lib/todo-storage';
import {
    readWorkspaceBookmarksFromStage,
    applyWorkspaceBookmarkState,
    findWorkspaceBookmarkByName
} from '../lib/workspace-bookmarks';

const messages = defineMessages({
    bookmarkMissing: {
        id: 'gui.notes.bookmarkMissing',
        defaultMessage: 'Bookmark "{name}" not found.',
        description: 'Notice when a bookmark link is broken'
    }
});

class TodoTab extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleProjectLoaded',
            'handleAddNote',
            'handleMarkdownChange',
            'handleSelectNote',
            'handleJumpToBookmark',
            'handleRenameNote',
            'handleDuplicateNote',
            'handleDeleteNote'
        ]);
    }
    componentDidMount () {
        this.props.vm.runtime.on('PROJECT_LOADED', this.handleProjectLoaded);
        this.handleProjectLoaded();
    }
    componentWillUnmount () {
        this.props.vm.runtime.off('PROJECT_LOADED', this.handleProjectLoaded);
    }
    persist (notes, activeNoteId) {
        const stage = this.props.vm.runtime.getTargetForStage();
        writeNotesToStage(stage, notes, activeNoteId);
        if (this.props.vm.runtime.emitProjectChanged) {
            this.props.vm.runtime.emitProjectChanged();
        }
    }
    handleProjectLoaded () {
        const stage = this.props.vm.runtime.getTargetForStage();
        let document = readNotesFromStage(stage);
        if (document === null) {
            document = normalizeNotesDocument({
                notes: [createNote(DEFAULT_NOTE_MARKDOWN)]
            });
            writeNotesToStage(stage, document.notes, document.activeNoteId);
            if (this.props.vm.runtime.emitProjectChanged) {
                this.props.vm.runtime.emitProjectChanged();
            }
        }
        this.props.onHydrate(document.notes, document.activeNoteId);
    }
    handleAddNote () {
        const note = createNote();
        const notes = [...this.props.notes, note];
        this.props.onAddNote(note);
        this.persist(notes, note.id);
    }
    handleSelectNote (noteId) {
        if (noteId === this.props.activeNoteId) return;
        this.props.onSelectNote(noteId);
        this.persist(this.props.notes, noteId);
    }
    handleMarkdownChange (markdown) {
        const activeNote = this.props.notes.find(note => note.id === this.props.activeNoteId);
        if (!activeNote || markdown === activeNote.markdown) return;
        const notes = this.props.notes.map(note => (
            note.id === activeNote.id ? Object.assign({}, note, {markdown}) : note
        ));
        this.props.onUpdateNote(activeNote.id, markdown);
        this.persist(notes, activeNote.id);
    }
    handleRenameNote (noteId, name) {
        const note = this.props.notes.find(item => item.id === noteId);
        if (!note || !name.trim()) return;
        const notes = this.props.notes.map(item => (
            item.id === noteId ? Object.assign({}, item, {name: name.trim()}) : item
        ));
        this.props.onRenameNote(noteId, name.trim());
        this.persist(notes, this.props.activeNoteId);
    }
    handleDuplicateNote (noteId, name) {
        const note = this.props.notes.find(item => item.id === noteId);
        if (!note) return;
        const duplicate = createNote(note.markdown, name);
        const notes = [...this.props.notes, duplicate];
        this.props.onDuplicateNote(duplicate);
        this.persist(notes, duplicate.id);
    }
    handleDeleteNote (noteId) {
        const noteIndex = this.props.notes.findIndex(note => note.id === noteId);
        if (noteIndex === -1) return;
        let notes = this.props.notes.filter(note => note.id !== noteId);
        if (notes.length === 0) notes = [createNote()];
        const activeNoteId = noteId === this.props.activeNoteId ?
            notes[Math.max(0, noteIndex - 1)].id : this.props.activeNoteId;
        this.props.onDeleteNote(noteId, activeNoteId, notes);
        this.persist(notes, activeNoteId);
    }
    async handleJumpToBookmark (name) {
        const stage = this.props.vm.runtime.getTargetForStage();
        const bookmarks = readWorkspaceBookmarksFromStage(stage);
        const bookmark = findWorkspaceBookmarkByName(bookmarks, name);
        if (!bookmark) {
            // eslint-disable-next-line no-console
            if (typeof console !== 'undefined' && console.warn) {
                console.warn(this.props.intl.formatMessage(messages.bookmarkMissing, {name}));
            }
            return;
        }
        this.props.onActivateBlocksTab();
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        await applyWorkspaceBookmarkState(this.props.vm, bookmark.state);
    }
    render () {
        return (
            <TodoTabComponent
                activeNoteId={this.props.activeNoteId}
                documentId={this.props.documentId}
                isRtl={this.props.isRtl}
                notes={this.props.notes}
                onAddNote={this.handleAddNote}
                onDeleteNote={this.handleDeleteNote}
                onDuplicateNote={this.handleDuplicateNote}
                onJumpToBookmark={this.handleJumpToBookmark}
                onMarkdownChange={this.handleMarkdownChange}
                onRenameNote={this.handleRenameNote}
                onSelectNote={this.handleSelectNote}
                vm={this.props.vm}
            />
        );
    }
}

TodoTab.propTypes = {
    activeNoteId: PropTypes.string,
    documentId: PropTypes.number.isRequired,
    intl: intlShape.isRequired,
    isRtl: PropTypes.bool,
    notes: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        markdown: PropTypes.string.isRequired
    })).isRequired,
    onActivateBlocksTab: PropTypes.func.isRequired,
    onAddNote: PropTypes.func.isRequired,
    onDeleteNote: PropTypes.func.isRequired,
    onDuplicateNote: PropTypes.func.isRequired,
    onHydrate: PropTypes.func.isRequired,
    onSelectNote: PropTypes.func.isRequired,
    onUpdateNote: PropTypes.func.isRequired,
    onRenameNote: PropTypes.func.isRequired,
    vm: PropTypes.instanceOf(VM).isRequired
};

const mapStateToProps = state => ({
    activeNoteId: state.scratchGui.todoTab.activeNoteId,
    documentId: state.scratchGui.todoTab.documentId,
    isRtl: state.locales.isRtl,
    notes: state.scratchGui.todoTab.notes,
    vm: state.scratchGui.vm
});

const mapDispatchToProps = dispatch => ({
    onActivateBlocksTab: () => dispatch(activateTab(BLOCKS_TAB_INDEX)),
    onAddNote: note => dispatch(addNote(note)),
    onDeleteNote: (noteId, activeNoteId, notes) => dispatch(deleteNote(noteId, activeNoteId, notes)),
    onDuplicateNote: note => dispatch(duplicateNote(note)),
    onHydrate: (notes, activeNoteId) => dispatch(hydrateNotes(notes, activeNoteId)),
    onSelectNote: noteId => dispatch(selectNote(noteId)),
    onUpdateNote: (noteId, markdown) => dispatch(updateNote(noteId, markdown)),
    onRenameNote: (noteId, name) => dispatch(renameNote(noteId, name))
});

export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(TodoTab));
