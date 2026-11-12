/**
 * Password / passphrase policy and a zxcvbn-style strength heuristic.
 * Pure module: no React, no DOM, no network.
 */
export const MIN_PASSWORD_LENGTH = 10;

const COMMON_LIST = [
  "password", "passw0rd", "motdepasse", "motdepass", "mdp", "azerty", "azertyuiop", "qwerty",
  "qwertyuiop", "123456", "1234567", "12345678", "123456789", "1234567890", "0123456789",
  "000000", "111111", "123123", "654321", "987654321", "abc123", "abcdef", "abcdefgh",
  "iloveyou", "jetaime", "soleil", "bonjour", "bonsoir", "salut", "coucou", "doudou",
  "loulou", "chouchou", "chocolat", "princesse", "marseille", "paris", "lyon", "toulouse",
  "nicolas", "julien", "camille", "thomas", "olivier", "pierre", "louise", "marie",
  "football", "basket", "sunshine", "princess", "dragon", "monkey", "letmein", "welcome",
  "admin", "administrator", "root", "user", "login", "master", "secret", "default", "changeme",
  "trustno1", "starwars", "pokemon", "batman", "superman", "freedom", "whatever", "shadow",
  "michael", "jordan", "hello", "hello123", "charlie", "liverpool", "arsenal", "chelsea",
  "barcelona", "realmadrid", "psg", "olympique", "france", "francais", "zenflow", "focus",
  "flow", "breathe", "respire", "pomodoro", "meditation", "zen", "calme", "love", "amour",
  "chat", "chien", "maison", "famille", "bebe", "bisous", "tresor", "cheval", "vacances",
  "printemps", "automne", "hiver", "ete", "summer", "winter", "spring", "google", "facebook",
  "instagram", "youtube", "netflix", "apple", "samsung", "azerty123", "qwerty123",
  "password1", "motdepasse1", "aaaaaa", "azertyui", "wxcvbn", "qsdfgh", "1q2w3e4r", "1qaz2wsx",
  "zaq12wsx", "q1w2e3r4", "asdfgh", "asdfghjkl", "zxcvbnm", "baseball", "superstar",
];
const COMMON = new Set(COMMON_LIST);

const SEQUENCES = [
  "abcdefghijklmnopqrstuvwxyz",
  "01234567890",
  "azertyuiop",
  "qsdfghjklm",
  "wxcvbn",
  "qwertyuiop",
  "asdfghjkl",
  "zxcvbnm",
];

export type StrengthScore = 0 | 1 | 2 | 3 | 4;

export interface PasswordEvaluation {
  score: StrengthScore;
  label: string;
  bits: number;
  issues: string[];
  /** True when the passphrase satisfies every rule required to create a vault. */
  ok: boolean;
}

export const STRENGTH_LABELS = ["Très faible", "Faible", "Correcte", "Forte", "Excellente"] as const;

function normalize(pw: string): string {
  return pw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function unleet(s: string): string {
  return s
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/7/g, "t")
    .replace(/@/g, "a")
    .replace(/\$/g, "s");
}

/** Blocks very common passwords, including "word + digits/symbols" and leet variants. */
export function isCommonPassword(pw: string): boolean {
  const n = normalize(pw);
  if (COMMON.has(n)) return true;
  const core = n.replace(/[\d\W_]+$/u, "").replace(/^[\d\W_]+/u, "");
  if (core.length === 0) {
    // Only digits/symbols: block if it is a straight sequence or a repeat.
    return isSequence(n) || /^(.)\1+$/u.test(n);
  }
  return COMMON.has(core) || COMMON.has(unleet(core)) || COMMON.has(unleet(n));
}

function isSequence(s: string): boolean {
  if (s.length < 4) return false;
  return SEQUENCES.some((seq) => seq.includes(s) || [...seq].reverse().join("").includes(s));
}

function longestSequenceRun(n: string): number {
  let longest = 0;
  for (const seq of SEQUENCES) {
    const rev = [...seq].reverse().join("");
    for (const source of [seq, rev]) {
      for (let len = Math.min(n.length, source.length); len >= 4; len--) {
        if (len <= longest) break;
        for (let i = 0; i + len <= n.length; i++) {
          if (source.includes(n.slice(i, i + len))) {
            longest = len;
            break;
          }
        }
      }
    }
  }
  return longest;
}

function charsetSize(pw: string): number {
  let size = 0;
  if (/[a-z]/.test(pw)) size += 26;
  if (/[A-Z]/.test(pw)) size += 26;
  if (/\d/.test(pw)) size += 10;
  if (/[^A-Za-z0-9]/.test(pw)) size += 33;
  return Math.max(size, 1);
}

/**
 * Estimate passphrase strength. `context` holds words that must not help
 * (e.g. the display name), which get penalized like dictionary words.
 */
export function evaluatePassword(pw: string, context: string[] = []): PasswordEvaluation {
  const issues: string[] = [];
  const n = normalize(pw);
  const length = [...pw].length;

  if (length === 0) {
    return { score: 0, label: STRENGTH_LABELS[0], bits: 0, issues: [`Au moins ${MIN_PASSWORD_LENGTH} caractères`], ok: false };
  }

  let bits = length * Math.log2(charsetSize(pw));

  const unique = new Set(pw).size;
  const uniqueRatio = unique / length;
  if (uniqueRatio < 0.5) {
    bits *= uniqueRatio + 0.3;
    issues.push("Évite les répétitions");
  } else if (/(.)\1{2,}/u.test(pw)) {
    bits -= 8;
    issues.push("Évite les répétitions");
  }

  const seqRun = longestSequenceRun(n);
  if (seqRun >= 4) {
    bits -= seqRun * 3;
    issues.push("Évite les suites (abcd, 1234, azerty)");
  }

  let worstWord = 0;
  for (const word of COMMON_LIST) {
    if (word.length >= 4 && n.includes(word)) worstWord = Math.max(worstWord, word.length);
  }
  if (worstWord > 0) bits -= worstWord * 3;

  const contextWords = context.map(normalize).filter((w) => w.length >= 3);
  if (contextWords.some((w) => n.includes(w))) {
    bits -= 12;
    issues.push("N'y mets pas ton prénom");
  }

  if (/(19|20)\d{2}/.test(n)) bits -= 6;

  bits = Math.max(0, Math.round(bits));
  const score: StrengthScore = bits < 30 ? 0 : bits < 45 ? 1 : bits < 60 ? 2 : bits < 75 ? 3 : 4;

  const tooShort = length < MIN_PASSWORD_LENGTH;
  const common = isCommonPassword(pw);
  if (tooShort) issues.unshift(`Au moins ${MIN_PASSWORD_LENGTH} caractères`);
  if (common) issues.unshift("Mot de passe trop courant");
  if (!tooShort && !common && score < 2) issues.push("Ajoute des mots ou des symboles");

  return {
    score,
    label: STRENGTH_LABELS[score],
    bits,
    issues: Array.from(new Set(issues)),
    ok: !tooShort && !common && score >= 2,
  };
}
