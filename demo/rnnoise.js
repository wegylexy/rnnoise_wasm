if (navigator.mediaDevices &&
    (window.AudioContext || (window.AudioContext = window.webkitAudioContext)) &&
    (window.AudioWorkletNode || window.ScriptProcessorNode) &&
    AudioContext.prototype.createMediaStreamSource
) {
    switch (location.protocol) {
        case "http:":
        case "https:":
            navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
                stream.getTracks().forEach(t => { t.stop() });
                return navigator.mediaDevices.enumerateDevices();
            }).then(devices => {
                const input = document.getElementById("input"),
                    output = document.getElementById("output"),
                    start = document.getElementById("start"),
                    vadProb = document.getElementById("vadProb"),
                    sink = Audio.prototype.setSinkId;
                input.disabled = false;
                if (sink)
                    output.disabled = false;
                else
                    devices = devices.filter(d => d.kind == "audioinput").concat({
                        kind: "audiooutput",
                        label: "Default"
                    });
                devices.forEach(d => {
                    if (d.kind == "audioinput")
                        input.appendChild(Object.assign(document.createElement("option"), {
                            value: d.deviceId,
                            textContent: d.label
                        }));
                    else if (d.kind == "audiooutput")
                        output.appendChild(Object.assign(document.createElement("option"), {
                            value: d.deviceId,
                            textContent: d.label
                        }));
                });
                start.addEventListener("click", async () => {
                    start.disabled = output.disabled = input.disabled = true;
                    const context = new AudioContext({ sampleRate: 48000 });
                    try {
                        const destination = sink ? new MediaStreamAudioDestinationNode(context, {
                            channelCountMode: "explicit",
                            channelCount: 1,
                            channelInterpretation: "speakers"
                        }) : context.destination;
                        if (sink) {
                            const audio = new Audio();
                            audio.setSinkId(output.value);
                            audio.srcObject = destination.stream;
                            audio.play();
                        }
                        const [stream] = await Promise.all([
                            navigator.mediaDevices.getUserMedia({
                                audio: {
                                    deviceId: { exact: input.value },
                                    channelCount: { ideal: 1 },
                                    noiseSuppression: { ideal: false },
                                    echoCancellation: { ideal: true },
                                    autoGainControl: { ideal: false },
                                    sampleRate: { ideal: 48000 }
                                }
                            }),
                            RNNoiseNode.register(context)
                        ]), source = context.createMediaStreamSource(stream),
                            rnnoise = new RNNoiseNode(context);
                        rnnoise.connect(destination);
                        source.connect(rnnoise);
                        rnnoise.onstatus = data => { vadProb.style.width = data.vadProb * 100 + "%"; };
                        (function a() {
                            requestAnimationFrame(() => {
                                rnnoise.update();
                                a();
                            });
                        })();
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