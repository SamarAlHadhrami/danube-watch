function App() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">

      {/* ── Top bar ────────────────────────────────────────────────────────── */}
      <header
        className="fixed top-0 left-0 right-0 z-10 flex items-center justify-between px-6"
        style={{
          height: '56px',
          background: 'hsl(222 47% 6%)',
          borderBottom: '1px solid hsl(222 30% 16%)',
        }}
      >
        <span className="text-lg font-bold tracking-tight text-foreground">
          Danube Watch
        </span>
        <div id="status-badge-slot" />
      </header>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <main className="flex-1 pt-[56px]">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Components will be added here in the next phase */}
        </div>
      </main>

    </div>
  );
}

export default App;
