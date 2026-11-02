import { defineTechRegistry } from 'xploder';

export const SITE_REGISTRY = defineTechRegistry({
  schemaVersion: 1,
  techs: [
    { id: 'kotlin', label: 'Kotlin', category: 'language' },
    { id: 'android', label: 'Android', category: 'platform' },
    { id: 'coroutines', label: 'Kotlin Coroutines', category: 'library' },
    { id: 'jetpack-compose', label: 'Jetpack Compose', category: 'framework' },
    { id: 'room', label: 'Room', category: 'storage' },
    { id: 'websocket', label: 'WebSocket', category: 'network' },
  ],
});
