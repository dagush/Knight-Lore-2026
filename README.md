# Knight Lore 2026

Knight Lore 2026 is an experimental browser project that runs the ZX Spectrum
game through JSSpeccy 3 while building a parallel semantic 3D view of the same
room state.

Live page:

https://dagush.github.io/Knight-Lore-2026/

This is a rewrite/reinterpretation of the work originally done by Ricard
Galvany in 2006. The original project, Knight Lore 2006, is here:

https://ima.udg.edu/~dagush/Projects/KnightLore2006/

## How To Use

The public GitHub Pages version does not include a Knight Lore snapshot or game
image. Use the emulator's **Open file** button and load your own compatible
`.z80`, `.szx`, `.sna`, or `.zip` snapshot.

Once the game is loaded and a room is active, the page shows two views:

- the original Spectrum rendering from the emulator;
- the reconstructed 3D rendering driven by the live game memory.

The 3D panel can switch between Schematic and Full 3D modes and between several
camera directions.

## What This Is

The project explores whether the data already present in the original game can
be decoded into a higher-level representation:

- room size, shape, colour, walls, arches, tree walls, and portcullises;
- dynamic objects, collectable charms, balls, spikes, blocks, tables, chests,
  cauldron effects, and special room objects;
- player, guard, and wizard position/orientation using sprite billboards;
- texture extraction and dewarping from the original Spectrum sprite data.

It is not intended to be a faithful remake of Knight Lore. It is a proof of
concept, a reconstruction experiment, and a continuation of the 2006 project.

## Development Notes

This repository started as a personal experiment in AI-assisted development. I
tried to keep a detailed record of the reasoning, mistakes, validation passes,
and discoveries in the `Docs` folder:

- `Docs/Plan*.txt` contains planning documents.
- `Docs/logbook.txt` records the day-to-day implementation history.
- `Docs/static.txt`, `Docs/dynamic.txt`, and `Docs/info.txt` collect decoded
  game-data notes.

The old diagnostic workbench is kept separately from the public page. The public
GitHub Pages artifact is generated from `static/knight-lore-2026.html` and does
not publish the local `_tests` folder.

## Build

Install dependencies:

```sh
npm ci
```

Build the normal local distribution:

```sh
npm run build
```

Build the GitHub Pages artifact:

```sh
npm run build:pages
```

The Pages artifact is written to `pages-dist/`. It includes the public HTML
page, banner, favicon, built JSSpeccy bundle, worker, WASM core, ROM files, and
emulator tape-loader assets. The packager deliberately rejects game snapshot or
tape/media files outside the emulator helper assets.

## Deployment

GitHub Pages deployment is handled by `.github/workflows/pages.yml`.

After GitHub Pages is enabled with **GitHub Actions** as the source, every push
to `main` should rebuild and redeploy the public site automatically. A manual
rerun is only needed to retry a failed deployment or redeploy the same commit.

So, for example, if ghost rendering is improved later, committing and pushing
that change to `main` is enough for GitHub Pages to publish the updated version.

## Caveats

This code is experimental. Use it at your own risk.

The renderer contains many empirical decisions, especially for orientation,
diagonal billboard policies, and special-case objects. Some choices are visual
or pragmatic rather than recovered original game logic.

## Sources

- Static and data-format reference:
  https://www.icemark.com/dataformats/knightlore/index.html
- Map layout and item/room tables:
  https://www.porotal.org/knightlore/
- Disassembled code reference:
  https://github.com/jonsole/knightlore/blob/main/knightlore.asm
- JSSpeccy 3 emulator:
  https://github.com/gasman/jsspeccy3
- Original Knight Lore 2006 project:
  https://ima.udg.edu/~dagush/Projects/KnightLore2006/

## License

This project is built on JSSpeccy 3. See `COPYING` and the upstream JSSpeccy
project for licensing details.
