#include <emscripten.h>
#include <stdlib.h>
#include <rnnoise.h>

static const float scale = 32768;
static float inputBuffer[32768], outputBuffer[32768], vad_prob = 0;
static size_t input = 0, processed = 0, buffered = 0, output = 0, buffering = 0, latency;
static DenoiseState *state = NULL;

float *EMSCRIPTEN_KEEPALIVE getInput() { return &inputBuffer[input]; }

float EMSCRIPTEN_KEEPALIVE getVadProb() { return vad_prob; }

float *EMSCRIPTEN_KEEPALIVE pipe(size_t length)
{
    // Increases latency
    if (length > buffering)
        latency = buffering = (480 / length + (480 % length ? 1 : 0)) * length;
    // Shifts output
    if (output && buffered > 16384)
    {
        size_t d = buffered - output;
        for (size_t i = 0; i < d; ++i)
            outputBuffer[i] = outputBuffer[output + i];
        output = 0;
        buffered = d;
    }
    // Scales input
    for (size_t end = input + length; input < end; ++input)
        inputBuffer[input] *= scale;
    // Buffers input
    while (processed + 480 <= input)
    {
        vad_prob = rnnoise_process_frame(state, &outputBuffer[buffered], &inputBuffer[processed]);
        processed += 480;
        buffered += 480;
    }
    // Shifts input
    if (processed && input > 16384)
    {
        size_t d = input - processed;
        for (size_t i = 0; i < d; ++i)
            inputBuffer[i] = inputBuffer[processed + i];
        processed = 0;
        input = d;
    }
    // Flushes output
    if (output + latency > buffered)
        return NULL;
    latency = length;
    size_t o = output;
    // Scales output
    for (size_t end = output + length; output < end; ++output)
        outputBuffer[output] /= scale;
    return &outputBuffer[o];
}

void EMSCRIPTEN_KEEPALIVE reset()
{
    if (state)
        rnnoise_destroy(state);
    state = rnnoise_create(NULL);
}