// Code 128 (subset B) barcode encoder -> SVG.
//
// No dependencies, no build step. Subset B covers ASCII 32..126, which is
// everything a camp ID needs (letters, digits, dashes).
//
// A Code 128 symbol is: START-B, one symbol per character, a modulo-103 check
// symbol, then STOP. Every symbol is 11 modules wide (the stop symbol is 13),
// written as alternating bar/space widths starting with a bar.

// Widths for symbol values 0..106. Index 106 is STOP (7 elements, 13 modules).
const PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112",
];

const START_B = 104;
const STOP = 106;

/** True if `text` can be encoded in Code 128 subset B. */
export function encodable(text) {
  return typeof text === "string" && text.length > 0 &&
    [...text].every((ch) => ch.charCodeAt(0) >= 32 && ch.charCodeAt(0) <= 126);
}

/**
 * Symbol values for `text`, including start, check and stop symbols.
 * Exported so the test page can check the checksum arithmetic directly.
 */
export function symbolValues(text) {
  if (!encodable(text)) throw new Error(`Cannot encode ${JSON.stringify(text)} in Code 128B`);
  const data = [...text].map((ch) => ch.charCodeAt(0) - 32);
  let sum = START_B;
  data.forEach((v, i) => { sum += v * (i + 1); });
  return [START_B, ...data, sum % 103, STOP];
}

/** Module widths as a flat array, starting with a bar and alternating. */
export function moduleWidths(text) {
  return symbolValues(text)
    .flatMap((v) => [...PATTERNS[v]].map(Number));
}

/**
 * Render `text` as an SVG barcode.
 *
 * The quiet zone (10 blank modules each side) is part of the symbol — scanners
 * need it, so never crop or tightly-box the SVG this returns.
 */
export function toSVG(text, { height = 70, moduleWidth = 2, quietZone = 10, showText = true } = {}) {
  const widths = moduleWidths(text);
  const modules = widths.reduce((a, b) => a + b, 0);
  const totalModules = modules + quietZone * 2;
  const labelSpace = showText ? 22 : 0;

  let x = quietZone;
  let bars = "";
  widths.forEach((w, i) => {
    if (i % 2 === 0) bars += `<rect x="${x}" y="0" width="${w}" height="${height}" />`;
    x += w;
  });

  const label = showText
    ? `<text x="${totalModules / 2}" y="${height + 17}" text-anchor="middle"
             font-family="ui-monospace, SFMono-Regular, Menlo, monospace"
             font-size="15" letter-spacing="1.5" fill="#000">${escapeXML(text)}</text>`
    : "";

  return `<svg class="barcode" xmlns="http://www.w3.org/2000/svg"
     viewBox="0 0 ${totalModules} ${height + labelSpace}"
     width="${totalModules * moduleWidth}" height="${(height + labelSpace) * moduleWidth / 2}"
     role="img" aria-label="Barcode ${escapeXML(text)}" shape-rendering="crispEdges">
  <rect width="100%" height="100%" fill="#fff" />
  <g fill="#000">${bars}</g>
  ${label}
</svg>`;
}

function escapeXML(s) {
  return s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
}

export const _internals = { PATTERNS, START_B, STOP };
