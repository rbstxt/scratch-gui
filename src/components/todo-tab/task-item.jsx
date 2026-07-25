import classNames from 'classnames';
import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import {injectIntl, intlShape} from 'react-intl';

import MarkdownView, {
    toggleCheckboxAtIndex,
    isFirstCheckboxChecked,
    startsWithCheckbox,
    isEffectivelyEmpty
} from './markdown-view.jsx';

import styles from './todo-tab.css';

const messages = {
    delete: {
        id: 'gui.todoTab.task.delete',
        defaultMessage: 'Delete',
        description: 'Delete task'
    },
    placeholder: {
        id: 'gui.todoTab.task.placeholder',
        defaultMessage: '- [ ] Task...',
        description: 'Placeholder for empty task editor'
    }
};

class TaskItem extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleToggleDone',
            'handleStartEdit',
            'handleCancelEdit',
            'handleSaveEdit',
            'handleChangeContent',
            'handleDelete',
            'handleKeyDown',
            'handleToggleMarkdownCheckbox',
            'setTextarea'
        ]);
        // New (empty) tasks start in edit mode immediately, like Obsidian
        this.state = {
            editing: props.task.content === '',
            draftContent: props.task.content
        };
    }
    componentDidUpdate (prevProps) {
        if (prevProps.task.content !== this.props.task.content && !this.state.editing) {
            // eslint-disable-next-line react/no-did-update-set-state
            this.setState({draftContent: this.props.task.content});
        }
    }
    handleToggleDone () {
        this.props.onToggle(this.props.task.id);
    }
    handleToggleMarkdownCheckbox (idx) {
        const newContent = toggleCheckboxAtIndex(this.props.task.content, idx);
        const patch = {content: newContent};
        // Keep the task's done state in sync with the leading markdown checkbox
        if (idx === 0 && startsWithCheckbox(newContent)) {
            patch.done = Boolean(isFirstCheckboxChecked(newContent));
        }
        this.props.onUpdate(this.props.task.id, patch);
    }
    handleStartEdit () {
        this.setState({editing: true, draftContent: this.props.task.content});
    }
    handleCancelEdit () {
        // Cancelling an untouched empty task removes it
        if (isEffectivelyEmpty(this.props.task.content)) {
            this.props.onDelete(this.props.task.id);
            return;
        }
        this.setState({editing: false, draftContent: this.props.task.content});
    }
    handleSaveEdit () {
        const content = this.state.draftContent;
        if (isEffectivelyEmpty(content)) {
            this.props.onDelete(this.props.task.id);
            return;
        }
        const patch = {content};
        if (startsWithCheckbox(content)) {
            patch.done = Boolean(isFirstCheckboxChecked(content));
        }
        this.props.onUpdate(this.props.task.id, patch);
        this.setState({editing: false});
    }
    handleChangeContent (event) {
        this.setState({draftContent: event.target.value});
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
    handleDelete () {
        this.props.onDelete(this.props.task.id);
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
        const {task, isRtl} = this.props;
        const {editing, draftContent} = this.state;

        if (editing) {
            return (
                <div className={classNames(styles.taskItem, styles.taskEditing)}>
                    <textarea
                        ref={this.setTextarea}
                        className={styles.taskInput}
                        dir={isRtl ? 'rtl' : 'ltr'}
                        placeholder={this.props.intl.formatMessage(messages.placeholder)}
                        value={draftContent}
                        onBlur={this.handleSaveEdit}
                        onChange={this.handleChangeContent}
                        onKeyDown={this.handleKeyDown}
                    />
                </div>
            );
        }

        // When the content itself leads with a markdown checkbox, that checkbox
        // acts as the primary toggle (Obsidian-style) and the side checkbox hides.
        const hasLeadingCheckbox = startsWithCheckbox(task.content);
        const effectiveDone = hasLeadingCheckbox ?
            Boolean(isFirstCheckboxChecked(task.content)) : task.done;

        return (
            <div
                className={classNames(styles.taskItem, {
                    [styles.taskDone]: effectiveDone
                })}
            >
                {!hasLeadingCheckbox && (
                    <button
                        aria-label={task.done ? 'Mark as not done' : 'Mark as done'}
                        className={classNames(styles.taskCheckbox, {
                            [styles.taskCheckboxChecked]: task.done
                        })}
                        type="button"
                        onClick={this.handleToggleDone}
                    >
                        {task.done ? '✓' : ''}
                    </button>
                )}
                <div className={styles.taskBody}>
                    <div className={styles.taskContent}>
                        <MarkdownView
                            bookmarkNames={this.props.bookmarkNames}
                            source={task.content || ''}
                            onJumpToBookmark={this.props.onJumpToBookmark}
                            onRequestEdit={this.handleStartEdit}
                            onToggleCheckbox={this.handleToggleMarkdownCheckbox}
                        />
                    </div>
                </div>
                <div className={styles.taskActions}>
                    <button
                        aria-label={this.props.intl.formatMessage(messages.delete)}
                        className={classNames(styles.taskActionButton, styles.taskActionDanger)}
                        type="button"
                        onClick={this.handleDelete}
                    >
                        {'×'}
                    </button>
                </div>
            </div>
        );
    }
}

TaskItem.propTypes = {
    bookmarkNames: PropTypes.arrayOf(PropTypes.string),
    intl: intlShape.isRequired,
    isRtl: PropTypes.bool,
    onDelete: PropTypes.func.isRequired,
    onJumpToBookmark: PropTypes.func.isRequired,
    onToggle: PropTypes.func.isRequired,
    onUpdate: PropTypes.func.isRequired,
    task: PropTypes.shape({
        id: PropTypes.string,
        content: PropTypes.string,
        done: PropTypes.bool
    }).isRequired
};

TaskItem.defaultProps = {
    bookmarkNames: []
};

export default injectIntl(TaskItem);
