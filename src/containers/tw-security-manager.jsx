import React from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import log from '../lib/log';
import bindAll from 'lodash.bindall';
import SecurityManagerModal from '../components/tw-security-manager-modal/security-manager-modal.jsx';
import SecurityModals from '../lib/tw-security-manager-constants';
import {getPersistedUnsandboxed, setPersistedUnsandboxed} from '../lib/tw-persisted-unsandboxed.js';

/* eslint-disable require-atomic-updates */

const extensionsTrustedByUser = new Set();
const fetchHostsTrustedByUser = new Set();
const embedHostsTrustedByUser = new Set();

const manuallyTrustExtension = url => {
    extensionsTrustedByUser.add(url);
};

const isTrustedExtension = url => (
    url.startsWith('https://extensions.turbowarp.org/') ||
    url.startsWith('https://extensions.turbest.com/') ||
    url.startsWith('http://localhost:8000/') ||
    extensionsTrustedByUser.has(url)
);

const isAlwaysTrustedForFetching = parsed => (
    isTrustedExtension(parsed.href) ||
    parsed.origin === 'https://turbowarp.org' ||
    parsed.origin.endsWith('.turbowarp.org') ||
    parsed.origin.endsWith('.turbowarp.xyz') ||
    parsed.origin === 'https://raw.githubusercontent.com' ||
    parsed.origin === 'https://gist.githubusercontent.com' ||
    parsed.origin === 'https://api.github.com' ||
    parsed.origin === 'https://gitlab.com' ||
    parsed.origin.endsWith('.srht.site') ||
    parsed.origin.endsWith('.itch.io') ||
    parsed.origin === 'https://api.gamejolt.com' ||
    parsed.origin === 'https://httpbin.org' ||
    parsed.origin === 'https://scratchdb.lefty.one'
);

const FETCHABLE_PROTOCOLS = [
    'http:',
    'https:',
    'data:',
    'blob:',
    'ws:',
    'wss:'
];

const VISITABLE_PROTOCOLS = [
    'http:',
    'https:',
    'data:',
    'blob:',
    'mailto:',
    'steam:',
    'calculator:'
];

const parseURL = (url, protocols) => {
    let parsed;
    try {
        parsed = new URL(url);
    } catch (e) {
        return null;
    }
    return protocols.includes(parsed.protocol) ? parsed : null;
};

let allowedAudio = false;
let allowedVideo = false;
let allowedReadClipboard = false;
let allowedNotify = false;
let allowedGeolocation = false;

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
        bindAll(this, [
            'handleAllowed',
            'handleDenied',
            'handleChangeUnsandboxed'
        ]);
        bindAll(this, SECURITY_MANAGER_METHODS);
        this.nextModalCallbacks = [];
        this.modalLocked = false;
        this.state = {
            type: null,
            data: null,
            callback: null,
            modalCount: 0
        };
    }

    componentDidMount () {
        const vmSecurityManager = this.props.vm.extensionManager.securityManager;
        const propsSecurityManager = this.props.securityManager;
        for (const method of SECURITY_MANAGER_METHODS) {
            vmSecurityManager[method] = propsSecurityManager[method] || this[method];
        }
    }

    componentWillUnmount () {
        if (this.state.callback) {
            this.state.callback(false);
        }
        for (const callback of this.nextModalCallbacks) {
            callback();
        }
    }

    async acquireModalLock () {
        if (this.modalLocked) {
            await new Promise(resolve => {
                this.nextModalCallbacks.push(resolve);
            });
        } else {
            this.modalLocked = true;
        }

        const releaseLock = () => {
            if (this.nextModalCallbacks.length) {
                this.nextModalCallbacks.shift()();
            } else {
                this.modalLocked = false;
                this.setState({type: null, callback: null});
            }
        };

        const showModal = async (type, data = {}) => {
            const result = await new Promise(resolve => {
                this.setState(oldState => ({
                    type,
                    data,
                    callback: resolve,
                    modalCount: oldState.modalCount + 1
                }));
            });
            releaseLock();
            return result;
        };

        return {showModal, releaseLock};
    }

    handleAllowed () {
        this.state.callback(true);
    }

    handleDenied () {
        this.state.callback(false);
    }

    handleChangeUnsandboxed (e) {
        const unsandboxed = e.target.checked;
        this.setState(oldState => ({
            data: {
                ...oldState.data,
                unsandboxed
            }
        }));
    }

    getSandboxMode (url) {
        if (this.props.developerMode || isTrustedExtension(url)) {
            log.info(`Loading extension ${url} unsandboxed`);
            return 'unsandboxed';
        }
        return 'iframe';
    }

    async canLoadExtensionFromProject (url) {
        if (this.props.developerMode) {
            log.info(`Developer mode: loading extension ${url} automatically unsandboxed`);
            return true;
        }
        if (isTrustedExtension(url)) {
            log.info(`Loading extension ${url} automatically`);
            return true;
        }

        const {showModal} = await this.acquireModalLock();
        if (url.startsWith('data:')) {
            const allowed = await showModal(SecurityModals.LoadExtension, {
                url,
                unsandboxed: getPersistedUnsandboxed(),
                onChangeUnsandboxed: this.handleChangeUnsandboxed
            });
            if (allowed) {
                setPersistedUnsandboxed(this.state.data.unsandboxed);
                if (this.state.data.unsandboxed) {
                    manuallyTrustExtension(url);
                }
            }
            return allowed;
        }
        return showModal(SecurityModals.LoadExtension, {
            url,
            unsandboxed: false
        });
    }

    async canFetch (url) {
        if (this.props.developerMode) return true;
        const parsed = parseURL(url, FETCHABLE_PROTOCOLS);
        if (!parsed) return false;
        if (isAlwaysTrustedForFetching(parsed)) return true;

        const {showModal, releaseLock} = await this.acquireModalLock();
        const host = ['http:', 'https:', 'ws:', 'wss:'].includes(parsed.protocol) ? parsed.host : null;
        if (host && fetchHostsTrustedByUser.has(host)) {
            releaseLock();
            return true;
        }
        const allowed = await showModal(SecurityModals.Fetch, {url});
        if (host && allowed) fetchHostsTrustedByUser.add(host);
        return allowed;
    }

    async canOpenWindow (url) {
        if (this.props.developerMode) return true;
        if (!parseURL(url, VISITABLE_PROTOCOLS)) return false;
        const {showModal} = await this.acquireModalLock();
        return showModal(SecurityModals.OpenWindow, {url});
    }

    async canRedirect (url) {
        if (this.props.developerMode) return true;
        if (!parseURL(url, VISITABLE_PROTOCOLS)) return false;
        const {showModal} = await this.acquireModalLock();
        return showModal(SecurityModals.Redirect, {url});
    }

    async canRecordAudio () {
        if (this.props.developerMode) return true;
        if (!allowedAudio) {
            const {showModal} = await this.acquireModalLock();
            allowedAudio = await showModal(SecurityModals.RecordAudio);
        }
        return allowedAudio;
    }

    async canRecordVideo () {
        if (this.props.developerMode) return true;
        if (!allowedVideo) {
            const {showModal} = await this.acquireModalLock();
            allowedVideo = await showModal(SecurityModals.RecordVideo);
        }
        return allowedVideo;
    }

    async canReadClipboard () {
        if (this.props.developerMode) return true;
        if (!allowedReadClipboard) {
            const {showModal} = await this.acquireModalLock();
            allowedReadClipboard = await showModal(SecurityModals.ReadClipboard);
        }
        return allowedReadClipboard;
    }

    async canNotify () {
        if (this.props.developerMode) return true;
        if (!allowedNotify) {
            const {showModal} = await this.acquireModalLock();
            allowedNotify = await showModal(SecurityModals.Notify);
        }
        return allowedNotify;
    }

    async canGeolocate () {
        if (this.props.developerMode) return true;
        if (!allowedGeolocation) {
            const {showModal} = await this.acquireModalLock();
            allowedGeolocation = await showModal(SecurityModals.Geolocate);
        }
        return allowedGeolocation;
    }

    async canEmbed (url) {
        if (this.props.developerMode) return true;
        const parsed = parseURL(url, FETCHABLE_PROTOCOLS);
        if (!parsed) return false;
        const host = ['http:', 'https:'].includes(parsed.protocol) ? parsed.host : null;
        const {showModal, releaseLock} = await this.acquireModalLock();
        if (host && embedHostsTrustedByUser.has(host)) {
            releaseLock();
            return true;
        }
        const allowed = await showModal(SecurityModals.Embed, {url});
        if (host && allowed) embedHostsTrustedByUser.add(host);
        return allowed;
    }

    async canDownload (url, name) {
        if (this.props.developerMode) return true;
        if (!parseURL(url, FETCHABLE_PROTOCOLS)) return false;
        const {showModal} = await this.acquireModalLock();
        return showModal(SecurityModals.Download, {url, name});
    }

    render () {
        if (this.props.developerMode || !this.state.type) return null;
        return (
            <SecurityManagerModal
                type={this.state.type}
                data={this.state.data}
                onAllowed={this.handleAllowed}
                onDenied={this.handleDenied}
                key={this.state.modalCount}
            />
        );
    }
}

TWSecurityManagerComponent.propTypes = {
    developerMode: PropTypes.bool.isRequired,
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
    developerMode: state.scratchGui.tw.developerMode,
    vm: state.scratchGui.vm
});

const ConnectedSecurityManagerComponent = connect(mapStateToProps)(TWSecurityManagerComponent);

export {
    ConnectedSecurityManagerComponent as default,
    TWSecurityManagerComponent,
    manuallyTrustExtension,
    isTrustedExtension
};
