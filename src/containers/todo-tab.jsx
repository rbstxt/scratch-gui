import bindAll from 'lodash.bindall';
import React from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import {defineMessages, injectIntl, intlShape} from 'react-intl';

import VM from 'scratch-vm';

import TodoTabComponent from '../components/todo-tab/todo-tab.jsx';
import {
    hydrateTodos,
    addGoal,
    updateGoal,
    deleteGoal,
    toggleGoalExpanded,
    addTask,
    updateTask,
    deleteTask,
    toggleTask,
    setFilter
} from '../reducers/todo-tab';
import {
    readTodosFromStage,
    writeTodosToStage,
    buildDefaultTodos,
    createGoal,
    createTask
} from '../lib/todo-storage';
import {
    readWorkspaceBookmarksFromStage,
    applyWorkspaceBookmarkState,
    findWorkspaceBookmarkByName
} from '../lib/workspace-bookmarks';

const messages = defineMessages({
    bookmarkMissing: {
        id: 'gui.todoTab.bookmarkMissing',
        defaultMessage: 'Bookmark "{name}" not found.',
        description: 'Notice when a bookmark link is broken'
    }
});

class TodoTab extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleProjectLoaded',
            'persist',
            'handleAddGoal',
            'handleUpdateGoal',
            'handleDeleteGoal',
            'handleToggleGoal',
            'handleAddTask',
            'handleUpdateTask',
            'handleDeleteTask',
            'handleToggleTask',
            'handleSetFilter',
            'handleJumpToBookmark'
        ]);
    }
    componentDidMount () {
        this.props.vm.runtime.on('PROJECT_LOADED', this.handleProjectLoaded);
        this.props.vm.runtime.on('PROJECT_CHANGED', this.persist);
        this.handleProjectLoaded();
    }
    componentDidUpdate (prevProps) {
        if (prevProps.goals !== this.props.goals) {
            this.persist();
        }
    }
    componentWillUnmount () {
        this.props.vm.runtime.off('PROJECT_LOADED', this.handleProjectLoaded);
        this.props.vm.runtime.off('PROJECT_CHANGED', this.persist);
    }
    handleProjectLoaded () {
        const stage = this.props.vm.runtime.getTargetForStage();
        let goals = readTodosFromStage(stage);
        if (goals === null) {
            goals = buildDefaultTodos();
            writeTodosToStage(stage, goals);
            if (this.props.vm.runtime.emitProjectChanged) {
                this.props.vm.runtime.emitProjectChanged();
            }
        }
        this.props.onHydrate(goals);
        const bookmarks = readWorkspaceBookmarksFromStage(stage);
        this.setState({workspaceBookmarks: bookmarks});
    }
    persist () {
        const stage = this.props.vm.runtime.getTargetForStage();
        writeTodosToStage(stage, this.props.goals);
    }
    getWorkspaceBookmarks () {
        const stage = this.props.vm.runtime.getTargetForStage();
        return readWorkspaceBookmarksFromStage(stage);
    }
    handleAddGoal (title) {
        this.props.onAddGoal(createGoal({title, expanded: true}));
    }
    handleUpdateGoal (goalId, patch) {
        this.props.onUpdateGoal(goalId, patch);
    }
    handleDeleteGoal (goalId) {
        this.props.onDeleteGoal(goalId);
    }
    handleToggleGoal (goalId) {
        this.props.onToggleGoal(goalId);
    }
    handleAddTask (goalId, content) {
        this.props.onAddTask(goalId, createTask(content));
    }
    handleUpdateTask (goalId, taskId, patch) {
        this.props.onUpdateTask(goalId, taskId, patch);
    }
    handleDeleteTask (goalId, taskId) {
        this.props.onDeleteTask(goalId, taskId);
    }
    handleToggleTask (goalId, taskId) {
        this.props.onToggleTask(goalId, taskId);
    }
    handleSetFilter (filter) {
        this.props.onSetFilter(filter);
    }
    handleJumpToBookmark (name) {
        const bookmarks = this.getWorkspaceBookmarks();
        const bookmark = findWorkspaceBookmarkByName(bookmarks, name);
        if (!bookmark) {
            // eslint-disable-next-line no-console
            if (typeof console !== 'undefined' && console.warn) {
                console.warn(this.props.intl.formatMessage(messages.bookmarkMissing, {name}));
            }
            return;
        }
        applyWorkspaceBookmarkState(this.props.vm, bookmark.state);
    }
    render () {
        const workspaceBookmarks = this.getWorkspaceBookmarks();
        return (
            <TodoTabComponent
                filter={this.props.filter}
                goals={this.props.goals}
                isRtl={this.props.isRtl}
                workspaceBookmarks={workspaceBookmarks}
                onAddGoal={this.handleAddGoal}
                onAddTask={this.handleAddTask}
                onDeleteGoal={this.handleDeleteGoal}
                onDeleteTask={this.handleDeleteTask}
                onJumpToBookmark={this.handleJumpToBookmark}
                onToggleGoal={this.handleToggleGoal}
                onToggleTask={this.handleToggleTask}
                onUpdateGoal={this.handleUpdateGoal}
                onUpdateTask={this.handleUpdateTask}
                onSetFilter={this.handleSetFilter}
            />
        );
    }
}

TodoTab.propTypes = {
    filter: PropTypes.string,
    goals: PropTypes.array,
    intl: intlShape.isRequired,
    isRtl: PropTypes.bool,
    onAddGoal: PropTypes.func.isRequired,
    onAddTask: PropTypes.func.isRequired,
    onDeleteGoal: PropTypes.func.isRequired,
    onDeleteTask: PropTypes.func.isRequired,
    onHydrate: PropTypes.func.isRequired,
    onSetFilter: PropTypes.func.isRequired,
    onToggleGoal: PropTypes.func.isRequired,
    onToggleTask: PropTypes.func.isRequired,
    onUpdateGoal: PropTypes.func.isRequired,
    onUpdateTask: PropTypes.func.isRequired,
    vm: PropTypes.instanceOf(VM).isRequired
};

const mapStateToProps = state => ({
    goals: state.scratchGui.todoTab.goals,
    filter: state.scratchGui.todoTab.filter,
    isRtl: state.locales.isRtl,
    vm: state.scratchGui.vm
});

const mapDispatchToProps = dispatch => ({
    onHydrate: goals => dispatch(hydrateTodos(goals)),
    onAddGoal: goal => dispatch(addGoal(goal)),
    onUpdateGoal: (goalId, patch) => dispatch(updateGoal(goalId, patch)),
    onDeleteGoal: goalId => dispatch(deleteGoal(goalId)),
    onToggleGoal: goalId => dispatch(toggleGoalExpanded(goalId)),
    onAddTask: (goalId, task) => dispatch(addTask(goalId, task)),
    onUpdateTask: (goalId, taskId, patch) => dispatch(updateTask(goalId, taskId, patch)),
    onDeleteTask: (goalId, taskId) => dispatch(deleteTask(goalId, taskId)),
    onToggleTask: (goalId, taskId) => dispatch(toggleTask(goalId, taskId)),
    onSetFilter: filter => dispatch(setFilter(filter))
});

export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(TodoTab));
