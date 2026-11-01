let webglSupport: boolean | undefined;

export function hasWebgl(
  doc: Document | undefined = typeof document === 'undefined' ? undefined : document,
): boolean {
  if (webglSupport !== undefined) return webglSupport;
  if (doc === undefined) return false;

  try {
    const canvas = doc.createElement('canvas');
    const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl');

    if (context === null) {
      webglSupport = false;
      return false;
    }

    context.getExtension('WEBGL_lose_context')?.loseContext();
    webglSupport = true;
    return true;
  } catch {
    webglSupport = false;
    return false;
  }
}
