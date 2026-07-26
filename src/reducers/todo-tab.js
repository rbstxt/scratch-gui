const HYDRATE_NOTES = 'scratch-gui/todo-tab/HYDRATE_NOTES';
const SELECT_NOTE = 'scratch-gui/todo-tab/SELECT_NOTE';
const ADD_NOTE = 'scratch-gui/todo-tab/ADD_NOTE';
const UPDATE_NOTE = 'scratch-gui/todo-tab/UPDATE_NOTE';
const RENAME_NOTE = 'scratch-gui/todo-tab/RENAME_NOTE';
const DUPLICATE_NOTE = 'scratch-gui/todo-tab/DUPLICATE_NOTE';
const DELETE_NOTE = 'scratch-gui/todo-tab/DELETE_NOTE';

const initialState = {
    notes: [],
    activeNoteId: null,
    documentId: 0,
    loaded: false
};

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case HYDRATE_NOTES:
        return Object.assign({}, state, {
            notes: action.notes,
            activeNoteId: action.activeNoteId,
            documentId: state.documentId + 1,
            loaded: true
        });
    case SELECT_NOTE:
        if (action.noteId === state.activeNoteId) return state;
        return Object.assign({}, state, {
            activeNoteId: action.noteId,
            documentId: state.documentId + 1
        });
    case ADD_NOTE:
        return Object.assign({}, state, {
            notes: [...state.notes, action.note],
            activeNoteId: action.note.id,
            documentId: state.documentId + 1
        });
    case UPDATE_NOTE:
        return Object.assign({}, state, {
            notes: state.notes.map(note => (
                note.id === action.noteId ?
                    Object.assign({}, note, {markdown: action.markdown}) :
                    note
            ))
        });
    case RENAME_NOTE:
        return Object.assign({}, state, {
            notes: state.notes.map(note => (
                note.id === action.noteId ?
                    Object.assign({}, note, {name: action.name}) :
                    note
            ))
        });
    case DUPLICATE_NOTE:
        return Object.assign({}, state, {
            notes: [...state.notes, action.note],
            activeNoteId: action.note.id,
            documentId: state.documentId + 1
        });
    case DELETE_NOTE: {
        return Object.assign({}, state, {
            notes: action.notes,
            activeNoteId: action.activeNoteId,
            documentId: state.documentId + 1
        });
    }
    default:
        return state;
    }
};

const hydrateNotes = (notes, activeNoteId) => ({
    type: HYDRATE_NOTES,
    notes,
    activeNoteId
});

const selectNote = noteId => ({
    type: SELECT_NOTE,
    noteId
});

const addNote = note => ({
    type: ADD_NOTE,
    note
});

const updateNote = (noteId, markdown) => ({
    type: UPDATE_NOTE,
    noteId,
    markdown
});

const renameNote = (noteId, name) => ({
    type: RENAME_NOTE,
    noteId,
    name
});

const duplicateNote = note => ({
    type: DUPLICATE_NOTE,
    note
});

const deleteNote = (noteId, activeNoteId, notes) => ({
    type: DELETE_NOTE,
    noteId,
    activeNoteId,
    notes
});

export {
    reducer as default,
    initialState as todoTabInitialState,
    hydrateNotes,
    selectNote,
    addNote,
    updateNote,
    renameNote,
    duplicateNote,
    deleteNote
};
