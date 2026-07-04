/* eslint-disable require-await, no-unused-vars */

import React from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import log from '../lib/log';
import bindAll from 'lodash.bindall';

/**
 * Set of extension URLs that the user has manually trusted to load unsandboxed.
 */
const extensionsTrustedByUser = new Set();

const manuallyTrustExtension = url => {
    extensionsTrustedByUser.add(url);
};

/**
 * All extensions are trusted and loaded unsandboxed.
 * @param {string} url URL as a string.
 * @returns {boolean} True if the extension can is trusted
 */
// eslint-disable-next-line no-unused-vars
const isTrustedExtension = url => true;

const SECURITY_MANAGER_METHODS = [
    'getSandboxMode',
    'canLoadExtensionFromProject',
    'canFetch',
    'canOpenWindow',
    'canRedirect',
    'canRecordAudio',
    'canRecordVideo',
    'canReadClipboard',
    'canNotify',
    'canGeolocate',
    'canEmbed',
    'canDownload'
];

class TWSecurityManagerComponent extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, SECURITY_MANAGER_METHODS);
    }

    componentDidMount () {
        const vmSecurityManager = this.props.vm.extensionManager.securityManager;
        const propsSecurityManager = this.props.securityManager;
        for (const method of SECURITY_MANAGER_METHODS) {
            vmSecurityManager[method] = propsSecurityManager[method] || this[method];
        }
    }

    /**
     * @param {string} url The extension's URL
     * @returns {string} The VM worker mode to use
     */
    getSandboxMode (url) {
        log.info(`Loading extension ${url} unsandboxed`);
        return 'unsandboxed';
    }

    /**
     * @param {string} url The extension's URL
     * @returns {Promise<boolean>} Whether the extension can be loaded
     */
    async canLoadExtensionFromProject (url) {
        manuallyTrustExtension(url);
        log.info(`Loading extension ${url} automatically unsandboxed`);
        return true;
    }

    /**
     * @returns {Promise<boolean>} True if the resource is allowed to be fetched
     */
    async canFetch () {
        return true;
    }

    /**
     * @returns {Promise<boolean>} True if the website can be opened
     */
    async canOpenWindow () {
        return true;
    }

    /**
     * @returns {Promise<boolean>} True if the website can be redirected to
     */
    async canRedirect () {
        return true;
    }

    /**
     * @returns {Promise<boolean>} True if audio can be recorded
     */
    async canRecordAudio () {
        return true;
    }

    /**
     * @returns {Promise<boolean>} True if video can be recorded
     */
    async canRecordVideo () {
        return true;
    }

    /**
     * @returns {Promise<boolean>} True if the clipboard can be read
     */
    async canReadClipboard () {
        return true;
    }

    /**
     * @returns {Promise<boolean>} True if the notifications are allowed
     */
    async canNotify () {
        return true;
    }

    /**
     * @returns {Promise<boolean>} True if geolocation is allowed.
     */
    async canGeolocate () {
        return true;
    }

    /**
     * @returns {Promise<boolean>} True if embed is allowed.
     */
    async canEmbed () {
        return true;
    }

    /**
     * @returns {Promise<boolean>} True if allowed
     */
    async canDownload () {
        return true;
    }

    render () {
        return null;
    }
}

TWSecurityManagerComponent.propTypes = {
    vm: PropTypes.shape({
        extensionManager: PropTypes.shape({
            securityManager: PropTypes.shape(
                SECURITY_MANAGER_METHODS.reduce((obj, method) => {
                    obj[method] = PropTypes.func.isRequired;
                    return obj;
                }, {})
            ).isRequired
        }).isRequired
    }).isRequired,
    securityManager: PropTypes.shape(Object.fromEntries(SECURITY_MANAGER_METHODS.map(i => [i, PropTypes.func])))
};

TWSecurityManagerComponent.defaultProps = {
    securityManager: {}
};

const mapStateToProps = state => ({
    vm: state.scratchGui.vm
});

const mapDispatchToProps = () => ({});

const ConnectedSecurityManagerComponent = connect(
    mapStateToProps,
    mapDispatchToProps
)(TWSecurityManagerComponent);

export {
    ConnectedSecurityManagerComponent as default,
    manuallyTrustExtension,
    isTrustedExtension
};
