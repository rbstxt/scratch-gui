import classNames from 'classnames';
import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import {FormattedMessage, injectIntl, intlShape} from 'react-intl';

import MarkdownView, {toggleCheckboxAtIndex} from './markdown-view.jsx';
import TaskItem from './task-item.jsx';

import styles from './todo-tab.css';

const messages = {
    addTask: {
        id: 'gui.todoTab.addTask',
        defaultMessage: 'Add task',
        description: 'Add a task to the goal'
    },
    deleteGoal: {
        id: 'gui.todoTab.deleteGoal',
        defaultMessage: 'Delete',
        description: 'Delete goal'
    },
    collapse: {
        id: 'gui.todoTab.collapse',
        defaultMessage: 'Collapse',
        description: 'Collapse goal'
    },
    expand: {
        id: 'gui.todoTab.expand',
        defaultMessage: 'Expand',
        description: 'Expand goal'
    },
    goalProgress: {
        id: 'gui.todoTab.goalProgress',
        defaultMessage: '{done}/{total} done',
        description: 'Progress indicator for a goal'
    },
    confirmDelete: {
        id: 'gui.todoTab.confirmDelete',
        defaultMessage: 'Delete this goal and its tasks?',
        description: 'Confirmation message when deleting a goal'
    },
    titlePlaceholder: {
        id: 'gui.todoTab.titlePlaceholder',
        defaultMessage: '## Goal name',
        description: 'Placeholder for goal title editor'
    }
};

const isTitleEmpty = title => (title || '').replace(/[#*\s`_-]/g, '') === '';

class GoalCard extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleToggleExpand',
            'handleStartEdit',
            'handleCancelEdit',
            'handleSaveEdit',
            'handleChangeTitle',
            'handleKeyDown',
            'handleAddTask',
            'handleDelete',
            'handleToggleTitleCheckbox',
            'handleTaskUpdate',
            'handleTaskToggle',
            'handleTaskDelete',
            'setTextarea'
        ]);
        // Newly added goals (empty title) open in edit mode immediately
        this.state = {
            editing: props.goal.title === '',
            draftTitle: props.goal.title === '' ? '## ' : props.goal.title
        };
    }
    componentDidUpdate (prevProps) {
        if (prevProps.goal.title !== this.props.goal.title && !this.state.editing) {
            // eslint-disable-next-line react/no-did-update-set-state
            this.setState({draftTitle: this.props.goal.title});
        }
    }
    handleToggleExpand () {
        this.props.onToggle(this.props.goal.id);
    }
    handleStartEdit () {
        this.setState({editing: true, draftTitle: this.props.goal.title});
    }
    handleCancelEdit () {
        if (isTitleEmpty(this.props.goal.title) && this.props.goal.tasks.length === 0) {
            this.props.onDelete(this.props.goal.id);
            return;
        }
        this.setState({editing: false, draftTitle: this.props.goal.title});
    }
    handleSaveEdit () {
        const title = this.state.draftTitle;
        if (isTitleEmpty(title)) {
            if (this.props.goal.tasks.length === 0) {
                this.props.onDelete(this.props.goal.id);
                return;
            }
            this.setState({editing: false, draftTitle: this.props.goal.title});
            return;
        }
        this.props.onUpdate(this.props.goal.id, {title});
        this.setState({editing: false});
    }
    handleChangeTitle (event) {
        this.setState({draftTitle: event.target.value});
        this.autoResize(event.target);
    }
    handleKeyDown (event) {
        if (event.key === 'Escape') {
            event.preventDefault();
            this.handleCancelEdit();
        } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            this.handleSaveEdit();
        }
    }
    handleAddTask () {
        // New tasks are created empty; TaskItem opens its editor right away
        this.props.onAddTask(this.props.goal.id, '');
        if (!this.props.goal.expanded) {
            this.props.onToggle(this.props.goal.id);
        }
    }
    handleDelete () {
        // eslint-disable-next-line no-alert
        if (typeof window === 'undefined' || window.confirm(this.props.intl.formatMessage(messages.confirmDelete))) {
            this.props.onDelete(this.props.goal.id);
        }
    }
    handleToggleTitleCheckbox (idx) {
        const title = toggleCheckboxAtIndex(this.props.goal.title, idx);
        this.props.onUpdate(this.props.goal.id, {title});
    }
    handleTaskUpdate (taskId, patch) {
        this.props.onUpdateTask(this.props.goal.id, taskId, patch);
    }
    handleTaskToggle (taskId) {
        this.props.onToggleTask(this.props.goal.id, taskId);
    }
    handleTaskDelete (taskId) {
        this.props.onDeleteTask(this.props.goal.id, taskId);
    }
    autoResize (el) {
        el.style.height = 'auto';
        el.style.height = `${el.scrollHeight}px`;
    }
    setTextarea (el) {
        if (el) {
            el.focus();
            el.setSelectionRange(el.value.length, el.value.length);
            this.autoResize(el);
        }
    }
    render () {
        const {goal, isRtl} = this.props;
        const {editing, draftTitle} = this.state;
        const totalTasks = goal.tasks.length;
        const doneTasks = goal.tasks.filter(task => task.done).length;
        const headingSummary = this.props.intl.formatMessage(messages.goalProgress, {
            done: doneTasks,
            total: totalTasks
        });
        return (
            <div className={classNames(styles.goalCard, {[styles.goalCollapsed]: !goal.expanded})}>
                <div className={styles.goalHeader}>
                    <button
                        aria-label={this.props.intl.formatMessage(goal.expanded ? messages.collapse : messages.expand)}
                        className={styles.goalToggle}
                        type="button"
                        onClick={this.handleToggleExpand}
                    >
                        <span className={classNames(styles.caret, {[styles.caretOpen]: goal.expanded})}>
                            {'▶'}
                        </span>
                    </button>
                    <div className={styles.goalTitleArea}>
                        {editing ? (
                            <textarea
                                ref={this.setTextarea}
                                className={styles.goalTitleInput}
                                dir={isRtl ? 'rtl' : 'ltr'}
                                placeholder={this.props.intl.formatMessage(messages.titlePlaceholder)}
                                value={draftTitle}
                                onBlur={this.handleSaveEdit}
                                onChange={this.handleChangeTitle}
                                onKeyDown={this.handleKeyDown}
                            />
                        ) : (
                            <div
                                className={styles.goalTitleText}
                                onClick={this.handleStartEdit}
                                role="presentation"
                            >
                                <MarkdownView
                                    bookmarkNames={this.props.bookmarkNames}
                                    source={goal.title || ''}
                                    onJumpToBookmark={this.props.onJumpToBookmark}
                                    onToggleCheckbox={this.handleToggleTitleCheckbox}
                                />
                            </div>
                        )}
                        {!editing && (
                            <div className={styles.goalMeta}>
                                <span>{headingSummary}</span>
                            </div>
                        )}
                    </div>
                    <div className={styles.goalActions}>
                        <button
                            aria-label={this.props.intl.formatMessage(messages.deleteGoal)}
                            className={classNames(styles.goalActionButton, styles.goalActionDanger)}
                            type="button"
                            onClick={this.handleDelete}
                        >
                            {'×'}
                        </button>
                    </div>
                </div>
                {goal.expanded && (
                    <div className={styles.goalBody}>
                        {goal.tasks.length === 0 && (
                            <div className={styles.taskEmpty}>
                                <em>
                                    <FormattedMessage
                                        defaultMessage="Click below to add the first task"
                                        description="Hint shown when a goal has no tasks"
                                        id="gui.todoTab.noTasks"
                                    />
                                </em>
                            </div>
                        )}
                        {goal.tasks.map(task => (
                            <TaskItem
                                bookmarkNames={this.props.bookmarkNames}
                                isRtl={isRtl}
                                key={task.id}
                                onDelete={this.handleTaskDelete}
                                onJumpToBookmark={this.props.onJumpToBookmark}
                                onToggle={this.handleTaskToggle}
                                onUpdate={this.handleTaskUpdate}
                                task={task}
                            />
                        ))}
                        <button
                            className={styles.addTaskButton}
                            type="button"
                            onClick={this.handleAddTask}
                        >
                            {'+ '}
                            <FormattedMessage {...messages.addTask} />
                        </button>
                    </div>
                )}
            </div>
        );
    }
}

GoalCard.propTypes = {
    bookmarkNames: PropTypes.arrayOf(PropTypes.string),
    goal: PropTypes.shape({
        id: PropTypes.string,
        title: PropTypes.string,
        expanded: PropTypes.bool,
        tasks: PropTypes.array
    }).isRequired,
    intl: intlShape.isRequired,
    isRtl: PropTypes.bool,
    onAddTask: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
    onDeleteTask: PropTypes.func.isRequired,
    onJumpToBookmark: PropTypes.func.isRequired,
    onToggle: PropTypes.func.isRequired,
    onToggleTask: PropTypes.func.isRequired,
    onUpdate: PropTypes.func.isRequired,
    onUpdateTask: PropTypes.func.isRequired
};

GoalCard.defaultProps = {
    bookmarkNames: []
};

export default injectIntl(GoalCard);
