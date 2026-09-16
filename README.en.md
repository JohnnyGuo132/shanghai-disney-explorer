<div align="center">

# Wonder Walk · Shanghai Disneyland

**Explore the park at your own pace. Stay for the castle after dark.**

Browser-based 3D exploration · Day and night · Walking routes · Castle show

[Quick start](#quick-start) · [Release notes](./CHANGELOG.md) · [简体中文](./README.md)

</div>

![In-app daylight view of the castle and gardens](./docs/media/daylight.png)

## About

Wonder Walk is an unofficial 3D exploration app inspired by Shanghai Disneyland. Move between park-wide aerial views and ground-level paths, approach landmarks, explore changing light, and watch a castle fireworks demonstration.

**v1.0.3 is the first public open-source release.** Browse or clone the source and download release assets without signing in. All runtime assets are bundled; local use needs no account, API key, or external asset CDN. GitHub Pages remains disabled; this release makes the source and downloadable packages public.

This release licenses original project content under MIT and updates the public collaboration guides. The scene retains v1.0.2's castle ground-contact correction and the earlier zoom stability fixes. Third-party software, assets, and data keep their own licenses. See the [v1.0.3 notes](./docs/releases/v1.0.3.md).

Ground outlines are derived from OpenStreetMap. Buildings, landscape details, and interiors are approximate reconstructions informed by public references. This is not an official guide or a survey-grade replica. Routes and show sequences belong to the virtual scene.

## Features

- Eight themed lands and 22 main destinations, with additional selectable buildings.
- Ground-level exploration, close-up views, continuous zoom out into aerial mode, and a minimap.
- Walking routes from the current position, distance and time estimates, autoplay, pause, and resume.
- Daylight, twilight, and night; sun, moon phase, and stars calculated for the selected Shanghai date and time.
- An approximately one-minute castle show combining fireworks, lighting, projection, and smoke.
- Architectural details, vegetation, paving, street furniture, and animated rides; selected rides offer normal, slow, and paused playback.
- Bundled models, textures, rendering libraries, and decoders. No npm dependencies to install.

| Castle show | Park overview |
| --- | --- |
| ![In-app castle show at night](./docs/media/night-show.png) | ![In-app aerial park view](./docs/media/park-overview.png) |

These are actual browser captures from v1.0.0. Rendering varies with hardware, viewport, and quality settings.

## Quick start

1. Open the [v1.0.3 release](https://github.com/JohnnyGuo132/shanghai-disney-explorer/releases/tag/v1.0.3). No GitHub login is required to download it.
2. Download and extract `shanghai-disney-explorer-v1.0.3-source.zip`.
3. Install [Node.js](https://nodejs.org/) **22 or later**. Open a terminal in the extracted project directory and run:

```sh
npm run dev
```

Visit **http://127.0.0.1:4173/** and allow the scene to load. No `npm install` or build step is needed. Keep the terminal open while exploring; press `Ctrl+C` to stop the server. If PowerShell blocks `npm.ps1`, use `node scripts/serve.mjs` instead.

For a different port, run `npm run dev -- --port 4184`. Do not open the HTML file directly: module and model loading requires HTTP.

The release also provides a static website archive, SHA-256 checksums, and a version manifest. See [release packaging](./docs/RELEASING.md) for their roles and verification commands.

Or clone the public repository:

```sh
git clone https://github.com/JohnnyGuo132/shanghai-disney-explorer.git
cd shanghai-disney-explorer
npm run dev
```

## Controls

| Input | Action |
| --- | --- |
| Drag | Look around; orbit in aerial mode |
| Scroll | Zoom; continue zooming out to enter aerial mode |
| `W A S D` / arrow keys | Walk; hold `Shift` to move faster |
| Click a building | Travel to a nearby viewing point |
| Search a destination | Select it, then choose the close-up or navigation action |
| Navigation controls | Preview, start, pause, resume, or inspect the route |
| Time / fireworks controls | Change lighting or watch the castle show |
| Quality control | Switch between high quality and reduced rendering cost |
| `/` / `Esc` | Open search / dismiss panels and interrupt automatic movement |

The app interface and detailed guides are currently in Chinese. See the [user guide](./docs/USER_GUIDE.md).

## Requirements and limits

A modern browser with **WebGL 2** and hardware acceleration is required. Desktop mouse and keyboard are the primary input devices. Touch direction buttons are available, but broad mobile and tablet validation has not been completed.

Vegetation, shadows, transparent surfaces, and fireworks are GPU-intensive. Use the lower-cost quality setting first. No fixed frame rate, loading time, or broad hardware compatibility is guaranteed. See [performance and compatibility](./docs/PERFORMANCE.md) for the validation scope.

Interiors consist mainly of selected shop windows and furnishings; many buildings cannot be entered. The app does not provide live queues, ticketing, operating schedules, or ride simulation. See [known limits and roadmap](./docs/ROADMAP.md).

## Development

`dist/` contains both editable website source and the complete deployable payload. `scripts/` contains the local server, checks, tests, and release packager. There is no frontend build step.

```sh
npm run check
npm test
```

Read the [architecture guide](./docs/ARCHITECTURE.md), [contribution guide](./CONTRIBUTING.md), [support policy](./SUPPORT.md), and [security policy](./SECURITY.md) before making changes.

The [v1.0.3 release notes](./docs/releases/v1.0.3.md) describe the licensing and public distribution changes. The [v1.0.2 patch notes](./docs/releases/v1.0.2.md) describe the castle base correction and its verification scope. The [v1.0.1 patch notes](./docs/releases/v1.0.1.md) document the earlier zoom stability fixes. The [v1.0.0 validation record](./docs/RELEASE-VALIDATION.md) preserves the first release's browser checks, screenshots, and untested environments.

[Issues](https://github.com/JohnnyGuo132/shanghai-disney-explorer/issues/new/choose) and pull requests are welcome. Report security issues through the [private reporting channel](./SECURITY.md). Historical v1.0.0–v1.0.2 documents retain the private distribution policy that applied at the time; this README and the v1.0.3 notes describe the current policy.

## Licensing and credits

Original project content is licensed under **MIT**. You are welcome to use, modify, and contribute to it. Third-party software, assets, and data retain their existing terms and are outside the project's MIT grant. See [LICENSE.md](./LICENSE.md), [third-party notices](./THIRD_PARTY_NOTICES.md), and the [asset credits](./dist/credits.html).

Thanks to Three.js, OpenStreetMap contributors, Poly Haven, ambientCG, HYG, NASA SVS, and all bundled library and asset authors.

This project is not affiliated with or endorsed by Disney or Shanghai Disney Resort. Names, trademarks, and third-party likenesses belong to their respective rights holders.
