import { SystemHealthBadge } from '@/components/SystemHealthBadge';
import { ProductTable }      from '@/components/ProductTable';
import { HealingTimeline }   from '@/components/HealingTimeline';
import { StatsRow }          from '@/components/StatsRow';
import { Package }           from 'lucide-react';

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
        <SystemHealthBadge />
      </header>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <main className="flex-1 pt-[56px]">
        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col gap-8">

          {/* KPI stats row */}
          <StatsRow />

          {/* Two-column layout: ProductTable (65%) + HealingTimeline (35%) */}
          <div className="flex flex-col lg:flex-row gap-6">

            {/* Product table — wider column */}
            <section className="lg:w-[65%] min-w-0 flex flex-col gap-3">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Package className="w-3.5 h-3.5" />
                Products
              </h2>
              <ProductTable />
            </section>

            {/* Healing timeline — narrower column */}
            <aside className="lg:w-[35%] min-w-0">
              <HealingTimeline />
            </aside>

          </div>
        </div>
      </main>

    </div>
  );
}

export default App;
