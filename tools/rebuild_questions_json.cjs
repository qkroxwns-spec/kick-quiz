const fs = require("fs");

const inputPath = "c:/Users/USER/Desktop/Kick Quiz/question.json";

const s = fs.readFileSync(inputPath, "utf8");

// Remove `// ...` comments that appear outside of double-quoted strings.
const lines = s.split(/\r?\n/).map((line) => {
  let out = "";
  let inStr = false;
  let esc = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (esc) {
      out += ch;
      esc = false;
      continue;
    }
    if (ch === "\\") {
      out += ch;
      esc = true;
      continue;
    }
    if (ch === '"') {
      inStr = !inStr;
      out += ch;
      continue;
    }
    if (!inStr && ch === "/" && line[i + 1] === "/") break;
    out += ch;
  }
  return out;
});

const clean = lines.join("\n");

// Extract balanced `{ ... }` chunks at any nesting depth, ignoring braces inside strings.
const objs = [];
const stack = [];
let inStr = false;
let esc = false;

for (let i = 0; i < clean.length; i++) {
  const ch = clean[i];

  if (esc) {
    esc = false;
    continue;
  }
  if (ch === "\\") {
    esc = true;
    continue;
  }
  if (ch === '"') {
    inStr = !inStr;
    continue;
  }
  if (inStr) continue;

  if (ch === "{") {
    stack.push(i);
  } else if (ch === "}") {
    const start = stack.pop();
    if (start === undefined) continue;
    const chunk = clean.slice(start, i + 1);
    if (chunk.includes("q") && chunk.includes("level") && chunk.includes("c")) {
      objs.push(chunk);
    }
  }
}

function toJsonish(t) {
  let x = t.trim().replace(/,\s*}/g, "}");

  // Quote keys q,a,c,level (and b for repair) if unquoted.
  for (const k of ["q", "a", "c", "level", "b"]) {
    x = x.replace(new RegExp(`(?<!")\\b${k}\\b\\s*:`, "g"), `"${k}":`);
  }

  // Repair: {"a": 12, "b": 15} -> {"a": [12, 15]}
  x = x.replace(/"a"\s*:\s*(\d+)\s*,\s*"b"\s*:\s*(\d+)/g, `"a": [$1, $2]`);

  return x;
}

const parsed = [];
let failed = 0;

for (const chunk of objs) {
  try {
    const obj = JSON.parse(toJsonish(chunk));
    if (!("q" in obj && "a" in obj && "c" in obj && "level" in obj)) {
      failed++;
      continue;
    }
    parsed.push({ q: obj.q, a: obj.a, c: obj.c, level: obj.level });
  } catch {
    failed++;
  }
}

const flat = parsed.slice(0, 400);
const easy = flat.filter((x) => x.level === "easy");
const hard = flat.filter((x) => x.level === "hard");
const out = { easy, hard };
fs.writeFileSync(inputPath, JSON.stringify(out, null, 2), "utf8");

console.log({
  found_chunks: objs.length,
  parsed: parsed.length,
  failed,
  output_easy: easy.length,
  output_hard: hard.length,
  output_total: easy.length + hard.length,
});

