set -eu -o pipefail
mkdir -p dist && \
/emsdk/node/*/bin/node /emsdk/upstream/emscripten/node_modules/.bin/google-closure-compiler \
    --language_in ECMASCRIPT_NEXT \
    --language_out ECMASCRIPT_2018 \
    --js_output_file dist/rnnoise-runtime.js \
    src/runtime.js && \
/emsdk/node/*/bin/node /emsdk/upstream/emscripten/node_modules/.bin/google-closure-compiler \
    --language_in ECMASCRIPT_NEXT \
    --language_out ECMASCRIPT_2018 \
    --js_output_file dist/rnnoise-processor.js \
    src/processor.js && \
emcc \
    -s ENVIRONMENT=worker \
    --no-entry \
    -O3 -g0 \
    -o dist/rnnoise-processor.wasm \
    -Irnnoise/include \
    rnnoise/src/celt_lpc.c \
    rnnoise/src/denoise.c \
    rnnoise/src/kiss_fft.c \
    rnnoise/src/pitch.c \
    rnnoise/src/rnn.c \
    rnnoise/src/rnn_data.c \
    src/worklet.c