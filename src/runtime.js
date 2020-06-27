(function () {
    const base = document.currentScript.src.match(/(.*\/)?/)[0],
        compilation = WebAssembly.compileStreaming(fetch(base + "rnnoise-processor.wasm"));

    if (globalThis.AudioWorkletNode) {
        globalThis.RNNoiseNode = class extends AudioWorkletNode {
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
            }
        };
    } else if (globalThis.ScriptProcessorNode) {
        globalThis.RNNoiseNode = function (context) {
            const size = 16384, processor = context.createScriptProcessor(size, 1, 1),
                instance = context.RNNoiseInstance,
                heapFloat32 = new Float32Array(instance.memory.buffer);
            let input = instance.buffer(0);
            instance.reset();
            processor.onaudioprocess = ({ inputBuffer, outputBuffer }) => {
                const i = inputBuffer.getChannelData(0), o = outputBuffer.getChannelData(0);
                heapFloat32.set(i, input / 4);
                input = instance.buffer(i.length);
                const ptr4 = instance.render(o.length) / 4;
                if (ptr4)
                    o.set(heapFloat32.subarray(ptr4, ptr4 + o.length));
            };
            return processor;
        };
        globalThis.RNNoiseNode.register = async (context) => {
            if (!context.RNNoiseInstance) {
                context.RNNoiseInstance = (await WebAssembly.instantiate(await compilation, {
                    wasi_snapshot_preview1: { proc_exit: c => { } }
                })).exports;
            }
        };
    }
})();