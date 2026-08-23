import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';

type OverallStatus = 'healthy' | 'recovered' | 'healing' | 'detected' | 'escalated' | 'unknown';

interface StatusResponse {
  status: OverallStatus;
}

function badgeStyle(status: OverallStatus): { background: string; color: string } {
  switch (status) {
    case 'healthy':
    case 'recovered':
      return { background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' };
    case 'healing':
    case 'detected':
      return { background: 'hsl(var(--warning))', color: 'hsl(var(--warning-foreground))' };
    case 'escalated':
      return { background: 'hsl(var(--destructive))', color: 'hsl(var(--destructive-foreground))' };
    default:
      return { background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' };
  }
}

function badgeLabel(status: OverallStatus): string {
  switch (status) {
    case 'healthy':
    case 'recovered':  return 'Healthy';
    case 'healing':
    case 'detected':   return 'Healing...';
    case 'escalated':  return 'Escalated';
    default:           return 'Unknown';
  }
}

export function SystemHealthBadge() {
  const [status, setStatus] = useState<OverallStatus>('unknown');

  useEffect(() => {
    function poll() {
      fetch('http://localhost:3001/api/status')
        .then(r => r.ok ? r.json() as Promise<StatusResponse> : Promise.reject())
        .then(data => setStatus(data.status))
        .catch(() => setStatus('unknown'));
    }

    poll();
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <Badge style={badgeStyle(status)} className="text-xs font-semibold px-2.5 py-1">
      {badgeLabel(status)}
    </Badge>
  );
}
