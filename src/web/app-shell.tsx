export function AppShell() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <header className="border-b border-slate-800 px-4 py-4 sm:px-6">
        <h1 className="text-xl font-semibold">Liryk</h1>
      </header>

      <main className="mx-auto grid max-w-6xl gap-4 px-4 py-6 sm:px-6 lg:grid-cols-2">
        <section
          aria-label="Connection pane"
          className="rounded-lg border border-slate-800 bg-slate-900/60 p-4"
        >
          <h2 className="text-lg font-medium">Connection</h2>
          <p className="mt-2 text-sm text-slate-300">Spotify is not connected yet.</p>
        </section>

        <section aria-label="Lyrics pane" className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="text-lg font-medium">Lyrics</h2>
          <p className="mt-2 text-sm text-slate-300">Lyrics will appear once a track is playing.</p>
        </section>
      </main>
    </div>
  );
}
