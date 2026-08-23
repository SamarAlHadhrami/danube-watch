import { useEffect, useState } from 'react';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge }    from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input }    from '@/components/ui/input';
import { Search }   from 'lucide-react';
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
    <div className="rounded-xl border border-border overflow-hidden">
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
    <div className="rounded-xl border border-border flex items-center justify-center py-16 text-sm text-muted-foreground">
      {children}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function ProductTable() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);
  const [query, setQuery]       = useState('');

  useEffect(() => {
    fetch('http://localhost:3001/api/products')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<Product[]>;
      })
      .then(data => { setProducts(data); setLoading(false); })
      .catch(()  => { setError(true);   setLoading(false); });
  }, []);

  const filtered = query.trim()
    ? products.filter(p => p.title.toLowerCase().includes(query.toLowerCase()))
    : products;

  if (loading) return <TableSkeleton />;
  if (error) return <CenteredMessage>Unable to load products</CenteredMessage>;

  return (
    <div className="flex flex-col gap-3">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search products..."
          className="pl-9 bg-card border-border rounded-xl h-9 text-sm focus-visible:ring-primary/50"
        />
      </div>

      {products.length === 0 ? (
        <CenteredMessage>No products yet — waiting for first collection</CenteredMessage>
      ) : filtered.length === 0 ? (
        <CenteredMessage>No products match "{query}"</CenteredMessage>
      ) : (
        /* Outer rounded border — header is sticky inside via position sticky */
        <div className="rounded-xl border border-border overflow-hidden transition-shadow duration-200 hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.15)]">
          {/* Sticky header */}
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

          {/* Scrollable body */}
          <div
            className="overflow-x-auto overflow-y-auto"
            style={{
              maxHeight: '560px',
              scrollbarWidth: 'thin',
              scrollbarColor: 'hsl(var(--border)) transparent',
            }}
          >
            <Table>
              <TableBody>
                {filtered.map(p => (
                  <TableRow key={p.id} className="transition-colors">
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
                          className="text-xs font-semibold"
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
      )}
    </div>
  );
}
