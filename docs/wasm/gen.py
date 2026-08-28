"""Generate one translation unit per sketch, plus the registry the page calls.

Each sketch becomes `namespace skNNN { <the .cpp> }`. A separate TU keeps its
#defines to itself, the namespace keeps its globals to itself, so 94 sketches
that all define draw(), t, speed and loadingFlag can live in one module.

A sketch's numeric #defines are promoted to variables where that still compiles,
which is what makes them adjustable from the page. Promotion is tried and
reverted per define, so one that is used as an array bound simply stays a
#define and does not appear in the settings panel.
"""
import json, os, re, subprocess, sys

ROOT = "/home/st3p40/worksfromsoulmate"
HERE = os.path.dirname(os.path.abspath(__file__))
GEN = os.path.join(HERE, "gen")
# the promotion test has to use the compiler that will do the real build:
# g++ accepts things clang does not, and a promotion that turns an array bound
# into a variable is exactly the case where they disagree
CXX = os.environ.get("CXX", "g++")
CXXFLAGS = (os.environ.get("CXXFLAGS", "-std=c++17 -w -fpermissive").split()
            + ["-I", HERE, "-DLED_COLS=32", "-DLED_ROWS=32", "-fsyntax-only"])

# Sketches that compile but never return. Both hunt for a cell matching a
# condition that stops being true once the panel fills up, and then spin.
# Remove a name from here once its sketch is fixed.
HANGS = {"Any recreations/Minesweeper.cpp", "Other/Flags.cpp"}

# #defines that are plumbing, not settings
SKIP = {"WIDTH", "HEIGHT", "NUM_LEDS", "LED_COLS", "LED_ROWS", "N_LEDS",
        "C_X", "C_Y", "CENTER_X", "CENTER_Y", "WU_WEIGHT"}
DEFINE = re.compile(r'^[ \t]*#[ \t]*define[ \t]+([A-Za-z_]\w*)[ \t]+(-?\d+\.?\d*)[ \t]*(//.*)?$', re.M)
NUMTYPE = r'(?:byte|boolean|bool|u?int(?:8|16|32)_t|unsigned\s+char|unsigned\s+int|int|long|float|double)'
# a global the sketch initialises and never touches again - Fire.cpp's `byte scale = 64;`
GLOBAL = re.compile(r'^(?:const\s+)?' + NUMTYPE + r'\s+([A-Za-z_]\w*)\s*=\s*(-?\d+\.?\d*)\s*;', re.M)
# the same thing written as a function-local static - the Radial Effects folder
LOCALSTATIC = re.compile(r'^[ \t]+static\s+' + NUMTYPE + r'\s+([A-Za-z_]\w*)\s*=\s*(-?\d+\.?\d*)\s*;[ \t]*$', re.M)


def never_written(text, name):
    """True when the sketch only ever reads it, i.e. it is a knob, not state."""
    n = re.escape(name)
    if re.search(r'\b' + n + r'\s*(\+\+|--|\+=|-=|\*=|/=|%=|\|=|&=|\^=|<<=|>>=)', text):
        return False
    if re.search(r'(\+\+|--)\s*\b' + n + r'\b', text):
        return False
    # a plain assignment, but not the declaration itself and not ==/!=/<=/>=
    for m in re.finditer(r'\b' + n + r'\s*=(?!=)', text):
        line = text[text.rfind("\n", 0, m.start()) + 1:m.start()]
        if not re.search(NUMTYPE + r'\s*$|^\s*(const\s+)?$', line.strip() or " "):
            return False
        if not re.match(r'^\s*(static\s+)?(const\s+)?' + NUMTYPE + r'\s*$', line):
            return False
    if re.search(r'\b(scanf|memcpy|memset)\s*\([^)]*&\s*' + n + r'\b', text):
        return False
    return True


def sketches():
    out = []
    for dp, dn, fn in os.walk(ROOT):
        # prune, so nothing under docs/ is treated as a sketch - the vendored
        # FastLED and the generated wrappers both live there
        dn[:] = [d for d in dn if d not in (".git", "docs")]
        rel = os.path.relpath(dp, ROOT)
        if rel == "docs" or rel.startswith("docs" + os.sep):
            continue
        for f in sorted(fn):
            if f.endswith(".cpp"):
                out.append(os.path.relpath(os.path.join(dp, f), ROOT).replace(os.sep, "/"))
    return sorted(out)


def read(path):
    raw = open(path, "rb").read()
    try:
        return raw.decode("utf-8")
    except UnicodeDecodeError:
        return raw.decode("cp1251")         # a few sketches carry cp1251 comments


def compiles(path):
    return subprocess.call([CXX] + CXXFLAGS + [path],
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL) == 0


def write_unit(ns, body_rel, promoted):
    """The wrapper: promoted defines become variables ahead of the body, and a
    pair of accessors goes after it. The accessors use decltype, so a knob that
    is a byte in one sketch and a float in another needs no type bookkeeping."""
    decls = "".join("  %s %s = %s;\n" % ("double" if "." in v else "int32_t", n, v)
                    for n, v, k in promoted if k != "global")
    if promoted:
        get = "".join("    case %d: return (double)%s;\n" % (i, n)
                      for i, (n, _, _) in enumerate(promoted))
        setb = "".join("    case %d: %s = (decltype(%s))v; break;\n" % (i, n, n)
                       for i, (n, _, _) in enumerate(promoted))
        acc = ("  double __pget(int j){ switch(j){\n%s  } return 0; }\n"
               "  void __pset(int j, double v){ switch(j){\n%s  } }\n" % (get, setb))
    else:
        acc = ""
    src = ('#include "../soulmate.h"\nnamespace %s {\n%s#include "%s"\n%s}\n'
           % (ns, decls, body_rel, acc))
    path = os.path.join(GEN, ns + ".cpp")
    open(path, "w", encoding="utf-8").write(src)
    return path


def main():
    os.makedirs(GEN, exist_ok=True)
    reg = []
    for i, f in enumerate(sketches()):
        ns = "sk%03d" % i
        if f in HANGS:
            reg.append({"ns": ns, "file": f, "ok": False, "params": [], "why": "loops forever"})
            print("SKIP  %-58s loops forever" % f)
            continue
        text = read(os.path.join(ROOT, f))
        cands = [("define", m.group(1), m.group(2)) for m in DEFINE.finditer(text)
                 if m.group(1) not in SKIP]
        for rx, kind in ((GLOBAL, "global"), (LOCALSTATIC, "static")):
            for m in rx.finditer(text):
                n, v = m.group(1), m.group(2)
                if n in SKIP or any(c[1] == n for c in cands):
                    continue
                if never_written(text, n):
                    cands.append((kind, n, v))

        # start from the untouched sketch, then promote defines one at a time,
        # keeping only the promotions that still compile
        body_rel = "body_%s.cpp" % ns
        body_abs = os.path.join(GEN, body_rel)
        open(body_abs, "w", encoding="utf-8").write(text)
        unit = write_unit(ns, body_rel, [])
        if not compiles(unit):
            reg.append({"ns": ns, "file": f, "ok": False, "params": []})
            print("SKIP  %-58s does not compile" % f)
            continue

        promoted, body = [], text
        for kind, name, val in cands:
            if kind == "global":
                trial_body = body                      # nothing to rewrite
            elif kind == "define":
                trial_body = DEFINE.sub(
                    lambda m: "" if m.group(1) == name else m.group(0), body)
            else:
                trial_body = LOCALSTATIC.sub(
                    lambda m: "" if m.group(1) == name else m.group(0), body)
            if trial_body == body and kind != "global":
                continue
            open(body_abs, "w", encoding="utf-8").write(trial_body)
            write_unit(ns, body_rel, promoted + [(name, val, kind)])
            if compiles(unit):
                promoted.append((name, val, kind))
                body = trial_body
            else:
                open(body_abs, "w", encoding="utf-8").write(body)   # put it back
        open(body_abs, "w", encoding="utf-8").write(body)
        write_unit(ns, body_rel, promoted)
        reg.append({"ns": ns, "file": f, "ok": True,
                    "params": [{"k": n, "def": float(v), "kind": k}
                               for n, v, k in promoted]})
        print("ok    %-58s %d setting(s)%s" % (f, len(promoted),
              "  " + ", ".join(n for n, _, _ in promoted) if promoted else ""))

    json.dump(reg, open(os.path.join(HERE, "registry.json"), "w"), indent=1)
    n = sum(1 for r in reg if r["ok"])
    print("\n%d/%d sketches, %d settings promoted"
          % (n, len(reg), sum(len(r["params"]) for r in reg)))


main()
