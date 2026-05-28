const fs = require("fs");

const memes = [
  {
    output: "assets/meme-miss.svg",
    source: "assets/source-chihuahua.jpg",
    viewBox: "0 0 464 612",
    label: "Angry chihuahua meme: Not even close",
    image: { width: 464, height: 612 },
    box: { x: 106, y: 222, width: 252, height: 96, radius: 18, fill: "#111", opacity: 0.84 },
    text: {
      x: 232,
      y: 258,
      size: 26,
      fill: "#fff",
      stroke: "#000",
      lines: ["NOT EVEN", "CLOSE"],
      dy: 32,
    },
  },
  {
    output: "assets/meme-progress.svg",
    source: "assets/source-border-collie.jpg",
    viewBox: "0 0 1366 916",
    label: "Border collie meme: Keep going",
    image: { width: 1366, height: 916 },
    box: { x: 384, y: 326, width: 324, height: 122, radius: 24, fill: "#fff", opacity: 0.9 },
    text: {
      x: 546,
      y: 374,
      size: 40,
      fill: "#17211b",
      stroke: "#fff",
      lines: ["KEEP", "GOING"],
      dy: 46,
    },
  },
  {
    output: "assets/meme-close.svg",
    source: "assets/source-golden-retriever.jpg",
    viewBox: "0 0 804 563",
    label: "Golden retriever meme: One letter away",
    image: { width: 804, height: 563 },
    box: { x: 322, y: 176, width: 250, height: 98, radius: 22, fill: "#fff", opacity: 0.92 },
    text: {
      x: 447,
      y: 214,
      size: 29,
      fill: "#17211b",
      stroke: "#fff",
      lines: ["ONE LETTER", "AWAY"],
      dy: 35,
    },
  },
];

function escapeXml(value) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function renderText(text) {
  return text.lines
    .map((line, index) => {
      const dy = index === 0 ? 0 : text.dy;
      return `<tspan x="${text.x}"${dy ? ` dy="${dy}"` : ""}>${escapeXml(line)}</tspan>`;
    })
    .join("");
}

for (const meme of memes) {
  const data = fs.readFileSync(meme.source).toString("base64");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${meme.viewBox}" role="img" aria-label="${escapeXml(meme.label)}">
  <image href="data:image/jpeg;base64,${data}" width="${meme.image.width}" height="${meme.image.height}" preserveAspectRatio="xMidYMid slice"/>
  <rect x="${meme.box.x}" y="${meme.box.y}" width="${meme.box.width}" height="${meme.box.height}" rx="${meme.box.radius}" fill="${meme.box.fill}" fill-opacity="${meme.box.opacity}"/>
  <text x="${meme.text.x}" y="${meme.text.y}" text-anchor="middle" font-family="Impact, Arial Black, sans-serif" font-size="${meme.text.size}" fill="${meme.text.fill}" stroke="${meme.text.stroke}" stroke-width="3" paint-order="stroke" letter-spacing=".5">
    ${renderText(meme.text)}
  </text>
</svg>
`;

  fs.writeFileSync(meme.output, svg);
}

console.log(`Generated ${memes.length} meme assets`);
