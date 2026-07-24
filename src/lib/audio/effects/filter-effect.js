class FilterEffect {
    constructor (audioContext, type, transition, startSeconds, endSeconds) {
        this.audioContext = audioContext;
        this.input = this.audioContext.createGain();
        this.output = this.audioContext.createGain();
        this.filter = this.audioContext.createBiquadFilter();

        const isLowPass = type === 'lowpass';
        const filteredFrequency = isLowPass ? 880 : 800;
        const neutralFrequency = isLowPass ? audioContext.sampleRate / 2 : 10;
        const frequency = this.filter.frequency;

        this.filter.type = type;
        this.filter.Q.value = 0.7;
        frequency.setValueAtTime(neutralFrequency, 0);

        if (transition === 'fadeIn') {
            frequency.setValueAtTime(filteredFrequency, startSeconds);
            frequency.exponentialRampToValueAtTime(neutralFrequency, endSeconds);
        } else if (transition === 'fadeOut') {
            frequency.setValueAtTime(neutralFrequency, startSeconds);
            frequency.exponentialRampToValueAtTime(filteredFrequency, endSeconds);
        } else {
            frequency.setValueAtTime(filteredFrequency, startSeconds);
        }
        const resetTime = transition === 'fadeOut' ? endSeconds + (1 / audioContext.sampleRate) : endSeconds;
        frequency.setValueAtTime(neutralFrequency, resetTime);

        this.input.connect(this.filter);
        this.filter.connect(this.output);
    }
}

export default FilterEffect;
