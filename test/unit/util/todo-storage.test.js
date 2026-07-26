/* eslint-env jest */
import {
    NOTES_COMMENT_PREFIX,
    normalizeNotesDocument,
    readNotesFromStage,
    writeNotesToStage
} from '../../../src/lib/todo-storage';

const makeStage = text => {
    const stage = {
        comments: text ? {notes: {text}} : {},
        createComment: jest.fn((id, blockId, commentText) => {
            stage.comments[id] = {text: commentText};
        })
    };
    return stage;
};

test('normalizes multiple notes and their active note', () => {
    const document = normalizeNotesDocument({
        notes: [
            {id: 'first', markdown: '# First'},
            {id: 'second', markdown: '# Second'}
        ],
        activeNoteId: 'second'
    });
    expect(document.notes).toHaveLength(2);
    expect(document.activeNoteId).toBe('second');
});

test('writes and reads the notes stage comment format', () => {
    const stage = makeStage();
    const notes = [
        {id: 'first', markdown: '# First'},
        {id: 'second', markdown: '# Second'}
    ];
    expect(writeNotesToStage(stage, notes, 'second')).toBe(true);
    expect(readNotesFromStage(stage)).toEqual({
        notes: expect.arrayContaining([
            expect.objectContaining(notes[0]),
            expect.objectContaining(notes[1])
        ]),
        activeNoteId: 'second'
    });
    const commentId = stage.createComment.mock.calls[0][0];
    expect(typeof commentId).toBe('string');
    expect(commentId).not.toHaveLength(0);
    expect(stage.createComment.mock.calls[0][2]).toContain(NOTES_COMMENT_PREFIX);
});

test('does not read the obsolete Todo comment format', () => {
    const stage = makeStage('TODO_LIST:{"markdown":"# Old"}');
    expect(readNotesFromStage(stage)).toBeNull();
});
