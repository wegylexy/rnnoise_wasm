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
            const size = 256, processor = context.createScriptProcessor(size, 1, 1),
                instance = context.RNNoiseInstance,
                heapFloat32 = new Float32Array(instance.memory.buffer);
            try { instance._start(); } catch (e) { }
            processor.onaudioprocess = ({ inputBuffer, outputBuffer }) => {
                const input = inputBuffer.getChannelData(0), output = outputBuffer.getChannelData(0);
                for (let i = 0; i < size; i += 128) {
                    heapFloat32.set(input.subarray(i, i + 128), instance.getInput() / 4);
                    let ptr4 = instance.transform() / 4;
                    output.set(heapFloat32.subarray(ptr4, ptr4 + 128), i);
                }
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