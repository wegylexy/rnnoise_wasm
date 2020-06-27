#include <emscripten.h>
#include <stdlib.h>
#include <rnnoise.h>

static const float scale = 32768;
static float inputBuffer[32768], outputBuffer[32768], vad_prob = 0;
static size_t input = 0, processed = 0, buffered = 0, output = 0, max_latency = 0, latency;
static DenoiseState *state = NULL;

float EMSCRIPTEN_KEEPALIVE getVadProb() { return vad_prob; }

float *EMSCRIPTEN_KEEPALIVE buffer(size_t length)
{
    if (length > max_latency)
        latency = max_latency = (480 / length + (480 % length ? 1 : 0)) * length;
    if (output && buffered > 16384)
    {
        size_t d = buffered - output;
        for (size_t i = 0; i < d; ++i)
            outputBuffer[i] = outputBuffer[output + i];
        output = 0;
        buffered = d;
    }
    for (size_t end = input + length; input < end; ++input)
        inputBuffer[input] *= scale;
    while (processed + 480 <= input)
    {
        vad_prob = rnnoise_process_frame(state, &outputBuffer[buffered], &inputBuffer[processed]);
        processed += 480;
        buffered += 480;
    }
    if (processed && input > 16384)
    {
        size_t d = input - processed;
        for (size_t i = 0; i < d; ++i)
            inputBuffer[i] = inputBuffer[processed + i];
        processed = 0;
        input = d;
    }
    return &inputBuffer[input];
}

float *EMSCRIPTEN_KEEPALIVE render(size_t length)
{
    if (output + latency > buffered)
        return NULL;
    latency = length;
    float *const o = &outputBuffer[output];
    for (size_t end = output + length; output < end; ++output)
        outputBuffer[output] /= scale;
    return o;
}

void EMSCRIPTEN_KEEPALIVE reset()
{
    if (state)
        rnnoise_destroy(state);
    state = rnnoise_create(NULL);
}