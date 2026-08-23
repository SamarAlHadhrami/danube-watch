import { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge }     from '@/components/ui/badge';
import { Skeleton }  from '@/components/ui/skeleton';
import { formatRelativeTime } from '@/lib/time';

interface Product {
  id: number;
  collector_id: string;
  title: string;
  current_price: number | null;
  original_price: number | null;
  discount_pct: number | null;
  url: string | null;
  last_seen: string;
  previous_snapshot_price: number | null;
}

function fmt(price: number | null): string {
  if (price == null) return '—';
  return price.toFixed(3);
}

// ── Loading skeleton ───────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/30 flex gap-4">
        {[45, 15, 15, 12, 13].map((w, i) => (
          <Skeleton key={i} className="h-4 rounded" style={{ width: `${w}%` }} />
        ))}
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="px-4 py-3 border-b border-border last:border-0 flex gap-4">
          {[45, 15, 15, 12, 13].map((w, j) => (
            <Skeleton key={j} className="h-4 rounded" style={{ width: `${w}%`, opacity: 1 - i * 0.12 }} />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Empty / error states ───────────────────────────────────────────────────

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border flex items-center justify-center py-16 text-sm text-muted-foreground">
      {children}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function ProductTable() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);

  useEffect(() => {
    fetch('http://localhost:3001/api/products')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<Product[]>;
      })
      .then(data => { setProducts(data); setLoading(false); })
      .catch(()  => { setError(true);   setLoading(false); });
  }, []);

  if (loading) return <TableSkeleton />;

  if (error) {
    return (
      <CenteredMessage>
        Unable to load products
      </CenteredMessage>
    );
  }

  if (products.length === 0) {
    return (
      <CenteredMessage>
        No products yet — waiting for first collection
      </CenteredMessage>
    );
  }

  return (
    /* Outer wrapper keeps horizontal overflow and the rounded border */
    <div className="rounded-lg border border-border overflow-hidden">
      {/* Sticky header sits outside the scrollable body */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[45%]">Title</TableHead>
              <TableHead className="text-right">Current (OMR)</TableHead>
              <TableHead className="text-right">Original (OMR)</TableHead>
              <TableHead className="text-center">Discount</TableHead>
              <TableHead className="text-right">Last Updated</TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      </div>

      {/* Scrollable body — max 600 px, thin custom scrollbar */}
      <div
        className="overflow-x-auto overflow-y-auto"
        style={{
          maxHeight: '600px',
          scrollbarWidth: 'thin',
          scrollbarColor: 'hsl(var(--border)) transparent',
        }}
      >
        <Table>
          <TableBody>
            {products.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-medium text-sm leading-snug w-[45%] max-w-[320px] truncate">
                  {p.url ? (
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary transition-colors"
                      title={p.title}
                    >
                      {p.title}
                    </a>
                  ) : (
                    <span title={p.title}>{p.title}</span>
                  )}
                </TableCell>

                <TableCell className="text-right tabular-nums">
                  {fmt(p.current_price)}
                </TableCell>

                <TableCell className="text-right tabular-nums text-muted-foreground line-through">
                  {p.original_price != null ? fmt(p.original_price) : '—'}
                </TableCell>

                <TableCell className="text-center">
                  {p.discount_pct != null ? (
                    <Badge
                      className="text-xs"
                      style={{
                        background: 'hsl(var(--warning))',
                        color: 'hsl(var(--warning-foreground))',
                      }}
                    >
                      {p.discount_pct}% OFF
                    </Badge>
                  ) : null}
                </TableCell>

                <TableCell className="text-right text-xs text-muted-foreground tabular-nums">
                  {formatRelativeTime(p.last_seen)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
