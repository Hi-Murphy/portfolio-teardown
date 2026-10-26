export default function HomePage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col px-5 sm:px-8">
      <header className="flex justify-end py-4">{/* theme toggle slot (T005) */}</header>
      <main className="flex flex-1 flex-col justify-center gap-3">
        <h1 className="font-semibold tracking-tight text-[clamp(2rem,8vw,4rem)] leading-[1.05]">
          Portfolio Teardown
        </h1>
        <p className="text-muted text-[clamp(1rem,3.5vw,1.25rem)]">coming online slice by slice</p>
      </main>
      <footer className="py-6 text-sm text-muted">{/* xploder version (T006) */}</footer>
    </div>
  );
}
