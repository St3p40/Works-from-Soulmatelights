"""Write ../labels.js: the display name, note, frame time and setting ranges.

Names, notes and the hand-picked slider ranges are lifted out of effects.js
while it is still around. Once it goes, labels.js is the record - keep it, and
this script will leave anything it already knows about alone.
"""
import json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
DOCS = os.path.dirname(HERE)
meta = json.loads(open(os.path.join(HERE, "meta.js")).read().split("=", 1)[1].rstrip().rstrip(";"))

known, curated = {}, {}
old = os.path.join(DOCS, "labels.js")
if os.path.exists(old):
    for e in json.loads(open(old, encoding="utf-8").read().split("=", 1)[1].rstrip().rstrip(";")):
        known[e["file"]] = e
        curated[e["file"]] = {p["k"]: p for p in e["params"]}

eff = os.path.join(DOCS, "effects.js")
if os.path.exists(eff):
    s = open(eff, encoding="utf-8").read()
    for m in re.finditer(r'name:\s*"([^"]+)",\s*file:\s*"([^"]+)",\s*\n?\s*note:\s*"([^"]*)",\s*ms:\s*(\d+)', s):
        known.setdefault(m.group(2), {})
        known[m.group(2)].update({"name": m.group(1), "note": m.group(3), "ms": int(m.group(4))})
    for blk in s.split("\n  add({")[1:]:
        f = re.search(r'file:\s*"([^"]+)"', blk).group(1)
        pm = re.search(r'\n    params: \[(.*?)\],\n', blk, re.S)
        if not pm:
            continue
        for pmm in re.finditer(r'\{\s*k:\s*"(\w+)",\s*label:\s*"([^"]*)"(.*?)\}', pm.group(1), re.S):
            d = {"label": pmm.group(2)}
            for key in ("min", "max", "step"):
                v = re.search(r'\b%s:\s*(-?[\d.]+)' % key, pmm.group(3))
                if v:
                    d[key] = float(v.group(1))
            o = re.search(r'opts:\s*\[([^\]]*)\]', pmm.group(3))
            if o:
                d["opts"] = re.findall(r'"([^"]*)"', o.group(1))
            curated.setdefault(f, {})[pmm.group(1)] = d

TOGGLE = {"subpixel", "subpix", "sub", "regime", "clr", "bounce", "board", "rot",
          "lamp", "broad", "color", "gravityx", "gravityy", "genposvar", "shift_hue"}

out = []
for sk in meta:
    f = sk["file"]
    K = known.get(f, {})
    cp = curated.get(f, {})
    params = []
    for p in sk["params"]:
        k, d = p["k"], p["def"]
        c = cp.get(k, {})
        q = {"k": k, "label": c.get("label", k), "def": d}
        if "opts" in c:
            q["opts"] = c["opts"]
        elif "min" in c and "max" in c:
            q["min"], q["max"] = c["min"], c["max"]
            if "step" in c:
                q["step"] = c["step"]
        elif d in (0, 1) and k.lower() in TOGGLE:
            q["opts"] = ["Off", "On"]
        elif float(d).is_integer():
            q["min"], q["max"] = int(min(0, d * 2)), int(max(1, abs(d) * 4, d + 1))
        else:
            q["min"], q["max"], q["step"] = 0, round(abs(d) * 4, 3), 0.05
        params.append(q)
    out.append({"file": f,
                "name": K.get("name", os.path.basename(f)[:-4]),
                "note": K.get("note", ""),
                "ms": K.get("ms", 16),
                "params": params})

open(os.path.join(DOCS, "labels.js"), "w", encoding="utf-8").write(
    "/* Generated - display names, notes, frame time and setting ranges.\n"
    "   Regenerate with docs/wasm/build.sh; hand edits to labels survive. */\n"
    "var SKETCH_LABELS = " + json.dumps(out, ensure_ascii=False, indent=0) + ";\n")
print("labels.js: %d sketches, %d settings" % (len(out), sum(len(s["params"]) for s in out)))
