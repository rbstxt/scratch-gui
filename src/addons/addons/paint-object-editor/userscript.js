/* eslint-disable require-jsdoc */
const BUTTON_ID = 'turbest-object-editor-button';
const PANEL_ID = 'turbest-object-editor-panel';

const PANEL_ICON = `
    <svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="2.5" y="3" width="15" height="14" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/>
        <path d="M3 6.5h14M6.5 10h7M6.5 13.5h7" fill="none" stroke="currentColor"
            stroke-width="1.5" stroke-linecap="round"/>
    </svg>`;

const BLEND_MODES = [
    'normal', 'multiply', 'screen', 'overlay', 'soft-light', 'hard-light',
    'color-dodge', 'color-burn', 'darken', 'lighten', 'difference',
    'exclusion', 'hue', 'saturation', 'color', 'luminosity'
];
const roundValue = value => Math.round(value * 100) / 100;

export default async function ({addon, msg}) {
    const paper = await addon.tab.traps.getPaper();
    const store = window.ReduxStore;
    const runtime = addon.tab.traps.vm.runtime;
    const transformState = new WeakMap();
    let panel = null;
    let fields = {};
    let selectionKey = '';

    const getSelection = () => {
        const state = store.getState().scratchPaint;
        return state && Array.isArray(state.selectedItems) ? state.selectedItems : [];
    };

    const getTransformState = item => {
        if (!transformState.has(item)) {
            transformState.set(item, {
                rotation: Number(item.rotation) || 0,
                scaleX: 100,
                scaleY: 100,
                skewX: 0,
                skewY: 0
            });
        }
        return transformState.get(item);
    };

    const getBounds = items => {
        let bounds = items[0].bounds.clone();
        for (let i = 1; i < items.length; i++) {
            bounds = bounds.unite(items[i].bounds);
        }
        return bounds;
    };

    const updateImage = () => {
        Promise.resolve().then(() => {
            const tool = paper.tool;
            if (tool && tool.boundingBoxTool && typeof tool.boundingBoxTool.setSelectionBounds === 'function') {
                tool.boundingBoxTool.setSelectionBounds();
            }
            if (tool && typeof tool.onUpdateImage === 'function') {
                tool.onUpdateImage();
            }
        });
    };

    const setSelectionValue = callback => {
        const items = getSelection();
        if (!items.length) return;
        callback(items, getBounds(items));
        updateImage();
        // The panel updater is initialized before any field event can run.
        // eslint-disable-next-line no-use-before-define
        updateFields();
    };

    const commonValue = (items, getter) => {
        const first = getter(items[0]);
        return items.every(item => getter(item) === first) ? first : '';
    };

    const setFieldValue = (name, value) => {
        if (!fields[name] || document.activeElement === fields[name]) return;
        fields[name].value = value;
    };

    const updateFields = () => {
        if (!panel) return;
        const items = getSelection();
        if (!items.length) {
            panel.remove();
            panel = null;
            return;
        }

        const bounds = getBounds(items);
        setFieldValue('x', roundValue(bounds.center.x - runtime.stageWidth));
        setFieldValue('y', roundValue((bounds.center.y - runtime.stageHeight) * -1));
        setFieldValue('width', roundValue(bounds.width / 2));
        setFieldValue('height', roundValue(bounds.height / 2));
        setFieldValue('rotation', commonValue(items, item => roundValue(getTransformState(item).rotation)));
        setFieldValue('scaleX', commonValue(items, item => roundValue(getTransformState(item).scaleX)));
        setFieldValue('scaleY', commonValue(items, item => roundValue(getTransformState(item).scaleY)));
        setFieldValue('skewX', commonValue(items, item => roundValue(getTransformState(item).skewX)));
        setFieldValue('skewY', commonValue(items, item => roundValue(getTransformState(item).skewY)));
        setFieldValue('blend', commonValue(items, item => item.blendMode || 'normal'));
        setFieldValue('cap', commonValue(items, item => item.strokeCap || 'round'));
        setFieldValue('join', commonValue(items, item => item.strokeJoin || 'round'));
        setFieldValue('dash', commonValue(items, item => (
            item.dashArray && item.dashArray[0] ? item.dashArray[0] : 0
        )));

        fields.layer.disabled = items.length !== 1;
        if (items.length === 1) {
            const siblings = items[0].parent ? items[0].parent.children : [];
            setFieldValue('layer', siblings.indexOf(items[0]) + 1);
            fields.layer.max = Math.max(1, siblings.length);
        } else {
            setFieldValue('layer', '');
        }
    };

    const addField = (container, name, label, options) => {
        const wrapper = document.createElement('label');
        wrapper.className = 'object-editor-field';
        if (options && options.wide) wrapper.dataset.wide = 'true';
        wrapper.appendChild(document.createTextNode(label));

        let input;
        if (options && options.values) {
            input = document.createElement('select');
            for (const value of options.values) {
                const option = document.createElement('option');
                option.value = value;
                option.textContent = msg(`option-${value}`);
                input.appendChild(option);
            }
        } else {
            input = document.createElement('input');
            input.type = 'number';
            input.step = options && options.step ? options.step : 'any';
            if (options && Object.prototype.hasOwnProperty.call(options, 'min')) input.min = options.min;
            if (options && Object.prototype.hasOwnProperty.call(options, 'max')) input.max = options.max;
        }
        input.addEventListener('change', options.onChange);
        wrapper.appendChild(input);
        container.appendChild(wrapper);
        fields[name] = input;
    };

    const createPanel = () => {
        if (panel) panel.remove();
        panel = document.createElement('div');
        panel.id = PANEL_ID;
        panel.className = 'object-editor-panel';

        const header = document.createElement('div');
        header.className = 'object-editor-header';
        header.textContent = msg('panel-title');
        const close = document.createElement('button');
        close.className = 'object-editor-close';
        close.type = 'button';
        close.title = msg('close');
        close.textContent = '\u00d7';
        close.addEventListener('click', () => {
            panel.remove();
            panel = null;
        });
        header.appendChild(close);

        const container = document.createElement('div');
        container.className = 'object-editor-fields';
        fields = {};

        addField(container, 'x', msg('field-x'), {
            onChange: event => setSelectionValue((items, bounds) => {
                const target = Number(event.target.value) + runtime.stageWidth;
                for (const item of items) item.translate(target - bounds.center.x, 0);
            })
        });
        addField(container, 'y', msg('field-y'), {
            onChange: event => setSelectionValue((items, bounds) => {
                const target = runtime.stageHeight - Number(event.target.value);
                for (const item of items) item.translate(0, target - bounds.center.y);
            })
        });
        addField(container, 'rotation', msg('field-rotation'), {
            onChange: event => setSelectionValue((items, bounds) => {
                const target = Number(event.target.value);
                for (const item of items) {
                    const state = getTransformState(item);
                    item.rotate(target - state.rotation, bounds.center);
                    state.rotation = target;
                }
            })
        });
        addField(container, 'layer', msg('field-layer'), {
            min: 1,
            step: '1',
            onChange: event => setSelectionValue(items => {
                const item = items[0];
                const parent = item.parent;
                if (!parent) return;
                const target = Math.max(0, Math.min(parent.children.length - 1, Number(event.target.value) - 1));
                parent.insertChild(target, item);
            })
        });
        addField(container, 'scaleX', msg('field-scale-x'), {
            onChange: event => setSelectionValue((items, bounds) => {
                const target = Number(event.target.value) || 0.01;
                for (const item of items) {
                    const state = getTransformState(item);
                    item.scale(target / state.scaleX, 1, bounds.center);
                    state.scaleX = target;
                }
            })
        });
        addField(container, 'scaleY', msg('field-scale-y'), {
            onChange: event => setSelectionValue((items, bounds) => {
                const target = Number(event.target.value) || 0.01;
                for (const item of items) {
                    const state = getTransformState(item);
                    item.scale(1, target / state.scaleY, bounds.center);
                    state.scaleY = target;
                }
            })
        });
        addField(container, 'width', msg('field-width'), {
            min: 0,
            onChange: event => setSelectionValue((items, bounds) => {
                const ratio = Math.max(0.01, Number(event.target.value) * 2) / Math.max(0.01, bounds.width);
                for (const item of items) item.scale(ratio, 1, bounds.center);
            })
        });
        addField(container, 'height', msg('field-height'), {
            min: 0,
            onChange: event => setSelectionValue((items, bounds) => {
                const ratio = Math.max(0.01, Number(event.target.value) * 2) / Math.max(0.01, bounds.height);
                for (const item of items) item.scale(1, ratio, bounds.center);
            })
        });
        addField(container, 'skewX', msg('field-skew-x'), {
            onChange: event => setSelectionValue((items, bounds) => {
                const target = Number(event.target.value);
                for (const item of items) {
                    const state = getTransformState(item);
                    item.shear(Math.tan((target - state.skewX) * Math.PI / 180), 0, bounds.center);
                    state.skewX = target;
                }
            })
        });
        addField(container, 'skewY', msg('field-skew-y'), {
            onChange: event => setSelectionValue((items, bounds) => {
                const target = Number(event.target.value);
                for (const item of items) {
                    const state = getTransformState(item);
                    item.shear(0, Math.tan((target - state.skewY) * Math.PI / 180), bounds.center);
                    state.skewY = target;
                }
            })
        });
        addField(container, 'blend', msg('field-blend'), {
            values: BLEND_MODES,
            wide: true,
            onChange: event => setSelectionValue(items => {
                for (const item of items) item.blendMode = event.target.value;
            })
        });
        addField(container, 'cap', msg('field-cap'), {
            values: ['round', 'butt', 'square'],
            onChange: event => setSelectionValue(items => {
                for (const item of items) item.strokeCap = event.target.value;
            })
        });
        addField(container, 'join', msg('field-join'), {
            values: ['round', 'miter', 'bevel'],
            onChange: event => setSelectionValue(items => {
                for (const item of items) item.strokeJoin = event.target.value;
            })
        });
        addField(container, 'dash', msg('field-dash'), {
            min: 0,
            wide: true,
            onChange: event => setSelectionValue(items => {
                const value = Math.max(0, Number(event.target.value));
                for (const item of items) item.dashArray = value ? [value, value] : [];
            })
        });

        panel.appendChild(header);
        panel.appendChild(container);
        document.body.appendChild(panel);

        header.addEventListener('mousedown', event => {
            if (event.target === close) return;
            const rect = panel.getBoundingClientRect();
            const offsetX = event.clientX - rect.left;
            const offsetY = event.clientY - rect.top;
            panel.style.transform = 'none';
            const move = moveEvent => {
                panel.style.left = `${moveEvent.clientX - offsetX}px`;
                panel.style.top = `${moveEvent.clientY - offsetY}px`;
            };
            const up = () => {
                document.removeEventListener('mousemove', move);
                document.removeEventListener('mouseup', up);
            };
            document.addEventListener('mousemove', move);
            document.addEventListener('mouseup', up);
        });

        updateFields();
    };

    const ensureButton = () => {
        const row = document.querySelector("[class^='paint-editor_row_'] [class^='fixed-tools_row_']");
        if (!row) return;
        let button = document.getElementById(BUTTON_ID);
        if (!button) {
            button = document.createElement('button');
            button.id = BUTTON_ID;
            button.type = 'button';
            button.className = 'object-editor-button';
            button.title = msg('open-tooltip');
            button.innerHTML = PANEL_ICON;
            const label = document.createElement('span');
            label.textContent = msg('toolbar-label');
            button.appendChild(label);
            button.addEventListener('click', () => {
                if (getSelection().length) createPanel();
            });
            row.appendChild(button);
        }
        button.dataset.enabled = getSelection().length ? 'true' : 'false';
    };

    const refresh = () => {
        ensureButton();
        const key = getSelection()
            .map(item => item.id)
            .join('.');
        if (key !== selectionKey) {
            selectionKey = key;
            updateFields();
        } else if (panel) {
            updateFields();
        }
    };

    addon.tab.redux.initialize();
    addon.tab.redux.addEventListener('statechanged', refresh);
    refresh();
}
