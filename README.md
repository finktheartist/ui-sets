# UI sets

One page that lists every component set: a poster, a line about it, a few controls you can try live in a frame, the install command and the links. Each set lives in its own repo and its own deployment; this page only points at them.

Live: https://ui-sets.vercel.app

## Add a set

1. Add an entry to `sets.json`. The first entry is shown first.
2. Put a poster at `posters/ID.jpg`, 1200 by 750, where `ID` is the entry's `id`.

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

A set needs a demo page per control that accepts `?embed=1` and hides its heading. The four sets here all do.

## Run it

```sh
python3 -m http.server 8000     # from this folder
# open http://localhost:8000/
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
