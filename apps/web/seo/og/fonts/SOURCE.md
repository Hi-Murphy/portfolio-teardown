# IBM Plex font sources

The renderer loads these fonts only while generating build-time PNG cards. They are not shipped in
the static export.

## Release assets

| Package       | Release tag            | Asset URL                                                                                | Archive SHA-256                                                    |
| ------------- | ---------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| IBM Plex Sans | `@ibm/plex-sans@1.1.0` | https://github.com/IBM/plex/releases/download/%40ibm/plex-sans%401.1.0/ibm-plex-sans.zip | `fb365d910566e6d199cc2c15579a7dd9a267128e18431a394ed81f1970c69200` |
| IBM Plex Mono | `@ibm/plex-mono@2.5.0` | https://github.com/IBM/plex/releases/download/%40ibm/plex-mono%402.5.0/ibm-plex-mono.zip | `6d23f01257663d8cc49a0d64c22ced630b79e0e2a0ac08a0da86e9a38bbc481c` |

The files were extracted from these paths inside the release archives:

- `ibm-plex-sans/fonts/complete/ttf/IBMPlexSans-SemiBold.ttf`
- `ibm-plex-mono/fonts/complete/ttf/IBMPlexMono-Regular.ttf`
- `LICENSE.txt` (the same licence text is present in both archives)

## Vendored files

| File                       | SHA-256                                                            |
| -------------------------- | ------------------------------------------------------------------ |
| `IBMPlexSans-SemiBold.ttf` | `a20caf8286023a6a7a85e40b1d2a4ae9fc3e3b1f9eda8f4c542dd4986af67bb1` |
| `IBMPlexMono-Regular.ttf`  | `7c6fbddca4b700be918f5f6183d9bd4464fa427fe435f0b480d77fe2bb8c5a43` |
| `OFL.txt`                  | `7e6b2818edbd8f6a01ae80641cc8f16a51080d08fb4e532be3a0b6f74adb07da` |

## Licence and renderer

`OFL.txt` is the SIL Open Font License 1.1 text shipped in both release archives. The font files are
vendored unmodified under that licence.

Renderer: `next/og` `ImageResponse` (satori plus resvg wasm) from the repository's pinned Next.js
version. The RFC Q4 fallback was not used.
