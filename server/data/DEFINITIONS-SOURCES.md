# Vietnamese definition attribution and license

The definitions in `definitions.json` are extracts by Vietnamese Wiktionary
contributors, obtained through Tatu Ylonen's Kaikki / Wiktextract extraction.
The Vietnamese-language edition supplies Vietnamese glosses directly.

- Source: https://vi.wiktionary.org/
- Dataset: https://kaikki.org/viwiktionary/
- Raw download: https://kaikki.org/viwiktionary/raw-wiktextract-data.jsonl.gz
- Retrieved: 2026-11-10.
- Extraction: 2026-11-03, from the 2026-10-02 Vietnamese Wiktionary dump.
- Download size: 34,422,366 bytes.
- Download SHA-256: `1f0abd21982660b5fc2eff5eb3fbacbed2d9fe8f476af794dbed0d927ffb8187`.
- Wiktextract commit: https://github.com/tatuylonen/wiktextract/commit/19f9a3006a405fb7bfb40193dca41c7117a009a5

## License

The dictionary extracts remain under Creative Commons Attribution-ShareAlike
4.0 International (CC BY-SA 4.0):
https://creativecommons.org/licenses/by-sa/4.0/ . Retain this attribution and
license when redistributing these definitions or adaptations. This notice
covers the dictionary extracts and does not relicense unrelated application code.
See also https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use .

Every entry retains the contributor project's name, license, and original article
URL in `source`. The article's View history tab identifies contributors; use
`https://vi.wiktionary.org/w/index.php?title=TITLE&action=history` for its history.
Attribution persists in this notice and the checked-in data independently of
the download's availability.

Changes to the extracts: select one existing gloss for each matching headword;
normalize Unicode to NFC and collapse whitespace. Prefer the first explanatory
sense over variant/cross-reference senses, then senses at most 350 characters.
Omit empty, unexpanded-markup, or over-600-character glosses. Definitions are not
inferred from headwords, classifier combinations, or examples.

## Rebuild

From the repository root with Python 3.10 or newer:

```powershell
python server/scripts/build-definitions.py ../kaikki-vi-raw.jsonl.gz --download
```

For reproducible output, retain the downloaded file with the SHA-256 above and
omit `--download`; the upstream URL changes with future dumps. The generator
reads `server/data/words.txt`, filters to Vietnamese entries, and deterministically
writes sorted JSON. It validates normalized keys, membership, nonempty text and
attribution, and a maximum output size of 15 MB. The raw dump is not checked in.

Current output: 25,976 definitions / 79,569 words (32.65%), 5,560,378 bytes.
Absent words retain the application's unavailable-meaning fallback.

Academic citation requested by Kaikki: Tatu Ylonen (2022), *Wiktextract:
Wiktionary as Machine-Readable Structured Data*, Proceedings of LREC 2022,
pp. 1317-1325: https://aclanthology.org/2022.lrec-1.140/ .

---

# English word list and Vietnamese definitions (`words-en.txt`, `definitions-en.json`, `common-en.txt`)

The English Word Chain mode (`wordchain_en`) only accepts words attested by reputable,
licensed sources. Built by `server/scripts/build-en-dictionary.py` (2026-11-11):
210,987 words, 130,549 Vietnamese definitions (about 98% of common words; the rest
show no meaning box). Proper nouns, capitalised abbreviations and the noisy headwords of
"TudienAnhVietBeta" are no longer accepted as words.

## Word list (valid words) = union of

1. **SCOWL size 70 ("large")**, Kevin Atkinson — the word lists behind aspell/hunspell
   spell checkers. Generated at http://app.aspell.net/create (US, GB-ise, GB-ize, CA;
   variant level 1; diacritics stripped). Only all-lowercase `a–z` entries (drops proper
   nouns and possessives). License: http://wordlist.aspell.net/scowl-readme/ (permissive).
2. **ENABLE1** (public domain), via https://github.com/dolph/dictionary (`enable1.txt`).
3. **Princeton WordNet 2.0** single-word lowercase lemmas (WordNet License), via
   `catusf/tudien` `WordNet2.0.tab`.
4. **Vietnamese Wiktionary** English entries (Kaikki / Wiktextract, CC BY-SA 4.0):
   lowercase headwords; part-of-speech `name`, `abbrev`, `phrase`, affixes and senses tagged
   abbreviation / initialism / acronym / misspelling are skipped.
5. **FVDP English–Vietnamese dictionary** (Free Vietnamese Dictionary Project, Hồ Ngọc Đức;
   StarDict `star_anhviet.tab` via https://github.com/catusf/tudien, GPL): lowercase headwords.

`common-en.txt` = SCOWL size 35 words present in the list; used to pick hints and opening words.

## Vietnamese definitions, by priority

1. **Vietnamese Wiktionary** (CC BY-SA 4.0): senses grouped by part of speech
   ("(danh từ) …", "(động từ) …"), IPA from `sounds`, and inflection links from `form_of`
   or glosses such as "Quá khứ của take". Archaic forms ("thou art" = be) are ignored.
2. **FVDP** (GPL): part-of-speech blocks; examples (`=…+…`), idioms (`!…`) and
   specialised fields (`@…`) are removed. Multiple lines for one headword are merged.
3. **Inflections**: irregular verbs (`SPDict-Irregular-Verbs.tab`, catusf/tudien) and
   regular `-s/-es/-ed/-ing/-er/-est/-ly` forms, only when the base is a defined valid word
   and the inflected form itself is in SCOWL/ENABLE. Stored as `"@base|label"` and expanded
   by the server, e.g. `took` → "(quá khứ của take) …", `cats` → "(số nhiều của cat) …".
   US/UK spelling variants are linked the same way (`archeology` → `archaeology`).
4. **TudienAnhVietBeta** (catusf/tudien): only IPA for non-inflected words and a last-resort
   gloss (labels like "(Econ)" removed).
5. `definitions-en-fixes.json`: hand corrections for entries the sources get wrong
   (e.g. `xi`, `xu`, `xray`, `art`).

Every source keeps its own license; Wiktionary-derived text remains CC BY-SA 4.0 and
FVDP-derived text GPL. Attribution is kept in this file and in the server's definition source string.

## Rebuild

```bash
bash server/scripts/fetch-sources-en.sh ../en-sources   # ~150 MB download
python server/scripts/build-en-dictionary.py ../en-sources
```
