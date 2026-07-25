const HYDRATE_TODOS = 'scratch-gui/todo-tab/HYDRATE_TODOS';
const ADD_GOAL = 'scratch-gui/todo-tab/ADD_GOAL';
const UPDATE_GOAL = 'scratch-gui/todo-tab/UPDATE_GOAL';
const DELETE_GOAL = 'scratch-gui/todo-tab/DELETE_GOAL';
const TOGGLE_GOAL_EXPANDED = 'scratch-gui/todo-tab/TOGGLE_GOAL_EXPANDED';
const ADD_TASK = 'scratch-gui/todo-tab/ADD_TASK';
const UPDATE_TASK = 'scratch-gui/todo-tab/UPDATE_TASK';
const DELETE_TASK = 'scratch-gui/todo-tab/DELETE_TASK';
const TOGGLE_TASK = 'scratch-gui/todo-tab/TOGGLE_TASK';
const REORDER_GOALS = 'scratch-gui/todo-tab/REORDER_GOALS';
const SET_FILTER = 'scratch-gui/todo-tab/SET_FILTER';

export const TODO_FILTER_ALL = 'all';
export const TODO_FILTER_ACTIVE = 'active';
export const TODO_FILTER_DONE = 'done';

const initialState = {
    goals: [],
    filter: TODO_FILTER_ALL,
    loaded: false
};

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case HYDRATE_TODOS:
        return Object.assign({}, state, {
            goals: Array.isArray(action.goals) ? action.goals : [],
            loaded: true
        });
    case ADD_GOAL:
        return Object.assign({}, state, {
            goals: [...state.goals, action.goal]
        });
    case UPDATE_GOAL:
        return Object.assign({}, state, {
            goals: state.goals.map(goal => (
                goal.id === action.goalId ? Object.assign({}, goal, action.patch) : goal))
        });
    case DELETE_GOAL:
        return Object.assign({}, state, {
            goals: state.goals.filter(goal => goal.id !== action.goalId)
        });
    case TOGGLE_GOAL_EXPANDED:
        return Object.assign({}, state, {
            goals: state.goals.map(goal => (
                goal.id === action.goalId ? Object.assign({}, goal, {expanded: !goal.expanded}) : goal))
        });
    case ADD_TASK:
        return Object.assign({}, state, {
            goals: state.goals.map(goal => {
                if (goal.id !== action.goalId) return goal;
                return Object.assign({}, goal, {
                    tasks: [...goal.tasks, action.task]
                });
            })
        });
    case UPDATE_TASK:
        return Object.assign({}, state, {
            goals: state.goals.map(goal => {
                if (goal.id !== action.goalId) return goal;
                return Object.assign({}, goal, {
                    tasks: goal.tasks.map(task => (
                        task.id === action.taskId ? Object.assign({}, task, action.patch) : task))
                });
            })
        });
    case DELETE_TASK:
        return Object.assign({}, state, {
            goals: state.goals.map(goal => {
                if (goal.id !== action.goalId) return goal;
                return Object.assign({}, goal, {
                    tasks: goal.tasks.filter(task => task.id !== action.taskId)
                });
            })
        });
    case TOGGLE_TASK:
        return Object.assign({}, state, {
            goals: state.goals.map(goal => {
                if (goal.id !== action.goalId) return goal;
                return Object.assign({}, goal, {
                    tasks: goal.tasks.map(task => (
                        task.id === action.taskId ? Object.assign({}, task, {done: !task.done}) : task))
                });
            })
        });
    case REORDER_GOALS:
        return Object.assign({}, state, {
            goals: action.goals
        });
    case SET_FILTER:
        return Object.assign({}, state, {
            filter: action.filter
        });
    default:
        return state;
    }
};

const hydrateTodos = goals => ({
    type: HYDRATE_TODOS,
    goals
});

const addGoal = goal => ({
    type: ADD_GOAL,
    goal
});

const updateGoal = (goalId, patch) => ({
    type: UPDATE_GOAL,
    goalId,
    patch
});

const deleteGoal = goalId => ({
    type: DELETE_GOAL,
    goalId
});

const toggleGoalExpanded = goalId => ({
    type: TOGGLE_GOAL_EXPANDED,
    goalId
});

const addTask = (goalId, task) => ({
    type: ADD_TASK,
    goalId,
    task
});

const updateTask = (goalId, taskId, patch) => ({
    type: UPDATE_TASK,
    goalId,
    taskId,
    patch
});

const deleteTask = (goalId, taskId) => ({
    type: DELETE_TASK,
    goalId,
    taskId
});

const toggleTask = (goalId, taskId) => ({
    type: TOGGLE_TASK,
    goalId,
    taskId
});

const reorderGoals = goals => ({
    type: REORDER_GOALS,
    goals
});

const setFilter = filter => ({
    type: SET_FILTER,
    filter
});

export {
    reducer as default,
    initialState as todoTabInitialState,
    hydrateTodos,
    addGoal,
    updateGoal,
    deleteGoal,
    toggleGoalExpanded,
    addTask,
    updateTask,
    deleteTask,
    toggleTask,
    reorderGoals,
    setFilter
};
