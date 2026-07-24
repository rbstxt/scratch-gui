/* eslint-disable require-jsdoc */
const STORAGE_KEY = 'ADDONS_BLOCK-PINS';
// eslint-disable-next-line max-len
const CATEGORY_ICON = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI3MC42OTIiIGhlaWdodD0iNzAuNjkyIiB2aWV3Qm94PSIwIDAgNzAuNjkyIDcwLjY5MiI+PHBhdGggZD0iTTAgMzUuMzQ2QzAgMTUuODI1IDE1LjgyNSAwIDM1LjM0NiAwczM1LjM0NiAxNS44MjUgMzUuMzQ2IDM1LjM0Ni0xNS44MjUgMzUuMzQ2LTM1LjM0NiAzNS4zNDZTMCA1NC44NjcgMCAzNS4zNDYiIGZpbGw9IiNjNWJmOTYiLz48cGF0aCBkPSJNNC42NTYgMzUuMzQ2YzAtMTYuOTUgMTMuNzQtMzAuNjkgMzAuNjktMzAuNjlzMzAuNjkgMTMuNzQgMzAuNjkgMzAuNjktMTMuNzQgMzAuNjktMzAuNjkgMzAuNjktMzAuNjktMTMuNzQtMzAuNjktMzAuNjkiIGZpbGw9IiNmZmY3YzIiLz48cGF0aCBkPSJNNDguOTU2IDQ0LjAwMyA1MSA1MC4wMmwtNi4wMTctMi4wNDVMMzQuMTY4IDM3LjE2Yy0xLjg3MyAxLjY1NS02LjAwNyA1LjE1MS03LjMwMyA1LjAxOS0yLjM4Ny0uMjQ0LTEuODg5LTIuOTQ3LTIuMDQ4LTUuMzc2LS4xNTgtMi40MyAxLjQ3MS0zLjQ0IDEuNDcxLTMuNDRsLTUuODc5LTUuODhhMi40NSAyLjQ1IDAgMCAxIDAtMy40NjFsNC42MzMtNC42MzNhMi40NSAyLjQ1IDAgMCAxIDMuNDYxIDBsNi4wNyA2LjA3czIuMTQ5LTIuMDAzIDMuOTAyLTJjMS43NTMuMDAyIDUuNjY0LjA3NSA1LjMyMyAyLjAxMy0uMjM1IDEuMzMyLTQuMTExIDUuOTYtNS42MzkgNy43MzV6IiBmaWxsPSIjNDQ1MjczIi8+PC9zdmc+';

export default async function ({addon, msg, console}) {
    const Blockly = await addon.tab.traps.getBlockly();
    const vm = addon.tab.traps.vm;
    const category = document.createElementNS('http://www.w3.org/1999/xml', 'category');
    category.setAttribute('name', msg('category'));
    category.setAttribute('id', 'pinned');
    category.setAttribute('colour', '#ffffff');
    category.setAttribute('secondaryColour', '#ffffff');
    category.setAttribute('iconURI', CATEGORY_ICON);

    const gap = document.createElementNS('http://www.w3.org/1999/xml', 'sep');
    gap.setAttribute('gap', '36');
    let populateAttempts = 0;
    let pins;

    const loadPins = () => {
        try {
            const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
            return stored && Array.isArray(stored.blocks) ? stored.blocks : [];
        } catch (error) {
            console.warn('Malformed block pins', error);
            localStorage.removeItem(STORAGE_KEY);
            return [];
        }
    };

    const storePins = () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({blocks: pins}));
    };
    pins = loadPins();

    const createLabel = text => {
        const label = document.createElementNS('http://www.w3.org/1999/xml', 'label');
        label.setAttribute('text', text);
        return label;
    };

    const specifyType = block => {
        let type = block.type;
        if (type === 'data_variable' || type === 'data_listcontents') {
            type += `||v||${block.getVars()[0]}`;
        } else if (type === 'procedures_call') {
            type += `||p||${block.getProcCode()}`;
        }
        return type;
    };

    const getBlockByType = (type, workspace) => {
        const [blockType, metadataType, metadata] = type.split('||');
        const candidates = Object.values(workspace.blockDB_).filter(block => block.type === blockType);
        if (!metadataType) return candidates[0] || null;
        return candidates.find(block => (
            metadataType === 'p' ? block.getProcCode() === metadata : block.getVars()[0] === metadata
        )) || null;
    };

    const populateCategory = () => {
        category.innerHTML = '';
        const flyout = Blockly.mainWorkspace && Blockly.mainWorkspace.getFlyout();
        if (!flyout) {
            category.append(createLabel(msg('no-pins')), gap);
            return;
        }

        const blocks = pins
            .map(type => {
                const block = getBlockByType(type, flyout.workspace_);
                if (!block) console.warn(`Block pin could not load: ${type}`);
                return block ? Blockly.Xml.blockToDom(block) : null;
            })
            .filter(Boolean);
        if (!blocks.length) blocks.push(createLabel(msg('no-pins')));
        else if (blocks.length !== pins.length) blocks.push(createLabel(msg('some-pins-missing')));
        category.append(...blocks, gap);
    };

    const refreshToolbox = () => {
        populateCategory();
        const toolbox = Blockly.mainWorkspace && Blockly.mainWorkspace.getToolbox();
        if (toolbox) toolbox.populate_(toolbox.workspace_.options.languageTree);
        storePins();
    };

    const organizePins = () => {
        const toolbox = Blockly.mainWorkspace.getToolbox();
        const flyoutWorkspace = Blockly.mainWorkspace.getFlyout().workspace_;
        const categories = toolbox.categoryMenu_.categories_.map(item => item.id_);
        const categoryIndex = type => {
            const block = getBlockByType(type, flyoutWorkspace);
            if (!block) return Number.MAX_SAFE_INTEGER;
            let id = block.category_;
            if (id === 'data') id = 'variables';
            else if (id === 'data-lists') id = 'lists';
            else if (id === null) id = 'myBlocks';
            return categories.indexOf(id);
        };
        pins.sort((a, b) => categoryIndex(a) - categoryIndex(b));
        refreshToolbox();
    };

    const updatePin = (block, action) => {
        const type = specifyType(block);
        const index = pins.indexOf(type);
        if (action === 'pin' && index === -1) pins.push(type);
        if (action === 'unpin' && index !== -1) pins.splice(index, 1);
        if (action === 'top' && index !== -1) pins.unshift(...pins.splice(index, 1));
        if (action === 'bottom' && index !== -1) pins.push(...pins.splice(index, 1));
        refreshToolbox();
    };

    const originalShowContextMenu = Blockly.BlockSvg.prototype.showContextMenu_;
    Blockly.BlockSvg.prototype.showContextMenu_ = function (event) {
        if (this.workspace.options.readOnly || !this.contextMenu) return;
        if (!(this.isDeletable() && this.isMovable() && this.isInFlyout)) {
            originalShowContextMenu.call(this, event);
            return;
        }

        const block = this;
        const pinned = pins.includes(specifyType(block));
        const options = [];
        if (pinned) {
            options.push(
                {text: msg('move-top'), enabled: true, callback: () => updatePin(block, 'top')},
                {text: msg('move-bottom'), enabled: true, callback: () => updatePin(block, 'bottom')},
                {text: msg('organize-category'), enabled: true, callback: organizePins}
            );
        }
        options.push(
            {text: msg('pin'), enabled: !pinned, callback: () => updatePin(block, 'pin')},
            {text: msg('unpin'), enabled: pinned, callback: () => updatePin(block, 'unpin')},
            {
                text: msg('unpin-all'),
                enabled: pins.length > 0,
                callback: () => {
                    pins = [];
                    refreshToolbox();
                }
            }
        );
        if (this.customContextMenu) this.customContextMenu(options);
        Blockly.ContextMenu.show(event, options, this.RTL);
        Blockly.ContextMenu.currentBlock = this;
    };

    const originalPopulate = Blockly.Toolbox.CategoryMenu.prototype.populate;
    Blockly.Toolbox.CategoryMenu.prototype.populate = function (tree) {
        tree.insertBefore(category, tree.firstElementChild);
        originalPopulate.call(this, tree);
        if (populateAttempts < 3) {
            populateAttempts++;
            setTimeout(refreshToolbox, 1000);
        }
    };

    const scheduleRefresh = () => {
        populateAttempts = 2;
        setTimeout(refreshToolbox, 0);
    };
    vm.runtime.on('PROJECT_LOADED', () => {
        populateAttempts = 0;
    });
    vm.runtime.on('EXTENSION_ADDED', scheduleRefresh);
}
