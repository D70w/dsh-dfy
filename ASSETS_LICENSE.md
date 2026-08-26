# Asset license

## Built-in “大肥鱼” character pack

- Runtime assets: `character-packs/default-whale/runtime/production-v1/`
- Editable approved source: `artifacts/whale-pet-final-character-preview-v1.png`
- Transparent processing source: `character-packs/default-whale/source/canonical-transparent.png`
- Rejected action reference: `character-packs/default-whale/source/reusable-actions-v1.png`
- Character Pack v2 run sources (reference only): `reference/run_reference_frames/pose-sequences/run-v2/`
- Character source title: “鲸鱼娘形象”
- Original author: 上善无形 (Bilibili UID 4456176)
- Original source: <https://www.bilibili.com/opus/1231977657712771073>
- Author profile: <https://space.bilibili.com/4456176>
- Asset license: [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International](https://creativecommons.org/licenses/by-nc-sa/4.0/)
- Redistribution status: included in the npm package under CC BY-NC-SA 4.0; it is not covered by the repository MIT license.

The built-in character is a modified derivative. The project combined the
author's blue whale-girl identity with a community chibi maid interpretation,
generated and selected a new raster character illustration, removed its baked
checkerboard background, prepared the approved layered `see-through-idle-rig-v2`,
and calibrated the user-supplied transparent movement and action clips against
the same 1280 design coordinates. The original Bilibili images and community
screenshots are not bundled. The edited character layers and transparent WebM
adaptations in `runtime/production-v1` are bundled under this character-pack
license; authoring masters and historical experiments remain outside the npm package.

CC BY-NC-SA 4.0 requires attribution, non-commercial use, indication of
changes, and distribution of adaptations under the same license. Reusers must
preserve this notice. The character is community artwork and is not presented
as an official DeepSeek endorsement.

## Code and interface artwork

All TypeScript, shaders, motion data, UI styling, and non-character interface
elements remain licensed under the repository `LICENSE` (MIT). See
`character-packs/default-whale/SOURCE.md` and `LICENSE` for the character-pack
boundary.
