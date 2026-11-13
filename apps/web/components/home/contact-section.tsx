import { GitHubIcon, LinkedInIcon, MailIcon } from '../icons';
import { SITE } from '../../content/site';
import { SectionFrame } from './section-frame';

const CONTACT_LINK_CLASS =
  'inline-flex min-h-11 items-center gap-2.5 text-base text-fg underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

function LinkIcon({ label }: { readonly label: string }) {
  if (label === 'GitHub') return <GitHubIcon />;
  if (label === 'LinkedIn') return <LinkedInIcon />;
  return null;
}

export function ContactSection() {
  return (
    <SectionFrame id="contact" sectionId="contact" labelledBy="contact-title">
      <h2 id="contact-title" className="text-2xl leading-tight text-fg">
        {SITE.contact.title}
      </h2>
      <ul className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-8">
        <li>
          <a href={`mailto:${SITE.identity.email}`} className={CONTACT_LINK_CLASS}>
            <MailIcon />
            <span className="text-muted">{SITE.footer.contactLabel}</span>
            <span>{SITE.identity.email}</span>
          </a>
        </li>
        {SITE.identity.links.map((link) =>
          link.url === null ? null : (
            <li key={link.label}>
              <a href={link.url} className={CONTACT_LINK_CLASS}>
                <LinkIcon label={link.label} />
                <span>{link.label}</span>
              </a>
            </li>
          ),
        )}
      </ul>
    </SectionFrame>
  );
}
