# Johnbosco J · Portfolio

A first-person walk through a loft. A sheriff walks you in and sits you on the sofa, the TV runs
Riven TV with the portfolio as its apps, and the rest of the house is there to explore.

## Run it

```bash
npm install
npm run dev
```

`npm run build` writes the static site to `dist/`. Vercel builds it with the settings in `vercel.json`.

## Controls

- **W A S D** walk, **drag** to look, **Shift** to walk briskly, **E** to use what you are standing at.
- **On the sofa**: arrow keys and Enter drive the TV, P is power, 1–7 jump to an app. Move the mouse
  to the lower right to raise the remote. W A S D gets you up.
- **At the keyboard** (E to sit): `A S D F G H J K L ;` are the white keys, `W E T Y U O P` the
  sharps, `Z` / `X` move down and up an octave. All 61 keys can be clicked.
- **On the patio**: the key fob gets you in and out of the car and tells your guide to drive or stop.

## Where things live

| File | What it holds |
|---|---|
| `src/data.js` | All the content: profile, projects, experience, awards, contact, the laptop's sites, guide names |
| `src/tv.js` | The TV, drawn on Riven TV's 960×540 layout |
| `src/house.js` | Everything you can walk up to: trophies, fridge, laptop, keyboard, car, hen, résumé, autograph |
| `src/main.js` | Walking, camera, story, guides, remote, lighting |
| `src/sheriff.js` | The two guides |
| `src/audio.js` | Sound, and the list of files that replace the synthesised defaults |

## Adding sound

Drop files into `public/audio/` and add each one to `public/audio/manifest.json` (paths relative to `public/audio/`). Only files listed there are requested:

- `music/*.mp3`: background songs listed in `src/data.js`, shuffled at 2.5% volume
- `typewriter.mp3`, `footstep.mp3`: one key strike, one step
- `voice/sheriff/<line-id>.mp3` and `voice/ranger/<line-id>.mp3`: spoken lines. When a file exists the
  guide lip-syncs to it and the caption keeps pace. Line ids are the `id:` values in `src/main.js`
  (for example `intro-1`, `tv-home`, `at-shelf`, `tired-1`, `takeover-1`).

See `CREDITS.md` for third-party assets.
