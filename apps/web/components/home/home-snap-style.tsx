const SNAP_CSS = `
:root {
  scroll-snap-type: y mandatory;
}

[data-site-hero] {
  scroll-snap-align: start;
  scroll-snap-stop: always;
  scroll-margin-top: 2.8125rem;
}

[data-home-snap-sections] {
  scroll-snap-align: start;
}

[data-home-section="projects"],
[data-home-section="about"],
[data-home-section="contact"] {
  scroll-margin-top: 5rem;
}

footer {
  scroll-snap-align: end;
}

@media (prefers-reduced-motion: reduce) {
  :root {
    scroll-snap-type: none;
  }
}
`;

export function HomeSnapStyle() {
  return <style>{SNAP_CSS}</style>;
}
