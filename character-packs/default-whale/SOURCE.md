# Default whale character source

The built-in character is the approved chibi-maid derivative of the “鲸鱼娘形象” published by Bilibili creator 上善无形 (UID 4456176):

- Original post: <https://www.bilibili.com/opus/1231977657712771073>
- Author profile: <https://space.bilibili.com/4456176>
- Original license: CC BY-NC-SA 4.0

The author's stable identity cues are the blue-to-aqua very long hair, ahoge,
aquamarine gradient eyes, cetacean head fins, and whale tail. Community Q-version
references supplied the navy maid dress, ruffled headdress, whale apron emblem,
and compact desktop-pet proportions. Reference screenshots and authoring
masters are not present in the package; only the user-approved transparent
action/movement derivatives listed in `runtime/production-v1` are distributed.

Project modification chain:

1. A new raster derivative was generated from the documented identity and Q-version references.
2. The user approved `artifacts/whale-pet-final-character-preview-v1.png` as the canonical visual baseline.
3. `scripts/build-character-assets.py` removes only edge-connected baked checkerboard pixels and preserves enclosed white costume regions.
4. The script writes `source/canonical-transparent.png` and a 224×224 transparent runtime PNG for a 112×112 desktop-pet canvas.
5. The first 16-cel butterfly-story sheet is retained as `source/butterfly-story-sprites-v1.png` for provenance only; it is no longer a runtime asset because it coupled character, prop, scale, and story.
6. The rejected 25-cel character-only action sheet remains as `source/reusable-actions-v1.png` for provenance and comparison, but is no longer distributed as a runtime asset because its independently varied poses did not maintain scale, anchors, or gait continuity.
7. The user supplied nine same-canvas running-sequence images generated through ChatGPT. They are retained individually under `reference/run_reference_frames/pose-sequences/run-v2/chatgpt-frames/`; no source image is overwritten when alignment changes.
8. `scripts/normalize-pose-sequence.py` deterministically fits and removes the neutral background, detects the stable face component, normalizes face scale and position, applies one common square crop, and exports independent transparent 192×192 poses plus a review contact sheet and GIF.
9. The nine generated poses remain source-only motion references. The rejected 3×3 runtime atlas is no longer shipped.
10. `side-rig-parts-v3.png` and its prompt/layout files are retained only as rejected experiment history. They are not referenced by the current manifest because switching to that side view changed the approved character silhouette.
11. The user-provided 5.08-second Vidu video remains an external motion-quality reference only. Its pixels are not shipped. It established the desired compression/lift rhythm and delayed hair/skirt/tail follow-through while its black frames, frozen section, and redraw drift were rejected.
12. The user then provided the 10.08-second master named `Q版蓝发女仆鲸鱼娘左侧身原地跑步动画母带制作.mp4`. The stable 1.50–4.50 second interval begins and ends on the same pose. Twenty-four evenly spaced frames are extracted from that one continuous shot and retimed to a 720ms loop; the source video itself is not distributed.
13. `scripts/normalize-pose-sequence.py --preserve-source-scale --clean-neutral-floor --keep-largest-component` removes the neutral background, floor shadow, watermark fragments, and isolated debris without normalising away intentional body compression or airborne height. The transparent 224×224 review/source cels live under `reference/run_reference_frames/run-master-v2/normalized/`.
14. `scripts/build-run-master-atlas.py` deterministically packs the approved front texture plus the 24 run cels into one 5×5 content-hashed runtime atlas. The Browser uses a hybrid rig: the front actor keeps its bounded 18×18 local mesh and five springs for quiet actions; the run actor selects one complete cel through a stepped `runFrame` Motion curve. Butterfly and other props remain independent actors.
15. One 22px travelled stride maps to the complete 720ms/24-cel loop. Notice/ready holds the same side-view run cel used at gait start, so ready→run never changes character scale or viewpoint. A 120ms turn hand-off switches the front and side actors once at an 8% horizontal compression midpoint; it never draws both whole-character cels together and never fades through an empty frame. Frame selectors never interpolate through unrelated cels. Jump, air, and land remain absent until coherent art is accepted, and an asset or WebGL failure still falls back to the approved static PNG.
16. A separate Gate-1 realtime-runtime proof now lives under `source/realtime-phase1/`. Its `parts-v1/` directory contains 15 independently extracted transparent PNGs (13 active in the first preview); none is an action frame and no runtime atlas is used. The proof is intentionally not wired into the production manifest until the Bone + Part + Keyframe visual gate is accepted. The previous sequence assets are isolated under `reference/run_reference_frames/` and remain provenance/reference material only.
17. The accepted `whale-2d-navigation` desktop-pet runtime was promoted into `runtime/production-v1`: the `see-through-idle-rig-v2` layers retain their 1280 design coordinates, and the calibrated transparent WebM movement/action derivatives retain the same square bottom anchor. The earlier compact community/WhaleRig2 plugin pack is preserved under `source/legacy-plugin-runtime-v1` and is no longer distributed.

The character rasters, generated cels, and adaptations are distributed under CC BY-NC-SA 4.0.
WhaleRig code, JSON motion implementation, and plugin code remain MIT licensed.
