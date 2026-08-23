import { useEffect, useRef, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity } from 'lucide-react';
import { formatRelativeTime } from '@/lib/time';

function truncateMessage(msg: string, max = 120): string {
  return msg.length > max ? msg.slice(0, max) + '...' : msg;
}

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

// ── Loading skeleton ───────────────────────────────────────────────────────

function TimelineSkeleton() {
  return (
    <ol className="relative border-l border-border space-y-0">
      {Array.from({ length: 4 }).map((_, i) => (
        <li key={i} className="ml-4 pb-5 last:pb-0">
          <span className="absolute -left-[5px] mt-1 h-2.5 w-2.5 rounded-full bg-muted" />
          <Skeleton className="h-3 w-16 rounded mb-1.5" />
          <Skeleton className="h-3 w-full rounded mb-1" style={{ opacity: 1 - i * 0.15 }} />
          <Skeleton className="h-2.5 w-24 rounded" style={{ opacity: 1 - i * 0.15 }} />
        </li>
      ))}
    </ol>
  );
}

// ── New-event highlight keyframe (injected once) ───────────────────────────

const KEYFRAME_ID = 'dw-flash';
if (typeof document !== 'undefined' && !document.getElementById(KEYFRAME_ID)) {
  const style = document.createElement('style');
  style.id = KEYFRAME_ID;
  style.textContent = `
    @keyframes dw-flash {
      0%   { background-color: hsl(var(--warning) / 0.25); }
      100% { background-color: transparent; }
    }
    .dw-new-event {
      animation: dw-flash 1.5s ease-out forwards;
    }
  `;
  document.head.appendChild(style);
}

// ── Main component ─────────────────────────────────────────────────────────

export function HealingTimeline() {
  const [events, setEvents]   = useState<HealthEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  // Tracks IDs already rendered so we can highlight genuinely new arrivals
  const seenIds = useRef<Set<number>>(new Set());

  useEffect(() => {
    function poll() {
      fetch('http://localhost:3001/api/health-events?limit=15')
        .then(r => r.ok ? r.json() as Promise<HealthEvent[]> : Promise.reject())
        .then(data => {
          setEvents(data);
          setLoading(false);
          setError(false);
        })
        .catch(() => { setError(true); setLoading(false); });
    }

    poll();
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, []);

  // After each render, absorb newly seen IDs so they don't animate again
  useEffect(() => {
    events.forEach(ev => seenIds.current.add(ev.id));
  });

  return (
    <div className="flex flex-col gap-1">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
        <Activity className="w-3.5 h-3.5" />
        System Events
      </h2>

      {loading && <TimelineSkeleton />}

      {!loading && error && (
        <p className="text-xs text-destructive">Unable to load events.</p>
      )}

      {!loading && !error && events.length === 0 && (
        <p className="text-xs text-muted-foreground">No events yet.</p>
      )}

      {!loading && !error && events.length > 0 && (
        /* Scroll container — matches ProductTable's 600px max-height */
        <div
          className="overflow-y-auto"
          style={{
            maxHeight: '600px',
            scrollbarWidth: 'thin',
            scrollbarColor: 'hsl(var(--border)) transparent',
          }}
        >
          <ol className="relative border-l border-border space-y-0">
            {events.map(ev => {
              const isNew = !seenIds.current.has(ev.id);
              return (
                <li
                  key={ev.id}
                  className={['ml-4 pb-5 last:pb-0 rounded-r', isNew ? 'dw-new-event' : ''].join(' ')}
                >
                  {/* Dot */}
                  <span
                    className="absolute -left-[5px] mt-1 h-2.5 w-2.5 rounded-full"
                    style={{
                      background: dotColor(ev.status),
                      boxShadow: `0 0 0 2px hsl(var(--background))`,
                    }}
                  />

                  <p className="text-xs font-semibold leading-tight" style={{ color: dotColor(ev.status) }}>
                    {statusLabel(ev.status)}
                  </p>
                  <p className="text-xs text-foreground leading-snug mt-0.5">
                    {truncateMessage(ev.message)}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {formatRelativeTime(ev.timestamp)} · {ev.collector_id.slice(0, 18)}…
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
