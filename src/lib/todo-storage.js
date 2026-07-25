// Todo list persistence, stored in a stage comment (similar to workspace bookmarks).
export const TODO_LIST_COMMENT_PREFIX = 'TODO_LIST:';

export const DEFAULT_TODO_TUTORIAL_GOAL = `# ようこそ

**Markdown** で書けるシンプルなやることリストです。

## 使い方

- **文字をクリック**すると、その場で Markdown 編集に切り替わります (Obsidian 風)
- チェックボックスは **クリックするだけ**で切り替わります
- 編集を終えるには、外側をクリックするか \`Ctrl+Enter\` を押してください

## 記法

- 太字: \`**テキスト**\` / 斜体: \`*テキスト*\`
- タスク: \`- [ ] 未完了\` / \`- [x] 完了\`
- ブックマークへのリンク: \`[名前](bookmark:名前)\`

## 試してみよう

- [ ] このチェックボックスをクリック
- [ ] この文章をクリックして編集してみる
`;

const makeId = () => {
    const random = Math.random()
        .toString(36)
        .slice(2, 10);
    return `${Date.now().toString(36)}-${random}`;
};

const cloneGoal = (goal, index) => ({
    id: goal.id || `g_${index}_${makeId()}`,
    title: typeof goal.title === 'string' ? goal.title : '',
    expanded: goal.expanded !== false,
    tasks: Array.isArray(goal.tasks) ? goal.tasks.map((task, taskIndex) => ({
        id: task.id || `t_${index}_${taskIndex}_${makeId()}`,
        content: typeof task.content === 'string' ? task.content : '',
        done: Boolean(task.done),
        createdAt: typeof task.createdAt === 'number' ? task.createdAt : Date.now()
    })) : [],
    createdAt: typeof goal.createdAt === 'number' ? goal.createdAt : Date.now()
});

export const normalizeTodos = data => {
    if (!data || typeof data !== 'object') return [];
    const goals = Array.isArray(data.goals) ? data.goals : [];
    return goals.map((goal, index) => cloneGoal(goal, index));
};

export const buildDefaultTodos = () => ([
    {
        id: `g_default_${makeId()}`,
        title: DEFAULT_TODO_TUTORIAL_GOAL,
        expanded: true,
        tasks: [],
        createdAt: Date.now()
    }
]);

export const readTodosFromStage = stage => {
    if (!stage || !stage.comments) return null;
    for (const commentId in stage.comments) {
        const comment = stage.comments[commentId];
        if (!comment || typeof comment.text !== 'string' ||
            !comment.text.startsWith(TODO_LIST_COMMENT_PREFIX)) continue;
        try {
            const payload = JSON.parse(comment.text.slice(TODO_LIST_COMMENT_PREFIX.length));
            return normalizeTodos(payload);
        } catch {
            return [];
        }
    }
    return null;
};

export const writeTodosToStage = (stage, goals) => {
    if (!stage || !stage.comments) return false;
    const normalized = normalizeTodos({goals});
    const text = `${TODO_LIST_COMMENT_PREFIX}${JSON.stringify({
        goals: normalized,
        version: '1.0',
        timestamp: Date.now()
    })}`;
    for (const commentId in stage.comments) {
        const comment = stage.comments[commentId];
        if (comment && typeof comment.text === 'string' &&
            comment.text.startsWith(TODO_LIST_COMMENT_PREFIX)) {
            comment.text = text;
            return true;
        }
    }

    if (typeof stage.createComment === 'function') {
        void stage.createComment(null, null, text, -1000, -1000, 240, 120, true);
        return true;
    }
    return false;
};

export const createGoal = (overrides = {}) => ({
    id: `g_${makeId()}`,
    title: typeof overrides.title === 'string' ? overrides.title : '',
    expanded: overrides.expanded !== false,
    tasks: Array.isArray(overrides.tasks) ? overrides.tasks.map((task, index) => ({
        id: task.id || `t_${index}_${makeId()}`,
        content: typeof task.content === 'string' ? task.content : '',
        done: Boolean(task.done),
        createdAt: typeof task.createdAt === 'number' ? task.createdAt : Date.now()
    })) : [],
    createdAt: Date.now()
});

export const createTask = (content = '') => ({
    id: `t_${makeId()}`,
    content,
    done: false,
    createdAt: Date.now()
});
