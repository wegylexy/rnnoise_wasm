mkdir -p dist && \
emcc \
-s ENVIRONMENT=worker \
-O3 -g0 \
-o dist/rnnoise-processor.wasm \
src/worklet.c
cp src/processor.js dist/rnnoise-processor.js
cp src/runtime.js dist/rnnoise-runtime.js