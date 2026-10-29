import { TECH_CATEGORIES, type TechCategory, type TechColorRef } from '../schema/constants';
import { blueprint, type Palette, type PaletteRole } from './blueprint';

export { blueprint };
export type { Palette, PaletteRole };

const ROLE_CSS_NAMES = [
  ['paper', 'paper'],
  ['surface', 'surface'],
  ['grid', 'grid'],
  ['line', 'line'],
  ['lineMuted', 'line-muted'],
  ['ink', 'ink'],
  ['label', 'label'],
  ['accent', 'accent'],
  ['steel', 'steel'],
] as const satisfies readonly (readonly [PaletteRole, string])[];

function declarations(palette: Palette): string {
  const roles = ROLE_CSS_NAMES.map(([role, cssName]) => `--bp-${cssName}:${palette[role]};`).join(
    '',
  );
  const tech = TECH_CATEGORIES.map(
    (category) => `--bp-tech-${category}:${palette.tech[category]};`,
  ).join('');

  return `${roles}${tech}`;
}

export function paletteCss(): string {
  const light = declarations(blueprint.light);
  const dark = declarations(blueprint.dark);

  return `:root{${light}}.dark{${dark}}@media (prefers-color-scheme: dark){html:not(.light){${dark}color-scheme:dark}}`;
}

export function techColor(ref: TechColorRef, palette: Palette = blueprint.light): string {
  if (ref === 'accent') return palette.accent;

  return palette.tech[ref.slice('tech-'.length) as TechCategory];
}
