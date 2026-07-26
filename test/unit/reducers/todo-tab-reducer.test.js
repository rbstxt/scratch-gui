/* eslint-env jest */
import todoTabReducer, {
    hydrateNotes,
    selectNote,
    addNote,
    updateNote,
    renameNote,
    duplicateNote,
    deleteNote
} from '../../../src/reducers/todo-tab';

const firstNote = {id: 'first', markdown: '# First'};
const secondNote = {id: 'second', markdown: '# Second'};

test('initialState is defined', () => {
    const state = todoTabReducer(undefined, {type: 'anything'});
    expect(state).toEqual({
        notes: [],
        activeNoteId: null,
        documentId: 0,
        loaded: false
    });
});

test('hydrates all notes and the active note', () => {
    const state = todoTabReducer(undefined, hydrateNotes([firstNote, secondNote], 'first'));
    expect(state.notes).toEqual([firstNote, secondNote]);
    expect(state.activeNoteId).toBe('first');
    expect(state.documentId).toBe(1);
    expect(state.loaded).toBe(true);
});

test('selecting a note remounts Atomic Editor', () => {
    const state = todoTabReducer(undefined, hydrateNotes([firstNote, secondNote], 'first'));
    const selected = todoTabReducer(state, selectNote('second'));
    expect(selected.activeNoteId).toBe('second');
    expect(selected.documentId).toBe(2);
});

test('adds and selects a new note', () => {
    const state = todoTabReducer(undefined, hydrateNotes([firstNote], 'first'));
    const added = todoTabReducer(state, addNote(secondNote));
    expect(added.notes).toEqual([firstNote, secondNote]);
    expect(added.activeNoteId).toBe('second');
});

test('updates one note without remounting Atomic Editor', () => {
    const state = todoTabReducer(undefined, hydrateNotes([firstNote, secondNote], 'first'));
    const updated = todoTabReducer(state, updateNote('first', '# Changed'));
    expect(updated.notes[0].markdown).toBe('# Changed');
    expect(updated.notes[1]).toBe(secondNote);
    expect(updated.documentId).toBe(state.documentId);
});

test('renames a note without modifying its Markdown', () => {
    const state = todoTabReducer(undefined, hydrateNotes([firstNote], 'first'));
    const renamed = todoTabReducer(state, renameNote('first', 'Renamed'));
    expect(renamed.notes[0]).toEqual({...firstNote, name: 'Renamed'});
    expect(renamed.documentId).toBe(state.documentId);
});

test('duplicates and deletes notes with the supplied active note', () => {
    const state = todoTabReducer(undefined, hydrateNotes([firstNote], 'first'));
    const duplicated = todoTabReducer(state, duplicateNote(secondNote));
    expect(duplicated.notes).toEqual([firstNote, secondNote]);
    expect(duplicated.activeNoteId).toBe('second');
    const deleted = todoTabReducer(duplicated, deleteNote('second', 'first', [firstNote]));
    expect(deleted.notes).toEqual([firstNote]);
    expect(deleted.activeNoteId).toBe('first');
});
