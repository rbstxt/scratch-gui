/* eslint-env jest */
import todoTabReducer, {
    hydrateTodos,
    addGoal,
    updateGoal,
    deleteGoal,
    toggleGoalExpanded,
    addTask,
    updateTask,
    deleteTask,
    toggleTask,
    setFilter,
    TODO_FILTER_ALL,
    TODO_FILTER_ACTIVE,
    TODO_FILTER_DONE
} from '../../../src/reducers/todo-tab';

const makeGoal = (id, title, tasks = []) => ({
    id,
    title,
    expanded: true,
    tasks: tasks.map(task => ({
        id: task.id,
        content: task.content,
        done: task.done || false,
        createdAt: task.createdAt || 0
    })),
    createdAt: 0
});

test('initialState is defined', () => {
    expect(todoTabReducer(undefined, {type: 'anything'})).toBeDefined();
});

test('hydrateTodos replaces state', () => {
    const state = todoTabReducer(undefined, {type: 'init'});
    const goals = [makeGoal('g1', 'Goal 1')];
    const newState = todoTabReducer(state, hydrateTodos(goals));
    expect(newState.goals).toEqual(goals);
    expect(newState.loaded).toBe(true);
});

test('addGoal appends a goal', () => {
    const state = todoTabReducer(undefined, {type: 'init'});
    const goal = makeGoal('g1', 'Goal 1');
    const newState = todoTabReducer(state, addGoal(goal));
    expect(newState.goals).toEqual([goal]);
});

test('updateGoal merges patch', () => {
    const goal = makeGoal('g1', 'Original');
    const state = todoTabReducer(undefined, hydrateTodos([goal]));
    const newState = todoTabReducer(state, updateGoal('g1', {title: 'Updated'}));
    expect(newState.goals[0].title).toBe('Updated');
    expect(newState.goals[0].id).toBe('g1');
});

test('deleteGoal removes goal', () => {
    const state = todoTabReducer(undefined, hydrateTodos([
        makeGoal('g1', 'A'),
        makeGoal('g2', 'B')
    ]));
    const newState = todoTabReducer(state, deleteGoal('g1'));
    expect(newState.goals).toHaveLength(1);
    expect(newState.goals[0].id).toBe('g2');
});

test('toggleGoalExpanded flips expanded', () => {
    const state = todoTabReducer(undefined, hydrateTodos([makeGoal('g1', 'A')]));
    const newState = todoTabReducer(state, toggleGoalExpanded('g1'));
    expect(newState.goals[0].expanded).toBe(false);
    expect(todoTabReducer(newState, toggleGoalExpanded('g1')).goals[0].expanded).toBe(true);
});

test('addTask appends to the right goal', () => {
    const state = todoTabReducer(undefined, hydrateTodos([
        makeGoal('g1', 'A', []),
        makeGoal('g2', 'B', [])
    ]));
    const newState = todoTabReducer(state, addTask('g2', {id: 't1', content: 'task', done: false, createdAt: 0}));
    expect(newState.goals[0].tasks).toHaveLength(0);
    expect(newState.goals[1].tasks).toHaveLength(1);
    expect(newState.goals[1].tasks[0].id).toBe('t1');
});

test('updateTask merges patch into the right task', () => {
    const state = todoTabReducer(undefined, hydrateTodos([
        makeGoal('g1', 'A', [{id: 't1', content: 'old', done: false}])
    ]));
    const newState = todoTabReducer(state, updateTask('g1', 't1', {content: 'new'}));
    expect(newState.goals[0].tasks[0].content).toBe('new');
    expect(newState.goals[0].tasks[0].id).toBe('t1');
});

test('deleteTask removes the task', () => {
    const state = todoTabReducer(undefined, hydrateTodos([
        makeGoal('g1', 'A', [
            {id: 't1', content: 'a', done: false},
            {id: 't2', content: 'b', done: false}
        ])
    ]));
    const newState = todoTabReducer(state, deleteTask('g1', 't1'));
    expect(newState.goals[0].tasks).toHaveLength(1);
    expect(newState.goals[0].tasks[0].id).toBe('t2');
});

test('toggleTask flips done', () => {
    const state = todoTabReducer(undefined, hydrateTodos([
        makeGoal('g1', 'A', [{id: 't1', content: 'a', done: false}])
    ]));
    expect(todoTabReducer(state, toggleTask('g1', 't1')).goals[0].tasks[0].done).toBe(true);
});

test('setFilter changes the filter', () => {
    const state = todoTabReducer(undefined, {type: 'init'});
    expect(todoTabReducer(state, setFilter(TODO_FILTER_ACTIVE)).filter).toBe(TODO_FILTER_ACTIVE);
    expect(todoTabReducer(state, setFilter(TODO_FILTER_DONE)).filter).toBe(TODO_FILTER_DONE);
    expect(todoTabReducer(state, setFilter(TODO_FILTER_ALL)).filter).toBe(TODO_FILTER_ALL);
});
