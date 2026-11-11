"""Dựng kho từ tiếng Anh + giải nghĩa tiếng Việt cho game Nối từ Anh.

Chỉ dùng nguồn có uy tín, ghi rõ giấy phép (xem server/data/DEFINITIONS-SOURCES.md):

Kho từ hợp lệ (words-en.txt) = hợp của
  1. SCOWL cỡ 70 "large" (Kevin Atkinson, wordlist.aspell.net) — danh sách dùng cho bộ kiểm tra chính tả aspell/hunspell.
  2. ENABLE1 (public domain) — kho từ chuẩn của các game chữ.
  3. Princeton WordNet 2.0 — chỉ lấy mục viết thường một từ.
  4. Wiktionary tiếng Việt (Kaikki/Wiktextract) — mục tiếng Anh viết thường, bỏ tên riêng/viết tắt.
  5. Từ điển Anh–Việt FVDP (Hồ Ngọc Đức, StarDict star_anhviet) — mục viết thường một từ.
  Chỉ nhận chuỗi a–z, ít nhất 2 chữ, viết thường ngay trong nguồn (tên riêng, viết tắt viết hoa bị loại).
  Không còn dùng danh sách "TudienAnhVietBeta"/"popular" làm nguồn từ (lẫn nhiều tên riêng và viết tắt bị hạ chữ thường).

Giải nghĩa (definitions-en.json), theo thứ tự ưu tiên:
  1. Wiktionary tiếng Việt: nghĩa theo từ loại (danh từ, động từ, tính từ…), phiên âm IPA, quan hệ biến thể
     (số nhiều, quá khứ, V-ing…) lấy từ trường form_of / lời giải "… của X".
  2. FVDP: tách theo từ loại, bỏ ví dụ.
  3. Động từ bất quy tắc (SPDict) và biến thể quy tắc (-s, -es, -ed, -ing, -er, -est, -ly) — chỉ khi gốc từ
     là từ hợp lệ có nghĩa và chính biến thể có trong SCOWL/ENABLE.
  4. TudienAnhVietBeta: chỉ dùng phiên âm IPA và làm nghĩa dự phòng cuối cùng (bỏ nhãn "(Econ)", viết tắt).
  Biến thể lưu dạng tham chiếu "@gốc|nhãn" để server ghép nghĩa của gốc (đỡ phình dung lượng).

Cách chạy (Python 3.10+):
  python server/scripts/build-en-dictionary.py <thư mục nguồn>
Thư mục nguồn cần: scowl70.txt, scowl35.txt, enable1.txt, wordnet.tab(.bz2), kaikki-vi.jsonl.gz,
anhviet.tab, anhvietbeta.tab, irregular.tab (xem fetch-sources-en.sh).
"""
from __future__ import annotations

import bz2
import gzip
import json
import re
import sys
import unicodedata
from pathlib import Path

WORD_RE = re.compile(r"^[a-z]{2,}$")
DATA_DIR = Path(__file__).resolve().parents[1] / "data"

POS_VI = {
    "noun": "danh từ", "verb": "động từ", "adj": "tính từ", "adv": "trạng từ", "prep": "giới từ",
    "conj": "liên từ", "pron": "đại từ", "intj": "thán từ", "det": "hạn định từ", "article": "mạo từ",
    "num": "số từ", "particle": "tiểu từ", "contraction": "dạng rút gọn",
}
FVDP_POS = [
    ("ngoại động từ", "động từ"), ("nội động từ", "động từ"), ("trợ động từ", "động từ"), ("động từ", "động từ"),
    ("danh từ", "danh từ"), ("tính từ", "tính từ"), ("phó từ", "trạng từ"), ("trạng từ", "trạng từ"),
    ("giới từ", "giới từ"), ("liên từ", "liên từ"), ("đại từ", "đại từ"), ("thán từ", "thán từ"),
    ("mạo từ", "mạo từ"), ("số từ", "số từ"),
]
SKIP_POS = {"name", "abbrev", "phrase", "proverb", "prefix", "suffix", "affix", "infix", "symbol", "character", "unknown"}
SKIP_TAGS = {"abbreviation", "initialism", "acronym", "misspelling", "no-gloss"}

MAX_SENSE = 80
MAX_TEXT = 260


def clean(text: str) -> str:
    t = unicodedata.normalize("NFC", text)
    t = re.sub(r"<[^>]+>|\{\{[^}]*\}\}|\[\[|\]\]", " ", t)
    t = re.sub(r"\s+", " ", t).strip(" ;,.-:")
    return t


def lower_first(t: str) -> str:
    # "Con mèo" -> "con mèo", "(giải phẫu học) Đầu vú" -> "(giải phẫu học) đầu vú"; giữ chữ viết tắt ("UNESCO")
    m = re.match(r"^((?:\([^)]*\)\s*)*)(.*)$", t)
    head, rest = (m.group(1), m.group(2)) if m else ("", t)
    if len(rest) >= 2 and rest[0].isupper() and rest[1].islower():
        rest = rest[0].lower() + rest[1:]
    return head + rest


def short(t: str, n: int = MAX_SENSE) -> str:
    if len(t) <= n:
        return t
    cut = t[:n]
    sp = max(cut.rfind(";"), cut.rfind(","), cut.rfind(" "))
    return (cut[:sp] if sp > n // 2 else cut).rstrip(" ,;") + "…"


def fmt_blocks(blocks: list[tuple[str, list[str]]], max_pos: int = 3, per_pos: int = 2, limit: int = MAX_TEXT) -> str:
    parts: list[str] = []
    for pos, senses in blocks[:max_pos]:
        uniq: list[str] = []
        for s in senses:
            if s and s.lower() not in (u.lower() for u in uniq):
                uniq.append(s)
            if len(uniq) >= per_pos:
                break
        if uniq:
            parts.append(f"({pos}) " + "; ".join(short(s) for s in uniq))
    text = " · ".join(parts)
    return short(text, limit) if len(text) > limit else text


def merge_pos(blocks: list[tuple[str, list[str]]]) -> list[tuple[str, list[str]]]:
    out: dict[str, list[str]] = {}
    for pos, senses in blocks:
        out.setdefault(pos, []).extend(senses)
    return [(p, s) for p, s in out.items() if s]


# ---------- kho từ ----------

def read_lines(p: Path) -> list[str]:
    if not p.exists():
        return []
    return p.read_text("utf-8", "ignore").splitlines()


def scowl(p: Path) -> set[str]:
    lines = read_lines(p)
    # app.aspell.net ghi phần mô tả ở đầu, kết thúc bằng dòng "---"
    head = next((i for i, x in enumerate(lines[:80]) if x.strip() == "---"), -1)
    # chỉ giữ mục viết thường a–z: bỏ tên riêng (viết hoa) và dạng sở hữu ('s)
    return {w.strip() for w in lines[head + 1:] if WORD_RE.match(w.strip())}


def wordnet_lemmas(src: Path) -> set[str]:
    p = src / "wordnet.tab"
    if not p.exists() and (src / "wordnet.tab.bz2").exists():
        p.write_bytes(bz2.decompress((src / "wordnet.tab.bz2").read_bytes()))
    return {line.split("\t", 1)[0] for line in read_lines(p) if WORD_RE.match(line.split("\t", 1)[0])}


# ---------- Wiktionary tiếng Việt ----------

FORM_LABELS = [
    (r"ngôi thứ ba số ít", "ngôi 3 số ít của"),
    (r"phân từ hiện tại|danh động từ|gerund", "dạng V-ing của"),
    (r"quá khứ và phân từ quá khứ|quá khứ đơn và phân từ quá khứ|quá khứ và quá khứ phân từ", "quá khứ và phân từ II của"),
    (r"phân từ quá khứ", "phân từ II của"),
    (r"quá khứ", "quá khứ của"),
    (r"số nhiều", "số nhiều của"),
    (r"so sánh hơn", "so sánh hơn của"),
    (r"so sánh nhất", "so sánh nhất của"),
    (r"dạng viết khác|dạng thay thế|dạng chính tả", "cách viết khác của"),
]


def form_label(gloss: str) -> str | None:
    g = gloss.lower()
    for pat, label in FORM_LABELS:
        if re.search(pat, g):
            return label
    return None


def load_wiktionary(path: Path):
    """trả về (words, blocks, forms, ipa)"""
    words: set[str] = set()
    blocks: dict[str, list[tuple[str, list[str]]]] = {}
    forms: dict[str, tuple[str, str]] = {}
    ipa: dict[str, str] = {}
    if not path.exists():
        return words, blocks, forms, ipa
    with gzip.open(path, "rt", encoding="utf-8") as f:
        for line in f:
            e = json.loads(line)
            if e.get("lang_code") != "en":
                continue
            w = e.get("word", "")
            pos = e.get("pos") or ""
            if not WORD_RE.match(w) or pos in SKIP_POS:
                continue
            real: list[str] = []
            for s in e.get("senses", []):
                tags = set(s.get("tags", []))
                glosses = [clean(g) for g in s.get("glosses", []) if clean(g)]
                if not glosses or tags & SKIP_TAGS:
                    continue
                g = glosses[0]
                lemma = None
                if s.get("form_of"):
                    lemma = (s["form_of"][0].get("word") or "").strip()
                else:
                    m = re.search(r"của\s+([a-z]{2,})\.?$", g)
                    if m and len(g) <= 90 and form_label(g):
                        lemma = m.group(1)
                if lemma and WORD_RE.match(lemma) and lemma != w:
                    label = form_label(g)
                    # dạng cổ ("thou art" = be) hay biến thể lạ: không gắn nhãn, cũng không lấy làm nghĩa
                    if label and not re.search(r"cổ|lỗi thời|không còn dùng|không tiêu chuẩn", g.lower()) and not tags & {"archaic", "obsolete"}:
                        forms.setdefault(w, (lemma, label))
                    continue
                if "alt-of" in tags:
                    continue
                if re.match(r"^[Xx]em\s", g):
                    continue
                real.append(lower_first(g))
            if real:
                blocks.setdefault(w, []).append((POS_VI.get(pos, pos), real))
            if real or w in forms:
                words.add(w)
            if w not in ipa:
                for snd in e.get("sounds") or []:
                    v = (snd.get("ipa") or "").strip()
                    if v.startswith("/") and v.endswith("/") and 2 < len(v) <= 30:
                        ipa[w] = v
                        break
    return words, {w: merge_pos(b) for w, b in blocks.items()}, forms, ipa


# ---------- FVDP (star_anhviet) ----------

def parse_fvdp(raw: str) -> list[tuple[str, list[str]]]:
    out: list[tuple[str, list[str]]] = []
    # phần chuyên ngành (@...) ở cuối mục: bỏ
    main = re.split(r"\s@", raw)[0]
    for chunk in re.split(r"\*\s+", main):
        # thành ngữ (!...) nằm sau các nghĩa của từng từ loại: bỏ, giữ từ loại kế tiếp
        chunk = re.split(r"\s![A-Za-z]", chunk)[0].strip()
        if not chunk:
            continue
        pos = None
        for key, label in FVDP_POS:
            if chunk.startswith(key):
                pos = label
                chunk = chunk[len(key):]
                break
        if pos is None:
            continue
        senses = []
        for part in re.split(r"(?:^|\s)-\s+", chunk):
            part = re.sub(r"=[^=+]*\+[^=]*", " ", part)  # ví dụ "=câu+ nghĩa"
            g = clean(part)
            if g and len(g) >= 2 and not g.lower().startswith("(xem)") and not re.match(r"^[Xx]em\s", g):
                senses.append(g)
        if senses:
            out.append((pos, senses))
    return merge_pos(out)


def load_fvdp(path: Path):
    words: set[str] = set()
    blocks: dict[str, list[tuple[str, list[str]]]] = {}
    for line in read_lines(path):
        if "\t" not in line:
            continue
        w, raw = line.split("\t", 1)
        w = w.strip()
        if not WORD_RE.match(w):
            continue
        b = parse_fvdp(raw)
        if b:
            words.add(w)
            # một từ có thể có nhiều dòng (dòng danh từ, dòng động từ…): gộp lại
            blocks[w] = merge_pos(blocks.get(w, []) + b)
    return words, blocks


# ---------- TudienAnhVietBeta: chỉ IPA + nghĩa dự phòng ----------

def load_beta(path: Path):
    ipa: dict[str, str] = {}
    gloss: dict[str, str] = {}
    for line in read_lines(path):
        if "\t" not in line:
            continue
        w, raw = line.split("\t", 1)
        w = w.strip()
        if not WORD_RE.match(w):
            continue
        lines = [x.strip() for x in raw.split("•")[0].split("<br>")]
        if lines and re.fullmatch(r"/[^/]{1,28}/", lines[0]):
            ipa.setdefault(w, lines[0])
        gs = []
        for x in lines:
            if x.startswith("-"):
                g = clean(re.sub(r"^\((Econ|Tech|Toán|Tin)\)\s*", "", x.lstrip("-").strip()))
                if g and len(g) >= 2 and not g.lower().startswith("(xem)") and not re.match(r"^[Xx]em\s", g):
                    gs.append(g)
            if len(gs) >= 2:
                break
        if gs:
            gloss.setdefault(w, "; ".join(gs))
    return ipa, gloss


def load_irregular(path: Path) -> dict[str, tuple[str, str]]:
    forms: dict[str, tuple[str, str]] = {}
    for line in read_lines(path):
        if "\t" not in line:
            continue
        base, rest = line.split("\t", 1)
        base = base.strip()
        if not WORD_RE.match(base):
            continue
        cols = [c.strip() for c in rest.split("|")]
        past = {x.strip() for x in cols[0].split(",")} if cols else set()
        pp = {x.strip() for x in cols[1].split(",")} if len(cols) > 1 else set()
        for f in past | pp:
            if WORD_RE.match(f) and f != base:
                label = "quá khứ và phân từ II của" if f in past and f in pp else ("quá khứ của" if f in past else "phân từ II của")
                forms.setdefault(f, (base, label))
    return forms


def regular_lemma(w: str, ok, relaxed=lambda base: False) -> tuple[str, str] | None:
    """biến thể quy tắc -> (gốc, nhãn); `ok(gốc)` trả về các từ loại của gốc (None nếu gốc không có nghĩa).
    `relaxed(gốc)`: cả gốc lẫn biến thể đều có trong SCOWL thì vẫn nhận dù nguồn chưa ghi gốc là động từ/tính từ."""
    c: list[tuple[str, str]] = []
    if w.endswith("ies") and len(w) > 4:
        c.append((w[:-3] + "y", "s"))
    if re.search(r"(s|x|z|ch|sh|o)es$", w) and len(w) > 4:
        c.append((w[:-2], "s"))
    if w.endswith("s") and not w.endswith(("ss", "us", "is")) and len(w) > 3:
        c.append((w[:-1], "s"))
    if w.endswith("ied") and len(w) > 4:
        c.append((w[:-3] + "y", "ed"))
    if w.endswith("ed") and len(w) > 4:
        b = w[:-2]
        c += [(b, "ed"), (w[:-1], "ed")]
        if len(b) >= 3 and b[-1] == b[-2]:
            c.append((b[:-1], "ed"))
    if w.endswith("ing") and len(w) > 5:
        b = w[:-3]
        c += [(b, "ing"), (b + "e", "ing")]
        if len(b) >= 3 and b[-1] == b[-2]:
            c.append((b[:-1], "ing"))
    if w.endswith("ier") and len(w) > 4:
        c.append((w[:-3] + "y", "er"))
    if w.endswith("er") and len(w) > 4:
        b = w[:-2]
        c += [(b, "er"), (w[:-1], "er")]
        if len(b) >= 3 and b[-1] == b[-2]:
            c.append((b[:-1], "er"))
    if w.endswith("iest") and len(w) > 5:
        c.append((w[:-4] + "y", "est"))
    if w.endswith("est") and len(w) > 5:
        b = w[:-3]
        c += [(b, "est"), (w[:-2], "est")]
        if len(b) >= 3 and b[-1] == b[-2]:
            c.append((b[:-1], "est"))
    if w.endswith("ily") and len(w) > 4:
        c.append((w[:-3] + "y", "ly"))
    if w.endswith("ly") and len(w) > 4:
        c.append((w[:-2], "ly"))
    for base, kind in c:
        r = ok(base)
        if not r:
            continue
        poses = r
        if kind == "s":
            label = "số nhiều của" if "danh từ" in poses and "động từ" not in poses else (
                "ngôi 3 số ít của" if "động từ" in poses and "danh từ" not in poses else "số nhiều / ngôi 3 số ít của")
        elif kind == "ed":
            if "động từ" not in poses and not relaxed(base):
                continue
            label = "quá khứ và phân từ II của"
        elif kind == "ing":
            if "động từ" not in poses and not relaxed(base):
                continue
            label = "dạng V-ing của"
        elif kind in ("er", "est"):
            if "tính từ" not in poses and "trạng từ" not in poses:
                continue
            label = "so sánh hơn của" if kind == "er" else "so sánh nhất của"
        else:
            if "tính từ" not in poses and not relaxed(base):
                continue
            label = "trạng từ của"
        return base, label
    return None


VARIANT_RULES = [
    (r"or(s|ed|ing|ful|less|able|al|ally|ite|ites|ist|ists|ism)?$", r"our"),  # color -> colour, behavioral -> behavioural
    (r"er(s)?$", r"re"),                                  # theater -> theatre, center -> centre
    (r"iz(e|es|ed|ing|ation|ations|er|ers)$", r"is"),     # realize -> realise
    (r"yz(e|es|ed|ing)$", r"ys"),                         # analyze -> analyse
    (r"og(s)?$", r"ogue"),                                # catalog -> catalogue
    (r"ense(s)?$", r"ence"),                              # defense -> defence
    (r"el(ed|ing|er|ers)$", r"ell"),                      # traveled -> travelled
    (r"^arche", "archae"), (r"^ane", "anae"), (r"^ped", "paed"), (r"^ency", "encyc"), (r"^fet", "foet"),
    (r"e(s)?$", r""), (r"(s)?$", r"e"),                 # axe/ax, judgement/judgment ở cuối
    (r"que(s|d)?$", r"cue"),                              # barbeque -> barbecue
    (r"([^aeiou])ll", r"l"), (r"([aeiou])l([aeiou])", r"ll"),
]


def variant_of(w: str, ok) -> str | None:
    """cách viết khác (Mỹ/Anh) đã có nghĩa: color -> colour, archeology -> archaeology"""
    for pat, sub in VARIANT_RULES:
        v = re.sub(pat, sub, w, count=1)
        if v != w and ok(v):
            return v
    return None


def main() -> None:
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else DATA_DIR / "sources"
    s70 = scowl(src / "scowl70.txt")
    s35 = scowl(src / "scowl35.txt")
    enable = {w.strip() for w in read_lines(src / "enable1.txt") if WORD_RE.match(w.strip())}
    wn = wordnet_lemmas(src)
    wk_words, wk_blocks, wk_forms, wk_ipa = load_wiktionary(src / "kaikki-vi.jsonl.gz")
    fv_words, fv_blocks = load_fvdp(src / "anhviet.tab")
    beta_ipa, beta_gloss = load_beta(src / "anhvietbeta.tab")
    irregular = load_irregular(src / "irregular.tab")

    # "(như) teat" -> nghĩa đầu tiên của teat (giữ chữ gốc trong ngoặc cho rõ)
    def resolve_cross(blocks: dict[str, list[tuple[str, list[str]]]]) -> None:
        for w, bl in blocks.items():
            for _, senses in bl:
                for i, g in enumerate(senses):
                    m = re.search(r"\((?:như|cũng như)\)\s+([a-z]{2,})", g)
                    if not m:
                        continue
                    target = wk_blocks.get(m.group(1)) or fv_blocks.get(m.group(1))
                    if target and m.group(1) != w:
                        first = target[0][1][0]
                        senses[i] = (g[:m.start()] + f"{first} (như {m.group(1)})" + g[m.end():]).strip()

    resolve_cross(wk_blocks)
    resolve_cross(fv_blocks)

    words = s70 | enable | wn | wk_words | fv_words
    attested = s70 | enable  # biến thể quy tắc phải có trong danh sách chính tả

    def blocks_of(w: str):
        return wk_blocks.get(w) or fv_blocks.get(w)

    def poses_of(w: str) -> set[str] | None:
        b = blocks_of(w)
        if not b:
            return None
        return {p for p, _ in (wk_blocks.get(w) or [])} | {p for p, _ in (fv_blocks.get(w) or [])}

    defs: dict[str, str] = {}
    stats = {"wiktionary": 0, "fvdp": 0, "form_ref": 0, "beta": 0}
    for w in sorted(words):
        form = wk_forms.get(w) or irregular.get(w)
        # FVDP hay chép nguyên mục của gốc từ vào biến thể (took = take, mice = mouse): biến thể đã biết thì
        # chỉ dùng nghĩa riêng của Wiktionary (vd "left" vừa là quá khứ của leave vừa là "bên trái")
        b = wk_blocks.get(w) if form else blocks_of(w)
        ipa = wk_ipa.get(w) or ("" if form else beta_ipa.get(w, ""))
        if not form and not b and w in attested:
            form = regular_lemma(
                w, lambda base: poses_of(base) if base in words else None,
                relaxed=lambda base: w in s70 and base in s70,
            )
        if form and not (blocks_of(form[0]) and form[0] in words and form[0] != w):
            # gốc từ không có nghĩa: dùng nghĩa riêng (nếu có) như từ thường
            form = None
            b = b or blocks_of(w)
        text: str | None = None
        if form:
            lemma, label = form
            if not b:
                # chỉ là biến thể: server ghép "(nhãn gốc) nghĩa của gốc"
                defs[w] = f"@{lemma}|{label}"
                stats["form_ref"] += 1
                continue
            body = fmt_blocks(b, max_pos=2, per_pos=2, limit=MAX_TEXT - 40)
            # biến thể bất quy tắc (left/leave, better/good): ghi nhãn trước; quy tắc (evening/even): ghi sau
            text = f"{body} · (còn là {label} {lemma})" if w.startswith(lemma[:-1] or lemma) else f"({label} {lemma}) {body}"
        elif b:
            text = fmt_blocks(b)
        elif w in attested and (v := variant_of(w, lambda x: x in words and bool(blocks_of(x)))):
            defs[w] = f"@{v}|cách viết khác của"
            stats["variant_ref"] = stats.get("variant_ref", 0) + 1
            continue
        elif w in beta_gloss:
            text = short(beta_gloss[w], 160)
            stats["beta"] += 1
        if not text:
            continue
        if w in wk_blocks:
            stats["wiktionary"] += 1
        elif w in fv_blocks:
            stats["fvdp"] += 1
        defs[w] = f"{ipa} {text}".strip() if ipa else text

    # sửa tay một số mục nguồn ghi sai (xem definitions-en-fixes.json)
    fixes_path = DATA_DIR / "definitions-en-fixes.json"
    if fixes_path.exists():
        for w, text in json.loads(fixes_path.read_text("utf-8")).items():
            if w.startswith("_"):
                continue
            words.add(w)
            defs[w] = text

    sorted_words = sorted(words)
    (DATA_DIR / "words-en.txt").write_text("\n".join(sorted_words) + "\n", encoding="utf-8", newline="\n")
    common = sorted(w for w in s35 if w in words and len(w) >= 3)
    (DATA_DIR / "common-en.txt").write_text(
        "# Từ tiếng Anh thông dụng (SCOWL cỡ 35): ưu tiên khi cứu trợ và chọn từ mở đầu\n" + "\n".join(common) + "\n",
        encoding="utf-8", newline="\n",
    )
    out = json.dumps({k: defs[k] for k in sorted(defs)}, ensure_ascii=False, separators=(",", ":")) + "\n"
    (DATA_DIR / "definitions-en.json").write_text(out, encoding="utf-8", newline="\n")

    sample = {w: defs.get(w) for w in ["run", "ran", "cats", "cat", "need", "bank", "took", "mice", "fair", "xenon", "xylophone", "box", "taxi", "left", "better", "swam", "eaten", "happily", "children"]}
    print(json.dumps({
        "words_en": len(sorted_words),
        "definitions_en": len(defs),
        "coverage_percent": round(100 * len(defs) / len(sorted_words), 2),
        "sources": {"scowl70": len(s70), "enable1": len(enable), "wordnet": len(wn), "wiktionary_vi": len(wk_words), "fvdp": len(fv_words)},
        "definition_sources": stats,
        "common": len(common),
        "defs_bytes": (DATA_DIR / "definitions-en.json").stat().st_size,
        "words_bytes": (DATA_DIR / "words-en.txt").stat().st_size,
        "sample": sample,
    }, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
