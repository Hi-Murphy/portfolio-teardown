import type { TechCategory } from '../schema/constants';

export interface Palette {
  paper: string;
  surface: string;
  grid: string;
  line: string;
  lineMuted: string;
  ink: string;
  label: string;
  accent: string;
  steel: string;
  tech: Record<TechCategory, string>;
}

export type PaletteRole = Exclude<keyof Palette, 'tech'>;

export const blueprint = {
  light: {
    paper: '#F6F3EA',
    surface: '#FCFAF4',
    grid: '#D9E1EA',
    line: '#1E4D8C',
    lineMuted: '#6F89AE',
    ink: '#22262B',
    label: '#4A5059',
    accent: '#0A6E87',
    steel: '#56677A',
    tech: {
      language: '#1F5FAD',
      platform: '#4A5D73',
      framework: '#7A3E9D',
      library: '#0F766E',
      storage: '#97560F',
      network: '#0A6E87',
      tooling: '#5A691C',
      ai: '#B0336A',
    } satisfies Record<TechCategory, string>,
  },
  dark: {
    paper: '#0B1A2E',
    surface: '#112540',
    grid: '#1B3354',
    line: '#8CC4EE',
    lineMuted: '#4E78A3',
    ink: '#E6EDF5',
    label: '#A7B8CB',
    accent: '#4FD0E6',
    steel: '#8FA3B8',
    tech: {
      language: '#7FB2F0',
      platform: '#A3B5C9',
      framework: '#C9A2E8',
      library: '#5FD3C2',
      storage: '#E8B36A',
      network: '#5ED3EE',
      tooling: '#C2CF7A',
      ai: '#F08BB4',
    } satisfies Record<TechCategory, string>,
  },
} as const satisfies Record<'light' | 'dark', Palette>;
