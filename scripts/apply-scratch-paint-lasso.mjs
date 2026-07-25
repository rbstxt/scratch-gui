import {spawnSync} from 'child_process';
import {readFile, writeFile} from 'fs/promises';
import {dirname, resolve} from 'path';
import {fileURLToPath} from 'url';

const rootDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const patchPath = resolve(rootDirectory, 'patches', 'scratch-paint-lasso.patch');

const replaceOnce = (source, search, replacement, file) => {
    if (!source.includes(search)) throw new Error(`Unable to apply dependency patch to ${file}`);
    return source.replace(search, replacement);
};

const patchFile = async (path, marker, transforms) => {
    let source = await readFile(path, 'utf8');
    if (source.includes(marker)) return;
    for (const [search, replacement] of transforms) {
        source = replaceOnce(source, search, replacement, path);
    }
    await writeFile(path, source);
};

const migrateGaiaOffscreenOptimization = async (vmDirectory, renderDirectory) => {
    const runtimePath = resolve(vmDirectory, 'engine', 'runtime.js');
    let runtime = await readFile(runtimePath, 'utf8');
    if (runtime.includes('renderer.renderOffscreen')) {
        runtime = runtime.replace(
            'this.renderer.renderOffscreen = !this.runtimeOptions.disableOffscreenRendering;',
            'this.renderer.offscreenDrawableCulling = this.runtimeOptions.disableOffscreenRendering;'
        ).replace(
            'if (this.runtimeOptions.disableOffscreenRendering === this.renderer.renderOffscreen) {\n' +
                '                this.renderer.setRenderOffscreen(!this.runtimeOptions.disableOffscreenRendering);\n' +
                '            }',
            'if (this.runtimeOptions.disableOffscreenRendering !== this.renderer.offscreenDrawableCulling) {\n' +
                '                this.renderer.setOffscreenDrawableCulling(this.runtimeOptions.disableOffscreenRendering);\n' +
                '            }'
        );
        await writeFile(runtimePath, runtime);
    }

    const renderPath = resolve(renderDirectory, 'RenderWebGL.js');
    let render = await readFile(renderPath, 'utf8');
    if (render.includes('setRenderOffscreen (enabled)')) {
        render = render.replace('        this.renderOffscreen = true;\n\n', '')
            .replace(
                `    setRenderOffscreen (enabled) {
        this.renderOffscreen = enabled;
        this.dirty = true;
        this.draw();
    }

`,
                ''
            ).replace(
                '        const halfNativeSizeX = this._nativeSize[0] / 2;\n' +
                    '        const halfNativeSizeY = this._nativeSize[1] / 2;\n\n',
                ''
            ).replace(
                `            const uniforms = {};
            if (!this.renderOffscreen && drawable.uniformApplied &&
                drawMode === ShaderManager.DRAW_MODE.default && drawable.skin) {
                let uniformHasBeenSet = false;
                if (drawable.transformBeforeCheckViewport()) {
                    Object.assign(uniforms, drawable.getUniforms());
                    uniformHasBeenSet = true;
                }
                if (!drawable.inViewport(halfNativeSizeX, halfNativeSizeY)) continue;
                if (!uniformHasBeenSet) Object.assign(uniforms, drawable.getUniforms());
            }

            let effectBits = drawable.enabledEffects;`,
                '            const uniforms = {};\n\n            let effectBits = drawable.enabledEffects;'
            ).replace(
                '            drawable.uniformApplied = true;\n            Object.assign(uniforms,\n',
                '            Object.assign(uniforms,\n'
            );
        await writeFile(renderPath, render);
    }
};

const apply02EngineOptimizations = async () => {
    const vmDirectory = resolve(rootDirectory, 'node_modules', 'scratch-vm', 'src');
    const renderDirectory = resolve(rootDirectory, 'node_modules', 'scratch-render', 'src');

    await migrateGaiaOffscreenOptimization(vmDirectory, renderDirectory);

    // Port the runtime API used by NitroBolt's extension manager. Keep this
    // alongside the other reproducible dependency patches so a clean install
    // retains extension removal and ordering support.
    await patchFile(resolve(vmDirectory, 'virtual-machine.js'), '_removeExtensionPrimitive =', [[
        '    service._registerExtensionPrimitives = runtime._registerExtensionPrimitives.bind(runtime);',
        '    service._registerExtensionPrimitives = runtime._registerExtensionPrimitives.bind(runtime);\n' +
            '    service._reorderExtensionPrimitive = runtime._reorderExtensionPrimitive.bind(runtime);\n' +
            '    service._removeExtensionPrimitive = runtime._removeExtensionPrimitive.bind(runtime);'
    ]]);

    await patchFile(resolve(vmDirectory, 'engine', 'runtime.js'), '_removeExtensionPrimitive (extensionId)', [[
        '    /**\n     * Register the primitives provided by an extension.',
        `    /**
     * Reorder extension categories to match the extension manager.
     * @param {number} extensionIndex source category index
     * @param {number} reorderIndex destination category index
     * @private
     */
    _reorderExtensionPrimitive (extensionIndex, reorderIndex) {
        this._blockInfo.splice(reorderIndex, 0, this._blockInfo.splice(extensionIndex, 1)[0]);
        this.emit(Runtime.BLOCKS_NEED_UPDATE);
    }

    /**
     * Remove an extension category and its blocks from every target.
     * @param {string} extensionId extension identifier
     * @private
     */
    _removeExtensionPrimitive (extensionId) {
        const extensionIndex = this._blockInfo.findIndex(extension => extension && extension.id === extensionId);
        if (extensionIndex === -1) return;
        const info = this._blockInfo[extensionIndex];
        this._blockInfo.splice(extensionIndex, 1);
        const opcodes = new Set(info.blocks
            .filter(block => block.json && block.json.type)
            .map(block => block.json.type));
        for (const target of this.targets) {
            for (const blockId of Object.keys(target.blocks._blocks)) {
                const block = target.blocks.getBlock(blockId);
                if (block && opcodes.has(block.opcode)) target.blocks.deleteBlock(blockId, true);
            }
        }
        this.emit(Runtime.BLOCKS_NEED_UPDATE);
    }

    /**
     * Register the primitives provided by an extension.`
    ]]);

    await patchFile(resolve(vmDirectory, 'extension-support', 'extension-manager.js'), 'removeExtension (extensionURL)', [[
        '    /**\n     * Wait until all async extensions have loaded',
        `    /**
     * Reorder loaded extensions and their block categories.
     * @param {number} extensionIndex source index
     * @param {number} reorderIndex destination index
     */
    reorderExtension (extensionIndex, reorderIndex) {
        const extensions = Array.from(this._loadedExtensions.entries());
        if (extensionIndex < 0 || extensionIndex >= extensions.length || reorderIndex < 0 || reorderIndex >= extensions.length) return;
        extensions.splice(reorderIndex, 0, extensions.splice(extensionIndex, 1)[0]);
        this._loadedExtensions = new Map(extensions);
        dispatch.call('runtime', '_reorderExtensionPrimitive', extensionIndex, reorderIndex);
        this.refreshBlocks();
    }

    /**
     * Unload an extension and remove its blocks.
     * @param {string} extensionURL extension identifier
     */
    removeExtension (extensionURL) {
        if (!this.isExtensionLoaded(extensionURL)) return;
        const serviceName = this._loadedExtensions.get(extensionURL);
        delete dispatch.services[serviceName];
        delete this.runtime[\`ext_\${extensionURL}\`];
        this._loadedExtensions.delete(extensionURL);
        dispatch.call('runtime', '_removeExtensionPrimitive', extensionURL);
        this.refreshBlocks();
    }

    /**
     * Wait until all async extensions have loaded`
    ]]);

    await patchFile(resolve(vmDirectory, 'engine', 'runtime.js'), 'offscreenDrawableCulling', [
        [
            '            miscLimits: true,\n            fencing: true\n',
            '            miscLimits: true,\n            fencing: true,\n' +
                '            disableOffscreenRendering: false,\n            disableDirectionClamping: false\n'
        ],
        [
            '        this.renderer.offscreenTouching = !this.runtimeOptions.fencing;\n        this.updatePrivacy();',
            '        this.renderer.offscreenTouching = !this.runtimeOptions.fencing;\n' +
                '        this.renderer.offscreenDrawableCulling = this.runtimeOptions.disableOffscreenRendering;\n' +
                '        this.updatePrivacy();'
        ],
        [
            '            this.renderer.offscreenTouching = !this.runtimeOptions.fencing;\n        }\n    }\n\n' +
                '    /**\n     * tw: Update compiler options',
                '            this.renderer.offscreenTouching = !this.runtimeOptions.fencing;\n' +
                '            if (this.runtimeOptions.disableOffscreenRendering !== this.renderer.offscreenDrawableCulling) {\n' +
                '                this.renderer.setOffscreenDrawableCulling(this.runtimeOptions.disableOffscreenRendering);\n' +
                '            }\n        }\n    }\n\n    /**\n     * tw: Update compiler options'
        ]
    ]);

    await patchFile(resolve(vmDirectory, 'sprites', 'rendered-target.js'),
        'runtimeOptions.disableDirectionClamping', [[
            '        this.direction = MathUtil.wrapClamp(direction, -179, 180);',
            '        this.direction = this.runtime.runtimeOptions.disableDirectionClamping\n' +
                '            ? direction\n            : MathUtil.wrapClamp(direction, -179, 180);'
        ]]);

    // Port 02Engine's conservative offscreen culling. Unlike GaiaMod's old
    // viewport approximation, this uses each drawable's AABB, retains a safety
    // margin, and only culls ordinary stage rendering without shape-changing
    // effects. That keeps stamping, picking and other auxiliary draws intact.
    await patchFile(resolve(renderDirectory, 'RenderWebGL.js'), 'setOffscreenDrawableCulling (enabled)', [
        [
            'const __fenceBounds = new Rectangle();',
            'const __fenceBounds = new Rectangle();\nconst __offscreenCullBounds = new Rectangle();'
        ],
        [
            'const __cpuTouchingColorPixelCount = 4e4;',
            'const OFFSCREEN_CULL_MARGIN = 8;\n' +
                'const SHAPE_CHANGING_EFFECT_MASK = Object.keys(ShaderManager.EFFECT_INFO).reduce((mask, effectName) => {\n' +
                '    const effect = ShaderManager.EFFECT_INFO[effectName];\n' +
                '    return effect.shapeChanges ? mask | effect.mask : mask;\n' +
                '}, 0);\n\nconst __cpuTouchingColorPixelCount = 4e4;'
        ],
        [
            '        this.offscreenTouching = false;',
            '        this.offscreenTouching = false;\n        this.offscreenDrawableCulling = false;'
        ],
        [
            '    // tw: implement high quality pen option',
            `    setOffscreenDrawableCulling (enabled) {
        this.dirty = true;
        this.offscreenDrawableCulling = Boolean(enabled);
    }

    // tw: implement high quality pen option`
        ],
        [
            '        const gl = this._gl;\n        let currentShader = null;\n\n' +
                '        const framebufferSpaceScaleDiffers = (',
            '        const gl = this._gl;\n        let currentShader = null;\n' +
                '        const canCullOffscreenDrawables = this._canCullOffscreenDrawables(drawMode, projection, opts);\n\n' +
                '        const framebufferSpaceScaleDiffers = ('
        ],
        [
            '            // Hidden drawables (e.g., by a "hide" block) are not drawn unless\n' +
                '            // the ignoreVisibility flag is used (e.g. for stamping or touchingColor).',
            '            if (canCullOffscreenDrawables && this._isDrawableOutsideStage(drawable)) continue;\n\n' +
                '            // Hidden drawables (e.g., by a "hide" block) are not drawn unless\n' +
                '            // the ignoreVisibility flag is used (e.g. for stamping or touchingColor).'
        ],
        [
            '        this._regionId = null;\n    }\n\n    /**\n     * Get the convex hull points',
            `        this._regionId = null;
    }

    _canCullOffscreenDrawables (drawMode, projection, opts) {
        return this.offscreenDrawableCulling &&
            drawMode === ShaderManager.DRAW_MODE.default &&
            projection === this._projection &&
            !opts.ignoreVisibility &&
            !opts.filter &&
            !opts.idFilterFunc &&
            !opts.extraUniforms &&
            !Object.prototype.hasOwnProperty.call(opts, 'effectMask') &&
            !opts.skipPrivateSkins;
    }

    _isDrawableOutsideStage (drawable) {
        if (!drawable.skin ||
            !(drawable.skin instanceof BitmapSkin || drawable.skin instanceof SVGSkin) ||
            (drawable.enabledEffects & SHAPE_CHANGING_EFFECT_MASK) !== 0) {
            return false;
        }

        const bounds = drawable.getAABB(__offscreenCullBounds);
        const stageLeft = (-this._nativeSize[0] / 2) - OFFSCREEN_CULL_MARGIN;
        const stageRight = (this._nativeSize[0] / 2) + OFFSCREEN_CULL_MARGIN;
        const stageBottom = (-this._nativeSize[1] / 2) - OFFSCREEN_CULL_MARGIN;
        const stageTop = (this._nativeSize[1] / 2) + OFFSCREEN_CULL_MARGIN;

        return bounds.right < stageLeft || bounds.left > stageRight ||
            bounds.top < stageBottom || bounds.bottom > stageTop;
    }

    /**
     * Get the convex hull points`
        ]
    ]);

    await patchFile(resolve(vmDirectory, 'engine', 'runtime.js'), 'caseSensitiveLists: false', [[
        '            disableDirectionClamping: false\n',
        '            disableDirectionClamping: false,\n' +
            '            caseSensitiveLists: false,\n' +
            '            realLayerIndexes: false\n'
    ]]);

    await patchFile(resolve(vmDirectory, 'blocks', 'scratch3_data.js'),
        'runtime.runtimeOptions.caseSensitiveLists', [
            [
                '        // Go through the list items one-by-one using Cast.compare.',
                '        if (this.runtime && this.runtime.runtimeOptions.caseSensitiveLists) {\n' +
                    '            return list.value.indexOf(item) + 1;\n' +
                    '        }\n\n' +
                    '        // Go through the list items one-by-one using Cast.compare.'
            ],
            [
                '        if (list.value.indexOf(item) >= 0) {',
                '        if (this.runtime && this.runtime.runtimeOptions.caseSensitiveLists) {\n' +
                    '            return list.value.indexOf(item) !== -1;\n' +
                    '        }\n' +
                    '        if (list.value.indexOf(item) >= 0) {'
            ]
        ]);

    await patchFile(resolve(vmDirectory, 'compiler', 'jsexecute.js'),
        'runtime.runtimeOptions.caseSensitiveLists', [
            [
                'runtimeFunctions.listContains = `const listContains = (list, item) => {\n' +
                    '    // TODO: evaluate whether indexOf is worthwhile here',
                'runtimeFunctions.listContains = `const listContains = (list, item) => {\n' +
                    '    if (globalState.thread.target.runtime.runtimeOptions.caseSensitiveLists) {\n' +
                    '        return list.value.indexOf(item) !== -1;\n' +
                    '    }\n' +
                    '    // TODO: evaluate whether indexOf is worthwhile here'
            ],
            [
                'runtimeFunctions.listIndexOf = `const listIndexOf = (list, item) => {\n' +
                    '    for (let i = 0; i < list.value.length; i++) {',
                'runtimeFunctions.listIndexOf = `const listIndexOf = (list, item) => {\n' +
                    '    if (globalState.thread.target.runtime.runtimeOptions.caseSensitiveLists) {\n' +
                    '        return list.value.indexOf(item) + 1;\n' +
                    '    }\n' +
                    '    for (let i = 0; i < list.value.length; i++) {'
            ]
        ]);

    await patchFile(resolve(renderDirectory, 'RenderWebGL.js'), 'this.useRealLayerIndexes = false', [
        [
            '        this.offscreenTouching = false;',
            '        this.offscreenTouching = false;\n\n        this.useRealLayerIndexes = false;'
        ],
        [
            '        let oldIndex = startIndex;',
            '        const useRealLayers = this.useRealLayerIndexes;\n\n        let oldIndex = startIndex;'
        ],
        [
            '            // Remove drawable from the list.\n            if (order === 0) {\n' +
                '                return oldIndex;\n            }\n\n' +
                '            const _ = this._drawList.splice(oldIndex, 1)[0];\n' +
                '            // Determine new index.',
            '            if (order === 0) return oldIndex;\n\n            // Determine new index.'
        ],
        [
            '            newIndex = Math.min(newIndex, endIndex);\n\n' +
                '            // Insert at new index.\n' +
                '            this._drawList.splice(newIndex, 0, drawableID);',
            `            if (useRealLayers) {
                if (!Number.isFinite(newIndex)) {
                    let top = startIndex - 1;
                    for (let i = startIndex; i < this._drawList.length; i++) {
                        if (i !== oldIndex && typeof this._drawList[i] !== 'undefined') top = i;
                    }
                    newIndex = top + 1;
                }
                if (newIndex >= this._drawList.length) {
                    delete this._drawList[oldIndex];
                } else {
                    const step = newIndex > oldIndex ? 1 : -1;
                    for (let i = oldIndex; i !== newIndex; i += step) {
                        this._drawList[i] = this._drawList[i + step];
                    }
                }
                this._drawList[newIndex] = drawableID;
            } else {
                this._drawList.splice(oldIndex, 1);
                newIndex = Math.min(newIndex, endIndex);
                this._drawList.splice(newIndex, 0, drawableID);
            }`
        ]
    ]);
};

const applyTextToPathButton = async () => {
    const paintDirectory = resolve(rootDirectory, 'node_modules', 'scratch-paint', 'src');
    const componentPath = resolve(paintDirectory, 'components', 'mode-tools', 'mode-tools.jsx');
    const containerPath = resolve(paintDirectory, 'containers', 'mode-tools.jsx');
    const iconPath = resolve(paintDirectory, 'components', 'mode-tools', 'icons', 'text-to-path.svg');

    await writeFile(iconPath, `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <g fill="none" stroke="#575E75" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 5h9M8.5 5v10M5.5 15h6"/>
    <path d="M15.5 9.5 20 7l-1 5.1-3.5-2.6Z"/>
    <circle cx="15.5" cy="9.5" r="1.25" fill="#575E75" stroke="none"/>
    <circle cx="20" cy="7" r="1.25" fill="#575E75" stroke="none"/>
    <circle cx="19" cy="12.1" r="1.25" fill="#575E75" stroke="none"/>
    <path d="M15.5 9.5c.2 4.4 1.7 7.5 4.5 9.5"/>
  </g>
</svg>
`);

    await patchFile(componentPath, 'paint.modeTools.textToPath', [
        [
            "import alignCenterIcon from './icons/alignCenter.svg';",
            "import alignCenterIcon from './icons/alignCenter.svg';\n" +
                "import textToPathIcon from './icons/text-to-path.svg';"
        ],
        [
            `        lasso: {
            defaultMessage: 'Lasso',`,
            `        textToPath: {
            defaultMessage: 'Convert text to path',
            description: 'Label for the button that converts editable text into SVG paths',
            id: 'paint.modeTools.textToPath'
        },
        lasso: {
            defaultMessage: 'Lasso',`
        ],
        [
            `                    </InputGroup>
                </div>
            );
        case Modes.BIT_RECT:`,
            `                    </InputGroup>
                    {props.mode === Modes.TEXT && props.canConvertTextToPath ? (
                        <InputGroup className={classNames(styles.modDashedBorder, styles.modLabeledIconHeight)}>
                            <LabeledIconButton
                                hideLabel
                                imgSrc={textToPathIcon}
                                title={props.intl.formatMessage(messages.textToPath)}
                                onMouseDown={event => {
                                    event.preventDefault();
                                    props.onConvertTextToPath();
                                }}
                                onClick={() => {}}
                            />
                        </InputGroup>
                    ) : null}
                </div>
            );
        case Modes.BIT_RECT:`
        ],
        [
            '    onCopyToClipboard: PropTypes.func.isRequired,',
            '    onCopyToClipboard: PropTypes.func.isRequired,\n' +
                '    onConvertTextToPath: PropTypes.func.isRequired,'
        ],
        [
            '    onVectorLassoEnabledChange: PropTypes.func.isRequired,\n',
            '    onVectorLassoEnabledChange: PropTypes.func.isRequired,\n' +
                '    canConvertTextToPath: PropTypes.bool,\n'
        ],
        [
            `                            onClick={() => onLassoEnabledChange(!lassoEnabled)}
                        />
                    </InputGroup>`,
            `                            onClick={() => onLassoEnabledChange(!lassoEnabled)}
                        />
                    </InputGroup>
                    {props.canConvertTextToPath ? (
                        <InputGroup className={classNames(styles.modDashedBorder, styles.modLabeledIconHeight)}>
                            <LabeledIconButton
                                hideLabel
                                imgSrc={textToPathIcon}
                                title={props.intl.formatMessage(messages.textToPath)}
                                onMouseDown={event => {
                                    event.preventDefault();
                                    props.onConvertTextToPath();
                                }}
                                onClick={() => {}}
                            />
                        </InputGroup>
                    ) : null}`
        ]
    ]);

    await patchFile(containerPath, 'handleConvertTextToPath ()', [
        [
            "import {clearSelectedItems, setSelectedItems} from '../reducers/selected-items';",
            "import {clearSelectedItems, setSelectedItems} from '../reducers/selected-items';\n" +
                "import {setTextEditTarget} from '../reducers/text-edit-target';"
        ],
        [
            "import opentype from 'opentype.js';",
            "import opentype from 'opentype.js';\n" +
                "import {woff2} from 'fonteditor-core';\n" +
                "import woff2Wasm from '../../../fonteditor-core/woff2/woff2.wasm';"
        ],
        [
            `    convertText2Path (textNode) {
        const fontURL = this.extractFontURL(textNode.font);
        return new Promise((resolve) => {
            opentype.load(fontURL, (err, font) => {
                if (err) {
                    console.warn("Font merge load error:", err);
                    resolve(undefined);
                    return;
                }

                const pathData = font.getPath(
                    textNode.content, 0, 0,
                    textNode.fontSize || 16
                ).toPathData();

                const compound = new paper.CompoundPath(pathData);
                compound.fillColor = this.fillColor || "black";
                compound.matrix = textNode.matrix.clone();
                resolve(compound);
            });
        });
    }`,
            `    async convertText2Path (textNode) {
        const fontURL = this.extractFontURL(textNode.font);
        if (!fontURL) {
            console.warn('Text-to-path conversion could not locate the font:', textNode.font);
            return undefined;
        }

        try {
            let fontBuffer = await fetch(fontURL).then(response => response.arrayBuffer());
            const signature = String.fromCharCode(...new Uint8Array(fontBuffer, 0, 4));
            if (signature === 'wOF2') {
                await woff2.init(woff2Wasm.default || woff2Wasm);
                fontBuffer = woff2.decode(fontBuffer).buffer;
            }
            const font = opentype.parse(fontBuffer);
            const fontSize = textNode.fontSize || 16;
            const leading = textNode.leading || fontSize * 1.2;
            const origin = textNode.point || textNode.position;
            const paths = textNode.content.split('\\n').map((line, index) => {
                const advance = font.getAdvanceWidth(line, fontSize);
                const alignmentOffset = textNode.justification === 'center' ? -advance / 2 :
                    textNode.justification === 'right' ? -advance : 0;
                return font.getPath(
                    line,
                    origin.x + alignmentOffset,
                    origin.y + (index * leading),
                    fontSize
                ).toPathData();
            });
            const compound = new paper.CompoundPath(paths.join(' '));
            return compound;
        } catch (error) {
            console.warn('Text-to-path conversion failed:', error);
            return undefined;
        }
    }`
        ],
        [
            "            'handleCenterSelection',",
            "            'handleCenterSelection',\n            'handleConvertTextToPath',"
        ],
        [
            '    handlePasteFromClipboard () {',
            `    async handleConvertTextToPath () {
        const selectedTextNodes = getSelectedRootItems().filter(item => item.className === 'PointText');
        const editTarget = this.props.textEditTarget ?
            paper.project.getItems({
                match: item => item.className === 'PointText' &&
                    String(item.id) === String(this.props.textEditTarget)
            })[0] : null;
        if (editTarget && editTarget.className === 'PointText' && !selectedTextNodes.includes(editTarget)) {
            selectedTextNodes.push(editTarget);
        }
        if (selectedTextNodes.length === 0) return;

        // End editing first so the textarea and undo state are committed before replacing the item.
        if (editTarget) this.props.clearTextEditTarget();
        let changed = false;
        for (const textNode of selectedTextNodes) {
            const path = await this.convertText2Path(textNode);
            if (!path || !textNode.parent) continue;
            // Glyph coordinates already use the PointText baseline, so copying
            // its matrix would apply the text position a second time.
            path.copyAttributes(textNode, true);
            path.insertAbove(textNode);
            textNode.remove();
            setItemSelection(path, true);
            changed = true;
        }
        if (!changed) return;
        this.props.setSelectedItems(this.props.format);
        this.props.onUpdateImage();
    }
    handlePasteFromClipboard () {`
        ],
        [
            '                onCenterSelection={this.handleCenterSelection}',
            '                onCenterSelection={this.handleCenterSelection}\n' +
            '                canConvertTextToPath={Boolean(this.props.textEditTarget) ||\n' +
                "                    this.props.selectedItems.some(item => item.className === 'PointText')}\n" +
                '                onConvertTextToPath={this.handleConvertTextToPath}'
        ],
        [
            '    clearSelectedItems: PropTypes.func.isRequired,',
            '    clearSelectedItems: PropTypes.func.isRequired,\n' +
                '    clearTextEditTarget: PropTypes.func.isRequired,'
        ],
        [
            '    setSelectedItems: PropTypes.func.isRequired\n};',
            '    setSelectedItems: PropTypes.func.isRequired,\n' +
                '    textEditTarget: PropTypes.number\n};'
        ],
        [
            '    selectedItems: state.scratchPaint.selectedItems\n});',
            '    selectedItems: state.scratchPaint.selectedItems,\n' +
                '    textEditTarget: state.scratchPaint.textEditTarget\n});'
        ],
        [
            '    clearSelectedItems: () => {\n        dispatch(clearSelectedItems());\n    },',
            '    clearSelectedItems: () => {\n        dispatch(clearSelectedItems());\n    },\n' +
                '    clearTextEditTarget: () => {\n        dispatch(setTextEditTarget());\n    },'
        ]
    ]);

    await patchFile(containerPath, 'async loadFontBuffer (fontName)', [
        [
            `    extractFontURL(fontName) {
        const manager = window.vm ? window.vm.runtime.fontManager : undefined;
        if (!manager) return undefined;

        const customCheck = manager.fonts.find(f => !f.system && fontName.includes(f.family));
        if (customCheck) return customCheck.asset.encodeDataURI();
        else {
            // could be a default font
            if (!this._defaultCache) {
                const defaultFontsCss = document.querySelector(\`style[id="scratch-font-styles"]\`).sheet;
                this._defaultCache = {};
                for (const rule of defaultFontsCss.cssRules) {
                    if (rule.type === CSSRule.FONT_FACE_RULE) {
                        const name = rule.style.getPropertyValue("font-family").replace(/["']/g, "").trim();
                        this._defaultCache[name] = rule.style.getPropertyValue("src")
                            .replace("url(\\"", "").replace("\\")", "");
                    }
                }
            }

            if (this._defaultCache[fontName]) return this._defaultCache[fontName];
            else return undefined;
        }
    }`,
            `    extractFontURL(fontName) {
        // could be a default font
        if (!this._defaultCache) {
            const defaultFontsCss = document.querySelector(\`style[id="scratch-font-styles"]\`).sheet;
            this._defaultCache = {};
            for (const rule of defaultFontsCss.cssRules) {
                if (rule.type === CSSRule.FONT_FACE_RULE) {
                    const name = rule.style.getPropertyValue("font-family").replace(/["']/g, "").trim();
                    this._defaultCache[name] = rule.style.getPropertyValue("src")
                        .replace("url(\\"", "").replace("\\")", "");
                }
            }
        }

        if (this._defaultCache[fontName]) return this._defaultCache[fontName];
        return undefined;
    }

    async loadFontBuffer (fontName) {
        const customFont = this.props.customFonts.find(font =>
            fontName.includes(font.name) || fontName.includes(font.family)
        );
        if (customFont) {
            if (customFont.data) {
                const data = customFont.data;
                return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
            }
            if (customFont.system && window.queryLocalFonts) {
                const localFonts = await window.queryLocalFonts();
                const localFont = localFonts.find(font =>
                    font.family === customFont.name ||
                    font.fullName === customFont.name ||
                    font.postscriptName === customFont.name
                );
                if (localFont) return localFont.blob().then(blob => blob.arrayBuffer());
            }
        }

        const fontURL = this.extractFontURL(fontName);
        if (!fontURL) return undefined;
        return fetch(fontURL).then(response => response.arrayBuffer());
    }`
        ],
        [
            `        const fontURL = this.extractFontURL(textNode.font);
        if (!fontURL) {`,
            `        const fontBuffer = await this.loadFontBuffer(textNode.font);
        if (!fontBuffer) {`
        ],
        [
            `            let fontBuffer = await fetch(fontURL).then(response => response.arrayBuffer());
            const signature = String.fromCharCode(...new Uint8Array(fontBuffer, 0, 4));`,
            `            let decodedFontBuffer = fontBuffer;
            const signature = String.fromCharCode(...new Uint8Array(decodedFontBuffer, 0, 4));`
        ],
        [
            '                fontBuffer = woff2.decode(fontBuffer).buffer;',
            '                decodedFontBuffer = woff2.decode(decodedFontBuffer).buffer;'
        ],
        [
            '            const font = opentype.parse(fontBuffer);',
            '            const font = opentype.parse(decodedFontBuffer);'
        ],
        [
            '    clearTextEditTarget: PropTypes.func.isRequired,',
            `    clearTextEditTarget: PropTypes.func.isRequired,
    customFonts: PropTypes.arrayOf(PropTypes.shape({
        data: PropTypes.instanceOf(Uint8Array),
        family: PropTypes.string,
        name: PropTypes.string,
        system: PropTypes.bool
    })).isRequired,`
        ],
        [
            'const mapStateToProps = state => ({\n    format:',
            'const mapStateToProps = state => ({\n    customFonts: state.scratchPaint.customFonts,\n    format:'
        ]
    ]);

};

const applyFonteditorCoreWoff2Fix = async () => {
    const indexPath = resolve(rootDirectory, 'node_modules', 'fonteditor-core', 'woff2', 'index.js');
    await patchFile(indexPath, "require('./woff2.js')", [[
        "require('./woff2')",
        "require('./woff2.js')"
    ]]);
};

const applyCustomFontSelectionFix = async () => {
    const paintDirectory = resolve(rootDirectory, 'node_modules', 'scratch-paint', 'src');
    await patchFile(
        resolve(paintDirectory, 'components', 'font-dropdown', 'custom-font-button.jsx'),
        'this.handleClick = this.handleClick.bind(this);',
        [
            [
                '        this.handleMouseOver = this.handleMouseOver.bind(this);',
                '        this.handleMouseOver = this.handleMouseOver.bind(this);\n' +
                    '        this.handleClick = this.handleClick.bind(this);'
            ],
            [
                '    handleMouseOver () {\n        this.props.onMouseOver(this.props.font);\n    }',
                '    handleMouseOver () {\n        this.props.onMouseOver(this.props.font);\n    }\n' +
                    '    handleClick (event) {\n        event.stopPropagation();\n' +
                    '        this.props.onClick(this.props.font);\n    }'
            ],
            [
                '                {...this.props}\n                onMouseOver={this.handleMouseOver}',
                '                {...this.props}\n                onClick={this.handleClick}\n' +
                    '                onMouseDown={this.handleClick}\n' +
                    '                onMouseDownCapture={this.handleClick}\n' +
                    '                onMouseOver={this.handleMouseOver}'
            ],
            [
                '    font: PropTypes.string.isRequired,\n    onMouseOver:',
                '    font: PropTypes.string.isRequired,\n    onClick: PropTypes.func.isRequired,\n    onMouseOver:'
            ]
        ]
    );
    await patchFile(
        resolve(paintDirectory, 'containers', 'font-dropdown.jsx'),
        'handleChoose (font)',
        [[
            `    handleChoose () {
        if (this.dropDown.isOpen()) {
            this.dropDown.handleClosePopover();`,
            `    handleChoose (font) {
        if (typeof font === 'string') {
            this.savedFont = font;
            this.props.changeFont(font);
        }
        if (this.dropDown.isOpen()) {
            this.dropDown.handleClosePopover();`
        ]]
    );
};

const runGitApply = args => spawnSync(
    'git',
    [
        'apply',
        '--directory=node_modules/scratch-paint',
        '--unidiff-zero',
        '--whitespace=nowarn',
        ...args,
        patchPath
    ],
    {
        cwd: rootDirectory,
        encoding: 'utf8'
    }
);

const check = runGitApply(['--check']);
if (check.status === 0) {
    const apply = runGitApply([]);
    if (apply.status !== 0) {
        process.stderr.write(apply.stderr);
        process.exit(apply.status || 1);
    }
    process.stdout.write('Applied scratch-paint Lasso patch.\n');
} else {
    const reverseCheck = runGitApply(['--reverse', '--check']);
    if (reverseCheck.status === 0) {
        process.stdout.write('scratch-paint Lasso patch is already applied.\n');
    } else {
        process.stderr.write(
            'Unable to apply the scratch-paint Lasso patch. ' +
            'The scratch-paint dependency no longer matches the expected revision.\n'
        );
        process.stderr.write(check.stderr);
        process.exit(check.status || 1);
    }
}

await apply02EngineOptimizations();
await applyFonteditorCoreWoff2Fix();
await applyCustomFontSelectionFix();
await applyTextToPathButton();
