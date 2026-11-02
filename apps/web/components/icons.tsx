interface MonogramMarkProps {
  readonly siteName: string;
}

const MONOGRAM_CLASS =
  'inline-flex size-9 shrink-0 items-center justify-center rounded-sm border border-line font-mono text-xs font-semibold leading-none tracking-tight text-fg';

export function MonogramMark({ siteName }: MonogramMarkProps) {
  const initials = siteName
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return (
    <span aria-hidden="true" className={MONOGRAM_CLASS}>
      {initials}
    </span>
  );
}

export function GitHubIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
    </svg>
  );
}

export function LinkedInIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M5.34 3.5A1.84 1.84 0 1 0 5.33 7.18 1.84 1.84 0 0 0 5.34 3.5ZM3.75 8.75h3.17V21H3.75V8.75Zm5.26 0h3.04v1.67h.04c.42-.8 1.46-1.98 3.01-1.98 3.22 0 3.82 2.12 3.82 4.87V21h-3.17v-6.82c0-1.63-.03-3.72-2.27-3.72-2.27 0-2.62 1.77-2.62 3.6V21H9.01V8.75Z" />
    </svg>
  );
}

export function MailIcon() {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}
