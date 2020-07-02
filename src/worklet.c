#include <emscripten.h>
#include <stdlib.h>
#include <string.h>
#include <rnnoise.h>

#define FRAME_SIZE 480
#define MAX_FRAME_SIZE 16384

static const float scale = -INT16_MIN;

struct State
{
    float buffer[MAX_FRAME_SIZE * 2], vad_prob;
    size_t input, processed, output, buffering, latency;
    DenoiseState *state;
};

struct State *EMSCRIPTEN_KEEPALIVE newState()
{
    struct State *s = malloc(sizeof(struct State));
    s->vad_prob = s->latency = s->buffering = s->output = s->processed = s->input = 0;
    s->state = rnnoise_create(NULL);
    return s;
}

void EMSCRIPTEN_KEEPALIVE deleteState(struct State *const state)
{
    rnnoise_destroy(state->state);
    free(state);
}

float *EMSCRIPTEN_KEEPALIVE getInput(struct State *const state)
{
    // Shifts
    if (state->output && state->input > MAX_FRAME_SIZE)
    {
        memmove(state->buffer, &state->buffer[state->output], sizeof(float) * (state->input -= state->output));
        state->processed -= state->output;
        state->output = 0;
    }
    return &state->buffer[state->input];
}

float EMSCRIPTEN_KEEPALIVE getVadProb(const struct State *const state) { return state->vad_prob; }

float *EMSCRIPTEN_KEEPALIVE pipe(struct State *const state, size_t length)
{
    // Increases latency
    if (length > state->buffering)
        state->latency = state->buffering = (FRAME_SIZE / length + (FRAME_SIZE % length ? 1 : 0)) * length;
    // Scales input
    for (size_t end = state->input + length; state->input < end; ++state->input)
        state->buffer[state->input] *= scale;
    // Processes
    while (state->processed + FRAME_SIZE <= state->input)
    {
        state->vad_prob = rnnoise_process_frame(state->state, &state->buffer[state->processed], &state->buffer[state->processed]);
        state->processed += FRAME_SIZE;
    }
    // Buffers
    if (state->output + state->latency > state->processed)
        return NULL;
    state->latency = length;
    size_t o = state->output;
    // Scales output
    for (size_t end = state->output + length; state->output < end; ++state->output)
        state->buffer[state->output] /= scale;
    return &state->buffer[o];
}