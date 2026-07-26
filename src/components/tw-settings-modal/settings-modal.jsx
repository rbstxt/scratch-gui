/* eslint-disable react/jsx-no-bind */
import {defineMessages, FormattedMessage, intlShape, injectIntl} from 'react-intl';
import PropTypes from 'prop-types';
import React, {useState} from 'react';
import classNames from 'classnames';
import bindAll from 'lodash.bindall';
import Box from '../box/box.jsx';
import Modal from '../../containers/modal.jsx';
import FancyCheckbox from '../tw-fancy-checkbox/checkbox.jsx';
import Input from '../forms/input.jsx';
import BufferedInputHOC from '../forms/buffered-input-hoc.jsx';
import DocumentationLink from '../tw-documentation-link/documentation-link.jsx';
import styles from './settings-modal.css';
import helpIcon from './help-icon.svg';
import {APP_NAME} from '../../lib/brand.js';
import AddonSettingsComponent from '../../addons/settings/settings.jsx';
import downloadBlob from '../../lib/download-blob.js';
import KeyInput from './key-input.jsx';
import {defaultKeyboardShortcuts} from '../../lib/nb-keyboard-shortcut.js';
import {Theme} from '../../lib/themes';
import NBExtensionManager from '../../containers/nb-extension-manager.jsx';

/* eslint-disable react/no-multi-comp */

const BufferedInput = BufferedInputHOC(Input);

const messages = defineMessages({
    title: {
        defaultMessage: 'Editor Settings',
        description: 'Title of editor settings modal',
        id: 'nb.editorSettings.title'
    },
    help: {
        defaultMessage: 'Click for help',
        description: 'Hover text of help icon in settings',
        id: 'tw.settingsModal.help'
    },
    advancedTitle: {
        defaultMessage: 'Advanced Settings',
        description: 'Title of the standard settings modal on project pages',
        id: 'tw.settingsModal.title'
    }
});

const onExportSettings = settings => {
    const blob = new Blob([JSON.stringify(settings)]);
    downloadBlob('turbest-addon-settings.json', blob);
};

const LearnMore = props => (
    <React.Fragment>
        {' '}
        <DocumentationLink {...props}>
            <FormattedMessage
                defaultMessage="Learn more."
                id="gui.alerts.cloudInfoLearnMore"
            />
        </DocumentationLink>
    </React.Fragment>
);

class UnwrappedSetting extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleClickHelp'
        ]);
        this.state = {
            helpVisible: false
        };
    }
    componentDidUpdate (prevProps) {
        if (this.props.active && !prevProps.active) {
            // eslint-disable-next-line react/no-did-update-set-state
            this.setState({
                helpVisible: true
            });
        }
    }
    handleClickHelp () {
        this.setState(prevState => ({
            helpVisible: !prevState.helpVisible
        }));
    }
    render () {
        return (
            <div
                className={classNames(styles.setting, {
                    [styles.active]: this.props.active
                })}
            >
                <div className={styles.label}>
                    {this.props.primary}
                    <button
                        className={styles.helpIcon}
                        onClick={this.handleClickHelp}
                        title={this.props.intl.formatMessage(messages.help)}
                    >
                        <img
                            src={helpIcon}
                            draggable={false}
                        />
                    </button>
                </div>
                {this.state.helpVisible && (
                    <div className={styles.detail}>
                        {this.props.help}
                        {this.props.slug && <LearnMore slug={this.props.slug} />}
                    </div>
                )}
                {this.props.secondary}
            </div>
        );
    }
}
UnwrappedSetting.propTypes = {
    intl: intlShape,
    active: PropTypes.bool,
    help: PropTypes.node,
    primary: PropTypes.node,
    secondary: PropTypes.node,
    slug: PropTypes.string
};
const Setting = injectIntl(UnwrappedSetting);

const BooleanSetting = ({value, onChange, label, ...props}) => (
    <Setting
        {...props}
        active={value}
        primary={
            <label className={styles.label}>
                <FancyCheckbox
                    className={styles.checkbox}
                    checked={value}
                    onChange={onChange}
                />
                {label}
            </label>
        }
    />
);
BooleanSetting.propTypes = {
    onChange: PropTypes.func.isRequired,
    value: PropTypes.bool.isRequired,
    label: PropTypes.node.isRequired
};

const HighQualityPen = props => (
    <BooleanSetting
        {...props}
        label={
            <FormattedMessage
                defaultMessage="High Quality Pen"
                description="High quality pen setting"
                id="tw.settingsModal.highQualityPen"
            />
        }
        help={
            <FormattedMessage
                // eslint-disable-next-line max-len
                defaultMessage="Allows pen projects to render at higher resolutions and disables some coordinate rounding in the editor. Not all projects benefit from this setting and it may impact performance."
                description="High quality pen setting help"
                id="tw.settingsModal.highQualityPenHelp"
            />
        }
        slug="high-quality-pen"
    />
);

const CustomFPS = props => (
    <BooleanSetting
        value={props.framerate !== 30}
        onChange={props.onChange}
        label={
            <FormattedMessage
                defaultMessage="60 FPS (Custom FPS)"
                description="FPS setting"
                id="tw.settingsModal.fps"
            />
        }
        help={
            <FormattedMessage
                // eslint-disable-next-line max-len
                defaultMessage="Runs scripts 60 times per second instead of 30. Most projects will not work properly with this enabled. You should try Interpolation with 60 FPS mode disabled if that is the case. {customFramerate}."
                description="FPS setting help"
                id="tw.settingsModal.fpsHelp"
                values={{
                    customFramerate: (
                        <a
                            onClick={props.onCustomizeFramerate}
                            tabIndex="0"
                        >
                            <FormattedMessage
                                defaultMessage="Click to use a framerate other than 30 or 60"
                                description="FPS settings help"
                                id="tw.settingsModal.fpsHelp.customFramerate"
                            />
                        </a>
                    )
                }}
            />
        }
        slug="custom-fps"
    />
);
CustomFPS.propTypes = {
    framerate: PropTypes.number,
    onChange: PropTypes.func,
    onCustomizeFramerate: PropTypes.func
};

const Interpolation = props => (
    <BooleanSetting
        {...props}
        label={
            <FormattedMessage
                defaultMessage="Interpolation"
                description="Interpolation setting"
                id="tw.settingsModal.interpolation"
            />
        }
        help={
            <FormattedMessage
                // eslint-disable-next-line max-len
                defaultMessage="Makes projects appear smoother by interpolating sprite motion. Interpolation should not be used on 3D projects, raytracers, pen projects, and laggy projects as interpolation will make them run slower without making them appear smoother."
                description="Interpolation setting help"
                id="tw.settingsModal.interpolationHelp"
            />
        }
        slug="interpolation"
    />
);

const InfiniteClones = props => (
    <BooleanSetting
        {...props}
        label={
            <FormattedMessage
                defaultMessage="Infinite Clones"
                description="Infinite Clones setting"
                id="tw.settingsModal.infiniteClones"
            />
        }
        help={
            <FormattedMessage
                defaultMessage="Disables Scratch's 300 clone limit."
                description="Infinite Clones setting help"
                id="tw.settingsModal.infiniteClonesHelp"
            />
        }
        slug="infinite-clones"
    />
);

const RemoveFencing = props => (
    <BooleanSetting
        {...props}
        label={
            <FormattedMessage
                defaultMessage="Remove Fencing"
                description="Remove Fencing setting"
                id="tw.settingsModal.removeFencing"
            />
        }
        help={
            <FormattedMessage
                // eslint-disable-next-line max-len
                defaultMessage="Allows sprites to move offscreen, become as large or as small as they want, and makes touching blocks work offscreen."
                description="Remove Fencing setting help"
                id="tw.settingsModal.removeFencingHelp"
            />
        }
        slug="remove-fencing"
    />
);

const RemoveMiscLimits = props => (
    <BooleanSetting
        {...props}
        label={
            <FormattedMessage
                defaultMessage="Remove Miscellaneous Limits"
                description="Remove Miscellaneous Limits setting"
                id="tw.settingsModal.removeMiscLimits"
            />
        }
        help={
            <FormattedMessage
                defaultMessage="Removes sound effect limits and pen size limits."
                description="Remove Miscellaneous Limits setting help"
                id="tw.settingsModal.removeMiscLimitsHelp"
            />
        }
        slug="remove-misc-limits"
    />
);

const DisableOffscreenRendering = props => (
    <BooleanSetting
        {...props}
        label={
            <FormattedMessage
                defaultMessage="Disable Off Screen Rendering"
                description="Disable Out of Bounds Rendering setting"
                id="pm.settingsModal.oobRendering"
            />
        }
        help={
            <FormattedMessage
                defaultMessage="When enabled all sprites that are off screen will not be rendered."
                description="Out of Bounds Rendering setting help"
                id="pm.settingsModal.oobRenderingHelp"
            />
        }
        slug="disable-offscreen-rendering"
    />
);

const DisableDirectionClamping = props => (
    <BooleanSetting
        {...props}
        label={
            <FormattedMessage
                defaultMessage="Disable Direction Clamping"
                description="Disable Direction Clamping setting"
                id="pm.settingsModal.noDirWrap"
            />
        }
        help={
            <FormattedMessage
                defaultMessage="When enabled, directions will not be clamped from -179 - 180"
                description="Disable Direction Clamping setting help"
                id="pm.settingsModal.noDirWrapHelp"
            />
        }
        slug="disable-direction-clamping"
    />
);

const CaseSensitiveLists = props => (
    <BooleanSetting
        {...props}
        label={
            <FormattedMessage
                defaultMessage="Case Sensitive Lists"
                description="Case Sensitive Lists setting"
                id="tw.settingsModal.caseSensitiveLists"
            />
        }
        help={
            <FormattedMessage
                defaultMessage={
                    'Makes lists case sensitive. This means that \'a\' and \'A\' are different values. ' +
                    'This is not recommended for most projects but can improve speed massively for list heavy projects.'
                }
                description="Case Sensitive Lists help"
                id="tw.settingsModal.caseSensitiveListsHelp"
            />
        }
        slug="case-sensitive-lists"
    />
);

const RealLayerIndexes = props => (
    <BooleanSetting
        {...props}
        label={
            <FormattedMessage
                defaultMessage="Real Layer Indexes"
                description="Real Layer Indexes label"
                id="tw.settingsModal.realLayerIndexes"
            />
        }
        help={
            <FormattedMessage
                defaultMessage={
                    'Changes layer indexes to change the position in the render order array without limiting ' +
                    'the number of layers to the number of drawables.'
                }
                description="Real Layer Indexes help"
                id="tw.settingsModal.realLayerIndexesHelp"
            />
        }
        slug="real-layer-indexes"
    />
);

const WarpTimer = props => (
    <BooleanSetting
        {...props}
        label={
            <FormattedMessage
                defaultMessage="Warp Timer"
                description="Warp Timer setting"
                id="tw.settingsModal.warpTimer"
            />
        }
        help={
            <FormattedMessage
                // eslint-disable-next-line max-len
                defaultMessage="Makes scripts check if they are stuck in a long or infinite loop and run at a low framerate instead of getting stuck until the loop finishes. This fixes most crashes but has a significant performance impact, so it's only enabled by default in the editor."
                description="Warp Timer help"
                id="tw.settingsModal.warpTimerHelp"
            />
        }
        slug="warp-timer"
    />
);

const DisableCompiler = props => (
    <BooleanSetting
        {...props}
        label={
            <FormattedMessage
                defaultMessage="Disable Compiler"
                description="Disable Compiler setting"
                id="tw.settingsModal.disableCompiler"
            />
        }
        help={
            <FormattedMessage
                // eslint-disable-next-line max-len
                defaultMessage="Disables the {APP_NAME} compiler. You may want to enable this while editing projects so that scripts update immediately. Otherwise, you should never enable this."
                description="Disable Compiler help"
                id="tw.settingsModal.disableCompilerHelp"
                values={{
                    APP_NAME
                }}
            />
        }
        slug="disable-compiler"
    />
);

const DeveloperMode = props => (
    <BooleanSetting
        {...props}
        label={
            <FormattedMessage
                defaultMessage="Developer Mode"
                description="Developer mode setting"
                id="turbest.settingsModal.developerMode"
            />
        }
        help={
            <FormattedMessage
                defaultMessage={
                    'Disables extension sandboxes and automatically allows security-sensitive actions. ' +
                    'Only enable this while developing code you trust.'
                }
                description="Developer mode setting help"
                id="turbest.settingsModal.developerModeHelp"
            />
        }
    />
);

const CustomStageSize = ({
    customStageSizeEnabled,
    stageWidth,
    onStageWidthChange,
    stageHeight,
    onStageHeightChange
}) => (
    <Setting
        active={customStageSizeEnabled}
        primary={(
            <div className={classNames(styles.label, styles.customStageSize)}>
                <FormattedMessage
                    defaultMessage="Custom Stage Size:"
                    description="Custom Stage Size option"
                    id="tw.settingsModal.customStageSize"
                />
                <BufferedInput
                    value={stageWidth}
                    onSubmit={onStageWidthChange}
                    className={styles.customStageSizeInput}
                    type="number"
                    min="0"
                    max="1024"
                    step="1"
                />
                <span>{'×'}</span>
                <BufferedInput
                    value={stageHeight}
                    onSubmit={onStageHeightChange}
                    className={styles.customStageSizeInput}
                    type="number"
                    min="0"
                    max="1024"
                    step="1"
                />
            </div>
        )}
        secondary={
            (stageWidth >= 1000 || stageHeight >= 1000) && (
                <div className={styles.warning}>
                    <FormattedMessage
                        // eslint-disable-next-line max-len
                        defaultMessage="Using a custom stage size this large is not recommended! Instead, use a lower size with the same aspect ratio and let fullscreen mode upscale it to match the user's display."
                        description="Warning about using stages that are too large in settings modal"
                        id="tw.settingsModal.largeStageWarning"
                    />
                    <LearnMore slug="custom-stage-size" />
                </div>
            )
        }
        help={(
            <FormattedMessage
                // eslint-disable-next-line max-len
                defaultMessage="Changes the size of the Scratch stage from 480x360 to something else. Try 640x360 to make the stage widescreen. Very few projects will handle this properly."
                description="Custom Stage Size option"
                id="tw.settingsModal.customStageSizeHelp"
            />
        )}
        slug="custom-stage-size"
    />
);
CustomStageSize.propTypes = {
    customStageSizeEnabled: PropTypes.bool,
    stageWidth: PropTypes.number,
    onStageWidthChange: PropTypes.func,
    stageHeight: PropTypes.number,
    onStageHeightChange: PropTypes.func
};

const StoreProjectOptions = ({onStoreProjectOptions}) => (
    <div className={styles.setting}>
        <div>
            <button
                onClick={onStoreProjectOptions}
                className={styles.button}
            >
                <FormattedMessage
                    defaultMessage="Store settings in project"
                    description="Button in settings modal"
                    id="tw.settingsModal.storeProjectOptions"
                />
            </button>
            <p>
                <FormattedMessage
                    // eslint-disable-next-line max-len
                    defaultMessage="Stores the selected settings in the project so they will be automatically applied when TurboWarp loads this project. Warp timer and disable compiler will not be saved."
                    description="Help text for the store settings in project button"
                    id="tw.settingsModal.storeProjectOptionsHelp"
                />
            </p>
        </div>
    </div>
);
StoreProjectOptions.propTypes = {
    onStoreProjectOptions: PropTypes.func
};

const Header = props => (
    <div className={styles.header}>
        {props.children}
        <div className={styles.divider} />
    </div>
);
Header.propTypes = {
    children: PropTypes.node
};

const AdvancedSettings = props => (
    <Box>
        <Header>
            <FormattedMessage
                defaultMessage="Featured"
                description="Settings modal section"
                id="tw.settingsModal.featured"
            />
        </Header>
        <CustomFPS
            framerate={props.framerate}
            onChange={props.onFramerateChange}
            onCustomizeFramerate={props.onCustomizeFramerate}
        />
        <Interpolation
            value={props.interpolation}
            onChange={props.onInterpolationChange}
        />
        <HighQualityPen
            value={props.highQualityPen}
            onChange={props.onHighQualityPenChange}
        />
        <WarpTimer
            value={props.warpTimer}
            onChange={props.onWarpTimerChange}
        />
        <Header>
            <FormattedMessage
                defaultMessage="Remove Limits"
                description="Settings modal section"
                id="tw.settingsModal.removeLimits"
            />
        </Header>
        <InfiniteClones
            value={props.infiniteClones}
            onChange={props.onInfiniteClonesChange}
        />
        <RemoveFencing
            value={props.removeFencing}
            onChange={props.onRemoveFencingChange}
        />
        <DisableDirectionClamping
            value={props.disableDirectionClamping}
            onChange={props.onDisableDirectionClampingChange}
        />
        <RemoveMiscLimits
            value={props.removeLimits}
            onChange={props.onRemoveLimitsChange}
        />
        <Header>
            <FormattedMessage
                defaultMessage="Danger Zone"
                description="Settings modal section"
                id="tw.settingsModal.dangerZone"
            />
        </Header>
        {!props.isEmbedded && (
            <CustomStageSize
                {...props}
            />
        )}
        <DisableCompiler
            value={props.disableCompiler}
            onChange={props.onDisableCompilerChange}
        />
        <DeveloperMode
            value={props.developerMode}
            onChange={props.onDeveloperModeChange}
        />
        <DisableOffscreenRendering
            value={props.disableOffscreenRendering}
            onChange={props.onDisableOffscreenRenderingChange}
        />
        <CaseSensitiveLists
            value={props.caseSensitiveLists}
            onChange={props.onCaseSensitiveListsChange}
        />
        <RealLayerIndexes
            value={props.realLayerIndexes}
            onChange={props.onRealLayerIndexesChange}
        />
        {!props.isEmbedded && (
            <StoreProjectOptions
                {...props}
            />
        )}
    </Box>
);
AdvancedSettings.propTypes = {
    isEmbedded: PropTypes.bool,
    framerate: PropTypes.number,
    onFramerateChange: PropTypes.func,
    onCustomizeFramerate: PropTypes.func,
    highQualityPen: PropTypes.bool,
    onHighQualityPenChange: PropTypes.func,
    interpolation: PropTypes.bool,
    onInterpolationChange: PropTypes.func,
    infiniteClones: PropTypes.bool,
    onInfiniteClonesChange: PropTypes.func,
    removeFencing: PropTypes.bool,
    onRemoveFencingChange: PropTypes.func,
    removeLimits: PropTypes.bool,
    onRemoveLimitsChange: PropTypes.func,
    disableOffscreenRendering: PropTypes.bool,
    onDisableOffscreenRenderingChange: PropTypes.func,
    disableDirectionClamping: PropTypes.bool,
    onDisableDirectionClampingChange: PropTypes.func,
    caseSensitiveLists: PropTypes.bool,
    onCaseSensitiveListsChange: PropTypes.func,
    realLayerIndexes: PropTypes.bool,
    onRealLayerIndexesChange: PropTypes.func,
    warpTimer: PropTypes.bool,
    onWarpTimerChange: PropTypes.func,
    disableCompiler: PropTypes.bool,
    onDisableCompilerChange: PropTypes.func,
    developerMode: PropTypes.bool,
    onDeveloperModeChange: PropTypes.func
};

const ExtraFeaturesSettings = props => (
    <Box>
        <Header>
            <FormattedMessage
                defaultMessage="Extra Features"
                description="Settings modal section"
                id="tw.settingsModal.extraFeatures"
            />
        </Header>
        <BooleanSetting
            value={Boolean((props.preferences || {}).workspaceBookmarks)}
            onChange={event => props.onSetPreference('workspaceBookmarks', event.target.checked)}
            label={<FormattedMessage
                defaultMessage="Workspace Bookmarks"
                description="Opt-in setting for workspace bookmarks"
                id="tw.workspaceBookmarks.feature"
            />}
        />
    </Box>
);

// Keep the project page on TurboWarp's original, single-panel settings UI.
// The tabbed NitroBolt-derived editor settings are intentionally editor-only.
const ProjectPageAdvancedSettings = props => (
    <Box className={styles.vanillaBody}>
        <Header>
            <FormattedMessage
                defaultMessage="Featured"
                description="Settings modal section"
                id="tw.settingsModal.featured"
            />
        </Header>
        <CustomFPS
            framerate={props.framerate}
            onChange={props.onFramerateChange}
            onCustomizeFramerate={props.onCustomizeFramerate}
        />
        <Interpolation
            value={props.interpolation}
            onChange={props.onInterpolationChange}
        />
        <HighQualityPen
            value={props.highQualityPen}
            onChange={props.onHighQualityPenChange}
        />
        <WarpTimer
            value={props.warpTimer}
            onChange={props.onWarpTimerChange}
        />
        <Header>
            <FormattedMessage
                defaultMessage="Remove Limits"
                description="Settings modal section"
                id="tw.settingsModal.removeLimits"
            />
        </Header>
        <InfiniteClones
            value={props.infiniteClones}
            onChange={props.onInfiniteClonesChange}
        />
        <RemoveFencing
            value={props.removeFencing}
            onChange={props.onRemoveFencingChange}
        />
        <RemoveMiscLimits
            value={props.removeLimits}
            onChange={props.onRemoveLimitsChange}
        />
        <Header>
            <FormattedMessage
                defaultMessage="Danger Zone"
                description="Settings modal section"
                id="tw.settingsModal.dangerZone"
            />
        </Header>
        {!props.isEmbedded && <CustomStageSize {...props} />}
        <DisableCompiler
            value={props.disableCompiler}
            onChange={props.onDisableCompilerChange}
        />
        {!props.isEmbedded && <StoreProjectOptions {...props} />}
    </Box>
);
ExtraFeaturesSettings.propTypes = {
    preferences: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
    onSetPreference: PropTypes.func.isRequired
};

const KeymapSettings = props => {
    const keySetting = (key, message) => (
        <Box className={styles.keySetting}>
            <FormattedMessage {...message} />
            <KeyInput
                onChange={shortcut => props.onSetPreference(
                    `keybind-${key}`,
                    shortcut ? shortcut.toJSON() : null
                )}
                shortcut={props.preferences[`keybind-${key}`] ?? defaultKeyboardShortcuts[key]}
            />
        </Box>
    );
    return (
        <Box>
            <p>
                <FormattedMessage
                    defaultMessage="Credit: NitroBolt"
                    description="Credit for the Keymap feature"
                    id="nb.editorSettings.keymap.credit"
                />
            </p>
            <Header>
                <FormattedMessage
                    defaultMessage="Popups"
                    id="nb.editorSettings.keymap.popups"
                />
            </Header>
            {keySetting('open-backpack', {
                defaultMessage: 'Open backpack',
                id: 'nb.editorSettings.keymap.openBackpack'
            })}
            {keySetting('open-editor-settings', {
                defaultMessage: 'Open editor settings',
                id: 'nb.editorSettings.keymap.openEditorSettings'
            })}
            {keySetting('open-extensions', {
                defaultMessage: 'Open extension catalog',
                id: 'nb.editorSettings.keymap.openExtentions'
            })}
            <Header>
                <FormattedMessage
                    defaultMessage="Project Controls"
                    id="nb.editorSettings.keymap.projectControls"
                />
            </Header>
            {keySetting('start-project', {
                defaultMessage: 'Start project',
                id: 'nb.editorSettings.keymap.startProject'
            })}
            {keySetting('stop-project', {
                defaultMessage: 'Stop project',
                id: 'nb.editorSettings.keymap.stopProject'
            })}
            {keySetting('project-full-screen', {
                defaultMessage: 'Toggle project full screen',
                id: 'nb.editorSettings.keymap.projectFullScreen'
            })}
            <Header>
                <FormattedMessage
                    defaultMessage="Sprite Settings"
                    id="nb.editorSettings.keymap.spriteSettings"
                />
            </Header>
            {keySetting('change-sprite-name', {
                defaultMessage: 'Change sprite name',
                id: 'nb.editorSettings.keymap.changeSpriteName'
            })}
            {keySetting('toggle-sprite-visibility', {
                defaultMessage: 'Toggle sprite visibility',
                id: 'nb.editorSettings.keymap.spriteVisibility'
            })}
        </Box>
    );
};
KeymapSettings.propTypes = {
    preferences: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
    onSetPreference: PropTypes.func.isRequired
};

const WallpaperSettings = props => {
    const wallpaper = props.theme.wallpaper;
    const update = patch => props.onChangeTheme(props.theme.set('wallpaper', {...wallpaper, ...patch}));
    const upload = e => {
        const file = e.target.files && e.target.files[0];
        // Reset immediately so choosing the same file again still fires change.
        e.target.value = '';
        if (!file || !file.type.startsWith('image/')) return;

        const reader = new FileReader();
        reader.onload = () => {
            const image = reader.result;
            if (typeof image !== 'string' || !image.startsWith('data:image/')) return;
            update({
                url: image,
                history: [image, ...wallpaper.history.filter(item => item !== image)].slice(0, 10)
            });
        };
        reader.readAsDataURL(file);
    };
    return (
        <Box>
            <Header>
                <FormattedMessage
                    defaultMessage="Wallpaper"
                    id="tw.menuBar.wallpaper"
                />
            </Header>
            <label className={styles.appearanceForm}>
                <FormattedMessage
                    defaultMessage="Upload an image"
                    id="tw.wallpaper.upload"
                />
                <input
                    type="file"
                    accept="image/*"
                    onChange={upload}
                />
            </label>
            <label className={styles.appearanceRow}>
                <FormattedMessage
                    defaultMessage="Opacity:"
                    id="tw.wallpaper.opacity"
                />
                <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.1"
                    value={wallpaper.opacity}
                    onChange={e => update({opacity: parseFloat(e.target.value)})}
                />
                {`${Math.round(wallpaper.opacity * 100)}%`}
            </label>
            <label className={styles.appearanceRow}>
                <FormattedMessage
                    defaultMessage="Darkness:"
                    id="tw.wallpaper.darkness"
                />
                <input
                    type="range"
                    min="0"
                    max="0.8"
                    step="0.1"
                    value={wallpaper.darkness}
                    onChange={e => update({darkness: parseFloat(e.target.value)})}
                />
                {`${Math.round(wallpaper.darkness * 100)}%`}
            </label>
            <label className={styles.appearanceRow}>
                <FancyCheckbox
                    checked={wallpaper.gridVisible !== false}
                    onChange={e => update({gridVisible: e.target.checked})}
                />
                <FormattedMessage
                    defaultMessage="Show Grid"
                    id="tw.wallpaper.showGrid"
                />
            </label>
            <div className={styles.appearanceList}>
                <button onClick={() => update({url: ''})}>
                    <FormattedMessage
                        defaultMessage="No wallpaper"
                        id="tw.wallpaper.noWallpaper"
                    />
                </button>
                {wallpaper.history.map((item, index) => (
                    <button
                        key={item}
                        className={classNames({[styles.appearanceSelected]: wallpaper.url === item})}
                        onClick={() => update({url: item})}
                    >
                        <img
                            src={item}
                            alt=""
                        />
                        <span>
                            <FormattedMessage
                                defaultMessage="Wallpaper {number}"
                                id="tw.wallpaper.historyItem"
                                values={{number: wallpaper.history.length - index}}
                            />
                        </span>
                    </button>
                ))}
            </div>
        </Box>
    );
};
WallpaperSettings.propTypes = {
    theme: PropTypes.instanceOf(Theme).isRequired,
    onChangeTheme: PropTypes.func.isRequired
};

const SettingsModalComponent = props => {
    const [selectedSectionIndex, setSelectedSectionIndex] = useState(props.activeTab ?? 0);
    const [dirty, setDirty] = useState(false);
    const sections = [
        {
            title: {
                defaultMessage: 'Advanced Settings',
                description: 'Editor settings sidebar item',
                id: 'tw.menuBar.moreSettings'
            },
            content: <AdvancedSettings {...props} />
        },
        {
            title: {
                defaultMessage: 'Addons',
                description: 'Editor settings sidebar item',
                id: 'tw.menuBar.addons'
            },
            content: (
                <AddonSettingsComponent
                    onDirty={setDirty}
                    onExportSettings={onExportSettings}
                />
            ),
            escaped: true
        },
        {
            title: {
                defaultMessage: 'Keymap',
                description: 'Editor settings sidebar item',
                id: 'nb.editorSettings.keymapSection'
            },
            content: <KeymapSettings {...props} />
        },
        {
            title: {
                defaultMessage: 'Extensions',
                description: 'Editor settings sidebar item for the NitroBolt extension manager',
                id: 'nb.extensionManager.title'
            },
            content: <NBExtensionManager vm={props.vm} />
        },
        {
            title: {
                defaultMessage: 'Extra Features',
                description: 'Editor settings sidebar item',
                id: 'tw.settingsModal.extraFeatures'
            },
            content: <ExtraFeaturesSettings {...props} />
        },
        {
            title: {defaultMessage: 'Wallpaper', id: 'tw.menuBar.wallpaper'},
            content: <WallpaperSettings {...props} />
        }
    ];
    const selectedSection = sections[Math.min(selectedSectionIndex, sections.length - 1)];

    if (props.isPlayerOnly) {
        return (
            <Modal
                className={styles.modalContent}
                onRequestClose={props.onClose}
                contentLabel={props.intl.formatMessage(messages.advancedTitle)}
                id="settingsModal"
            >
                <ProjectPageAdvancedSettings {...props} />
            </Modal>
        );
    }

    return (
        <Modal
            className={styles.modalContent}
            onRequestClose={props.onClose}
            contentLabel={props.intl.formatMessage(messages.title)}
            id="settingsModal"
        >
            <Box className={styles.body}>
                <div className={styles.topicList}>
                    <div className={styles.navigation}>
                        {sections.map((section, index) => (
                            <div
                                key={index}
                                className={classNames(styles.topicItem, {
                                    [styles.active]: selectedSectionIndex === index
                                })}
                                onClick={() => setSelectedSectionIndex(index)}
                            >
                                <FormattedMessage {...section.title} />
                            </div>
                        ))}
                    </div>
                    {dirty && (
                        <button
                            className={classNames(styles.button, styles.dirtyButton)}
                            onClick={() => location.reload()}
                        >
                            <FormattedMessage
                                defaultMessage="Refresh to apply settings"
                                id="nb.editorSettings.dirty"
                            />
                        </button>
                    )}
                </div>
                {selectedSection.escaped ? (
                    <div className={classNames(styles.content, styles.escaped)}>
                        {selectedSection.content}
                    </div>
                ) : (
                    <div className={styles.content}>
                        <h1><FormattedMessage {...selectedSection.title} /></h1>
                        {selectedSection.content}
                    </div>
                )}
            </Box>
        </Modal>
    );
};

SettingsModalComponent.propTypes = {
    intl: intlShape,
    onClose: PropTypes.func,
    vm: PropTypes.shape({
        extensionManager: PropTypes.shape({
            _loadedExtensions: PropTypes.instanceOf(Map)
        })
    }).isRequired,
    isEmbedded: PropTypes.bool,
    isPlayerOnly: PropTypes.bool,
    framerate: PropTypes.number,
    onFramerateChange: PropTypes.func,
    onCustomizeFramerate: PropTypes.func,
    highQualityPen: PropTypes.bool,
    onHighQualityPenChange: PropTypes.func,
    interpolation: PropTypes.bool,
    onInterpolationChange: PropTypes.func,
    infiniteClones: PropTypes.bool,
    onInfiniteClonesChange: PropTypes.func,
    removeFencing: PropTypes.bool,
    onRemoveFencingChange: PropTypes.func,
    removeLimits: PropTypes.bool,
    onRemoveLimitsChange: PropTypes.func,
    warpTimer: PropTypes.bool,
    onWarpTimerChange: PropTypes.func,
    disableCompiler: PropTypes.bool,
    onDisableCompilerChange: PropTypes.func,
    developerMode: PropTypes.bool,
    onDeveloperModeChange: PropTypes.func,
    activeTab: PropTypes.number,
    preferences: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
    onSetPreference: PropTypes.func.isRequired,
    theme: PropTypes.instanceOf(Theme),
    onChangeTheme: PropTypes.func
};

export default injectIntl(SettingsModalComponent);
