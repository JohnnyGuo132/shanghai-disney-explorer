# Sky asset credits and licenses

## SunCalc 2.0.2

`vendor/suncalc-2.0.2.js` is an unchanged copy of [SunCalc 2.0.2](https://github.com/mourner/suncalc/tree/v2.0.2), by Volodymyr Agafonkin and contributors. **BSD-2-Clause**, not MIT. The original copyright notice, conditions, and disclaimer are retained in `licenses/SunCalc-BSD-2-Clause.txt` and must accompany redistribution.

## Moon surface map

`moon-albedo-2k.jpg`: NASA's Scientific Visualization Studio, **CGI Moon Kit**, 2025 color map, 2048 × 1024 pixels. Visualization: Ernie Wright (USRA); data from the Lunar Reconnaissance Orbiter camera and laser altimeter teams. The original downloaded JPEG is unchanged.

- [Asset and explanation](https://svs.gsfc.nasa.gov/4720/)
- [Original JPEG](https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_2k.jpg)
- [NASA SVS reuse statement](https://svs.gsfc.nasa.gov/help/): SVS content is public domain unless individually noted. This color-map entry carries no contrary restriction.
- [NASA media usage guidance](https://www.nasa.gov/nasa-brand-center/images-and-media/)

Suggested displayed credit: “Moon map: NASA Scientific Visualization Studio / Ernie Wright; LROC and LOLA teams.” This does not imply NASA endorsement.

## Bright-star catalog

`catalog.json` is a derivative of **HYG Database 4.1**, David Nash / Astronexus. It is distributed under **Creative Commons Attribution-ShareAlike 4.0 International**. Keep this separate data file under the same license, preserve its attribution/source metadata, and make this notice and the license link available alongside the distributed catalog.

- [HYG project](https://github.com/astronexus/HYG-Database)
- [Pinned original data](https://raw.githubusercontent.com/astronexus/HYG-Database/c7f7f883fe678cc7680169a50ccd7dcc49b060ce/hyg/CURRENT/hygdata_v41.csv)
- [Original license](https://github.com/astronexus/HYG-Database/blob/c7f7f883fe678cc7680169a50ccd7dcc49b060ce/LICENSE)
- [CC BY-SA 4.0 license](https://creativecommons.org/licenses/by-sa/4.0/)

Changes: select the 1,000 brightest catalog records other than the Sun; retain RA, Dec, magnitude, B−V, IDs and names; omit other fields; estimate color temperature from B−V where available. Coordinates are J2000.0; RA is hours and Dec is degrees. Resolved binary components are retained. Some catalog secondary-component labels are informal; names are not an assertion of IAU approval.

The color temperature estimate uses the formula in [F. J. Ballesteros, “New insights into black bodies” (2012)](https://arxiv.org/abs/1201.1809). It is an approximate rendering aid, not a measured stellar effective temperature. Four selected records have no usable B−V/temperature value.

## Computation references

- Sun/moon position and phase: SunCalc 2.0.2 source and the Meeus algorithms cited there.
- Mean sidereal time and longitude convention: [US Naval Observatory](https://aa.usno.navy.mil/faq/GAST).
- J2000 precession: IAU 1976 / Lieske published polynomial model; coefficients checked against [ERFA's reference implementation](https://github.com/liberfa/erfa/blob/master/src/prec76.c). The adapter implements the formulas with its own matrix operations; it does not copy the ERFA C routine.
- QA phase-date reference: [Hong Kong Observatory September 2026 astronomical calendar](https://www.hko.gov.hk/en/gts/astron2026/files/2026cal09.pdf), HKT = UTC+8.

Research downloads and QA scripts in `source/` are not part of the website asset payload.
