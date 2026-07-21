# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ArtistInfluence.ai is a self-contained, single-page interactive network visualization of the AllMusic artist-influence graph. It is a static site — no server, no build step beyond a one-shot data injection — built around a Cytoscape.js rendering of ~5,890 artist nodes and ~13,463 directional influence edges sourced from allmusic.com.

The deliverable is a single `index.html` (≈2.6 MB) that loads the bundled Cytoscape libraries and an embedded data payload, then renders the graph entirely in the browser.

## Build

The only build step is a Node script that injects the dataset into the HTML template.

```
node build_network.js
```

`build_network.js` reads `datasets/music_influence_network.json`, recomputes per-node in/out degree from the edges (the values stored on each node in the JSON only cover profiled data, so the script treats the edges array as authoritative), inlines profiles into a `name -> profile` lookup, and writes the result into `index.html` by replacing the `__DATA_PLACEHOLDER__` token in `network_template.html`.

There are no tests, no linter, and no package.json. The only runtime dependency is Node's standard library (for `fs` and `path`).

## Dataset

- `datasets/music_influence_network.json` — single source of truth. Top-level keys: `metadata`, `nodes`, `edges`, `profiles` (a list, not a map; `build_network.js` indexes it by name).
- `datasets/music_influence_edges.csv`, `datasets/music_influence_nodes.csv` — exports of the same data, useful for quick inspection or external tools.
- `datasets/past/` — older snapshots kept for reference; do not edit by hand.

`profiles[i].influencedBy` and `profiles[i].influenced` contain entries that may be either a string or a `{name, href}` object — the renderer in `network_template.html` normalizes both shapes.

## Data Refresh Workflow (AllMusic scraping)

The dataset is built by scraping allmusic.com. The pattern is documented in `README.md` and uses three `localStorage` keys that persist across page navigations on allmusic.com: `processQueue`, `influenceGraph`, `visitedUrls`. For each queued URL:

1. Navigate to `{url}#relatedArtists` and wait ~3 seconds.
2. Run the extraction JS inline (not wrapped in a function) and verify non-zero `by=` / `inf=` counts.
3. If counts are zero, wait 2–3 more seconds and re-run; if the page redirects to a search, drop the URL from the queue.
4. After a batch, regenerate the three exported files (JSON + two CSVs) via the Blob download scripts.

Future sessions expanding the dataset should follow this same loop.

## Architecture (in `network_template.html`)

The template is a single HTML file containing CSS, layout, and the entire client-side application. It is split into three regions in a CSS grid:

- **Left panel** — title/stats, view-mode `<select>`, search, filters (toggle unprofiled, minimum-degree slider), legend, tips.
- **Center** — Cytoscape canvas `#cy`, with a toolbar (Fit, Re-layout) and a loading overlay.
- **Right panel** — details for the selected artist: degree counts, external AllMusic link, and (for profiled artists) the full `influencedBy` / `influenced` lists, otherwise a list derived from edges to profiled neighbors.

Key functions:
- `buildElements(mode, opts)` — produces the `nodes`/`edges` arrays for Cytoscape. Honors three view modes: `profiled` (default), `all`, and `ego` (selected node + 1-hop neighbors, activated by double-click). Respects `showUnprofiled` and `minDeg` filters (filters are bypassed in ego mode).
- `rebuild(animate)` — tears down `cy.elements()`, re-adds from `buildElements`, then runs the `fcose` layout. Layout parameters (node repulsion, ideal edge length, iteration count, `quality: 'draft' | 'default'`) branch on node count.
- `selectArtist(id)` — centers, zooms, highlights neighborhood via `.faded`/`.highlight`/`highlight-in`/`highlight-out` CSS classes, and renders the right panel.
- `renderDetails(id)` — normalizes the heterogeneous profile entries, builds the HTML for the right panel, and wires up click handlers on related-artist items (which switch to the `all` view if the clicked artist isn't in the current graph).

Search input: case-insensitive substring match on node id, sorted profiled-first then by degree, capped at 30 results.

## Vendored Libraries (`vendor/`)

Cytoscape.js plus the `fcose` layout and its `cose-base`/`layout-base` dependencies. They are loaded with plain `<script>` tags from the template. Do not replace these with a CDN — the site is designed to work fully offline once built.

## Conventions

- `index.html` is generated; do not edit it directly — change `network_template.html` or `build_network.js` instead.
- After any data change, re-run `node build_network.js` and commit the regenerated `index.html` together with the updated dataset.
- Edge direction is `source -> target` meaning "source influenced target" (matches the CSV columns).
- Color coding in the renderer: unprofiled = gray; profiled tiers step purple→gold by `outDeg` (≥10, ≥30, ≥60).
