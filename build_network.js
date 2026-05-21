// Build a self-contained interactive HTML network diagram from the AllMusic influence dataset.
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DATASETS = path.join(ROOT, 'datasets');

const raw = JSON.parse(fs.readFileSync(path.join(DATASETS, 'music_influence_network.json'), 'utf8'));

// Compute degree from the authoritative edges array (per-node counts only cover profiled data).
const inDeg = new Map();
const outDeg = new Map();
for (const e of raw.edges) {
  outDeg.set(e.source, (outDeg.get(e.source) || 0) + 1);
  inDeg.set(e.target, (inDeg.get(e.target) || 0) + 1);
}

const nodesOut = raw.nodes.map(n => ({
  id: n.name,
  profiled: !!n.profiled,
  inDeg: inDeg.get(n.name) || 0,
  outDeg: outDeg.get(n.name) || 0,
  url: n.url || null,
}));

const edgesOut = raw.edges.map(e => ({ s: e.source, t: e.target }));

// Profiles ship as an array — index them by artist name for O(1) lookup in the UI.
const profiles = {};
for (const p of Object.values(raw.profiles || {})) {
  if (p && p.name) profiles[p.name] = p;
}

const metadata = {
  generatedAt: raw.metadata.generatedAt,
  profiledArtists: raw.metadata.profiledArtists,
  totalArtistNodes: raw.metadata.totalNodes,
  totalInfluenceEdges: raw.metadata.totalEdges,
};

const payload = { metadata, nodes: nodesOut, edges: edgesOut, profiles };

console.log(`Nodes: ${nodesOut.length}  Edges: ${edgesOut.length}  Profiled: ${nodesOut.filter(n => n.profiled).length}`);

const template = fs.readFileSync(path.join(ROOT, 'network_template.html'), 'utf8');
const html = template.replace('__DATA_PLACEHOLDER__', JSON.stringify(payload));
const outPath = path.join(ROOT, 'index.html');
fs.writeFileSync(outPath, html, 'utf8');
console.log(`Wrote ${outPath}  (${(fs.statSync(outPath).size / 1024).toFixed(0)} KB)`);
