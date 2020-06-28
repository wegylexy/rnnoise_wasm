#include <emscripten.h>
#include <stdlib.h>
#include <rnnoise.h>

#define FRAME_SIZE 480
#define MAX_FRAME_SIZE 16384

static const float scale = -INT16_MIN;
static float inputBuffer[MAX_FRAME_SIZE * 2], outputBuffer[MAX_FRAME_SIZE * 2], vad_prob = 0;
static size_t input = 0, processed = 0, buffered = 0, output = 0, buffering = 0, latency;
static DenoiseState *state = NULL;

float *EMSCRIPTEN_KEEPALIVE getInput() { return &inputBuffer[input]; }

float EMSCRIPTEN_KEEPALIVE getVadProb() { return vad_prob; }

float *EMSCRIPTEN_KEEPALIVE pipe(size_t length)
{
    // Increases latency
    if (length > buffering)
        latency = buffering = (FRAME_SIZE / length + (FRAME_SIZE % length ? 1 : 0)) * length;
    // Shifts output
    if (output && buffered > MAX_FRAME_SIZE)
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
    while (processed + FRAME_SIZE <= input)
    {
        vad_prob = rnnoise_process_frame(state, &outputBuffer[buffered], &inputBuffer[processed]);
        processed += FRAME_SIZE;
        buffered += FRAME_SIZE;
    }
    // Shifts input
    if (processed && input > MAX_FRAME_SIZE)
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