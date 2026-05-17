# ai-design-studio

Project workspace for the drawing-to-sound system.

## Structure

- `drawing-interface/` — web-based drawing interface for iPad and browser input
- `touchdesigner/` — TouchDesigner project files, patches, and related assets
- `docs/` — mapping rules, architecture notes, and project documentation

## Planned system flow

```text
drawing-interface (Device 1 / web UI)
        ↓ WebSocket / JSON
touchdesigner (sound + visual engine)
        ↓
TouchDesigner output (Device 2 / sound + visuals)
```
