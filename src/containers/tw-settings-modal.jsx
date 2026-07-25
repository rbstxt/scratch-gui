import PropTypes from 'prop-types';
import React from 'react';
import {defineMessages, injectIntl, intlShape} from 'react-intl';
import bindAll from 'lodash.bindall';
import {connect} from 'react-redux';
import {closeSettingsModal} from '../reducers/modals';
import SettingsModalComponent from '../components/tw-settings-modal/settings-modal.jsx';
import {defaultStageSize} from '../reducers/custom-stage-size';
import {setDeveloperMode} from '../reducers/tw';
import {setPreference} from '../reducers/preferences';
import {setTheme} from '../reducers/theme';
import {persistTheme} from '../lib/themes/themePersistance';
import {Theme} from '../lib/themes';

const messages = defineMessages({
    newFramerate: {
        defaultMessage: 'New framerate:',
        description: 'Prompt shown to choose a new framerate',
        id: 'tw.menuBar.newFramerate'
    }
});

class UsernameModal extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleFramerateChange',
            'handleCustomizeFramerate',
            'handleHighQualityPenChange',
            'handleInterpolationChange',
            'handleInfiniteClonesChange',
            'handleRemoveFencingChange',
            'handleRemoveLimitsChange',
            'handleDisableOffscreenRenderingChange',
            'handleDisableDirectionClampingChange',
            'handleCaseSensitiveListsChange',
            'handleRealLayerIndexesChange',
            'handleWarpTimerChange',
            'handleStageWidthChange',
            'handleStageHeightChange',
            'handleDisableCompilerChange',
            'handleDeveloperModeChange',
            'handleStoreProjectOptions'
        ]);
    }
    handleFramerateChange (e) {
        this.props.vm.setFramerate(e.target.checked ? 60 : 30);
    }
    async handleCustomizeFramerate () {
        // prompt() returns Promise in desktop app
        // eslint-disable-next-line no-alert
        const newFramerate = await prompt(this.props.intl.formatMessage(messages.newFramerate), this.props.framerate);
        const parsed = parseFloat(newFramerate);
        if (isFinite(parsed)) {
            this.props.vm.setFramerate(parsed);
        }
    }
    handleHighQualityPenChange (e) {
        this.props.vm.renderer.setUseHighQualityRender(e.target.checked);
    }
    handleInterpolationChange (e) {
        this.props.vm.setInterpolation(e.target.checked);
    }
    handleInfiniteClonesChange (e) {
        this.props.vm.setRuntimeOptions({
            maxClones: e.target.checked ? Infinity : 300
        });
    }
    handleRemoveFencingChange (e) {
        this.props.vm.setRuntimeOptions({
            fencing: !e.target.checked
        });
    }
    handleRemoveLimitsChange (e) {
        this.props.vm.setRuntimeOptions({
            miscLimits: !e.target.checked
        });
    }
    handleDisableOffscreenRenderingChange (e) {
        this.props.vm.setRuntimeOptions({
            disableOffscreenRendering: e.target.checked
        });
    }
    handleDisableDirectionClampingChange (e) {
        this.props.vm.setRuntimeOptions({
            disableDirectionClamping: e.target.checked
        });
    }
    handleCaseSensitiveListsChange (e) {
        this.props.vm.setRuntimeOptions({
            caseSensitiveLists: e.target.checked
        });
    }
    handleRealLayerIndexesChange (e) {
        this.props.vm.renderer.useRealLayerIndexes = e.target.checked;
        this.props.vm.setRuntimeOptions({
            realLayerIndexes: e.target.checked
        });
    }
    handleWarpTimerChange (e) {
        this.props.vm.setCompilerOptions({
            warpTimer: e.target.checked
        });
    }
    handleDisableCompilerChange (e) {
        this.props.vm.setCompilerOptions({
            enabled: !e.target.checked
        });
    }
    handleDeveloperModeChange (e) {
        this.props.onSetDeveloperMode(e.target.checked);
    }
    handleStageWidthChange (value) {
        this.props.vm.setStageSize(value, this.props.customStageSize.height);
    }
    handleStageHeightChange (value) {
        this.props.vm.setStageSize(this.props.customStageSize.width, value);
    }
    handleStoreProjectOptions () {
        this.props.vm.storeProjectOptions();
    }
    render () {
        const {
            /* eslint-disable no-unused-vars */
            onClose,
            vm,
            /* eslint-enable no-unused-vars */
            ...props
        } = this.props;
        return (
            <SettingsModalComponent
                onClose={this.props.onClose}
                vm={this.props.vm}
                onFramerateChange={this.handleFramerateChange}
                onCustomizeFramerate={this.handleCustomizeFramerate}
                onHighQualityPenChange={this.handleHighQualityPenChange}
                onInterpolationChange={this.handleInterpolationChange}
                onInfiniteClonesChange={this.handleInfiniteClonesChange}
                onRemoveFencingChange={this.handleRemoveFencingChange}
                onRemoveLimitsChange={this.handleRemoveLimitsChange}
                onDisableOffscreenRenderingChange={this.handleDisableOffscreenRenderingChange}
                onDisableDirectionClampingChange={this.handleDisableDirectionClampingChange}
                onCaseSensitiveListsChange={this.handleCaseSensitiveListsChange}
                onRealLayerIndexesChange={this.handleRealLayerIndexesChange}
                onWarpTimerChange={this.handleWarpTimerChange}
                onStageWidthChange={this.handleStageWidthChange}
                onStageHeightChange={this.handleStageHeightChange}
                onDisableCompilerChange={this.handleDisableCompilerChange}
                onDeveloperModeChange={this.handleDeveloperModeChange}
                activeTab={this.props.activeTab}
                preferences={this.props.preferences}
                onSetPreference={this.props.onSetPreference}
                stageWidth={this.props.customStageSize.width}
                stageHeight={this.props.customStageSize.height}
                customStageSizeEnabled={
                    this.props.customStageSize.width !== defaultStageSize.width ||
                    this.props.customStageSize.height !== defaultStageSize.height
                }
                onStoreProjectOptions={this.handleStoreProjectOptions}
                {...props}
            />
        );
    }
}

UsernameModal.propTypes = {
    intl: intlShape,
    onClose: PropTypes.func,
    vm: PropTypes.shape({
        renderer: PropTypes.shape({
            setUseHighQualityRender: PropTypes.func,
            useRealLayerIndexes: PropTypes.bool
        }),
        setFramerate: PropTypes.func,
        setCompilerOptions: PropTypes.func,
        setInterpolation: PropTypes.func,
        setRuntimeOptions: PropTypes.func,
        setStageSize: PropTypes.func,
        storeProjectOptions: PropTypes.func
    }),
    isEmbedded: PropTypes.bool,
    framerate: PropTypes.number,
    highQualityPen: PropTypes.bool,
    interpolation: PropTypes.bool,
    infiniteClones: PropTypes.bool,
    removeFencing: PropTypes.bool,
    removeLimits: PropTypes.bool,
    disableOffscreenRendering: PropTypes.bool,
    disableDirectionClamping: PropTypes.bool,
    caseSensitiveLists: PropTypes.bool,
    realLayerIndexes: PropTypes.bool,
    warpTimer: PropTypes.bool,
    customStageSize: PropTypes.shape({
        width: PropTypes.number,
        height: PropTypes.number
    }),
    disableCompiler: PropTypes.bool,
    developerMode: PropTypes.bool,
    onSetDeveloperMode: PropTypes.func,
    activeTab: PropTypes.number,
    preferences: PropTypes.object, // eslint-disable-line react/forbid-prop-types
    onSetPreference: PropTypes.func,
    theme: PropTypes.instanceOf(Theme),
    onChangeTheme: PropTypes.func
};

const mapStateToProps = state => ({
    vm: state.scratchGui.vm,
    isEmbedded: state.scratchGui.mode.isEmbedded,
    isPlayerOnly: state.scratchGui.mode.isPlayerOnly,
    framerate: state.scratchGui.tw.framerate,
    highQualityPen: state.scratchGui.tw.highQualityPen,
    interpolation: state.scratchGui.tw.interpolation,
    infiniteClones: state.scratchGui.tw.runtimeOptions.maxClones === Infinity,
    removeFencing: !state.scratchGui.tw.runtimeOptions.fencing,
    removeLimits: !state.scratchGui.tw.runtimeOptions.miscLimits,
    disableOffscreenRendering: state.scratchGui.tw.runtimeOptions.disableOffscreenRendering,
    disableDirectionClamping: state.scratchGui.tw.runtimeOptions.disableDirectionClamping,
    caseSensitiveLists: !!state.scratchGui.tw.runtimeOptions.caseSensitiveLists,
    realLayerIndexes: !!state.scratchGui.tw.runtimeOptions.realLayerIndexes,
    warpTimer: state.scratchGui.tw.compilerOptions.warpTimer,
    customStageSize: state.scratchGui.customStageSize,
    disableCompiler: !state.scratchGui.tw.compilerOptions.enabled,
    developerMode: state.scratchGui.tw.developerMode,
    activeTab: state.scratchGui.modals.settingsModalTab,
    preferences: state.scratchGui.preferences,
    theme: state.scratchGui.theme.theme
});

const mapDispatchToProps = dispatch => ({
    onClose: () => dispatch(closeSettingsModal()),
    onSetDeveloperMode: enabled => dispatch(setDeveloperMode(enabled)),
    onSetPreference: (key, value) => dispatch(setPreference(key, value)),
    onChangeTheme: theme => {
        persistTheme(theme);
        dispatch(setTheme(theme));
    }
});

export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(UsernameModal));
