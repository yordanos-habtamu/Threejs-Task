# Three.js Simple 3D Editor – Senior Assessment

A clean, production-ready, fully object-oriented 3D editor built with Three.js (r160) that meets **all required features** and **all bonus points**.

Live demo: just open `index.html` in any modern browser.

## How to run the app

1. Save the provided code as `index.html`
2. Open the file in Chrome / Firefox / Edge (no server needed – works offline)
3. That’s it! All dependencies are loaded from the official unpkg CDN via import maps.

## Completed Features

### Core Requirements
- Perspective camera + OrbitControls
- GridHelper + AxesHelper
- Add **Box**, **Sphere**, **Cylinder** (with one-click button + color picker)
- Objects spawn at **random positions** inside a ~20×20×20 volume
- Click-to-select with **raycasting**
- Visual highlight of selected object (emissive glow)
- Full **TransformControls** (drag to Move / Rotate / Scale) with mode buttons
- Translation snap = 1 unit  
  Rotation snap = 15°  
  Scale snap = 0.25
- Selected object info panel showing:
  - Type
  - Position (X, Y, Z)
  - Scale (X, Y, Z)
  - Computed real-world dimensions (size, radius, radius, cylinder R/H)
- **Scene persistence** – Export / Import entire scene as JSON (positions, rotations, scales, colors, types)

### Bonus Features (all implemented)
- TransformControls for direct drag manipulation
- Grid snapping for translation
- Full **Undo / Redo** stack (works with add, delete, move, rotate, scale, color changes)
- **Delete selected object** button
- **Color picker** for newly created objects
- **Light / Dark theme** toggle (auto-updates background, grid, lights)
- Dedicated **Zoom In / Zoom Out** buttons (smooth & reliable)

## What I would add/fix with more time

| Feature                         | Reason / Benefit                                      |
|---------------------------------|--------------------------------------------------------|
| Multi-selection & group transform | Real CAD workflow                                      |
| Keyboard shortcuts (Del, Ctrl+Z, Ctrl+Shift+Z, etc.) | Faster editing                                         |
| Direct property panel (sliders for position/rotation/scale) | Precise numeric control                                |
| Parametric shape editing (change radius, height, etc. after creation) | True editor experience                                 |
| Command pattern instead of full-scene snapshots | Better performance with hundreds of objects            |
| Drag-and-drop OBJ/GLTF import   | Quick asset insertion                                  |
| Scene tree / hierarchy panel    | Visibility toggles, renaming, parenting                |
| Touch / mobile support          | Wider usability                                        |

The current codebase is deliberately structured as a single, well-encapsulated `ThreeJSEditor` class – making any of the above extensions trivial and safe.

**Ready for production and further team development.**