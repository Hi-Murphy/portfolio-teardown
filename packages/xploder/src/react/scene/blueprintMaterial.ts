import { Color, Vector3, type MeshLambertMaterial } from 'three';

export const BLUEPRINT_PROGRAM_CACHE_KEY = 'xploder-blueprint-1';

interface Uniform<T> {
  value: T;
}

export interface BlueprintUniforms {
  readonly uBase: Uniform<Color>;
  readonly uAccent: Uniform<Color>;
  readonly uPaper: Uniform<Color>;
  readonly uHighlightFill: Uniform<Color>;
  readonly uFaces: Uniform<Vector3>;
  readonly uEdgePx: Uniform<number>;
}

const VERTEX_DECLARATIONS = /* glsl */ `
attribute vec3 instanceFill;
uniform vec3 uBase;
uniform vec3 uAccent;
uniform vec3 uPaper;
varying vec3 vFill;
varying vec2 vBoxUv;
varying float vTop;
varying vec2 vEmphasis;
`;

const VERTEX_EMPHASIS = /* glsl */ `
  vFill = instanceFill;
  vBoxUv = uv;
  vTop = step( 0.5, normal.y );

  vec3 target = uBase * vColor.rgb;
  vec3 difference = target - uBase;
  vec3 accentDirection = uAccent - uBase;
  vec3 paperDirection = uPaper - uBase;
  float accentSquared = dot( accentDirection, accentDirection );
  float paperSquared = dot( paperDirection, paperDirection );
  float accentPaper = dot( accentDirection, paperDirection );
  float accentDifference = dot( accentDirection, difference );
  float paperDifference = dot( paperDirection, difference );
  float determinant = max( accentSquared * paperSquared - accentPaper * accentPaper, 1e-8 );
  float alpha = ( accentDifference * paperSquared - paperDifference * accentPaper ) / determinant;
  float beta = ( accentSquared * paperDifference - accentPaper * accentDifference ) / determinant;
  float p = clamp( beta, 0.0, 1.0 );
  float t = p < 0.999 ? clamp( alpha / ( 1.0 - p ), 0.0, 1.0 ) : 0.0;
  vEmphasis = vec2( t, p );
`;

const FRAGMENT_DECLARATIONS = /* glsl */ `
uniform vec3 uHighlightFill;
uniform vec3 uPaper;
uniform vec3 uFaces;
uniform float uEdgePx;
varying vec3 vFill;
varying vec2 vBoxUv;
varying float vTop;
varying vec2 vEmphasis;
`;

const FRAGMENT_OUTPUT = /* glsl */ `
  vec3 edgeInk = diffuseColor.rgb;
  vec3 fill = mix( mix( vFill, uHighlightFill, vEmphasis.x ), uPaper, vEmphasis.y );
  float face = vTop > 0.5 ? uFaces.x : ( normal.x < 0.0 ? uFaces.y : uFaces.z );
  fill = mix( fill, edgeInk, face );
  vec2 width = max( fwidth( vBoxUv ), vec2( 1e-6 ) );
  vec2 border = min( vBoxUv, 1.0 - vBoxUv ) / width;
  float edge = 1.0 - smoothstep( uEdgePx - 0.5, uEdgePx + 0.5, min( border.x, border.y ) );
  gl_FragColor = vec4( mix( fill, edgeInk, edge ), 1.0 );
`;

const COMMON_INCLUDE = '#include <common>';
const COLOR_VERTEX_INCLUDE = '#include <color_vertex>';
const OPAQUE_FRAGMENT_INCLUDE = '#include <opaque_fragment>';

function injectAfter(source: string, include: string, code: string): string {
  if (!source.includes(include)) throw new Error(`Missing shader include: ${include}`);

  return source.replace(include, `${include}\n${code}`);
}

export function createBlueprintUniforms(base: Color): BlueprintUniforms {
  return {
    uBase: { value: base },
    uAccent: { value: new Color() },
    uPaper: { value: new Color() },
    uHighlightFill: { value: new Color() },
    uFaces: { value: new Vector3() },
    uEdgePx: { value: 0 },
  };
}

export function patchBlueprintMaterial(
  material: MeshLambertMaterial,
  uniforms: BlueprintUniforms,
): void {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = injectAfter(shader.vertexShader, COMMON_INCLUDE, VERTEX_DECLARATIONS);
    shader.vertexShader = injectAfter(shader.vertexShader, COLOR_VERTEX_INCLUDE, VERTEX_EMPHASIS);
    shader.fragmentShader = injectAfter(
      shader.fragmentShader,
      COMMON_INCLUDE,
      FRAGMENT_DECLARATIONS,
    );
    shader.fragmentShader = injectAfter(
      shader.fragmentShader,
      OPAQUE_FRAGMENT_INCLUDE,
      FRAGMENT_OUTPUT,
    ).replace(OPAQUE_FRAGMENT_INCLUDE, '');
  };
  material.customProgramCacheKey = () => BLUEPRINT_PROGRAM_CACHE_KEY;
}
