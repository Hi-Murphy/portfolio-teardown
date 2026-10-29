// Fixtures are plain JSON files. They are re-exported as `unknown` so they reach the
// parsers exactly like runtime JSON input, with no help from TypeScript's inferred types.
import projectAUiApp from './project-a-ui-app.json';
import projectBPipeline from './project-b-pipeline.json';
import techRegistry from './tech-registry.json';

export const techRegistryJson: unknown = techRegistry;
export const projectAJson: unknown = projectAUiApp;
export const projectBJson: unknown = projectBPipeline;
