#include <emscripten.h>
#include <stdlib.h>
#include "../rnnoise/include/rnnoise.h"

static float buffer[1920];
size_t input = 0;

float *EMSCRIPTEN_KEEPALIVE getInput() { return &buffer[input]; }

void run(float *const ptr)
{
    // TODO: process
}

float *EMSCRIPTEN_KEEPALIVE transform()
{
    float *const i = &buffer[input], *const o = &buffer[(input + 1408) % 1920];
    switch (input)
    {
    case 0:
    case 512:
    case 1024:
    case 1536:
        run(o);
        break;
    }
    if ((input += 128) == 1920)
        input = 0;
    return o;
}

int main()
{
    return 0;
}