// Adapted from MistWarp's workspace bookmark persistence.
import LazyScratchBlocks from './tw-lazy-scratch-blocks';

export const WORKSPACE_BOOKMARKS_COMMENT_PREFIX = 'WORKSPACE_BOOKMARKS:';

export const readWorkspaceBookmarksFromStage = stage => {
    if (!stage || !stage.comments) return [];
    for (const commentId in stage.comments) {
        const comment = stage.comments[commentId];
        if (!comment || typeof comment.text !== 'string' ||
            !comment.text.startsWith(WORKSPACE_BOOKMARKS_COMMENT_PREFIX)) continue;
        try {
            const payload = JSON.parse(comment.text.slice(WORKSPACE_BOOKMARKS_COMMENT_PREFIX.length));
            return Array.isArray(payload.bookmarks) ? payload.bookmarks : [];
        } catch {
            return [];
        }
    }
    return [];
};

export const writeWorkspaceBookmarksToStage = (stage, bookmarks) => {
    if (!stage || !stage.comments) return false;

    const text = `${WORKSPACE_BOOKMARKS_COMMENT_PREFIX}${JSON.stringify({
        bookmarks,
        version: '2.0',
        timestamp: Date.now()
    })}`;
    for (const commentId in stage.comments) {
        const comment = stage.comments[commentId];
        if (comment && typeof comment.text === 'string' &&
            comment.text.startsWith(WORKSPACE_BOOKMARKS_COMMENT_PREFIX)) {
            comment.text = text;
            return true;
        }
    }

    if (typeof stage.createComment === 'function') {
        void stage.createComment(null, null, text, -1000, -1000, 200, 100, true);
        return true;
    }
    return false;
};

export const getCurrentWorkspaceBookmarkState = async vm => {
    if (!vm) return null;
    const ScratchBlocks = LazyScratchBlocks.isLoaded() ?
        LazyScratchBlocks.get() : await LazyScratchBlocks.load();
    const workspace = ScratchBlocks.getMainWorkspace();
    if (!workspace) return null;
    const metrics = workspace.getMetrics();
    return {
        scrollX: metrics.viewLeft,
        scrollY: metrics.viewTop,
        scale: workspace.scale,
        targetId: vm.editingTarget ? vm.editingTarget.id : null
    };
};

export const applyWorkspaceBookmarkState = async (vm, state) => {
    if (!vm || !state) return;
    const scale = Number(state.scale);
    const scrollX = Number(state.scrollX);
    const scrollY = Number(state.scrollY);
    if (!Number.isFinite(scale) || scale <= 0 ||
        !Number.isFinite(scrollX) || !Number.isFinite(scrollY)) return;
    if (state.targetId && vm.editingTarget && state.targetId !== vm.editingTarget.id) {
        const target = vm.runtime.getTargetById(state.targetId);
        if (target) vm.setEditingTarget(state.targetId);
    }
    const ScratchBlocks = LazyScratchBlocks.isLoaded() ?
        LazyScratchBlocks.get() : await LazyScratchBlocks.load();
    const workspace = ScratchBlocks.getMainWorkspace();
    if (!workspace || !workspace.scrollbar) return;
    workspace.setScale(scale);
    const metrics = workspace.getMetrics();
    workspace.scrollbar.set(scrollX - metrics.contentLeft, scrollY - metrics.contentTop);
};

export const findWorkspaceBookmarkByName = (bookmarks, name) => {
    if (!Array.isArray(bookmarks) || !name) return null;
    const target = String(name)
        .trim()
        .toLowerCase();
    if (!target) return null;
    for (let i = 0; i < bookmarks.length; i++) {
        if (typeof bookmarks[i].name === 'string' &&
            bookmarks[i].name
                .trim()
                .toLowerCase() === target) {
            return bookmarks[i];
        }
    }
    return null;
};
