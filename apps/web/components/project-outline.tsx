import type { Project } from 'xploder';

export interface ProjectOutlineProps {
  readonly project: Project;
  readonly message?: string;
  readonly className?: string;
}

interface StoryPartProps {
  readonly label: string;
  readonly text: string | undefined;
}

function StoryPart({ label, text }: StoryPartProps) {
  if (text === undefined) return null;

  return (
    <div>
      <h3 className="font-mono text-xs uppercase tracking-[0.16em] text-muted">{label}</h3>
      <p className="mt-2 text-sm leading-relaxed text-fg">{text}</p>
    </div>
  );
}

export function ProjectOutline({ project, message, className }: ProjectOutlineProps) {
  const { story, layers } = project;

  return (
    <section
      data-site-outline=""
      className={['flex flex-col gap-6', className].filter(Boolean).join(' ')}
    >
      {message === undefined ? null : (
        <p
          role="status"
          className="rounded border border-line/30 bg-surface px-3 py-2 text-sm text-fg"
        >
          {message}
        </p>
      )}

      {story.headline === undefined ? null : (
        <h2 className="text-xl leading-tight text-fg">{story.headline}</h2>
      )}

      <div className="grid gap-5 sm:grid-cols-3">
        <StoryPart label="Problem" text={story.problem} />
        <StoryPart label="Approach" text={story.approach} />
        <StoryPart label="Outcome" text={story.outcome} />
      </div>

      {story.metrics.length === 0 ? null : (
        <section>
          <h3 className="font-mono text-xs uppercase tracking-[0.16em] text-muted">Metrics</h3>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            {story.metrics.map((metric, index) => (
              <div key={`${metric.label}-${index}`} className="rounded border border-line/20 p-3">
                <dt className="font-mono text-xs text-muted">{metric.label}</dt>
                <dd className="mt-1 text-sm font-medium text-fg">{metric.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <div className="flex flex-col gap-5">
        {layers.map((layer) => (
          <section key={layer.id}>
            <h3 className="font-mono text-xs uppercase tracking-[0.16em] text-muted">
              {layer.name}
            </h3>
            <ul className="mt-3 flex flex-col gap-2">
              {layer.components.map((component) => (
                <li key={component.id} className="rounded border border-line/20 p-3">
                  <span className="block text-sm font-medium text-fg">{component.name}</span>
                  {component.summary === undefined ? null : (
                    <span className="mt-1 block text-sm leading-relaxed text-muted">
                      {component.summary}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </section>
  );
}
