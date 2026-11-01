import type { CSSProperties } from 'react';

import type { ChipModel } from '../../panel/content';
import { PANEL_LOOK } from '../../panel/look';
import { techColor, type Palette } from '../../theme';

export interface TechChipsProps {
  readonly chips: readonly ChipModel[];
  readonly palette: Palette;
}

const LIST_STYLE: CSSProperties = {
  listStyle: 'none',
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.375rem',
  padding: 0,
  margin: 0,
};

const VISUALLY_HIDDEN_STYLE: CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
  margin: '-1px',
  padding: 0,
  border: 0,
};

function chipStyle(accent: string | null, palette: Palette): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
    border: `1px solid ${palette.lineMuted}`,
    ...(accent === null ? {} : { borderInlineStart: `2px solid ${accent}` }),
    color: palette.ink,
    background: palette.surface,
    borderRadius: '999px',
    padding: '0.125rem 0.5rem',
    fontFamily: 'var(--font-mono, ui-monospace, monospace)',
    fontSize: `${PANEL_LOOK.typography.monoRem}rem`,
  };
}

export function TechChips({ chips, palette }: TechChipsProps) {
  return (
    <ul aria-label="Tech" style={LIST_STYLE}>
      {chips.map((chip) => {
        const accent = chip.colorRef === undefined ? null : techColor(chip.colorRef, palette);

        return (
          <li key={chip.id} data-xploder-chip={chip.id} style={chipStyle(accent, palette)}>
            {accent === null ? null : (
              <span
                aria-hidden="true"
                style={{
                  width: '0.5rem',
                  height: '0.5rem',
                  borderRadius: '999px',
                  background: accent,
                }}
              />
            )}
            <span>{chip.label}</span>
            {chip.category === undefined ? null : (
              <span style={VISUALLY_HIDDEN_STYLE}>, {chip.category}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
