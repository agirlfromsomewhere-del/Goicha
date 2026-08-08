// Basic Hepburn romaji -> hiragana conversion, used as a search fallback
// so words typed on a plain English keyboard (e.g. "neko") still find
// results even though the dictionary itself is indexed by kana/kanji.
// Not meant to be a complete IME - just good enough for dictionary lookup.

const DIGRAPHS = {
  kya: 'きゃ', kyu: 'きゅ', kyo: 'きょ',
  sha: 'しゃ', shu: 'しゅ', sho: 'しょ',
  cha: 'ちゃ', chu: 'ちゅ', cho: 'ちょ',
  nya: 'にゃ', nyu: 'にゅ', nyo: 'にょ',
  hya: 'ひゃ', hyu: 'ひゅ', hyo: 'ひょ',
  mya: 'みゃ', myu: 'みゅ', myo: 'みょ',
  rya: 'りゃ', ryu: 'りゅ', ryo: 'りょ',
  gya: 'ぎゃ', gyu: 'ぎゅ', gyo: 'ぎょ',
  ja: 'じゃ', ju: 'じゅ', jo: 'じょ',
  bya: 'びゃ', byu: 'びゅ', byo: 'びょ',
  pya: 'ぴゃ', pyu: 'ぴゅ', pyo: 'ぴょ',
};

const MONOGRAPHS = {
  a: 'あ', i: 'い', u: 'う', e: 'え', o: 'お',
  ka: 'か', ki: 'き', ku: 'く', ke: 'け', ko: 'こ',
  sa: 'さ', shi: 'し', su: 'す', se: 'せ', so: 'そ',
  ta: 'た', chi: 'ち', tsu: 'つ', te: 'て', to: 'と',
  na: 'な', ni: 'に', nu: 'ぬ', ne: 'ね', no: 'の',
  ha: 'は', hi: 'ひ', fu: 'ふ', he: 'へ', ho: 'ほ',
  ma: 'ま', mi: 'み', mu: 'む', me: 'め', mo: 'も',
  ya: 'や', yu: 'ゆ', yo: 'よ',
  ra: 'ら', ri: 'り', ru: 'る', re: 'れ', ro: 'ろ',
  wa: 'わ', wo: 'を',
  ga: 'が', gi: 'ぎ', gu: 'ぐ', ge: 'げ', go: 'ご',
  za: 'ざ', ji: 'じ', zu: 'ず', ze: 'ぜ', zo: 'ぞ',
  da: 'だ', di: 'ぢ', du: 'づ', de: 'で', do: 'ど',
  ba: 'ば', bi: 'び', bu: 'ぶ', be: 'べ', bo: 'ぼ',
  pa: 'ぱ', pi: 'ぴ', pu: 'ぷ', pe: 'ぺ', po: 'ぽ',
};

const VOWELS = new Set(['a', 'i', 'u', 'e', 'o']);

export function romajiToHiragana(input) {
  const s = input.toLowerCase();
  let out = '';
  let i = 0;

  while (i < s.length) {
    // Doubled consonant -> small っ (e.g. "kitte" -> きって)
    if (
      i + 1 < s.length &&
      s[i] === s[i + 1] &&
      /[bcdfghjklmpqrstvwxyz]/.test(s[i])
    ) {
      out += 'っ';
      i += 1;
      continue;
    }

    const three = s.slice(i, i + 3);
    if (DIGRAPHS[three]) {
      out += DIGRAPHS[three];
      i += 3;
      continue;
    }

    const two = s.slice(i, i + 2);
    if (DIGRAPHS[two]) {
      out += DIGRAPHS[two];
      i += 2;
      continue;
    }
    if (MONOGRAPHS[two]) {
      out += MONOGRAPHS[two];
      i += 2;
      continue;
    }

    const one = s[i];
    if (MONOGRAPHS[one]) {
      out += MONOGRAPHS[one];
      i += 1;
      continue;
    }

    if (one === 'n') {
      const next = s[i + 1];
      if (next === 'n') {
        out += 'ん';
        i += 2;
        continue;
      }
      if (!next || !VOWELS.has(next) && next !== 'y') {
        out += 'ん';
        i += 1;
        continue;
      }
    }

    // Unknown character (space, punctuation, already-kana, etc.) - keep
    // as-is so partial conversions still line up with the original text.
    out += s[i];
    i += 1;
  }

  return out;
}

export function looksLikeRomaji(query) {
  return /^[a-z\s]+$/i.test(query);
}
