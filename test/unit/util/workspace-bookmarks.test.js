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

import {applyWorkspaceBookmarkState} from '../../../src/lib/workspace-bookmarks';

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
});
