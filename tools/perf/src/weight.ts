import type { Browser, BrowserContext } from 'playwright';

import { PROFILES, launch } from './browser.ts';
import { WEIGHT_BUDGET_BYTES } from './budgets.ts';
import { CliError, EXIT } from './exit-codes.ts';

export type ProfileName = 'mobile' | 'desktop';

export interface CdpNetEventParams {
  requestId?: string;
  type?: string;
  request?: { url?: string };
  response?: { url?: string };
  encodedDataLength?: number;
  [key: string]: unknown;
}

export interface CdpNetEvent {
  method: string;
  params: CdpNetEventParams;
}

export interface WeightRequest {
  url: string;
  type: string;
  bytes: number;
  thirdParty: boolean;
}

export interface WeightProfileResult {
  totalBytes: number;
  requests: number;
  byType: Record<string, number>;
  byOrigin: { first: number; third: number };
  top: WeightRequest[];
  pass: boolean;
}

export interface WeightReport {
  kind: 'weight';
  version: 1;
  url: string;
  budgetBytes: number;
  profiles: Record<ProfileName, WeightProfileResult>;
  pass: boolean;
}

export interface WeightAssertion {
  id: 'weight';
  profile: ProfileName;
  threshold: string;
  actual: number;
  scope: 'profile';
  pass: boolean;
}

interface RequestState {
  url: string;
  type: string;
  receivedBytes: number;
}

const QUIET_MS = 1000;
const QUIET_CAP_MS = 30_000;
const NAVIGATION_TIMEOUT_MS = 30_000;
const TOP_REQUEST_COUNT = 10;

function byteCount(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return 0;
  return Math.trunc(value);
}

function normalizedType(value: unknown): string {
  return typeof value === 'string' && value.length > 0 ? value.toLowerCase() : 'other';
}

function requestOrigin(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

function isThirdParty(url: string, pageOrigin: string): boolean {
  const origin = requestOrigin(url);
  return origin === null || origin !== requestOrigin(pageOrigin);
}

function requestState(states: Map<string, RequestState>, requestId: string): RequestState {
  let state = states.get(requestId);
  if (!state) {
    state = { url: '', type: 'other', receivedBytes: 0 };
    states.set(requestId, state);
  }
  return state;
}

export function aggregateWeight(events: CdpNetEvent[], pageOrigin: string): WeightProfileResult {
  const states = new Map<string, RequestState>();
  const finalized = new Set<string>();
  const requests: WeightRequest[] = [];

  const finish = (requestId: string, encodedDataLength: unknown): void => {
    if (finalized.has(requestId)) return;

    const state = requestState(states, requestId);
    finalized.add(requestId);
    requests.push({
      url: state.url,
      type: state.type,
      bytes: byteCount(encodedDataLength),
      thirdParty: isThirdParty(state.url, pageOrigin),
    });
  };

  for (const event of events) {
    const requestId = event.params.requestId;
    if (!requestId) continue;

    switch (event.method) {
      case 'Network.requestWillBeSent': {
        const state = requestState(states, requestId);
        if (event.params.request?.url) state.url = event.params.request.url;
        if (event.params.type) state.type = normalizedType(event.params.type);
        break;
      }
      case 'Network.responseReceived': {
        const state = requestState(states, requestId);
        if (event.params.response?.url) state.url = event.params.response.url;
        if (event.params.type) state.type = normalizedType(event.params.type);
        break;
      }
      case 'Network.dataReceived': {
        const state = requestState(states, requestId);
        state.receivedBytes += byteCount(event.params.encodedDataLength);
        break;
      }
      case 'Network.loadingFinished':
        finish(requestId, event.params.encodedDataLength);
        break;
      case 'Network.loadingFailed': {
        const state = requestState(states, requestId);
        finish(requestId, Math.max(state.receivedBytes, byteCount(event.params.encodedDataLength)));
        break;
      }
    }
  }

  let totalBytes = 0;
  const byType: Record<string, number> = {};
  const byOrigin = { first: 0, third: 0 };

  for (const request of requests) {
    totalBytes += request.bytes;
    byType[request.type] = (byType[request.type] ?? 0) + request.bytes;
    byOrigin[request.thirdParty ? 'third' : 'first'] += request.bytes;
  }

  const top = requests
    .slice()
    .sort((left, right) => right.bytes - left.bytes || left.url.localeCompare(right.url))
    .slice(0, TOP_REQUEST_COUNT);

  return {
    totalBytes,
    requests: requests.length,
    byType,
    byOrigin,
    top,
    pass: totalBytes < WEIGHT_BUDGET_BYTES,
  };
}

export function assertWeight(report: WeightReport): WeightAssertion[] {
  return (['mobile', 'desktop'] as const).map((profile) => {
    const actual = report.profiles[profile].totalBytes;
    return {
      id: 'weight',
      profile,
      threshold: `< ${WEIGHT_BUDGET_BYTES}`,
      actual,
      scope: 'profile',
      pass: actual < WEIGHT_BUDGET_BYTES,
    };
  });
}

function networkActivity(): {
  started(requestId: string): void;
  finished(requestId: string): void;
  waitForQuiet(): Promise<void>;
} {
  const inFlight = new Set<string>();
  let onChange: (() => void) | undefined;

  return {
    started(requestId: string): void {
      inFlight.add(requestId);
      onChange?.();
    },
    finished(requestId: string): void {
      inFlight.delete(requestId);
      onChange?.();
    },
    waitForQuiet(): Promise<void> {
      return new Promise((resolveQuiet) => {
        let quietTimer: NodeJS.Timeout | undefined;
        let done = false;

        const complete = (): void => {
          if (done) return;
          done = true;
          onChange = undefined;
          if (quietTimer) clearTimeout(quietTimer);
          clearTimeout(capTimer);
          resolveQuiet();
        };

        const update = (): void => {
          if (done) return;
          if (inFlight.size > 0) {
            if (quietTimer) {
              clearTimeout(quietTimer);
              quietTimer = undefined;
            }
            return;
          }

          quietTimer ??= setTimeout(complete, QUIET_MS);
        };

        const capTimer = setTimeout(complete, QUIET_CAP_MS);
        onChange = update;
        update();
      });
    },
  };
}

function contextOptions(profile: ProfileName): Parameters<Browser['newContext']>[0] {
  const selected = PROFILES[profile];
  const screen = selected.screenEmulation;

  return {
    userAgent: selected.userAgent,
    viewport: { width: screen.width, height: screen.height },
    screen: { width: screen.width, height: screen.height },
    deviceScaleFactor: screen.deviceScaleFactor,
    isMobile: screen.mobile,
    hasTouch: screen.mobile,
    serviceWorkers: 'block',
  };
}

export async function measureWeight(url: URL, profile: ProfileName): Promise<WeightProfileResult> {
  let browser: Browser | undefined;
  let context: BrowserContext | undefined;

  try {
    browser = await launch();
    context = await browser.newContext(contextOptions(profile));
    const page = await context.newPage();
    const session = await context.newCDPSession(page);
    const events: CdpNetEvent[] = [];
    const activity = networkActivity();

    const record = (method: string, params: unknown): void => {
      events.push({ method, params: params as CdpNetEventParams });
    };

    session.on('Network.requestWillBeSent', (params) => {
      record('Network.requestWillBeSent', params);
      activity.started(params.requestId);
    });
    session.on('Network.responseReceived', (params) => {
      record('Network.responseReceived', params);
    });
    session.on('Network.dataReceived', (params) => {
      record('Network.dataReceived', params);
    });
    session.on('Network.loadingFinished', (params) => {
      record('Network.loadingFinished', params);
      activity.finished(params.requestId);
    });
    session.on('Network.loadingFailed', (params) => {
      record('Network.loadingFailed', params);
      activity.finished(params.requestId);
    });

    await session.send('Network.enable');
    await session.send('Network.setCacheDisabled', { cacheDisabled: true });

    try {
      await page.goto(url.href, { waitUntil: 'load', timeout: NAVIGATION_TIMEOUT_MS });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new CliError(EXIT.UNREACHABLE, `unreachable: ${url.href}: ${detail}`);
    }

    await activity.waitForQuiet();
    return aggregateWeight(events, url.origin);
  } finally {
    await context?.close();
    await browser?.close();
  }
}
