cmake_minimum_required(VERSION 3.21 FATAL_ERROR)

project(gamedude_projectm_bridge LANGUAGES CXX)

if(NOT CMAKE_SYSTEM_NAME STREQUAL "Emscripten")
    message(FATAL_ERROR "gamedude_projectm_bridge must be built with the Emscripten toolchain (emcmake).")
endif()

if(NOT DEFINED PRESETS_DIR)
    message(FATAL_ERROR "Pass -DPRESETS_DIR=/path/to/presets when configuring.")
endif()

file(TO_CMAKE_PATH "${PRESETS_DIR}" PRESETS_DIR_NATIVE)

find_package(projectM4 REQUIRED CONFIG)

set(BRIDGE_SOURCES gamedude_projectm_bridge.cpp)

add_executable(projectm ${BRIDGE_SOURCES})

target_link_libraries(projectm PRIVATE libprojectM::projectM)

target_compile_options(projectm PRIVATE
    "SHELL:-s USE_SDL=2"
)

target_link_options(projectm PRIVATE
    "SHELL:-s USE_SDL=2"
    "SHELL:-s MIN_WEBGL_VERSION=2"
    "SHELL:-s MAX_WEBGL_VERSION=2"
    "SHELL:-s FULL_ES2=1"
    "SHELL:-s FULL_ES3=1"
    "SHELL:-s ALLOW_MEMORY_GROWTH=1"
    "SHELL:-s ASSERTIONS=1"
    "SHELL:-s NO_DISABLE_EXCEPTION_CATCHING"
    "SHELL:-s MODULARIZE=1"
    "SHELL:-s EXPORT_NAME=createProjectMModule"
    "SHELL:-s ENVIRONMENT=web"
    "SHELL:-s EXPORTED_FUNCTIONS=['_pm_init','_pm_destroy','_pm_resize','_pm_render_frame','_pm_feed_pcm','_pm_next_preset','_pm_prev_preset','_pm_set_preset_locked','_pm_set_auto_preset_switch_enabled','_pm_get_preset_count','_pm_get_preset_index','_pm_get_preset_path','_malloc','_free']"
    "SHELL:-s EXPORTED_RUNTIME_METHODS=['ccall','cwrap','HEAPF32']"
    "SHELL:--preload-file \"${PRESETS_DIR_NATIVE}@/presets\""
)

set_target_properties(projectm PROPERTIES OUTPUT_NAME "projectm")
