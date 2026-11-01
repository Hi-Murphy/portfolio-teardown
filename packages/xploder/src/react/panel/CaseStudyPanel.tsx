import { useLayoutEffect, useRef, type CSSProperties } from 'react';

import { PANEL_SECTION_TITLES, type CaseStudyModel } from '../../panel/content';
import { PANEL_LOOK } from '../../panel/look';
import type { Palette } from '../../theme';

export interface CaseStudyPanelProps {
  readonly model: CaseStudyModel;
  readonly palette: Palette;
  readonly headingId: string;
  readonly onClose: () => void;
}

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

export function CaseStudyPanel({ model, palette, headingId, onClose }: CaseStudyPanelProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useLayoutEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);

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
            // A programmatic focus target, not a control: no focus ring (RFC D5).
            outline: 'none',
          }}
        >
          {model.name}
        </h2>
        <button
          type="button"
          data-xploder-panel-close=""
          aria-label="Close case study"
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

      {model.tagline === undefined ? null : (
        <p
          style={{
            color: palette.label,
            fontFamily: 'var(--font-mono, ui-monospace, monospace)',
            fontSize: `${PANEL_LOOK.typography.monoRem}rem`,
            margin: '0.25rem 0 0',
          }}
        >
          {model.tagline}
        </p>
      )}

      {model.headline === undefined ? null : (
        <p
          style={{
            color: palette.ink,
            fontSize: `${PANEL_LOOK.typography.bodyRem * 1.125}rem`,
            lineHeight: 1.5,
            margin: '0.75rem 0 0',
          }}
        >
          {model.headline}
        </p>
      )}

      {model.sections.map((section) => (
        <section key={section.key}>
          <h3 style={sectionStyle(palette)}>{section.title}</h3>
          <p style={{ margin: 0, ...bodyStyle(palette) }}>{section.body}</p>
        </section>
      ))}

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
    </div>
  );
}
