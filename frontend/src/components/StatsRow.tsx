import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Package, Tag, ShieldCheck, AlertCircle, Clock } from 'lucide-react';
import { formatRelativeTime } from '@/lib/time';

interface Product {
  id: number;
  discount_pct: number | null;
}

interface HealthEvent {
  id: number;
  status: string;
  timestamp: string;
}

type OverallStatus = 'healthy' | 'recovered' | 'healing' | 'detected' | 'escalated' | 'unknown';

function deriveStatus(events: HealthEvent[]): OverallStatus {
  const statuses = events.slice(0, 2).map(e => e.status);
  if (statuses.includes('escalated')) return 'escalated';
  if (statuses.some(s => s === 'healing' || s === 'detected')) return 'healing';
  if (statuses.some(s => s === 'verified' || s === 'recovered')) return 'recovered';
  if (statuses.length > 0) return 'healthy';
  return 'unknown';
}

interface StatCardProps {
  icon: React.ReactNode;
  iconBg: string;
  value: string | number;
  label: string;
}

function StatCard({ icon, iconBg, value, label }: StatCardProps) {
  return (
    <Card className="flex-1 min-w-0 transition-shadow duration-200 hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.3),0_4px_16px_hsl(var(--primary)/0.08)]">
      <CardContent className="p-5 flex items-start gap-4">
        <div
          className="shrink-0 flex items-center justify-center w-10 h-10 rounded-lg"
          style={{ background: iconBg }}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold leading-none tracking-tight text-foreground">
            {value}
          </p>
          <p className="text-xs text-muted-foreground mt-1 leading-snug">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function StatsRow() {
  const [products, setProducts]     = useState<Product[]>([]);
  const [events, setEvents]         = useState<HealthEvent[]>([]);
  const [ready, setReady]           = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('http://localhost:3001/api/products').then(r => r.json()),
      fetch('http://localhost:3001/api/health-events?limit=2').then(r => r.json()),
    ])
      .then(([p, e]) => { setProducts(p); setEvents(e); setReady(true); })
      .catch(() => setReady(true));
  }, []);

  const totalProducts   = products.length;
  const activeDiscounts = products.filter(p => p.discount_pct != null).length;
  const status          = deriveStatus(events);
  const lastEvent       = events[0];

  const statusIcon = (status === 'escalated' || status === 'healing' || status === 'detected')
    ? <AlertCircle className="w-5 h-5 text-amber-400" />
    : <ShieldCheck className="w-5 h-5 text-primary" />;

  const statusLabel = status === 'escalated'
    ? 'Escalated'
    : (status === 'healing' || status === 'detected')
      ? 'Healing'
      : status === 'unknown'
        ? 'Unknown'
        : 'Healthy';

  const iconTeal  = 'hsl(var(--primary) / 0.12)';
  const iconAmber = 'hsl(var(--warning) / 0.12)';

  if (!ready) {
    return (
      <div className="flex flex-col sm:flex-row gap-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="flex-1 min-w-0">
            <CardContent className="p-5">
              <div className="h-10 w-10 rounded-lg bg-muted animate-pulse mb-3" />
              <div className="h-6 w-16 rounded bg-muted animate-pulse mb-2" />
              <div className="h-3 w-24 rounded bg-muted animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <StatCard
        icon={<Package className="w-5 h-5" style={{ color: 'hsl(var(--primary))' }} />}
        iconBg={iconTeal}
        value={totalProducts}
        label="Products Monitored"
      />
      <StatCard
        icon={<Tag className="w-5 h-5" style={{ color: 'hsl(var(--warning))' }} />}
        iconBg={iconAmber}
        value={activeDiscounts}
        label="Active Discounts"
      />
      <StatCard
        icon={statusIcon}
        iconBg={status === 'escalated' ? 'hsl(var(--destructive) / 0.12)' : iconTeal}
        value={statusLabel}
        label="System Status"
      />
      <StatCard
        icon={<Clock className="w-5 h-5" style={{ color: 'hsl(var(--primary))' }} />}
        iconBg={iconTeal}
        value={lastEvent ? formatRelativeTime(lastEvent.timestamp) : '—'}
        label="Last Checked"
      />
    </div>
  );
}
