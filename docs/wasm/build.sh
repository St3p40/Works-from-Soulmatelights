#!/bin/sh
# Build every sketch in the repository to WebAssembly, against real FastLED.
#
#     source ~/emsdk/emsdk_env.sh
#     sh docs/wasm/build.sh
#
# Needs emsdk on PATH. FastLED is cloned next to this script the first time.
set -e
here=$(cd "$(dirname "$0")" && pwd)
cd "$here"

[ -d fastled ] || git clone --depth 1 --branch 3.6.0 https://github.com/FastLED/FastLED.git fastled

# FastLED's own maths, compiled for the host. colorpalettes.cpp guards itself
# with its header's macro, so that one needs the #undef or it compiles to
# nothing and the palettes come out undefined.
mkdir -p fl
for m in lib8tion noise colorutils colorpalettes hsv2rgb bitswap; do
  g=$(head -4 fastled/src/$m.cpp | grep -oE '__INC_[A-Z0-9_]+' | head -1 || true)
  { echo '#include "../fl_host.h"'
    [ -n "$g" ] && echo "#undef $g"
    echo "#include \"../fastled/src/$m.cpp\""; } > fl/fl_$m.cpp
done

FLAGS=$(tr '\n' ' ' < flags.txt)

# one wrapper TU per sketch, with the tunable #defines promoted to variables
CXX=em++ CXXFLAGS="$FLAGS" python3 gen.py
python3 mkreg.py

UNITS=$(python3 -c "import json;print(' '.join('gen/%s.cpp'%r['ns'] for r in json.load(open('registry.json')) if r['ok']))")
EXPORTS='["_sk_count","_sk_cols","_sk_rows","_sk_leds","_sk_draw","_sk_clear","_sk_set_millis","_sk_get_seed","_sk_set_seed","_sk_param_count","_sk_param_get","_sk_param_set"]'

for S in 16 24 32 48 64 128; do
  emcc $FLAGS -I. -DLED_COLS=$S -DLED_ROWS=$S \
    $UNITS fl/fl_*.cpp support.cpp registry.cpp -o ../sketches$S.js \
    -sMODULARIZE=1 -sEXPORT_NAME=SketchModule$S -sSINGLE_FILE=1 \
    -sALLOW_MEMORY_GROWTH=1 -sENVIRONMENT=web \
    -sEXPORTED_RUNTIME_METHODS='["HEAPU8"]' -sEXPORTED_FUNCTIONS="$EXPORTS"
  echo "  ${S}x${S}  $(du -h ../sketches$S.js | cut -f1)"
done

python3 mklabels.py
echo "done - open docs/wasm.html"
