export type PanelState =
  | { readonly kind: 'closed' }
  | { readonly kind: 'detail'; readonly componentId: string }
  | { readonly kind: 'caseStudy' };

export type PanelEvent =
  | { type: 'slab'; hit: string | null }
  | { type: 'openDetail'; id: string }
  | { type: 'outside' }
  | { type: 'escape' }
  | { type: 'closeControl' }
  | { type: 'toggleCaseStudy' }
  | { type: 'openCaseStudy' }
  | { type: 'reset' };

export const CLOSED: PanelState = { kind: 'closed' };

const CASE_STUDY: PanelState = { kind: 'caseStudy' };

function close(state: PanelState): PanelState {
  return state.kind === 'closed' ? state : CLOSED;
}

function openCaseStudy(state: PanelState): PanelState {
  return state.kind === 'caseStudy' ? state : CASE_STUDY;
}

export function panelReducer(state: PanelState, event: PanelEvent): PanelState {
  switch (event.type) {
    case 'slab':
      if (event.hit === null) return close(state);
      if (state.kind === 'detail' && state.componentId === event.hit) return CLOSED;
      return { kind: 'detail', componentId: event.hit };
    case 'openDetail':
      return state.kind === 'detail' && state.componentId === event.id
        ? state
        : { kind: 'detail', componentId: event.id };
    case 'outside':
    case 'escape':
    case 'closeControl':
      return close(state);
    case 'toggleCaseStudy':
      return state.kind === 'caseStudy' ? CLOSED : CASE_STUDY;
    case 'openCaseStudy':
      return openCaseStudy(state);
    case 'reset':
      return close(state);
  }
}

export function consumesEscape(state: PanelState): boolean {
  return state.kind !== 'closed';
}
