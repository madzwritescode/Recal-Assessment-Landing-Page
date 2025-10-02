#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function toHex(n) {
  const v = Math.round(Math.min(1, Math.max(0, n)) * 255);
  return v.toString(16).padStart(2, '0');
}

function rgbToHex({ r, g, b }) {
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toLowerCase();
}

function collectNodes(node, out) {
  if (!node || typeof node !== 'object') return;
  out.push(node);
  const kids = node.children || node.document || node.nodes || [];
  if (Array.isArray(kids)) {
    for (const k of kids) collectNodes(k, out);
  } else if (kids && typeof kids === 'object') {
    // files/:fileKey/nodes response has { nodes: { id: { document } } }
    for (const key of Object.keys(kids)) {
      const n = kids[key];
      if (n && n.document) collectNodes(n.document, out);
    }
  }
}

function unique(arr) {
  return Array.from(new Set(arr));
}

function main() {
  const nodesPath = process.argv[2];
  const globalsPath = process.argv[3];
  if (!nodesPath || !globalsPath) {
    console.error('Usage: node scripts/extract-figma-tokens.mjs <nodes.json> <globals.css>');
    process.exit(1);
  }

  const raw = fs.readFileSync(nodesPath, 'utf8');
  const json = JSON.parse(raw);

  const all = [];
  if (json.document) {
    collectNodes(json.document, all);
  }
  if (json.nodes) {
    for (const key of Object.keys(json.nodes)) {
      const entry = json.nodes[key];
      if (entry && entry.document) collectNodes(entry.document, all);
    }
  }

  const colors = [];
  const textStyles = [];

  for (const n of all) {
    // Colors from fills
    if (Array.isArray(n.fills)) {
      for (const f of n.fills) {
        if (!f || f.visible === false) continue;
        if (f.type === 'SOLID' && f.color) {
          const hex = rgbToHex(f.color);
          colors.push(hex);
        }
      }
    }
    // Colors from strokes
    if (Array.isArray(n.strokes)) {
      for (const s of n.strokes) {
        if (!s || s.visible === false) continue;
        if (s.type === 'SOLID' && s.color) {
          const hex = rgbToHex(s.color);
          colors.push(hex);
        }
      }
    }
    // Typography from TEXT nodes
    if (n.type === 'TEXT' && n.style) {
      const { fontFamily, fontWeight, fontSize, lineHeightPx, letterSpacing } = n.style;
      textStyles.push({ fontFamily, fontWeight, fontSize, lineHeightPx, letterSpacing });
    }
  }

  const uniqueColors = unique(colors).filter(Boolean).slice(0, 24);
  const uniqueText = [];
  const seenText = new Set();
  for (const t of textStyles) {
    const key = JSON.stringify(t);
    if (!seenText.has(key)) {
      seenText.add(key);
      uniqueText.push(t);
    }
  }

  const lines = [];
  lines.push('');
  lines.push('/* === Generated from Figma nodes.json === */');
  lines.push(':root {');
  // Generated colors
  uniqueColors.forEach((hex, i) => {
    lines.push(`  --figma-color-${String(i + 1).padStart(2, '0')}: ${hex};`);
  });
  // Generated text tokens
  uniqueText.forEach((t, i) => {
    const idx = String(i + 1).padStart(2, '0');
    if (t.fontFamily) lines.push(`  --figma-font-family-${idx}: ${t.fontFamily};`);
    if (t.fontWeight != null) lines.push(`  --figma-font-weight-${idx}: ${t.fontWeight};`);
    if (t.fontSize != null) lines.push(`  --figma-font-size-${idx}: ${Number(t.fontSize)}px;`);
    if (t.lineHeightPx != null) lines.push(`  --figma-line-height-${idx}: ${Number(t.lineHeightPx)}px;`);
    if (t.letterSpacing != null) lines.push(`  --figma-letter-spacing-${idx}: ${Number(t.letterSpacing)}px;`);
  });
  lines.push('}');
  lines.push('/* === End generated tokens === */');
  lines.push('');

  const css = fs.readFileSync(globalsPath, 'utf8');
  const outCss = css + '\n' + lines.join('\n');
  fs.writeFileSync(globalsPath, outCss, 'utf8');

  const summary = {
    colors: uniqueColors.length,
    textStyles: uniqueText.length,
  };
  console.log(JSON.stringify(summary, null, 2));
}

main();


