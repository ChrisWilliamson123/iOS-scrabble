# Dictionary Word List — Source & License

## Decision

This project uses **SCOWL (English Speller Database / ESDB)**, British English variant, as the word list for move validation — **not** Collins Scrabble Words (CSW). CSW is commercial, copyrighted IP owned by HarperCollins with no official free/open-license distribution, so it was ruled out in favour of a genuinely open-licensed alternative, per an explicit decision to prioritize clean licensing over exact tournament-dictionary parity.

## What was generated

- **Source project:** [en-wl/wordlist](https://github.com/en-wl/wordlist) (formerly known as SCOWL — Spell Checker Oriented Word Lists — now ESDB, maintained by Kevin Atkinson).
- **Command used:**
  ```
  ./scowl word-list 70 B 1 --wo-poses=abbr
  ```
  - `70` = ESDB "size 70" (a larger/more permissive size tier that includes rarer and longer words — comparable in intent to a large Scrabble dictionary rather than a conservative spellchecker list).
  - `B` = British spellings.
  - `1` = variant level 1 (excludes most alternate-spelling variants except special cases).
  - `--wo-poses=abbr` = exclude words tagged as abbreviations.
- **Post-processing:** filtered to only pure lowercase alphabetic entries (`^[a-z]+$`), removing possessives (`'s`), proper nouns (capitalized entries), hyphenated/compound/open-form entries, and anything with diacritics or symbols — none of these are legal standalone Scrabble board words.
- **Result:** `wordlist-en-gb.txt` — **126,594 words**, one per line, lowercase, A–Z only. Length distribution ranges from 1 to 15+ letters (comparable in scale to real Scrabble dictionaries; for reference CSW ≈ 280K entries, TWL ≈ 180K entries — this list is smaller but broadly fit for purpose).

## License

SCOWL/ESDB's base license (reproduced in full in [`SCOWL-COPYRIGHT.txt`](./SCOWL-COPYRIGHT.txt) in this directory) is permissive and BSD/MIT-like:

> Permission to use, copy, modify, distribute, and sell any part of the English Speller Database (ESDB, previously known as SCOWLv2), or word lists created from it, is hereby granted without fee, provided that the above copyright notice appears in all copies and that both the above copyright notice and this notice appear in supporting documentation.

**This base notice is the only license obligation that applies to the word list used here** (size 70, British, non-Australian). Per the Copyright file's own routing rules: the additional UKACD-specific attribution clause only applies to generated word lists **larger than size 80** — this project uses size 70, so that extra clause is not triggered. The Australian-English and WordNet clauses in the same file are likewise not applicable (no Australian region code or POS data was used).

**Obligation going forward:** the copyright notice above, and the `SCOWL-COPYRIGHT.txt` file, must be kept alongside this word list and referenced/displayed somewhere reasonably accessible in the shipped game (e.g., an "About / Credits" note in the UI or in the repo README) for as long as this word list is distributed as part of the project.

## Known data quality caveats (tracked, not blocking)

- A handful of unit-style abbreviations survived the `--wo-poses=abbr` filter (e.g., `cd`, `kg`, `km`, `mg`, `ml`) because SCOWL doesn't tag them as `abbr` in its part-of-speech data. These are harmless as extra "valid" 2–3 letter words for Scrabble purposes (none are actually invalid English letter-strings) but are not official Scrabble dictionary entries. Flagged for optional manual exclusion list if stricter validation is wanted later.
- This is **not** an official Scrabble tournament word list and will disagree with CSW/TWL on specific edge-case word validity. This is an accepted tradeoff for using an open-licensed source, per explicit decision.

## Regeneration

If the list ever needs regenerating (e.g., a newer ESDB release), the steps above are fully reproducible: clone `en-wl/wordlist`, run `make` to build `scowl.db`, then re-run the `./scowl word-list ...` command shown above and re-apply the same `grep -E '^[a-z]+$'` filter.
