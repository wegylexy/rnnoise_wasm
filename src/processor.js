registerProcessor("rnnoise", class extends AudioWorkletProcessor {
    constructor(options) {
        super({
            ...options,
            numberOfInputs: 1,
            numberOfOutputs: 1,
            outputChannelCount: [1]
        });
        Object.assign(this, new WebAssembly.Instance(options.processorOptions.module, {
            env: {
                memory: this._memory = new WebAssembly.Memory({ initial: 256 }),
                table: this._table = new WebAssembly.Table({
                    initial: 0,
                    element: "anyfunc"
                })
            },
            wasi_snapshot_preview1: { proc_exit: c => { } }
        }).exports);
        this._heapFloat32 = new Float32Array(this._memory.buffer);
    }

    process(input, output, parameters) {
        this._heapFloat32.set(input[0][0], this.getInput() / 4);
        const ptr4 = this.transform() / 4;
        output[0][0].set(this._heapFloat32.subarray(ptr4, ptr4 + 128));
        return true;
    }
});