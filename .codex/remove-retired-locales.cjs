const fs = require('node:fs');
const path = require('node:path');

const directory = path.join(process.cwd(), 'assets/js/lang');
const files = ['dashboard-ui.js', 'extra-ui.js', 'session-ui.js', 'workflow-ui.js', 'table-ui.js'];

function propertyEnd(source, openBrace) {
  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let i = openBrace; i < source.length; i++) {
    const ch = source[i];
    const next = source[i + 1];
    if (lineComment) { if (ch === '\n') lineComment = false; continue; }
    if (blockComment) { if (ch === '*' && next === '/') { blockComment = false; i++; } continue; }
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '/' && next === '/') { lineComment = true; i++; continue; }
    if (ch === '/' && next === '*') { blockComment = true; i++; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) return i + 1;
  }
  throw new Error('Unclosed locale object');
}

for (const file of files) {
  const fullPath = path.join(directory, file);
  let source = fs.readFileSync(fullPath, 'utf8');
  for (const locale of ['ar', 'bn', 'fr']) {
    const pattern = new RegExp(`^[\\t ]*${locale}:[\\t ]*\\{`, 'gm');
    let match;
    const removals = [];
    while ((match = pattern.exec(source))) {
      const openBrace = source.indexOf('{', match.index);
      let end = propertyEnd(source, openBrace);
      while (source[end] === ' ' || source[end] === '\t') end++;
      if (source[end] === ',') end++;
      if (source[end] === '\r') end++;
      if (source[end] === '\n') end++;
      removals.push([match.index, end]);
    }
    for (const [start, end] of removals.reverse()) source = source.slice(0, start) + source.slice(end);
  }
  source = source.replace(/\[['"](?:am|om|so|ar|bn|fr)['"](?:,\s*['"](?:am|om|so|ar|bn|fr)['"])*\]/g, (list) => list.replace(/['"](?:ar|bn|fr)['"],?\s*/g, '').replace(/,\s*\]/g, ']'));
  fs.writeFileSync(fullPath, source, 'utf8');
}
