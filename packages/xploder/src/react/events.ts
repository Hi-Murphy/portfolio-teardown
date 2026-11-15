import type { SettlePhase } from './scene/OverlayProjector';

export type { SettlePhase };

export type ViewerEventName = 'ready' | 'settled' | 'tour-ended';

/** Public viewer callbacks plus the DOM mirror dispatcher. */
export interface ViewerEventHandlers {
  onReady?(): void;
  onSettled?(phase: SettlePhase): void;
  onTourEnded?(flowId: string): void;
  dispatch?(name: ViewerEventName, detail: object): void;
}

/** Emits the public viewer events in the documented order. */
export interface ViewerEvents {
  ready(): void;
  settled(phase: SettlePhase, at: number): void;
  tourEnded(flowId: string): void;
}

type BufferedEvent =
  | { readonly kind: 'settled'; readonly phase: SettlePhase; readonly at: number }
  | { readonly kind: 'tour-ended'; readonly flowId: string };

function deliverReady(handlers: ViewerEventHandlers): void {
  handlers.onReady?.();
  handlers.dispatch?.('ready', {});
}

function deliverSettled(handlers: ViewerEventHandlers, phase: SettlePhase, at: number): void {
  handlers.onSettled?.(phase);
  handlers.dispatch?.('settled', { phase, at });
}

function deliverTourEnded(handlers: ViewerEventHandlers, flowId: string): void {
  handlers.onTourEnded?.(flowId);
  handlers.dispatch?.('tour-ended', { flowId });
}

/**
 * Creates one viewer event emitter. `ready` is always first; settles and tour ends raised
 * before it are buffered in call order and flushed synchronously after the ready delivery.
 * Once ready, every settled call is delivered. A tour end waits for a microtask so a settle
 * decided in the same frame arrives first, and duplicate tour ends for one flow in that task
 * are delivered once. Handlers are read at each delivery, so the latest callbacks are used.
 */
export function createViewerEvents(getHandlers: () => ViewerEventHandlers): ViewerEvents {
  let readyDelivered = false;
  const buffered: BufferedEvent[] = [];
  const queuedTourEnds: string[] = [];
  let tourEndQueued = false;

  function deliverBuffered(event: BufferedEvent): void {
    if (event.kind === 'settled') {
      deliverSettled(getHandlers(), event.phase, event.at);
    } else {
      deliverTourEnded(getHandlers(), event.flowId);
    }
  }

  function ready(): void {
    if (readyDelivered) return;

    readyDelivered = true;
    deliverReady(getHandlers());

    for (const event of buffered.splice(0)) deliverBuffered(event);
  }

  function settled(phase: SettlePhase, at: number): void {
    if (!readyDelivered) {
      buffered.push({ kind: 'settled', phase, at });
      return;
    }

    deliverSettled(getHandlers(), phase, at);
  }

  function tourEnded(flowId: string): void {
    if (!readyDelivered) {
      buffered.push({ kind: 'tour-ended', flowId });
      return;
    }

    if (queuedTourEnds.includes(flowId)) return;

    queuedTourEnds.push(flowId);

    if (tourEndQueued) return;

    tourEndQueued = true;
    queueMicrotask(() => {
      tourEndQueued = false;
      const flows = queuedTourEnds.splice(0);

      for (const queuedFlowId of flows) deliverTourEnded(getHandlers(), queuedFlowId);
    });
  }

  return { ready, settled, tourEnded };
}
