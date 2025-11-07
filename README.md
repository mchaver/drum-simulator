# 🥁 Drum Simulator

A simple PS1-style drum simulator built with TypeScript and Three.js.

## Features

- **PS1 Aesthetic**: Low-poly models, flat shading, and retro graphics
- **6 Drum Pieces**: Kick, snare, hi-hat, two toms, and crash cymbal
- **Keyboard Controls**: Play drums using Q, W, E, A, S, D keys
- **Synthesized Sound**: Web Audio API generates drum sounds on the fly
- **Visual Feedback**: Drums animate and flash when hit

## Setup

Install dependencies:
```bash
npm install
```

## Development

Run the development server:
```bash
npm run dev
```

Then open your browser to the URL shown (usually http://localhost:5173)

## Build

Build for production:
```bash
npm run build
```

The built files will be in the `dist` folder.

## Controls

- **Q** - Kick Drum
- **W** - Snare
- **E** - Hi-Hat
- **A** - Tom 1
- **S** - Tom 2
- **D** - Crash Cymbal

## Next Steps

Some ideas for expanding the project:
- Add mouse click support for drums
- Load actual drum samples instead of synthesized sounds
- Add recording/playback functionality
- Add more drum pieces (ride cymbal, more toms, etc.)
- Add camera controls to rotate around the drum set
- Add visual effects (particle effects on hit)
- Add different drum kits to switch between
- Create a desktop version with Electron or Tauri

## Tech Stack

- TypeScript
- Three.js (3D graphics)
- Web Audio API (sound synthesis)
- Vite (build tool)
