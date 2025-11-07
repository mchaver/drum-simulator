# 🥁 Drum Simulator

A simple PS1-style drum simulator built with TypeScript and Three.js.

## Features

- **PS1 Aesthetic**: Low-poly models, flat shading, and retro graphics
- **8 Drum Pieces**: Kick, snare, hi-hat, three toms (rack + floor), crash cymbal, and ride cymbal
- **Keyboard Controls**: Play drums using Q, W, E, A, S, D, F, R keys
- **Mouse Interaction**: Click on drums to play them
- **Interactive Camera**: Right-click drag to orbit camera, scroll wheel to zoom
- **Synthesized Sound**: Web Audio API generates drum sounds on the fly
- **Visual Feedback**: Drums animate, flash, and emit particles when hit
- **Particle Effects**: PS1-style cube particles with physics and fade-out

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

### Keyboard
- **Q** - Kick Drum
- **W** - Snare
- **E** - Hi-Hat
- **A** - Tom 1
- **S** - Tom 2
- **F** - Floor Tom
- **D** - Crash Cymbal
- **R** - Ride Cymbal

### Mouse
- **Left Click** - Click on any drum to play it
- **Right Click + Drag** - Rotate camera around the drum set
- **Scroll Wheel** - Zoom in/out

## Next Steps

Some ideas for further expanding the project:
- Load actual drum samples instead of synthesized sounds
- Add recording/playback functionality
- Add different drum kits to switch between
- Improve particle effects with more variety (sparks, rings, etc.)
- Add velocity-sensitive drum hits (louder/softer based on input)
- Add a metronome or rhythm guide
- Create a desktop version with Electron or Tauri
- Add MIDI controller support

## Tech Stack

- TypeScript
- Three.js (3D graphics)
- Web Audio API (sound synthesis)
- Vite (build tool)
