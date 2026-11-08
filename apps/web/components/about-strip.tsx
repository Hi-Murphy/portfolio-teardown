export interface AboutStripProps {
  readonly title: string;
  readonly paragraphs: readonly string[];
  readonly skillsNote?: string;
}

export function AboutStrip({ title, paragraphs, skillsNote }: AboutStripProps) {
  return (
    <>
      <h2 id="about-title" className="text-xl leading-tight text-fg">
        {title}
      </h2>
      <div className="flex max-w-prose flex-col gap-4">
        {paragraphs.map((paragraph, index) => (
          <p key={`${paragraph}-${index}`} className="text-sm leading-relaxed text-fg">
            {paragraph}
          </p>
        ))}
      </div>
      {skillsNote === undefined ? null : (
        <p className="font-mono text-xs leading-relaxed text-muted">{skillsNote}</p>
      )}
    </>
  );
}
