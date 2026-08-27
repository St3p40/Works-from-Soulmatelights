"""Collect the .cpp sources referenced by effects.js into sources.js.

    python3 docs/build_sources.py docs

Run it after adding a sketch, and after moving or renaming one: any path in
effects.js that no longer exists is looked up by filename in the repository
and rewritten in place when the match is unambiguous.

It also watches for drift. effects.js is a hand port, so editing a .cpp does
not change what the page animates - only the source text shown beside it. That
mismatch is invisible: the detail view shows the new code next to a canvas
running the old logic. So the hash of every .cpp is kept in ported.json, and a
file that has changed since its port was last confirmed is reported as DRIFT.

Once you have ported the change, confirm it:

    python3 docs/build_sources.py docs --ported "Testing stuff/Worley Noise.cpp"
    python3 docs/build_sources.py docs --ported all
"""
import hashlib, json, os, re, sys

args = sys.argv[1:]
confirm = []
if "--ported" in args:
    i = args.index("--ported")
    confirm = args[i + 1:]
    args = args[:i]
    if not confirm:
        sys.exit("--ported needs a .cpp path, or the word all")

here = os.path.abspath(args[0] if args else os.path.dirname(os.path.abspath(__file__)))
root = os.path.dirname(here)
eff_path = os.path.join(here, "effects.js")
eff = open(eff_path, encoding="utf-8").read()
listed = re.findall(r'file:\s*"([^"]+)"', eff)

# every .cpp in the repository, indexed by filename
index = {}
for dp, dn, fn in os.walk(root):
    if ".git" in dp.split(os.sep) or os.path.abspath(dp) == here:
        continue
    for f in fn:
        if f.endswith(".cpp"):
            index.setdefault(f, []).append(
                os.path.relpath(os.path.join(dp, f), root).replace(os.sep, "/"))

moved, missing = [], []
for f in listed:
    if os.path.exists(os.path.join(root, f)):
        continue
    found = index.get(os.path.basename(f), [])
    (moved if len(found) == 1 else missing).append((f, found))

ported_path = os.path.join(here, "ported.json")
try:
    ported = json.load(open(ported_path, encoding="utf-8"))
except (IOError, ValueError):
    ported = None                           # first run; seeded below

if moved:
    for old, found in moved:
        eff = eff.replace('file: "%s"' % old, 'file: "%s"' % found[0])
        if ported and old in ported:        # a move is not a change
            ported[found[0]] = ported.pop(old)
        print("moved:  %s  ->  %s" % (old, found[0]))
    open(eff_path, "w", encoding="utf-8").write(eff)
    listed = re.findall(r'file:\s*"([^"]+)"', eff)

for f, found in missing:
    print("MISSING: %s%s" % (f, "  (several matches: %s)" % ", ".join(found) if found else ""))

unlisted = sorted(set(sum(index.values(), [])) - set(listed))
for f in unlisted:
    print("not on the page yet: %s" % f)

out = {}
for f in listed:
    raw = open(os.path.join(root, f), "rb").read()
    try:
        txt = raw.decode("utf-8")
    except UnicodeDecodeError:
        txt = raw.decode("cp1251")          # a few sketches carry cp1251 comments
    out[f] = txt.replace("\r\n", "\n").rstrip() + "\n"

# ------------------------------------------------------------------- drift
digest = dict((f, hashlib.sha1(t.encode("utf-8")).hexdigest()) for f, t in out.items())

if ported is None:
    ported = dict(digest)
    print("ported.json seeded: %d sketches recorded as up to date" % len(ported))
elif confirm == ["all"]:
    ported = dict(digest)
    print("ported.json: all %d sketches confirmed" % len(ported))
elif confirm:
    for f in confirm:
        f = f.replace(os.sep, "/").lstrip("./")
        if f not in digest:
            print("--ported: %s is not a sketch on the page" % f)
        else:
            ported[f] = digest[f]
            print("confirmed: %s" % f)

drift = sorted(f for f in digest if f in ported and ported[f] != digest[f])
new = sorted(f for f in digest if f not in ported)
for f in new:
    ported[f] = digest[f]
for f in drift:
    print("DRIFT:  %s changed since its port was confirmed" % f)
for f in sorted(set(ported) - set(digest)):
    del ported[f]                           # dropped from the page

with open(ported_path, "w", encoding="utf-8") as fh:
    json.dump(ported, fh, ensure_ascii=False, indent=0, sort_keys=True)
    fh.write("\n")

header = ("/* Generated file - the .cpp sources shown in the panel detail view.\n"
          "   Regenerate after editing, adding or moving a sketch:\n"
          "       python3 docs/build_sources.py docs */\n")
with open(os.path.join(here, "sources.js"), "w", encoding="utf-8") as fh:
    fh.write(header + "var SOURCES = " + json.dumps(out, ensure_ascii=False, indent=0) + ";\n")
print("%d sketches, %d chars%s" % (len(out), sum(len(v) for v in out.values()),
      ", %d DRIFT" % len(drift) if drift else ""))
sys.exit(1 if drift else 0)
