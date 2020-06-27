mkdir -p dist && \
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
cp src/processor.js dist/rnnoise-processor.js
cp src/runtime.js dist/rnnoise-runtime.js