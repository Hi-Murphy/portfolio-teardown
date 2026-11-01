import type { CSSProperties, RefObject } from 'react';

import { PANEL_SECTION_TITLES, type DetailModel } from '../../panel/content';
import { PANEL_LOOK } from '../../panel/look';
import type { Palette } from '../../theme';
import { TechChips } from './TechChips';

export interface DetailPanelProps {
  readonly model: DetailModel;
  readonly palette: Palette;
  readonly headingId: string;
  readonly headingRef?: RefObject<HTMLHeadingElement | null>;
  readonly onClose: () => void;
}

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

function bodyStyle(palette: Palette): CSSProperties {
  return {
    color: palette.ink,
    fontSize: `${PANEL_LOOK.typography.bodyRem}rem`,
    lineHeight: 1.5,
  };
}

function sectionStyle(palette: Palette): CSSProperties {
  return {
    color: palette.ink,
    fontSize: `${PANEL_LOOK.typography.bodyRem}rem`,
    margin: '0.75rem 0 0.25rem',
  };
}

export function DetailPanel({ model, palette, headingId, headingRef, onClose }: DetailPanelProps) {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '0.5rem',
        }}
      >
        <h2
          ref={headingRef}
          id={headingId}
          tabIndex={-1}
          style={{
            color: palette.ink,
            fontSize: `${PANEL_LOOK.typography.headingRem}rem`,
            lineHeight: 1.2,
            margin: 0,
          }}
        >
          {model.name}
        </h2>
        <button
          type="button"
          data-xploder-panel-close=""
          aria-label="Close details"
          onClick={onClose}
          style={{
            minWidth: '2.75rem',
            minHeight: '2.75rem',
            border: 0,
            background: 'transparent',
            color: palette.ink,
            cursor: 'pointer',
            fontSize: `${PANEL_LOOK.typography.headingRem}rem`,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      <p
        style={{
          color: palette.label,
          fontFamily: 'var(--font-mono, ui-monospace, monospace)',
          fontSize: `${PANEL_LOOK.typography.monoRem}rem`,
          margin: '0.25rem 0 0',
        }}
      >
        {model.meta.kind} · {model.meta.status}
      </p>

      {model.summary === undefined ? null : <p style={bodyStyle(palette)}>{model.summary}</p>}
      {model.description === undefined ? null : (
        <p style={bodyStyle(palette)}>{model.description}</p>
      )}

      {model.chips.length === 0 ? null : (
        <>
          <h3 style={sectionStyle(palette)}>{PANEL_SECTION_TITLES.tech}</h3>
          <TechChips chips={model.chips} palette={palette} />
        </>
      )}

      {model.metrics.length === 0 ? null : (
        <>
          <h3 style={sectionStyle(palette)}>{PANEL_SECTION_TITLES.metrics}</h3>
          <dl style={{ margin: 0, ...bodyStyle(palette) }}>
            {model.metrics.map((metric, index) => (
              <div key={`${metric.label}-${index}`} style={{ display: 'flex', gap: '0.5rem' }}>
                <dt style={{ color: palette.label }}>{metric.label}</dt>
                <dd style={{ color: palette.ink, margin: 0 }}>{metric.value}</dd>
              </div>
            ))}
          </dl>
        </>
      )}

      {model.links.length === 0 ? null : (
        <>
          <h3 style={sectionStyle(palette)}>{PANEL_SECTION_TITLES.links}</h3>
          <ul style={{ margin: 0, paddingInlineStart: '1.25rem', ...bodyStyle(palette) }}>
            {model.links.map((link, index) => (
              <li key={`${link.url}-${index}`}>
                <a
                  href={link.url}
                  target={link.target}
                  rel={link.rel}
                  style={{ color: palette.accent }}
                >
                  {link.label}
                  <span style={VISUALLY_HIDDEN_STYLE}> (opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
