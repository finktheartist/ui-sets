# finktheartist's UI Library

Every control from every component set on one page. Each card loops a short recording of its control being used; hover one to try the real thing, and open it for the install line, the code and a prompt for a coding agent. A second page, `sets/`, lists the sets themselves with a poster each. Each set lives in its own repo and its own deployment; this site only points at them.

Live: https://ui-sets.vercel.app (the sets: https://ui-sets.vercel.app/sets/)

| path | what it is |
|---|---|
| `index.html` | the library |
| `library/` | its data: `components.json`, the stills in `thumbs/` and the loops in `loops/` |
| `sets/index.html` | the page that lists the sets |
| `sets.json`, `posters/` | the sets, and a poster for each |
| `tools/` | the scripts that build `library/` (below) |

## Add a set

1. Add an entry to `sets.json`. The first entry is shown first.
2. Put a poster at `posters/ID.jpg`, 1200 by 750, where `ID` is the entry's `id`.
3. Rebuild the library (below) so its controls appear in it.

```json
{
  "id": "rubber-hose-ui",
  "name": "Rubber Hose UI",
  "tagline": "One or two sentences on what makes this set different.",
  "count": 11,
  "made": "How it is drawn, in a few words",
  "url": "https://rubber-hose-ui.vercel.app",
  "repo": "finktheartist/rubber-hose-ui",
  "status": "live",
  "paper": "#ecd7ac",
  "demos": [{ "name": "Button", "path": "button/", "height": 330 }]
}
```

| field | what it is |
|---|---|
| `url` | where the set is deployed. "Open the gallery" goes here, and the demos are framed from here. |
| `repo` | `owner/name` on GitHub, for the GitHub link and the install command. |
| `status` | `live`, or `soon` for a set that is not deployed yet: the card shows "Coming soon" with only its GitHub link. |
| `paper` | the set's own background colour, shown behind its poster and its demo frame. |
| `demos` | controls to try on this page. `path` is the control's demo page in the set (it is loaded with `?embed=1`), and `height` is the frame's height in pixels, or `[wide, narrow]` if the control is laid out differently on a phone. The first demo is the one in the install command. |

A set needs a demo page per control that accepts `?embed=1` and hides its heading, and a `registry.json` listing its controls. The four sets here all do.

## Rebuild the library

The library is built from each set's `registry.json`, read through the `_sets/` links (see below). With a server running on this folder, and `playwright-core` and `ffmpeg` installed:

```sh
node tools/library.mjs                                    # library/components.json
BASE=http://127.0.0.1:8000/ node tools/library-shots.mjs  # sizes and stills, then run library.mjs again
BASE=http://127.0.0.1:8000/ node tools/library-loops.mjs  # the loops (--missing for only the new ones)
node tools/library.mjs
```

Each control's loop is driven by a short script in `tools/library-loops.mjs` (the `PLAY` map): a new control needs one there. What a control is for (Buttons, Inputs and so on) comes from the `KIND` map in `tools/library.mjs`.

## Run it

```sh
python3 -m http.server 8000     # from this folder
# open http://localhost:8000/ and http://localhost:8000/sets/
```

To preview against copies of the sets on your own machine, before one is deployed, link them under `_sets/` (which git ignores) and add `?local`:

```sh
mkdir -p _sets && ln -s ../../rubber-hose-ui _sets/rubber-hose-ui     # the folder name is the set's id
# open http://localhost:8000/?local
```

With `?local` every set is treated as live and its links and frames point at `_sets/ID/`.

## The posters

Each is a screenshot of the top of the set's gallery at 1200 by 750. Any image that size works.

## License

MIT. See [LICENSE](LICENSE). Each set has its own license in its own repo.
