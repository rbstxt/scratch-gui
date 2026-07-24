export default class MockAudioEffects {
    static get effectTypes () { // @todo can this be imported from the real file?
        return {
            ROBOT: 'robot',
            REVERSE: 'reverse',
            LOUDER: 'higher',
            SOFTER: 'lower',
            FASTER: 'faster',
            SLOWER: 'slower',
            ECHO: 'echo',
            LOWPASS: 'low pass',
            HIGHPASS: 'high pass',
            LOWPASS_FADEIN: 'low pass fade in',
            LOWPASS_FADEOUT: 'low pass fade out',
            HIGHPASS_FADEIN: 'high pass fade in',
            HIGHPASS_FADEOUT: 'high pass fade out',
            MODIFY: 'modify'
        };
    }
    constructor (buffer, name) {
        this.buffer = buffer;
        this.name = name;
        this.process = jest.fn(done => {
            this._finishProcessing = renderedBuffer => {
                done(renderedBuffer, 0, 1);
                return new Promise(resolve => setTimeout(resolve));
            };
        });
        MockAudioEffects.instance = this;
    }
}
