// World: y is up; grid column runs along +x and grid row along +z. A camera at
// azimuth θ, elevation φ sits at (cos φ·sin θ, sin φ, cos φ·cos θ), looking at the origin.
export const VIEW = Object.freeze({
  baseAzimuth: Math.PI / 4,
  snap: Math.PI / 2,
  elevation: Math.atan(1 / Math.sqrt(2)),
  fitMargin: 0.08,
});
