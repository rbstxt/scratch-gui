import PropTypes from 'prop-types';
import React from 'react';
import bindAll from 'lodash.bindall';
import ExtensionManager from '../components/nb-extension-manager/extension-manager.jsx';

class NBExtensionManager extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'refreshExtensions',
            'handleRemove',
            'handleToggleMultiSelect',
            'handleSelectionChange',
            'handleRemoveSelected',
            'handleDragStart',
            'handleDragEnd',
            'handleDrop'
        ]);
        this.state = {
            dragging: null,
            extensions: [],
            multiSelect: false,
            selectedExtensions: []
        };
    }
    componentDidMount () {
        this.refreshExtensions();
    }
    componentDidUpdate (prevProps) {
        if (prevProps.vm !== this.props.vm) this.refreshExtensions();
    }
    refreshExtensions () {
        this.setState({extensions: Array.from(this.props.vm.extensionManager._loadedExtensions)});
    }
    handleRemove (extension) {
        this.props.vm.extensionManager.removeExtension(extension);
        this.setState(state => ({
            selectedExtensions: state.selectedExtensions.filter(id => id !== extension)
        }), this.refreshExtensions);
    }
    handleToggleMultiSelect () {
        this.setState(state => ({
            multiSelect: !state.multiSelect,
            selectedExtensions: []
        }));
    }
    handleSelectionChange (extension, selected) {
        this.setState(state => ({
            selectedExtensions: selected ?
                [...state.selectedExtensions, extension] :
                state.selectedExtensions.filter(id => id !== extension)
        }));
    }
    handleRemoveSelected () {
        for (const extension of this.state.selectedExtensions) {
            this.props.vm.extensionManager.removeExtension(extension);
        }
        this.setState({multiSelect: false, selectedExtensions: []}, this.refreshExtensions);
    }
    handleDragStart (index) {
        this.setState({dragging: index});
    }
    handleDragEnd () {
        this.setState({dragging: null});
    }
    handleDrop (index) {
        if (this.state.dragging === null || this.state.dragging === index) return;
        this.props.vm.extensionManager.reorderExtension(this.state.dragging, index);
        this.setState({dragging: null}, this.refreshExtensions);
    }
    render () {
        return (
            <ExtensionManager
                {...this.state}
                onDragEnd={this.handleDragEnd}
                onDragStart={this.handleDragStart}
                onDrop={this.handleDrop}
                onRemove={this.handleRemove}
                onRemoveSelected={this.handleRemoveSelected}
                onSelectionChange={this.handleSelectionChange}
                onToggleMultiSelect={this.handleToggleMultiSelect}
            />
        );
    }
}

NBExtensionManager.propTypes = {
    vm: PropTypes.shape({
        extensionManager: PropTypes.shape({
            _loadedExtensions: PropTypes.instanceOf(Map),
            removeExtension: PropTypes.func,
            reorderExtension: PropTypes.func
        }).isRequired
    }).isRequired
};

export default NBExtensionManager;
