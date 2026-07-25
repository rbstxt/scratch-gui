import classNames from 'classnames';
import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import {FormattedMessage, injectIntl, intlShape} from 'react-intl';

import Box from '../box/box.jsx';
import GoalCard from './goal-card.jsx';
import {
    TODO_FILTER_ALL,
    TODO_FILTER_ACTIVE,
    TODO_FILTER_DONE
} from '../../reducers/todo-tab';

import styles from './todo-tab.css';

const messages = {
    addGoal: {
        id: 'gui.todoTab.addGoal',
        defaultMessage: 'Add goal',
        description: 'Button to add a new goal to the todo list'
    },
    filterAll: {
        id: 'gui.todoTab.filterAll',
        defaultMessage: 'All',
        description: 'Show all todos'
    },
    filterActive: {
        id: 'gui.todoTab.filterActive',
        defaultMessage: 'Active',
        description: 'Show only active todos'
    },
    filterDone: {
        id: 'gui.todoTab.filterDone',
        defaultMessage: 'Done',
        description: 'Show only completed todos'
    },
    emptyState: {
        id: 'gui.todoTab.emptyState',
        defaultMessage: 'No goals yet. Add one to get started!',
        description: 'Empty state shown when no goals exist'
    },
    emptyFilter: {
        id: 'gui.todoTab.emptyFilter',
        defaultMessage: 'No todos match this filter.',
        description: 'Empty state for filtered views'
    }
};

class TodoTab extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleFilterButtonClick',
            'handleAddGoal'
        ]);
    }
    handleFilterButtonClick (event) {
        const filter = event.currentTarget.dataset.filter;
        if (filter) {
            this.props.onSetFilter(filter);
        }
    }
    handleAddGoal () {
        // Goals are created with an empty title; GoalCard opens its editor right away
        this.props.onAddGoal('');
    }
    render () {
        const {
            className,
            filter,
            goals,
            isRtl,
            onAddTask,
            onDeleteGoal,
            onDeleteTask,
            onToggleGoal,
            onToggleTask,
            onUpdateGoal,
            onUpdateTask,
            onJumpToBookmark,
            workspaceBookmarks
        } = this.props;
        const bookmarkNames = (workspaceBookmarks || []).map(b => b.name);
        const filterButtons = [
            {key: TODO_FILTER_ALL, label: messages.filterAll},
            {key: TODO_FILTER_ACTIVE, label: messages.filterActive},
            {key: TODO_FILTER_DONE, label: messages.filterDone}
        ];

        const visibleGoals = goals.map(goal => {
            const visibleTasks = goal.tasks.filter(task => {
                if (filter === TODO_FILTER_ACTIVE) return !task.done;
                if (filter === TODO_FILTER_DONE) return task.done;
                return true;
            });
            return Object.assign({}, goal, {tasks: visibleTasks});
        }).filter(goal => goal.tasks.length > 0 || filter === TODO_FILTER_ALL);

        const isEmpty = goals.length === 0;
        const isFilterEmpty = !isEmpty && visibleGoals.length === 0;

        return (
            <Box
                className={classNames(
                    styles.wrapper,
                    className,
                    {[styles.rtl]: isRtl}
                )}
            >
                <div className={styles.header}>
                    <div className={styles.filterGroup}>
                        {filterButtons.map(item => (
                            <button
                                key={item.key}
                                className={classNames(styles.filterButton, {
                                    [styles.filterButtonActive]: filter === item.key
                                })}
                                data-filter={item.key}
                                type="button"
                                onClick={this.handleFilterButtonClick}
                            >
                                <FormattedMessage {...item.label} />
                            </button>
                        ))}
                    </div>
                    <button
                        className={styles.addGoalButton}
                        type="button"
                        onClick={this.handleAddGoal}
                    >
                        <FormattedMessage {...messages.addGoal} />
                    </button>
                </div>
                <div className={styles.list}>
                    {isEmpty && (
                        <div className={styles.empty}>
                            <FormattedMessage {...messages.emptyState} />
                        </div>
                    )}
                    {isFilterEmpty && (
                        <div className={styles.empty}>
                            <FormattedMessage {...messages.emptyFilter} />
                        </div>
                    )}
                    {visibleGoals.map(goal => (
                        <GoalCard
                            bookmarkNames={bookmarkNames}
                            goal={goal}
                            key={goal.id}
                            onAddTask={onAddTask}
                            onDelete={onDeleteGoal}
                            onDeleteTask={onDeleteTask}
                            onJumpToBookmark={onJumpToBookmark}
                            onToggle={onToggleGoal}
                            onToggleTask={onToggleTask}
                            onUpdate={onUpdateGoal}
                            onUpdateTask={onUpdateTask}
                        />
                    ))}
                </div>
            </Box>
        );
    }
}

TodoTab.propTypes = {
    className: PropTypes.string,
    filter: PropTypes.string,
    goals: PropTypes.array,
    intl: intlShape.isRequired,
    isRtl: PropTypes.bool,
    onAddGoal: PropTypes.func.isRequired,
    onAddTask: PropTypes.func.isRequired,
    onDeleteGoal: PropTypes.func.isRequired,
    onDeleteTask: PropTypes.func.isRequired,
    onJumpToBookmark: PropTypes.func.isRequired,
    onToggleGoal: PropTypes.func.isRequired,
    onToggleTask: PropTypes.func.isRequired,
    onUpdateGoal: PropTypes.func.isRequired,
    onUpdateTask: PropTypes.func.isRequired,
    onSetFilter: PropTypes.func.isRequired,
    workspaceBookmarks: PropTypes.array
};

TodoTab.defaultProps = {
    goals: [],
    workspaceBookmarks: []
};

export default injectIntl(TodoTab);
