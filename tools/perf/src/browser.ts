import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { pathToFileURL } from 'node:url';

import { chromium, type Browser } from 'playwright';

import { CliError, EXIT } from './exit-codes.ts';

interface ScreenEmulation {
  mobile: boolean;
  width: number;
  height: number;
  deviceScaleFactor: number;
  disabled: boolean;
}

interface LighthouseConstants {
  screenEmulationMetrics: Record<'mobile' | 'desktop', ScreenEmulation>;
  userAgents: Record<'mobile' | 'desktop', string>;
}

export interface Profile {
  name: 'mobile' | 'desktop';
  formFactor: 'mobile' | 'desktop';
  screenEmulation: ScreenEmulation;
  userAgent: string;
}

const require = createRequire(import.meta.url);
const constantsPath = require.resolve('lighthouse/core/config/constants.js');
const constants = (await import(pathToFileURL(constantsPath).href)) as LighthouseConstants;

function profile(name: 'mobile' | 'desktop'): Profile {
  return {
    name,
    formFactor: name,
    screenEmulation: { ...constants.screenEmulationMetrics[name] },
    userAgent: constants.userAgents[name],
  };
}

export const PROFILES: { mobile: Profile; desktop: Profile } = {
  mobile: profile('mobile'),
  desktop: profile('desktop'),
};

export async function launch(opts: { cdpPort?: number } = {}): Promise<Browser> {
  try {
    return await chromium.launch({
      channel: 'chromium',
      headless: true,
      args: opts.cdpPort === undefined ? [] : [`--remote-debugging-port=${opts.cdpPort}`],
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new CliError(
      EXIT.BROWSER,
      `failed to launch Chromium: ${detail}\nrun: pnpm exec playwright install chromium`,
    );
  }
}

export async function freePort(): Promise<number> {
  return await new Promise<number>((resolvePort, reject) => {
    const probe = createServer();
    probe.unref();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address();
      if (!address || typeof address === 'string') {
        probe.close();
        reject(new Error('could not allocate a free port'));
        return;
      }

      probe.close((error) => {
        if (error) {
          reject(error);
        } else {
          resolvePort(address.port);
        }
      });
    });
  });
}

export function chromiumVersion(browser: Browser): string {
  return browser.version();
}
