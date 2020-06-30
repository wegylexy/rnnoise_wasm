#include <emscripten.h>
#include <stdlib.h>
#include <string.h>
#include <rnnoise.h>

#define FRAME_SIZE 480
#define MAX_FRAME_SIZE 16384

static const float scale = -INT16_MIN;
static float buffer[MAX_FRAME_SIZE * 2], vad_prob;
static size_t input, processed, output, buffering, latency;
static DenoiseState *state = NULL;

float *EMSCRIPTEN_KEEPALIVE getInput()
{
    // Shifts
    if (output && input > MAX_FRAME_SIZE)
    {
        memmove(buffer, &buffer[output], sizeof(float) * (input -= output));
        processed -= output;
        output = 0;
    }
    return &buffer[input];
}

float EMSCRIPTEN_KEEPALIVE getVadProb() { return vad_prob; }

float *EMSCRIPTEN_KEEPALIVE pipe(size_t length)
{
    // Increases latency
    if (length > buffering)
        latency = buffering = (FRAME_SIZE / length + (FRAME_SIZE % length ? 1 : 0)) * length;
    // Scales input
    for (size_t end = input + length; input < end; ++input)
        buffer[input] *= scale;
    // Processes
    while (processed + FRAME_SIZE <= input)
    {
        vad_prob = rnnoise_process_frame(state, &buffer[processed], &buffer[processed]);
        processed += FRAME_SIZE;
    }
    // Buffers
    if (output + latency > processed)
        return NULL;
    latency = length;
    size_t o = output;
    // Scales output
    for (size_t end = output + length; output < end; ++output)
        buffer[output] /= scale;
    return &buffer[o];
}

void EMSCRIPTEN_KEEPALIVE reset()
{
    if (state)
        rnnoise_destroy(state);
    vad_prob = latency = buffering = output = processed = input = 0;
    state = rnnoise_create(NULL);
}