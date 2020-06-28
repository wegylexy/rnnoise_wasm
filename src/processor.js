registerProcessor("rnnoise", class extends AudioWorkletProcessor {
    constructor(options) {
        super({
            ...options,
            numberOfInputs: 1,
            numberOfOutputs: 1,
            outputChannelCount: [1]
        });
        Object.assign(this, new WebAssembly.Instance(options.processorOptions.module).exports);
        this._heapFloat32 = new Float32Array(this.memory.buffer);
        this.reset();
        this.port.onmessage = () => {
            this.port.postMessage({ vadProb: this.getVadProb() });
        };
    }

    process(input, output, parameters) {
        this._heapFloat32.set(input[0][0], this.getInput() / 4);
        const o = output[0][0], ptr4 = this.pipe(o.length) / 4;
        if (ptr4)
            o.set(this._heapFloat32.subarray(ptr4, ptr4 + o.length));
        return true;
    }
});