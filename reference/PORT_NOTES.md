# WebGL port notes

`original-webgl.html` is the standalone HTML/Three.js scroll scene the user built.
It's the single reference for porting the scene into `components/mind/Cortex.tsx`.

## Preserve
- Scroll-linked camera path through a pre-formed neural network
- Filament color (#4dd4e8) and orange pulse (#ff7a3d)
- Node cluster density and drift physics
- Bloom pass on filaments if present

## Add (Round 3 physics)
- Activation propagation: uniform `uPulseOrigin` + `uPulseTime` driven by lib/bus.ts
- Dendritic sprouting: rare new-node spawn animation on unseen queries
- Myelination: session-persistent path glow (Redis-backed) via `route_to_section` events
- Ambient traffic: idle-state pulses along random paths

## Do not
- Do not tear down and rebuild the network on section change — camera dollies through it
- Do not touch cyan or orange from the DOM layer; they are WebGL-only
