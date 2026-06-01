/**
 * GameDudeSynth — minimal libprojectM bridge for Emscripten / WebGL2.
 * Feeds PCM from JavaScript; no SDL microphone capture.
 *
 * SPDX-License-Identifier: LGPL-2.1-or-later (links statically to libprojectM)
 */

#include <emscripten.h>
#include <emscripten/html5_webgl.h>

#include <SDL.h>
#include <GL/gl.h>

#include <projectM-4/projectM.h>

#include <algorithm>
#include <cstdio>
#include <cstring>
#include <fstream>
#include <sstream>
#include <string>
#include <vector>

namespace {

struct AppState {
    projectm_handle pm{nullptr};
    SDL_Window* window{nullptr};
    SDL_Renderer* renderer{nullptr};
    std::vector<std::string> presetPaths;
    size_t presetIndex{0};
    int width{0};
    int height{0};
    bool initialized{false};
};

AppState g_app;
bool g_autoPresetSwitchEnabled = false;

void loadPresetAt(size_t index, bool smooth)
{
    if (!g_app.pm || g_app.presetPaths.empty())
    {
        return;
    }
    g_app.presetIndex = index % g_app.presetPaths.size();
    projectm_load_preset_file(g_app.pm, g_app.presetPaths[g_app.presetIndex].c_str(), smooth);
}

void onPresetSwitchRequested(bool is_hard_cut, void* /*user_data*/)
{
    // Default to "manual-only": beat-driven preset cycling causes rapid flicker.
    if (!g_autoPresetSwitchEnabled)
    {
        return;
    }

    if (!g_app.pm || g_app.presetPaths.empty())
    {
        return;
    }
    const size_t next = (g_app.presetIndex + 1) % g_app.presetPaths.size();
    loadPresetAt(next, !is_hard_cut);
}

bool loadPresetManifest(const char* manifestPath)
{
    std::ifstream in(manifestPath);
    if (!in)
    {
        fprintf(stderr, "projectM bridge: could not open preset manifest: %s\n", manifestPath);
        return false;
    }

    g_app.presetPaths.clear();
    std::string line;
    while (std::getline(in, line))
    {
        while (!line.empty() && (line.back() == '\r' || line.back() == '\n' || line.back() == ' '))
        {
            line.pop_back();
        }
        size_t start = line.find_first_not_of(" \t");
        if (start == std::string::npos)
        {
            continue;
        }
        line = line.substr(start);
        if (line.empty() || line[0] == '#')
        {
            continue;
        }
        g_app.presetPaths.push_back(line);
    }

    fprintf(stderr, "projectM bridge: loaded %zu presets from manifest\n", g_app.presetPaths.size());
    return !g_app.presetPaths.empty();
}

bool initSdlGl(int width, int height)
{
    if (SDL_Init(SDL_INIT_VIDEO) != 0)
    {
        fprintf(stderr, "SDL_Init failed: %s\n", SDL_GetError());
        return false;
    }

    SDL_GL_SetAttribute(SDL_GL_CONTEXT_MAJOR_VERSION, 3);
    SDL_GL_SetAttribute(SDL_GL_CONTEXT_MINOR_VERSION, 0);
    SDL_GL_SetAttribute(SDL_GL_CONTEXT_PROFILE_MASK, SDL_GL_CONTEXT_PROFILE_ES);

    // Match projectM EMSCRIPTEN.md: one SDL window + renderer on the Module canvas (WebGL2).
    if (SDL_CreateWindowAndRenderer(
            width,
            height,
            SDL_WINDOW_OPENGL | SDL_WINDOW_RESIZABLE,
            &g_app.window,
            &g_app.renderer)
        != 0)
    {
        fprintf(stderr, "SDL_CreateWindowAndRenderer failed: %s\n", SDL_GetError());
        return false;
    }

    EMSCRIPTEN_WEBGL_CONTEXT_HANDLE webgl = emscripten_webgl_get_current_context();
    if (webgl)
    {
        emscripten_webgl_enable_extension(webgl, "OES_texture_float");
    }
    else
    {
        fprintf(stderr, "No active WebGL context after SDL init\n");
        return false;
    }

    return true;
}

} // namespace

extern "C" {

EMSCRIPTEN_KEEPALIVE
void pm_resize(int width, int height);

EMSCRIPTEN_KEEPALIVE
int pm_init(int width, int height)
{
    if (g_app.initialized)
    {
        pm_resize(width, height);
        return 1;
    }

    g_app.width = std::max(1, width);
    g_app.height = std::max(1, height);

    if (!initSdlGl(g_app.width, g_app.height))
    {
        return 0;
    }

    if (!loadPresetManifest("/presets/presets.manifest"))
    {
        fprintf(stderr, "projectM bridge: preset manifest missing or empty\n");
    }

    g_app.pm = projectm_create();
    if (!g_app.pm)
    {
        fprintf(stderr, "projectm_create failed\n");
        return 0;
    }

    const char* texturePaths[] = {"/presets", "/presets/textures"};
    projectm_set_texture_search_paths(g_app.pm, texturePaths, 2);

    projectm_set_window_size(g_app.pm, static_cast<size_t>(g_app.width), static_cast<size_t>(g_app.height));
    projectm_set_mesh_size(g_app.pm, 48, 32);
    projectm_set_fps(g_app.pm, 60);
    projectm_set_beat_sensitivity(g_app.pm, 1.2f);
    projectm_set_soft_cut_duration(g_app.pm, 2.5);
    projectm_set_preset_duration(g_app.pm, 25.0);
    projectm_set_aspect_correction(g_app.pm, true);
    projectm_set_hard_cut_enabled(g_app.pm, true);
    projectm_set_hard_cut_duration(g_app.pm, 12.0);

    projectm_set_preset_switch_requested_event_callback(g_app.pm, onPresetSwitchRequested, nullptr);

    // Start with built-in idle preset so a bad .milk in the pack cannot abort startup.
    projectm_load_preset_file(g_app.pm, "idle://", false);
    if (!g_app.presetPaths.empty())
    {
        loadPresetAt(0, true);
    }

    g_app.initialized = true;
    return 1;
}

EMSCRIPTEN_KEEPALIVE
void pm_destroy()
{
    if (g_app.pm)
    {
        projectm_destroy(g_app.pm);
        g_app.pm = nullptr;
    }
    if (g_app.renderer)
    {
        SDL_DestroyRenderer(g_app.renderer);
        g_app.renderer = nullptr;
    }
    if (g_app.window)
    {
        SDL_DestroyWindow(g_app.window);
        g_app.window = nullptr;
    }
    SDL_Quit();
    g_app = AppState{};
}

EMSCRIPTEN_KEEPALIVE
void pm_resize(int width, int height)
{
    g_app.width = std::max(1, width);
    g_app.height = std::max(1, height);
    if (g_app.window)
    {
        SDL_SetWindowSize(g_app.window, g_app.width, g_app.height);
    }
    if (g_app.pm)
    {
        projectm_set_window_size(g_app.pm, static_cast<size_t>(g_app.width), static_cast<size_t>(g_app.height));
    }
}

EMSCRIPTEN_KEEPALIVE
void pm_render_frame()
{
    if (!g_app.pm || !g_app.renderer)
    {
        return;
    }

    glClearColor(0.f, 0.f, 0.f, 1.f);
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);

    projectm_opengl_render_frame(g_app.pm);
    SDL_RenderPresent(g_app.renderer);
}

EMSCRIPTEN_KEEPALIVE
void pm_feed_pcm(const float* samples, int sampleCount, int channels)
{
    if (!g_app.pm || !samples || sampleCount <= 0)
    {
        return;
    }

    projectm_channels ch = PROJECTM_MONO;
    if (channels >= 2)
    {
        ch = PROJECTM_STEREO;
        sampleCount /= 2;
    }

    projectm_pcm_add_float(g_app.pm, samples, static_cast<unsigned int>(sampleCount), ch);
}

EMSCRIPTEN_KEEPALIVE
void pm_next_preset()
{
    if (g_app.presetPaths.empty())
    {
        return;
    }
    loadPresetAt(g_app.presetIndex + 1, true);
}

EMSCRIPTEN_KEEPALIVE
void pm_prev_preset()
{
    if (g_app.presetPaths.empty())
    {
        return;
    }
    const size_t count = g_app.presetPaths.size();
    loadPresetAt((g_app.presetIndex + count - 1) % count, true);
}

EMSCRIPTEN_KEEPALIVE
void pm_set_auto_preset_switch_enabled(int enabled)
{
    g_autoPresetSwitchEnabled = (enabled != 0);
}

EMSCRIPTEN_KEEPALIVE
void pm_set_preset_locked(int locked)
{
    if (g_app.pm)
    {
        projectm_set_preset_locked(g_app.pm, locked != 0);
    }
}

EMSCRIPTEN_KEEPALIVE
int pm_get_preset_count()
{
    return static_cast<int>(g_app.presetPaths.size());
}

EMSCRIPTEN_KEEPALIVE
int pm_get_preset_index()
{
    return static_cast<int>(g_app.presetIndex);
}

EMSCRIPTEN_KEEPALIVE
const char* pm_get_preset_path(int index)
{
    if (index < 0 || index >= static_cast<int>(g_app.presetPaths.size()))
    {
        return "";
    }
    return g_app.presetPaths[static_cast<size_t>(index)].c_str();
}

} // extern "C"

int main()
{
    return 0;
}
