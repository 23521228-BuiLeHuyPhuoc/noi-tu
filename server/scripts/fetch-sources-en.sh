#!/usr/bin/env bash
# Tải các nguồn uy tín cho kho từ tiếng Anh (Nối từ Anh) vào thư mục $1 (mặc định ./en-sources), rồi chạy:
#   python server/scripts/build-en-dictionary.py ./en-sources
set -euo pipefail
D=${1:-en-sources}; mkdir -p "$D"; cd "$D"
B=https://raw.githubusercontent.com
get() { curl -fsSL --retry 3 -o "$2" "$1"; echo "đã tải $2"; }
# SCOWL (Kevin Atkinson) cỡ 70 và 35, chính tả Mỹ/Anh/Canada
get "http://app.aspell.net/create?max_size=70&spelling=US&spelling=GBs&spelling=GBz&spelling=CA&max_variant=1&diacritic=strip&special=hacker&special=roman-numerals&download=wordlist&encoding=utf-8&format=inline" scowl70.txt
get "http://app.aspell.net/create?max_size=35&spelling=US&spelling=GBs&spelling=GBz&spelling=CA&max_variant=1&diacritic=strip&download=wordlist&encoding=utf-8&format=inline" scowl35.txt
get $B/dolph/dictionary/master/enable1.txt enable1.txt
get $B/catusf/tudien/master/dict/WordNet2.0.tab.bz2 wordnet.tab.bz2
get $B/catusf/tudien/master/dict/star_anhviet.tab anhviet.tab
get $B/catusf/tudien/master/dict/TudienAnhVietBeta.tab anhvietbeta.tab
get $B/catusf/tudien/master/dict/SPDict-Irregular-Verbs.tab irregular.tab
get https://kaikki.org/viwiktionary/raw-wiktextract-data.jsonl.gz kaikki-vi.jsonl.gz
echo "Xong."
