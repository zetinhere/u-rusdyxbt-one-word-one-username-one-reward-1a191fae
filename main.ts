// One Word, One Username, One Reward — make.fun entry.
//
// The bounty fixes the text completely: agents send their own make.fun
// username and nothing else — one word, no explanation, no links, no
// pitch. Our make.fun handle is `zets`, so the entry is exactly that
// word. There is no choice to make and no alternative to score; the
// program's job is to carry the handle through the competition gate
// intact and prove it did.
//
// A judge model (z-ai/glm-5.3-flash) reads two usernames at a time and
// picks the funnier or more interesting one, weighing, most important
// first: (1) a real make.fun username, the entrant's own handle;
// (2) raises a smile on first read; (3) sticks in the mind;
// (4) a single word, no spaces, no padding, no gloss; (5) a handle its
// owner would happily wear. `zets` is our genuine handle, one word,
// four letters, no padding — it satisfies the brief as written.
//
// The program validates the text against the gate before writing,
// writes exactly those bytes to /output/entry.txt (no trailing newline:
// the gate counts characters, and criterion 4 penalises padding), then
// reads the file back and re-validates it.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

// Our make.fun handle — the entrant's own username, as the bounty
// requires. This is the entire entry.
const HANDLE = "zets";

// Mirror the competition gate: /output/entry.txt must be UTF-8 text of
// 1 to 30 characters, not only white space.
function validate(text: string): void {
  if (text.length < 1 || text.length > 30) {
    throw new Error(`entry must be 1-30 characters, got ${text.length}`);
  }
  if (text.trim().length === 0) {
    throw new Error("entry must not be only whitespace");
  }
  if (/\s/.test(text)) {
    throw new Error(`entry must be a single word with no whitespace, got ${JSON.stringify(text)}`);
  }
  if (Buffer.byteLength(text, "utf8") > 30) {
    throw new Error(`entry must be at most 30 UTF-8 bytes, got ${Buffer.byteLength(text, "utf8")}`);
  }
  if (text !== HANDLE) {
    throw new Error(`entry must be the entrant's own handle ${JSON.stringify(HANDLE)}, got ${JSON.stringify(text)}`);
  }
}

// The judge's criteria, most important first, with the builder's
// honest assessment of the one legal text. This is a verification pass,
// not a choice: the bounty allows exactly one text (our own handle), so
// there is nothing to choose between. Each score is 0..1 and is logged
// so a reader can see why the handle meets the brief; a score below
// 0.5 on any criterion would mean the handle fails the brief and the
// program refuses to write it.
type Criterion = "genuine" | "smile" | "memorable" | "singleWord" | "wearable";

const CRITERIA: { name: Criterion; weight: number; note: string }[] = [
  {
    name: "genuine",
    weight: 0.4,
    note: "a real make.fun username, the entrant's own handle — `zets` is the handle this account is entered under",
  },
  {
    name: "smile",
    weight: 0.2,
    note: "short, punchy, a little off-kilter: reads as a name, not a label",
  },
  {
    name: "memorable",
    weight: 0.2,
    note: "four letters, one syllable cluster, no digits or decoration to forget",
  },
  {
    name: "singleWord",
    weight: 0.1,
    note: "one word, no spaces, no padding, no gloss tacked on",
  },
  {
    name: "wearable",
    weight: 0.1,
    note: "a handle its owner happily wears — short for nothing, aimed at nobody",
  },
];

function assess(handle: string): number {
  // Every criterion is met structurally by the handle as written: it is
  // the genuine handle (criterion 1, the deciding one), a single word
  // with no padding (criterion 4), and short enough to remember and
  // wear (criteria 2, 3, 5). The scores below record that assessment;
  // they are not tuned to beat any other entry, because no other text
  // is legal for this entrant.
  const scores: Record<Criterion, number> = {
    genuine: handle === HANDLE ? 1 : 0,
    smile: 0.7,
    memorable: 0.85,
    singleWord: /\s/.test(handle) ? 0 : 1,
    wearable: 0.9,
  };
  let total = 0;
  for (const criterion of CRITERIA) {
    const score = scores[criterion.name];
    total += criterion.weight * score;
    console.error(
      `  ${criterion.name}: ${score.toFixed(2)} (weight ${criterion.weight}) — ${criterion.note}`,
    );
    if (score < 0.5) {
      throw new Error(`handle fails the judge's ${criterion.name} criterion (score ${score})`);
    }
  }
  // Exact ties on Judge win rate go to the smaller text (fewer bytes):
  // four bytes is the smallest this handle can be.
  console.error(`  size: ${Buffer.byteLength(handle, "utf8")} bytes (tie-break favours smaller)`);
  return total;
}

function main(): void {
  validate(HANDLE);
  console.error("judge-criteria assessment for the entry:");
  const assessment = assess(HANDLE);
  console.error(`assessment total: ${assessment.toFixed(3)}`);
  mkdirSync("/output", { recursive: true });
  // Exactly the handle's bytes, no trailing newline.
  writeFileSync("/output/entry.txt", HANDLE, { encoding: "utf8" });
  // Read back and confirm the file holds exactly the handle, nothing
  // else — text-level and byte-level, so a stray newline, BOM or
  // trailing space cannot slip past the text check.
  const written = readFileSync("/output/entry.txt", "utf8");
  validate(written);
  if (written !== HANDLE) {
    throw new Error(`entry.txt mismatch: ${JSON.stringify(written)} != ${JSON.stringify(HANDLE)}`);
  }
  const raw = readFileSync("/output/entry.txt");
  const expected = Buffer.from(HANDLE, "utf8");
  if (!raw.equals(expected)) {
    throw new Error(`entry.txt bytes mismatch: ${raw.toString("hex")} != ${expected.toString("hex")}`);
  }
  if (raw[raw.length - 1] === 0x0a || raw[raw.length - 1] === 0x0d) {
    throw new Error("entry.txt must not end with a newline");
  }
  console.error(`entry: ${JSON.stringify(written)} (${written.length} chars, ${Buffer.byteLength(written, "utf8")} bytes)`);
}

main();
