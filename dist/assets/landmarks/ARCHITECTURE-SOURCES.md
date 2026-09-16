# Shanghai landmark architecture asset manifest

All three GLBs are stable, self-contained, in meters, Y-up, with bottom-center origin and guest-facing front +Z. File bounds below are width × height × depth. Each contains position, normal and UV0 attributes; textures are embedded. No Draco or Meshopt decoder is required.

| File | Bounds, meters | Effective triangles | Raw size | Material meshes |
|---|---:|---:|---:|---:|---:|
| tron.glb | 148.178 × 27.423 × 143.883 | 233,180 | 22.44 MB | 11 |
| mickey.glb | 49.810 × 25.550 × 66.560 | 298,812 | 29.04 MB | 27 |
| zootopia.glb | 111.000 × 40.251 × 80.140 | 258,910 | 25.12 MB | 34 |

## Validation

Every GLB passes Khronos glTF Validator with **0 errors and 0 warnings**. Informational notices identify UV0 attributes retained for future material substitution where the current material is untextured. Browser export and isolated WebGL rendering also completed without page errors. Four preview renders per asset are included as `<asset>-front.png`, `-three-quarter.png`, `-ground.png`, and `-rear.png`.

“Effective triangles” means non-degenerate triangles with geometric area above 1e-8 m², computed from the final world-transformed mesh positions. All three contain 0 degenerate triangles by this test. This is a geometry integrity measure, not a claim that every triangle is visible simultaneously. Surface-area totals include both sides of solids, framing, concealed joining faces and backstage envelopes. Detailed per-material triangle/area counts are in the reports.

## Authorship, sources and changes

Geometry and embedded texture pixels were newly authored procedurally for this task. There are **no downloaded artist meshes, stock models, traced photographic billboards, or image projections** in these assets. No Joseph/Sketchfab castle components were reused. Original brick pixels, clock face drawing and signage typography were generated directly in canvas. No third-party model license or CC-BY model attribution requirement was introduced.

Photographs were used to understand architectural forms and proportions. Their photographers retain the rights to those reference photos; they are not texture sources or included inside the GLBs. Disneyland, TRON, Zootopia, shop names and the represented architecture belong to their respective rights holders; these files are independent architectural interpretations, not official park models. No CC0 dedication or transfer of the user's rights is made by this manifest.

OpenStreetMap building/path footprints informed scale checks only. Credit: © OpenStreetMap contributors, data available under the Open Database License (https://www.openstreetmap.org/copyright). The source geometry was not directly copied as a building mesh.

Changes from references: inferred/set dimensions, simplified backstage envelopes, synthesized facade bay spacing and roof profiles, original lettering, assembled rather than surveyed streetscape layouts, opaque ETFE shading for reliable browser rendering, static coaster rails with no vehicles or ride operation. Small trim is explicitly modeled rather than triangle count padding.

## Integration

Use `INTEGRATION.json` for exact model bounds, material names, checksum, building anchors, dimensional assumptions and source links. Align building anchors to GIS centroids where applicable; the asset center includes foreground canopies/entrances and is not the building center. Root rotates +Z to the correct park-facing azimuth. Each asset uses ordinary glTF PBR materials and can be welded or texture-compressed without changing geometry. Set emissive intensities in runtime to suit day/night lighting.

## Shanghai TRON Lightcycle Power Run canopy and show building

Rear show building 82 x 84 m local plan is an approximation compatible with the rotated OSM axis bbox of about 117 x 130 m; the canopy sweep and height are estimated from architect photographs. The entire asset bbox includes the canopy, rail supports, forecourt ramp and rear building. This is not a surveyed or manufacturer model.

Front +Z, show building behind canopy toward -Z. Align showBuildingCenter to OSM building centroid, not asset center. Cyan ribs can use emissiveIntensity 0 in daylight, 1.5 at night. ETFE uses opaque pearl material with double-sided surfaces for predictable runtime sorting; its inflated cells are geometric.

References:

- [Grimshaw: Shanghai Disney Resort Tomorrowland (project architect, photos and axonometric)](https://grimshaw.global/projects/culture-and-exhibition/shanghai-disney-resort-tomorrowland/)
- [Knute Haglund: Tomorrowland Shanghai (project architect; ETFE pillow detail photograph)](https://www.knutehaglund.com/disneyland-shanghai-tomorrowland)
- [Shanghai Disney Resort factsheet (966 m ride track, not building dimensions)](https://shcorporate.shanghaidisneyresort.com/wp-content/uploads/2024/05/fact_sheet_shanghai_disney_resort_EN_2024_Q2.pdf)
- [OpenStreetMap ride building way 495378407](https://www.openstreetmap.org/way/495378407)

## Shanghai Mickey Avenue station-style gateway and eight-shop streetscape

A compact 66.56 m ensemble fits the approximately 86 m OSM main approach. Individual storefront heights, bays and roof profiles are photographic estimates and an original architectural interpretation. The clock gateway is station-style architecture; Shanghai has no operating Disneyland Railroad.

Gateway at +Z, street recedes toward -Z, two rows flank a roughly 23 m central gap. All three gateway arches remain genuinely open. Eight original shop modules are authored in the builder but final geometry is consolidated per material for 27 draw meshes. No terrain, foliage or rail tracks included.

References:

- [DAPS Magic opening-day photographs: Mickey Avenue and the entrance](https://dapsmagic.com/2016/06/shanghai-disneyland-detail-mickey-avenue-entrance/)
- [Laughing Place Shanghai Disneyland photo tour: Mickey Avenue](https://www.laughingplace.com/w/featured/2017/01/04/shanghai-disneyland-resort-photo-tour-part-3-mickey-avenue/)
- [D23 Remy’s Patisserie (official photo)](https://d23.com/a-to-z/remys-patisserie/)
- [Shanghai Disney Resort Avenue M Arcade (official photo)](https://www.shanghaidisneyresort.com/zh-cn/experience/shop/avenue-m-arcade)
- [OpenStreetMap Mickey Avenue main line way 490511410](https://www.openstreetmap.org/way/490511410)

## Shanghai Zootopia City Hall, skyline, Mane Street and police entrance

Rear envelope 110 x 56 m local plan follows the scale of the rotated OSM body axis bbox, about 130 x 74.5 m. Skyline heights and facade profiles are photographic estimates. The 40.25 m tallest set element is an artistic architectural interpretation, not a verified park height.

Guest-facing City Hall and Police facade at +Z; service envelope at -Z. Nine full-depth skyline silhouettes are separate authored components consolidated per material. Modern text on billboard textures is original typesetting; no photographic billboards or character art embedded.

References:

- [D23 official opening photo gallery](https://d23.com/gallery-totally-paw-some-photos-of-zootopia-at-shanghai-disney-resort/)
- [Disney Parks Blog: Five unique things in Shanghai Zootopia (Mane Street photo)](https://disneyparksblog.com/disney-experiences/5-unique-things-you-can-only-do-in-zootopia-at-shanghai-disney-resort/)
- [Rachel Gouk / Nomfluence firsthand City Hall photograph](https://rachelgouk.com/disneys-first-ever-zootopia-land-opens-at-shanghai-disneyland/)
- [Laughing Place land tour: police rock buttress entrance](https://www.laughingplace.com/w/disney-parks/photos-zootopia-land-shanghai-disneyland/)
- [OpenStreetMap Hot Pursuit building way 1234934044](https://www.openstreetmap.org/way/1234934044)

