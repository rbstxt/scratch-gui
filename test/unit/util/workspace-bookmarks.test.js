const mockWorkspace = {
    getMetrics: jest.fn(() => ({
        contentLeft: -200,
        contentTop: -300
    })),
    scrollbar: {
        set: jest.fn()
    },
    setScale: jest.fn()
};

jest.mock('../../../src/lib/tw-lazy-scratch-blocks', () => ({
    __esModule: true,
    default: {
        get: () => ({
            getMainWorkspace: () => mockWorkspace
        }),
        isLoaded: () => true
    }
}));

import {
    WORKSPACE_BOOKMARKS_COMMENT_PREFIX,
    applyWorkspaceBookmarkState,
    readWorkspaceBookmarksFromStage,
    writeWorkspaceBookmarksToStage
} from '../../../src/lib/workspace-bookmarks';

describe('workspace bookmarks', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('restores finite workspace coordinates and scale', async () => {
        const vm = {
            editingTarget: {id: 'sprite-1'},
            runtime: {}
        };

        await applyWorkspaceBookmarkState(vm, {
            scale: 0.75,
            scrollX: 125,
            scrollY: 250,
            targetId: 'sprite-1'
        });

        expect(mockWorkspace.setScale).toHaveBeenCalledWith(0.75);
        expect(mockWorkspace.scrollbar.set).toHaveBeenCalledWith(325, 550);
    });

    test('does not pass invalid bookmark values to Blockly', async () => {
        const vm = {
            editingTarget: {id: 'sprite-1'},
            runtime: {}
        };

        await applyWorkspaceBookmarkState(vm, {
            scrollX: 125,
            scrollY: 250
        });

        expect(mockWorkspace.setScale).not.toHaveBeenCalled();
        expect(mockWorkspace.scrollbar.set).not.toHaveBeenCalled();
    });

    test('creates a persistable stage comment with a unique ID', () => {
        const stage = {
            comments: {},
            createComment: jest.fn((id, blockId, text) => {
                stage.comments[id] = {text};
            })
        };
        const bookmarks = [{
            name: 'Link target',
            state: {scale: 1, scrollX: 0, scrollY: 0}
        }];

        expect(writeWorkspaceBookmarksToStage(stage, bookmarks)).toBe(true);
        expect(stage.createComment).toHaveBeenCalledTimes(1);
        const commentId = stage.createComment.mock.calls[0][0];
        expect(typeof commentId).toBe('string');
        expect(commentId).not.toHaveLength(0);
        expect(commentId).not.toBe('null');
        expect(stage.createComment.mock.calls[0][2]).toContain(WORKSPACE_BOOKMARKS_COMMENT_PREFIX);
        expect(readWorkspaceBookmarksFromStage(stage)).toEqual(bookmarks);
    });
});
