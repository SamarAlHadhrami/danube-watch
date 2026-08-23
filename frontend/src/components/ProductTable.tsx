import { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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

export function ProductTable() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    fetch('http://localhost:3001/api/products')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<Product[]>;
      })
      .then(data => { setProducts(data); setLoading(false); })
      .catch(e  => { setError(e.message); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-destructive">
        Failed to load products: {error}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
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
        <TableBody>
          {products.map(p => (
            <TableRow key={p.id}>
              <TableCell className="font-medium text-sm leading-snug max-w-[320px] truncate">
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
  );
}
