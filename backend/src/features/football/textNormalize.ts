// Some rows from API-Football arrive mojibake'd: a UTF-8 string whose bytes were
// decoded as Windows-1252 upstream, so e.g. "Dodô" becomes "DodÃ´", "Çakıroğlu"
// becomes "ÃakÄ±roÄŸlu", "João" becomes "JoÃ£o". This reverses that.
//
// It scans for maximal runs that decode as a valid UTF-8 multibyte sequence when
// each character is mapped back to its Windows-1252 byte, and reverses only those
// — so a mixed string ("SnÃ¦hólm", where æ is broken but ó is clean) is repaired
// without mangling the clean part, and a genuinely accented name ("Mbappé") is
// left untouched because it forms no valid sequence.

// The Windows-1252 code points in 0x80–0x9F that differ from Latin-1.
const CP1252_TO_BYTE: Record<string, number> = {
  '€': 0x80, '‚': 0x82, 'ƒ': 0x83, '„': 0x84, '…': 0x85,
  '†': 0x86, '‡': 0x87, 'ˆ': 0x88, '‰': 0x89, 'Š': 0x8a,
  '‹': 0x8b, 'Œ': 0x8c, 'Ž': 0x8e, '‘': 0x91, '’': 0x92,
  '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97,
  '˜': 0x98, '™': 0x99, 'š': 0x9a, '›': 0x9b, 'œ': 0x9c,
  'ž': 0x9e, 'Ÿ': 0x9f,
}

// Cheap gate so clean strings skip the work (Â/Ã/Ä/Å are the usual lead-byte tells).
const MOJIBAKE_HINT = /[Â-Å]/

// The Windows-1252 byte a mojibake character stands for, or null if the character
// can't be a single Windows-1252 byte (so it isn't part of this corruption).
function toByte(ch: string): number | null {
  const mapped = CP1252_TO_BYTE[ch]
  if (mapped !== undefined) return mapped
  const code = ch.codePointAt(0)!
  return code <= 0xff ? code : null
}

// How many bytes a UTF-8 sequence beginning with this lead byte occupies (2–4),
// or 0 if it isn't a multibyte lead.
function leadLen(b: number): number {
  if (b >= 0xc2 && b <= 0xdf) return 2
  if (b >= 0xe0 && b <= 0xef) return 3
  if (b >= 0xf0 && b <= 0xf4) return 4
  return 0
}

export function fixMojibake(s: string | null | undefined): string | null {
  if (s == null) return null
  if (!MOJIBAKE_HINT.test(s)) return s

  const chars = Array.from(s)
  let out = ''
  let i = 0
  while (i < chars.length) {
    const b0 = toByte(chars[i])
    const len = b0 == null ? 0 : leadLen(b0)
    if (len > 0 && i + len <= chars.length) {
      const bytes = [b0 as number]
      let ok = true
      for (let k = 1; k < len; k++) {
        const b = toByte(chars[i + k])
        if (b == null || b < 0x80 || b > 0xbf) {
          ok = false
          break
        }
        bytes.push(b)
      }
      if (ok) {
        const decoded = Buffer.from(bytes).toString('utf8')
        // Buffer decoding never throws; a bad run yields the replacement char,
        // in which case we keep the original characters instead.
        if (!decoded.includes('�')) {
          out += decoded
          i += len
          continue
        }
      }
    }
    out += chars[i]
    i++
  }
  return out
}
