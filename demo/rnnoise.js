if (navigator.mediaDevices && (globalThis.AudioWorkletNode || globalThis.ScriptProcessorNode)) {
    switch (location.protocol) {
        case "http:":
        case "https:":
            navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
                stream.getTracks().forEach(t => { t.stop() });
                return navigator.mediaDevices.enumerateDevices();
            }).then(devices => {
                const input = document.getElementById("input"),
                    start = document.getElementById("start"),
                    vadProb = document.getElementById("vadProb");
                devices.forEach(d => {
                    if (d.kind == "audioinput") {
                        const o = document.createElement("option");
                        o.value = d.deviceId;
                        o.textContent = d.label;
                        input.appendChild(o);
                    }
                });
                input.disabled = false;
                start.addEventListener("click", async () => {
                    start.disabled = true;
                    const context = new AudioContext({ sampleRate: 48000 });
                    try {
                        const [stream] = await Promise.all([
                            navigator.mediaDevices.getUserMedia({
                                audio: {
                                    deviceId: { exact: input.value },
                                    channelCount: { ideal: 1 },
                                    noiseSuppression: { ideal: false },
                                    echoCancellation: { ideal: false },
                                    autoGainControl: { ideal: false },
                                    sampleRate: { ideal: 48000 }
                                }
                            }),
                            RNNoiseNode.register(context)
                        ]);
                        const source = context.createMediaStreamSource(stream),
                            rnnoise = new RNNoiseNode(context);
                        rnnoise.connect(context.destination);
                        source.connect(rnnoise);
                        if (rnnoise.port) {
                            rnnoise.port.onmessage = ({ data }) => { vadProb.value = data.vadProb; };
                            (function a() {
                                requestAnimationFrame(() => {
                                    rnnoise.port.postMessage({});
                                    a();
                                });
                            })();
                        }
                    } catch (e) {
                        context.close();
                        console.error(e);
                    }
                });
                start.disabled = false;
            });
            break;
        default:
            alert("Run `node server.mjs` and then go to http://localhost:8080");
            close();
            break;
    }
} else {
    alert("Not supported by this browser. Please use a modern browser.");
}