(function () {
    const base = document.currentScript.src.match(/(.*\/)?/)[0],
        compilation = WebAssembly.compileStreaming(fetch(base + "rnnoise-processor.wasm"));

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
})();