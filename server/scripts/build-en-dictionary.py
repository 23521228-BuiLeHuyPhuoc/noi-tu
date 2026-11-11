"""Build English word list and Vietnamese definitions for English Word Chain.

Sources:
1. Wiktionary tiếng Việt (kaikki.org/viwiktionary, lang_code == "en", CC BY-SA 4.0)
2. StarDict Anh–Việt (catusf/tudien: TudienAnhVietBeta.tab & star_anhviet.tab, GPL)
3. ENABLE1 & Popular English wordlists (dolph/dictionary, Public Domain)
"""
from __future__ import annotations
import gzip
import json
from pathlib import Path
import re
import sys
import unicodedata

WORD_RE = re.compile(r"^[a-z]{2,}$")
DATA_DIR = Path(__file__).resolve().parents[1] / "data"


def clean_text(value: str) -> str:
    text = unicodedata.normalize("NFC", value)
    text = re.sub(r"<[^>]+>|\{\{[^}]*\}\}", " ", text)
    text = re.sub(r"\s+", " ", text).strip(" ;,.-")
    return text


def parse_beta(raw: str) -> str | None:
    main = raw.split("•")[0]
    lines = [line.strip() for line in main.split("<br>")]
    ipa = ""
    if lines and lines[0].startswith("/") and lines[0].endswith("/") and len(lines[0]) <= 40:
        ipa = lines[0]
    glosses: list[str] = []
    for line in lines:
        if line.startswith("-"):
            g = clean_text(line.lstrip("-").strip())
            if g and len(g) >= 2 and not g.lower().startswith("(xem)"):
                glosses.append(g)
                if len(glosses) >= 3:
                    break
    if not glosses:
        return None
    body = "; ".join(glosses)
    return f"{ipa} {body}".strip()[:240] if ipa else body[:240]


def parse_av(raw: str) -> str | None:
    main = re.split(r"\s![A-Za-z]|\s@Chuyên ngành", raw)[0]
    main = re.sub(r"=[^-+@!*]+\+[^-*@!]+", " ", main)
    parts = re.split(r"\s+-\s*|^-\s*", main)
    glosses: list[str] = []
    for part in parts[1:]:
        part = re.sub(
            r"\*\s*(danh từ|ngoại động từ|nội động từ|động từ|tính từ|phó từ|giới từ|liên từ|thán từ|mạo từ|đại từ).*$",
            "",
            part,
        ).strip()
        g = clean_text(part)
        if g and len(g) >= 2 and not g.lower().startswith("(xem)"):
            glosses.append(g)
            if len(glosses) >= 3:
                break
    if not glosses:
        return None
    return "; ".join(glosses)[:240]


def strip_ipa(defn: str) -> str:
    return re.sub(r"^/[^/]+/\s*", "", defn).strip()


def find_lemma(word: str, defs: dict[str, str]) -> tuple[str, str] | None:
    """Return (label, base_word) for common English inflections."""
    candidates: list[tuple[str, str]] = []
    if word.endswith("ies") and len(word) > 4:
        candidates.append(("số nhiều/chia của", word[:-3] + "y"))
    if word.endswith("ves") and len(word) > 4:
        candidates.append(("số nhiều của", word[:-3] + "f"))
        candidates.append(("số nhiều của", word[:-3] + "fe"))
    if word.endswith("es") and len(word) > 3:
        candidates.append(("số nhiều/chia của", word[:-2]))
        candidates.append(("số nhiều/chia của", word[:-1]))
    if word.endswith("s") and not word.endswith("ss") and len(word) > 2:
        candidates.append(("số nhiều/chia của", word[:-1]))
    if word.endswith("ied") and len(word) > 4:
        candidates.append(("quá khứ của", word[:-3] + "y"))
    if word.endswith("ed") and len(word) > 3:
        base = word[:-2]
        candidates.append(("quá khứ của", base))
        candidates.append(("quá khứ của", word[:-1]))
        if len(base) >= 3 and base[-1] == base[-2]:
            candidates.append(("quá khứ của", base[:-1]))
    if word.endswith("ing") and len(word) > 4:
        base = word[:-3]
        candidates.append(("dạng V-ing của", base))
        candidates.append(("dạng V-ing của", base + "e"))
        if len(base) >= 3 and base[-1] == base[-2]:
            candidates.append(("dạng V-ing của", base[:-1]))
    if word.endswith("ier") and len(word) > 4:
        candidates.append(("so sánh hơn của", word[:-3] + "y"))
    if word.endswith("er") and len(word) > 3:
        base = word[:-2]
        candidates.append(("so sánh hơn/danh từ của", base))
        candidates.append(("so sánh hơn/danh từ của", word[:-1]))
        if len(base) >= 3 and base[-1] == base[-2]:
            candidates.append(("so sánh hơn của", base[:-1]))
    if word.endswith("iest") and len(word) > 5:
        candidates.append(("so sánh nhất của", word[:-4] + "y"))
    if word.endswith("est") and len(word) > 4:
        base = word[:-3]
        candidates.append(("so sánh nhất của", base))
        candidates.append(("so sánh nhất của", word[:-2]))
        if len(base) >= 3 and base[-1] == base[-2]:
            candidates.append(("so sánh nhất của", base[:-1]))
    if word.endswith("ly") and len(word) > 3:
        candidates.append(("trạng từ của", word[:-2]))
        if word.endswith("ily") and len(word) > 4:
            candidates.append(("trạng từ của", word[:-3] + "y"))

    for label, base in candidates:
        if base in defs:
            return label, base
    return None


def main() -> None:
    src_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else DATA_DIR / "sources"
    words: set[str] = set()
    defs: dict[str, str] = {}

    beta_path = src_dir / "anhvietbeta.tab"
    if beta_path.exists():
        for line in beta_path.read_text("utf-8", "ignore").splitlines():
            if "\t" not in line:
                continue
            w, raw = line.split("\t", 1)
            w = w.strip().lower()
            if WORD_RE.match(w):
                words.add(w)
                if w not in defs:
                    d = parse_beta(raw)
                    if d:
                        defs[w] = d

    av_path = src_dir / "anhviet.tab"
    if av_path.exists():
        for line in av_path.read_text("utf-8", "ignore").splitlines():
            if "\t" not in line:
                continue
            w, raw = line.split("\t", 1)
            w = w.strip().lower()
            if WORD_RE.match(w):
                words.add(w)
                if w not in defs:
                    d = parse_av(raw)
                    if d:
                        defs[w] = d

    kaikki_path = src_dir / "kaikki-vi.jsonl.gz"
    if kaikki_path.exists():
        with gzip.open(kaikki_path, "rt", encoding="utf-8") as f:
            for line in f:
                entry = json.loads(line)
                if entry.get("lang_code") != "en":
                    continue
                w = entry.get("word", "").strip().lower()
                if not WORD_RE.match(w):
                    continue
                words.add(w)
                if w in defs:
                    continue
                glosses: list[str] = []
                for sense in entry.get("senses", []):
                    if "no-gloss" in sense.get("tags", []):
                        continue
                    for g in sense.get("glosses", []):
                        t = clean_text(g)
                        if t and 2 <= len(t) <= 240 and not re.match(r"^[Xx]em\s", t):
                            glosses.append(t)
                            if len(glosses) >= 3:
                                break
                    if len(glosses) >= 3:
                        break
                if glosses:
                    defs[w] = "; ".join(glosses)[:240]

    for fname in ("enable1.txt", "popular.txt"):
        p = src_dir / fname
        if p.exists():
            for line in p.read_text("utf-8", "ignore").splitlines():
                w = line.strip().lower()
                if WORD_RE.match(w):
                    words.add(w)

    # Resolve cross-references like "(như) teat" -> include target meaning
    for w, text in list(defs.items()):
        m = re.search(r"\(như\)\s+([a-z]{2,})", text, flags=re.IGNORECASE)
        if m:
            target = m.group(1).lower()
            if target in defs:
                target_meaning = strip_ipa(defs[target]).split(";")[0].strip()
                defs[w] = text.replace(m.group(0), target_meaning)[:240]

    # Populate definitions for short or popular inflected words directly
    popular: set[str] = set()
    pop_path = src_dir / "popular.txt"
    if pop_path.exists():
        popular = {
            w.strip().lower()
            for w in pop_path.read_text("utf-8", "ignore").splitlines()
            if WORD_RE.match(w.strip().lower())
        }

    base_defs = dict(defs)
    for w in sorted(words):
        if w in defs:
            continue
        if len(w) <= 6 or w in popular:
            res = find_lemma(w, base_defs)
            if res:
                label, base = res
                defs[w] = f"({label} {base}) {strip_ipa(base_defs[base])}"[:240]

    sorted_words = sorted(words)
    (DATA_DIR / "words-en.txt").write_text("\n".join(sorted_words) + "\n", encoding="utf-8", newline="\n")

    sorted_defs = {k: defs[k] for k in sorted(defs) if k in words and len(defs[k]) >= 4}
    out_json = json.dumps(sorted_defs, ensure_ascii=False, separators=(",", ":")) + "\n"
    (DATA_DIR / "definitions-en.json").write_text(out_json, encoding="utf-8", newline="\n")

    for name, title in (
        ("extra-words-en.txt", "Từ tiếng Anh bổ sung thêm vào kho"),
        ("banned-words-en.txt", "Từ tiếng Anh bị loại khỏi kho"),
    ):
        p = DATA_DIR / name
        if not p.exists():
            p.write_text(
                f"# {title}\n# Mỗi dòng một từ đơn tiếng Anh (a-z). Dòng bắt đầu bằng # bị bỏ qua.\n",
                encoding="utf-8",
                newline="\n",
            )

    print(
        json.dumps(
            {
                "words_en": len(sorted_words),
                "definitions_en": len(sorted_defs),
                "coverage_percent": round(100 * len(sorted_defs) / len(sorted_words), 2),
                "words_bytes": (DATA_DIR / "words-en.txt").stat().st_size,
                "defs_bytes": (DATA_DIR / "definitions-en.json").stat().st_size,
                "sample_art": sorted_defs.get("art"),
                "sample_tits": sorted_defs.get("tits"),
                "sample_sex": sorted_defs.get("sex"),
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
