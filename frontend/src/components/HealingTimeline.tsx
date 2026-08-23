import { useEffect, useState } from 'react';
import { formatRelativeTime } from '@/lib/time';

type EventStatus = 'healthy' | 'recovered' | 'verified' | 'healing' | 'detected' | 'escalated';

interface HealthEvent {
  id: number;
  collector_id: string;
  status: EventStatus;
  message: string;
  timestamp: string;
}

function dotColor(status: EventStatus): string {
  switch (status) {
    case 'healthy':
    case 'recovered':
    case 'verified':  return 'hsl(var(--primary))';
    case 'healing':
    case 'detected':  return 'hsl(var(--warning))';
    case 'escalated': return 'hsl(var(--destructive))';
    default:          return 'hsl(var(--muted-foreground))';
  }
}

function statusLabel(status: EventStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function HealingTimeline() {
  const [events, setEvents] = useState<HealthEvent[]>([]);
  const [error, setError]   = useState(false);

  useEffect(() => {
    function poll() {
      fetch('http://localhost:3001/api/health-events?limit=15')
        .then(r => r.ok ? r.json() as Promise<HealthEvent[]> : Promise.reject())
        .then(data => { setEvents(data); setError(false); })
        .catch(() => setError(true));
    }

    poll();
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col gap-1">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        System Events
      </h2>

      {error && (
        <p className="text-xs text-destructive">Could not reach backend.</p>
      )}

      {!error && events.length === 0 && (
        <p className="text-xs text-muted-foreground">No events yet.</p>
      )}

      <ol className="relative border-l border-border space-y-0">
        {events.map(ev => (
          <li key={ev.id} className="ml-4 pb-5 last:pb-0">
            {/* Dot */}
            <span
              className="absolute -left-[5px] mt-1 h-2.5 w-2.5 rounded-full ring-2"
              style={{
                background: dotColor(ev.status),
                ringColor: 'hsl(var(--background))',
                boxShadow: `0 0 0 2px hsl(var(--background))`,
              }}
            />

            <p className="text-xs font-semibold leading-tight" style={{ color: dotColor(ev.status) }}>
              {statusLabel(ev.status)}
            </p>
            <p className="text-xs text-foreground leading-snug mt-0.5">
              {ev.message}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {formatRelativeTime(ev.timestamp)} · {ev.collector_id.slice(0, 18)}…
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
