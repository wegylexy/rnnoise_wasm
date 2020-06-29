(function () {
    const base = document.currentScript.src.match(/(.*\/)?/)[0],
        compilation = (WebAssembly.compileStreaming || (async f => await WebAssembly.compile(await (await f).arrayBuffer())))(fetch(base + "rnnoise-processor.wasm"));
    window.RNNoiseNode = (window.AudioWorkletNode || (window.AudioWorkletNode = window.webkitAudioWorkletNode)) &&
        class extends AudioWorkletNode {
            static async register(context) {
                if (!context.RNNoiseModule) {
                    context.RNNoiseModule = await compilation;
                    await context.audioWorklet.addModule(base + "rnnoise-processor.js");
                }
            }

            constructor(context) {
                super(context, "rnnoise", {
                    channelCountMode: "explicit",
                    channelCount: 1,
                    channelInterpretation: "speakers",
                    numberOfInputs: 1,
                    numberOfOutputs: 1,
                    outputChannelCount: [1],
                    processorOptions: {
                        module: context.RNNoiseModule
                    }
                });
                this.port.onmessage = ({ data }) => {
                    const e = Object.assign(new Event("status"), data);
                    this.dispatchEvent(e);
                    if (this.onstatus)
                        this.onstatus(e);
                };
            }

            update() { this.port.postMessage({}); }
        } ||
        (window.ScriptProcessorNode || (window.ScriptProcessorNode = window.webkitScriptProcessorNode)) &&
        Object.assign(function (context) {
            const size = 512, processor = context.createScriptProcessor(size, 1, 1),
                instance = context.RNNoiseInstance,
                heapFloat32 = new Float32Array(instance.memory.buffer);
            instance.reset();
            processor.onaudioprocess = ({ inputBuffer, outputBuffer }) => {
                heapFloat32.set(inputBuffer.getChannelData(0), instance.getInput() / 4);
                const o = outputBuffer.getChannelData(0), ptr4 = instance.pipe(o.length) / 4;
                if (ptr4)
                    o.set(heapFloat32.subarray(ptr4, ptr4 + o.length));
            };
            processor.update = () => {
                const e = Object.assign(new Event("status"), {
                    vadProb: instance.getVadProb()
                });
                processor.dispatchEvent(e);
                if (processor.onstatus)
                    processor.onstatus(e);
            };
            return processor;
        }, {
            register: async (context) => {
                if (!context.RNNoiseInstance)
                    context.RNNoiseInstance = (await WebAssembly.instantiate(await compilation)).exports;
            }
        });
})();