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
        this._input = this.buffer(0);
        this.port.onmessage = () => {
            this.port.postMessage({ vadProb: this.getVadProb() });
        };
    }

    process(input, output, parameters) {
        const i = input[0][0], o = output[0][0];
        this._heapFloat32.set(i, this._input / 4);
        this._input = this.buffer(i.length);
        const ptr4 = this.render(o.length) / 4;
        if (ptr4)
            o.set(this._heapFloat32.subarray(ptr4, ptr4 + o.length));
        return true;
    }
});