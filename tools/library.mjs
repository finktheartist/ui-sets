// Builds library/components.json, the data behind library/index.html, from each set's registry.json.
// Reads the sets in sets.json from _sets/ID/ (symlinks, see the README). Run from the repo root: node tools/library.mjs
// Sizes from library/sizes.json (written by tools/library-shots.mjs) are merged in when present, and a card gets a
// loop when tools/library-loops.mjs has recorded one.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const KIND = {
  // what a control is for, which is how the library is filtered
  Buttons: ['button', 'launch', 'hoard', 'raven', 'plunger', 'drain', 'bumper'],
  Inputs: ['input', 'slider', 'dial', 'keep', 'stepper'],
  Selection: ['toggle', 'checkbox', 'radio', 'rating', 'lock', 'mode', 'checklist', 'targets'],
  Navigation: ['tabs'],
  Loading: ['progress', 'loading', 'round', 'sigil'],
  Feedback: ['toast', 'tooltip', 'alert'],
  Status: ['agent', 'sage'],
};
const kindOf = (name) => Object.keys(KIND).find((k) => KIND[k].includes(name)) || 'Other';
const PREFIX = { 'sakuga-vfx': 'Sakuga ', 'rubber-hose-ui': 'Rubber Hose ', 'cockpit-ui': 'Cockpit UI ', 'pinball-ui': 'Pinball UI ' };

const sets = JSON.parse(readFileSync('sets.json', 'utf8')).sets.filter((s) => s.status === 'live');
const sizes = existsSync('library/sizes.json') ? JSON.parse(readFileSync('library/sizes.json', 'utf8')) : {};
const out = { sets: [], components: [] };

for (const s of sets) {
  const reg = JSON.parse(readFileSync(`_sets/${s.id}/registry.json`, 'utf8'));
  out.sets.push({ id: s.id, name: s.name, url: s.url, repo: s.repo, paper: s.paper, made: s.made, tagline: s.tagline });
  for (const it of reg.items) {
    const file = it.files[0].path, dir = file.slice(0, file.lastIndexOf('/') + 1);
    const tag = (it.docs || it.description).match(/<([a-z]+(?:-[a-z]+)+)/)?.[1] || null;
    const title = it.title.startsWith(PREFIX[s.id] || '\0') ? it.title.slice(PREFIX[s.id].length) : it.title;
    const id = `${s.id}/${it.name}`;
    out.components.push({
      id, set: s.id, name: it.name, title: title[0].toUpperCase() + title.slice(1), kind: kindOf(it.name),
      description: it.description.replace(/\s*One file, no dependencies[^.]*\.?$/, '').replace(/\s*One file.*$/, ''),
      docs: (it.docs || '').replace(/\s*More: \S+\s*$/, ''), tag, file, demo: dir, script: it.files[0].target.replace(/^~\/public/, '').replace(/^~/, ''),
      install: `npx shadcn add ${s.repo}/${it.name}`, size: sizes[id] || null,
      loop: existsSync(`library/loops/${s.id}--${it.name}.mp4`),
    });
  }
}
writeFileSync('library/components.json', JSON.stringify(out, null, 1) + '\n');
console.log(`${out.components.length} components from ${out.sets.length} sets`);
