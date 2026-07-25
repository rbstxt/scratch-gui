import classNames from 'classnames';
import bindAll from 'lodash.bindall';
import DOMPurify from 'dompurify';
import {marked} from 'marked';
import PropTypes from 'prop-types';
import React from 'react';

import styles from './todo-tab.css';

marked.setOptions({
    gfm: true,
    breaks: true,
    headerIds: false,
    mangle: false
});

const BOOKMARK_LINK_PATTERN = /^bookmark:/i;

const transformBookmarkLinks = (token, bookmarkNames) => {
    if (token.type === 'link' && BOOKMARK_LINK_PATTERN.test(token.href || '')) {
        const name = decodeURIComponent(token.href.replace(/^bookmark:/i, '')).trim();
        const exists = bookmarkNames.some(
            n => n.toLowerCase() === name.toLowerCase()
        );
        if (exists) {
            return {
                type: 'html',
                block: false,
                text: `<a href="#" class="${styles.bookmarkLink}" ` +
                    `data-bookmark="${encodeURIComponent(name)}">${token.text}</a>`
            };
        }
        return {
            type: 'html',
            block: false,
            text: `<span class="${styles.bookmarkMissing}" title="Bookmark not found">` +
                `${token.text} (missing bookmark: ${name})</span>`
        };
    }
    return token;
};

const sanitize = html => DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
        'a', 'b', 'i', 'em', 'strong', 'code', 'pre',
        'ul', 'ol', 'li', 'p', 'br',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'blockquote', 'hr', 'del', 'input', 'span'
    ],
    ALLOWED_ATTR: [
        'href', 'class', 'data-bookmark',
        'target', 'rel', 'checked', 'type', 'title'
    ]
});

const indexCheckboxes = html => {
    const div = document.createElement('div');
    div.innerHTML = html;
    const checkboxes = div.querySelectorAll('input[type="checkbox"]');
    for (let i = 0; i < checkboxes.length; i++) {
        checkboxes[i].setAttribute('data-checkbox-idx', String(i));
    }
    return div.innerHTML;
};

// Match task-list checkboxes the same way marked renders them: list markers
// at the start of a line. Inline code spans and fenced code blocks are
// excluded so the rendered checkbox order matches the source order.
const CHECKBOX_PATTERN = /(^|\n)(\s*[-*+]\s*)\[([ xX])\]/g;

const stripCodeForCheckboxScan = source => source
    .replace(/```[\s\S]*?```/g, m => m.replace(/[^\n]/g, ' '))
    .replace(/`[^`\n]*`/g, m => ' '.repeat(m.length));

export const toggleCheckboxAtIndex = (source, targetIdx) => {
    const stripped = stripCodeForCheckboxScan(source);
    CHECKBOX_PATTERN.lastIndex = 0;
    let idx = 0;
    let match;
    while ((match = CHECKBOX_PATTERN.exec(stripped)) !== null) {
        if (idx++ !== targetIdx) continue;
        const bracketStart = match.index + match[1].length + match[2].length;
        const bracket = source.slice(bracketStart, bracketStart + 3);
        const toggled = /[xX]/.test(bracket) ? '[ ]' : '[x]';
        return source.slice(0, bracketStart) + toggled + source.slice(bracketStart + 3);
    }
    return source;
};

export const isFirstCheckboxChecked = source => {
    const stripped = stripCodeForCheckboxScan(source);
    CHECKBOX_PATTERN.lastIndex = 0;
    const match = CHECKBOX_PATTERN.exec(stripped);
    return match ? /[xX]/.test(match[3]) : null;
};

export const startsWithCheckbox = source => /^\s*[-*+]\s*\[[ xX]\]/.test(source || '');

export const isEffectivelyEmpty = source =>
    (source || '').replace(/(^|\n)\s*[-*+]\s*\[[ xX]\]/g, '$1').trim() === '';

class MarkdownView extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, ['handleClick']);
    }
    shouldComponentUpdate (nextProps) {
        return nextProps.source !== this.props.source ||
            nextProps.bookmarkNames !== this.props.bookmarkNames;
    }
    handleClick (event) {
        const target = event.target;
        if (target.tagName === 'INPUT' && target.type === 'checkbox') {
            // Clickable markdown checkboxes: toggle without entering edit mode
            event.preventDefault();
            event.stopPropagation();
            if (this.props.onToggleCheckbox) {
                this.props.onToggleCheckbox(Number(target.dataset.checkboxIdx));
            }
            return;
        }
        if (target && target.tagName === 'A' && target.dataset.bookmark) {
            event.preventDefault();
            event.stopPropagation();
            this.props.onJumpToBookmark(decodeURIComponent(target.dataset.bookmark));
            return;
        }
        if (target && target.tagName === 'A') {
            // External links work normally and do not trigger editing
            event.stopPropagation();
            return;
        }
        if (this.props.onRequestEdit) {
            this.props.onRequestEdit(event);
        }
    }
    render () {
        const {source, bookmarkNames, className} = this.props;
        const tokens = marked.lexer(source || '');
        const transformed = tokens.map(token => transformBookmarkLinks(token, bookmarkNames));
        const html = indexCheckboxes(sanitize(marked.parser(transformed)));
        return (
            <div
                className={classNames(styles.markdown, className)}
                role="presentation"
                onClick={this.handleClick}
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{__html: html}}
            />
        );
    }
}

MarkdownView.propTypes = {
    bookmarkNames: PropTypes.arrayOf(PropTypes.string),
    className: PropTypes.string,
    onJumpToBookmark: PropTypes.func.isRequired,
    onRequestEdit: PropTypes.func,
    onToggleCheckbox: PropTypes.func,
    source: PropTypes.string
};

MarkdownView.defaultProps = {
    bookmarkNames: [],
    source: ''
};

export default MarkdownView;
