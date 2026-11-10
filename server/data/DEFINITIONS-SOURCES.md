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
