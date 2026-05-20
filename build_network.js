// Build a self-contained interactive HTML network diagram from the AllMusic influence dataset.
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DATASETS = path.join(ROOT, 'datasets');

const raw = JSON.parse(fs.readFileSync(path.join(DATASETS, 'music_influence_network.json'), 'utf8'));

// Minimal CSV parser for the nodes file (handles quoted fields with commas).
function parseCsv(text) {
  const rows = [];
  let i = 0, field = '', row = [], inQuotes = false;
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i+1] === '"') { field += '"'; i += 2; continue; }
      if (c === '"') { inQuotes = false; i++; continue; }
      field += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ',') { row.push(field); field = ''; i++; continue; }
    if (c === '\r') { i++; continue; }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += c; i++;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const csvText = fs.readFileSync(path.join(DATASETS, 'music_influence_nodes.csv'), 'utf8');
const csvRows = parseCsv(csvText);
const header = csvRows[0];
const idx = {
  name: header.indexOf('name'),
  inflBy: header.indexOf('influencedBy_count'),
  infl: header.indexOf('influenced_count'),
  url: header.indexOf('allmusic_url'),
};
const csvByName = new Map();
for (let r = 1; r < csvRows.length; r++) {
  const row = csvRows[r];
  if (!row[idx.name]) continue;
  csvByName.set(row[idx.name], {
    influencedBy_count: parseInt(row[idx.inflBy], 10) || 0,
    influenced_count: parseInt(row[idx.infl], 10) || 0,
    allmusic_url: row[idx.url] || null,
  });
}

const edges = raw.edges.map(e => ({ s: e[0], t: e[1] }));

const inDeg = new Map();
const outDeg = new Map();
for (const { s, t } of edges) {
  outDeg.set(s, (outDeg.get(s) || 0) + 1);
  inDeg.set(t, (inDeg.get(t) || 0) + 1);
}

const nodesOut = raw.nodes.map(n => {
  const csv = csvByName.get(n.id);
  return {
    id: n.id,
    profiled: !!n.profiled,
    inDeg: inDeg.get(n.id) || 0,
    outDeg: outDeg.get(n.id) || 0,
    url: csv ? csv.allmusic_url : null,
  };
});

const profileDetails = {};
for (const n of raw.nodes) {
  if (!n.profiled) continue;
  const csv = csvByName.get(n.id);
  profileDetails[n.id] = {
    influencedBy: n.influencedBy || [],
    influenced: n.influenced || [],
    url: csv ? csv.allmusic_url : null,
  };
}

const metadata = {
  source: raw.metadata.source,
  description: raw.metadata.description,
  collectedDate: raw.metadata.collectedDate,
  profiledArtists: raw.metadata.profiledArtists,
  totalArtistNodes: raw.metadata.totalArtistNodes || raw.metadata.totalArtists,
  totalInfluenceEdges: raw.metadata.totalInfluenceEdges || raw.metadata.totalInfluenceLinks,
};
const payload = { metadata, nodes: nodesOut, edges, profiles: profileDetails };

console.log(`Nodes: ${nodesOut.length}  Edges: ${edges.length}  Profiled: ${nodesOut.filter(n => n.profiled).length}`);

const template = fs.readFileSync(path.join(ROOT, 'network_template.html'), 'utf8');
const html = template.replace('__DATA_PLACEHOLDER__', JSON.stringify(payload));
const outPath = path.join(ROOT, 'index.html');
fs.writeFileSync(outPath, html, 'utf8');
console.log(`Wrote ${outPath}  (${(fs.statSync(outPath).size / 1024).toFixed(0)} KB)`);
