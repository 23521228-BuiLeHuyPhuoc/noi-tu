#!/usr/bin/env bash
# Tải các nguồn từ điển mở vào thư mục $1 (mặc định ./sources-raw), rồi chạy:
#   npm run build:dict -- ./sources-raw
set -euo pipefail
D=${1:-sources-raw}; mkdir -p "$D"; cd "$D"
B=https://raw.githubusercontent.com
get() { curl -fsSL -o "$2" "$1"; echo "đã tải $2"; }
get $B/duyet/vietnamese-wordlist/master/Viet74K.txt Viet74K.txt
get $B/vntk/dictionary/master/data/dictionary.json vntk_dictionary.json
for x in hongocduc tudientv wiktionary; do get $B/undertheseanlp/dictionary/master/dictionaries/$x/words.txt uts_$x.txt; done
get $B/undertheseanlp/dictionary/master/dictionary/words.txt uts_words.txt
get $B/catusf/tudien/master/dict/star_vietviet.tab vietviet.tab
get $B/catusf/tudien/master/dict/star_vietanh.tab vietanh.tab
get $B/catusf/tudien/master/dict/star_viettbn.tab viettbn.tab
get $B/catusf/tudien/master/dict/SPDict-Viet-Anh.tab.bz2 spdict_vietanh.tab.bz2 && bunzip2 -f spdict_vietanh.tab.bz2
get $B/catusf/tudien/master/dict/star_anhviet.tab anhviet.tab
get $B/catusf/tudien/master/dict/TudienAnhVietBeta.tab anhvietbeta.tab
get $B/catusf/tudien/master/dict/star_vietphap.tab vietphap.tab
get $B/catusf/tudien/master/dict/star_vietduc.tab vietduc.tab
get $B/catusf/tudien/master/dict/star_vietnga.tab vietnga.tab
get $B/catusf/tudien/master/dict/star_vietnhat.tab vietnhat.tab
get $B/catusf/tudien/master/dict/star_viethan.tab viethan.tab
get $B/catusf/tudien/master/dict/star_phapviet.tab phapviet.tab
get $B/catusf/tudien/master/dict/star_ducviet.tab ducviet.tab
get $B/catusf/tudien/master/dict/star_ngaviet.tab ngaviet.tab
get $B/catusf/tudien/master/dict/star_nhatviet.tab nhatviet.tab
get $B/catusf/tudien/master/dict/star_hanviet.tab hanviet.tab
get $B/catusf/tudien/master/dict/star_trungviet.tab trungviet.tab
# (star_viettrung.tab không tồn tại trên upstream nên không tải)
get $B/DavidASix/vietnamese-language-graph/main/resources/Viet_Anh.xml viet_anh.xml
echo "Xong. Wiktionary (kaikki.org) đã có sẵn trong data/sources/."
