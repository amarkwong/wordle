const fs = require("fs");

const words = fs
  .readFileSync("assets/words.txt", "utf8")
  .trim()
  .split(/\s+/)
  .filter(Boolean);

fs.writeFileSync("words.js", `window.WORDS = ${JSON.stringify(words)};\n`);

console.log(`Generated ${words.length} words`);
