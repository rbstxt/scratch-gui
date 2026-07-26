import uid from 'scratch-vm/src/util/uid';

export const NOTES_COMMENT_PREFIX = 'TURBEST_NOTES:';

export const DEFAULT_NOTE_MARKDOWN = `# ようこそ

Atomic Editorを使ったMarkdown形式のメモです。

- [ ] チェックボックス
- ブックマークへのリンク: \`[名前](bookmark:名前)\`
`;

export const createNote = (markdown = '', name = '') => ({
    id: uid(),
    name: typeof name === 'string' ? name : '',
    markdown: typeof markdown === 'string' ? markdown : '',
    createdAt: Date.now()
});

const normalizeNote = note => {
    if (!note || typeof note !== 'object') return null;
    return {
        id: typeof note.id === 'string' && note.id ? note.id : uid(),
        name: typeof note.name === 'string' ? note.name : '',
        markdown: typeof note.markdown === 'string' ? note.markdown : '',
        createdAt: typeof note.createdAt === 'number' ? note.createdAt : Date.now()
    };
};

export const normalizeNotesDocument = document => {
    const notes = document && Array.isArray(document.notes) ?
        document.notes.map(normalizeNote).filter(Boolean) : [];
    if (notes.length === 0) notes.push(createNote(DEFAULT_NOTE_MARKDOWN));
    const requestedActiveId = document && document.activeNoteId;
    const activeNoteId = notes.some(note => note.id === requestedActiveId) ?
        requestedActiveId : notes[0].id;
    return {notes, activeNoteId};
};

export const readNotesFromStage = stage => {
    if (!stage || !stage.comments) return null;
    for (const commentId in stage.comments) {
        const comment = stage.comments[commentId];
        if (!comment || typeof comment.text !== 'string' ||
            !comment.text.startsWith(NOTES_COMMENT_PREFIX)) continue;
        try {
            return normalizeNotesDocument(
                JSON.parse(comment.text.slice(NOTES_COMMENT_PREFIX.length))
            );
        } catch {
            return normalizeNotesDocument(null);
        }
    }
    return null;
};

export const writeNotesToStage = (stage, notes, activeNoteId) => {
    if (!stage || !stage.comments) return false;
    const document = normalizeNotesDocument({notes, activeNoteId});
    const text = `${NOTES_COMMENT_PREFIX}${JSON.stringify({
        ...document,
        version: '1.0',
        timestamp: Date.now()
    })}`;
    for (const commentId in stage.comments) {
        const comment = stage.comments[commentId];
        if (comment && typeof comment.text === 'string' &&
            comment.text.startsWith(NOTES_COMMENT_PREFIX)) {
            comment.text = text;
            return true;
        }
    }
    if (typeof stage.createComment === 'function') {
        stage.createComment(uid(), null, text, -1000, -1000, 240, 120, true);
        return true;
    }
    return false;
};
