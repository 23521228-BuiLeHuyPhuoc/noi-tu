"""Build attributed Vietnamese glosses from Kaikki's Vietnamese Wiktionary dump.

Usage: python server/scripts/build-definitions.py path/to/raw-wiktextract-data.jsonl.gz
Add --download to fetch that file from Kaikki first. The downloaded dump is not
checked in. Identical input bytes and words.txt produce identical output bytes.
"""
import argparse
import gzip
import hashlib
import json
from pathlib import Path
import re
import unicodedata
import urllib.parse
import urllib.request

SOURCE_URL = "https://kaikki.org/viwiktionary/raw-wiktextract-data.jsonl.gz"
DATA = Path(__file__).resolve().parents[1] / "data"


def normalize(value):
    return " ".join(unicodedata.normalize("NFC", value).lower().split())


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as source:
        while chunk := source.read(1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()


def build(path):
    words = {normalize(w) for w in (DATA / "words.txt").read_text(encoding="utf-8").splitlines() if w and not w.startswith("#")}
    candidates = {}
    opener = gzip.open if path.suffix == ".gz" else open
    with opener(path, "rt", encoding="utf-8") as entries:
        for line in entries:
            entry = json.loads(line)
            if entry.get("lang_code") != "vi":
                continue
            word = normalize(entry.get("word", ""))
            if word not in words:
                continue
            for sense in entry.get("senses", []):
                if "no-gloss" in sense.get("tags", []):
                    continue
                for gloss in sense.get("glosses", []):
                    text = " ".join(unicodedata.normalize("NFC", gloss).split())
                    if not text or len(text) > 600 or re.search(r"<[^>]+>|\{\{", text):
                        continue
                    # Prefer actual explanations over variant/cross-reference senses.
                    cross_reference = bool(sense.get("form_of") or sense.get("alt_of"))
                    candidates.setdefault(word, []).append((cross_reference, text, entry["word"]))
    definitions = {}
    for word in sorted(candidates):
        _, (_, text, original) = min(enumerate(candidates[word]), key=lambda pair: (pair[1][0], len(pair[1][1]) > 350, pair[0]))
        title = urllib.parse.quote(original.replace(" ", "_"), safe="")
        definitions[word] = {"text": text, "source": f"Wiktionary tiếng Việt · CC BY-SA 4.0 · https://vi.wiktionary.org/wiki/{title}"}
    output = json.dumps(definitions, ensure_ascii=False, indent=2) + "\n"
    assert all(w in words and w == normalize(w) and d["text"] and d["source"] for w, d in definitions.items())
    assert len(output.encode("utf-8")) < 15_000_000
    (DATA / "definitions.json").write_text(output, encoding="utf-8", newline="\n")
    print(json.dumps({"definitions": len(definitions), "words": len(words), "coverage_percent": round(100 * len(definitions) / len(words), 2), "output_bytes": len(output.encode("utf-8")), "source_sha256": sha256(path)}, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("dump", type=Path)
    parser.add_argument("--download", action="store_true")
    args = parser.parse_args()
    if args.download:
        args.dump.parent.mkdir(parents=True, exist_ok=True)
        with urllib.request.urlopen(SOURCE_URL, timeout=180) as response, args.dump.open("wb") as target:
            while chunk := response.read(1024 * 1024):
                target.write(chunk)
    build(args.dump)
