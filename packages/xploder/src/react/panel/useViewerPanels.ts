import { useCallback, useId, useMemo, useReducer, useRef, type Dispatch } from 'react';

import { CLOSED, panelReducer, type PanelEvent, type PanelState } from '../../panel/state';

export interface ViewerPanelsActions {
  openDetail(id: string): void;
  toggleCaseStudy(): void;
  openCaseStudy(): void;
  close(): void;
}

export interface ViewerPanelsIds {
  readonly caseStudy: string;
  readonly detail: string;
}

export interface ViewerPanelsHandle {
  readonly state: PanelState;
  readonly actions: ViewerPanelsActions;
  readonly ids: ViewerPanelsIds;
}

interface PanelsMetadata {
  readonly dispatch: Dispatch<PanelEvent>;
  opener: Element | null;
  recordOpener: (element?: Element | null) => void;
}

export interface ViewerPanelsMetadata {
  readonly dispatch: Dispatch<PanelEvent>;
  readonly opener: Element | null;
  readonly recordOpener: (element: Element | null) => void;
}

const PANELS_METADATA = new WeakMap<ViewerPanelsHandle, PanelsMetadata>();

const EMPTY_METADATA: ViewerPanelsMetadata = {
  dispatch: () => undefined,
  opener: null,
  recordOpener: () => undefined,
};

export function panelsMetadataOf(handle: ViewerPanelsHandle): ViewerPanelsMetadata {
  return PANELS_METADATA.get(handle) ?? EMPTY_METADATA;
}

export function useViewerPanels(): ViewerPanelsHandle {
  const [state, dispatch] = useReducer(panelReducer, CLOSED);
  const reactId = useId();
  const metadata = useRef<PanelsMetadata>({
    dispatch,
    opener: null,
    recordOpener: () => undefined,
  }).current;

  const recordOpener = useCallback(
    (element?: Element | null) => {
      metadata.opener =
        element === undefined
          ? typeof document === 'undefined'
            ? null
            : document.activeElement
          : element;
    },
    [metadata],
  );

  metadata.recordOpener = recordOpener;

  const actions = useMemo<ViewerPanelsActions>(
    () => ({
      openDetail: (id) => {
        recordOpener();
        dispatch({ type: 'openDetail', id });
      },
      toggleCaseStudy: () => {
        recordOpener();
        dispatch({ type: 'toggleCaseStudy' });
      },
      openCaseStudy: () => {
        recordOpener();
        dispatch({ type: 'openCaseStudy' });
      },
      close: () => dispatch({ type: 'closeControl' }),
    }),
    [dispatch, recordOpener],
  );

  const ids = useMemo<ViewerPanelsIds>(
    () => ({
      caseStudy: `case-study-${reactId}`,
      detail: `detail-${reactId}`,
    }),
    [reactId],
  );

  const handle = useMemo<ViewerPanelsHandle>(
    () => ({ state, actions, ids }),
    [actions, ids, state],
  );

  PANELS_METADATA.set(handle, metadata);

  return handle;
}
