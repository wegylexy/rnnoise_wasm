#include <emscripten.h>
#include <stdlib.h>
#include <rnnoise.h>

static float ring[1920], vad_prob = 0;
static size_t input = 0;
static DenoiseState *state;

float *EMSCRIPTEN_KEEPALIVE getInput() { return &ring[input]; }

float EMSCRIPTEN_KEEPALIVE getVadProb() { return vad_prob; }

float *EMSCRIPTEN_KEEPALIVE transform()
{
    input += 128;
    input %= 1920;
    size_t p;
    switch (input)
    {
    case 128:
        p = 1440;
        break;
    case 512:
        p = 0;
        break;
    case 1024:
        p = 480;
        break;
    case 1536:
        p = 960;
        break;
    default:
        goto Buffer;
    }
    float *const o = &ring[p];
    for (size_t i = 0; i < 480; ++i)
        o[i] *= 32768;
    vad_prob = rnnoise_process_frame(state, o, o);
    for (size_t i = 0; i < 480; ++i)
        o[i] /= 32768;
Buffer:
    return &ring[(input + 1280) % 1920];
}

int main()
{
    state = rnnoise_create(NULL);
    return 0;
}