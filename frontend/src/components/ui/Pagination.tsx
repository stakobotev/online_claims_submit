import { Button } from './Button';
import { useTranslation } from 'react-i18next';

interface PaginationProps {
  page: number;
  pages: number;
  onPage: (p: number) => void;
}

export function Pagination({ page, pages, onPage }: PaginationProps) {
  const { t } = useTranslation();
  if (pages <= 1) return null;

  const windowPages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(pages, page + 2);
  for (let i = start; i <= end; i++) windowPages.push(i);

  return (
    <nav className="flex items-center justify-center gap-1 mt-4" aria-label="Pagination">
      <Button
        variant="ghost"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        aria-label={t('pagination.previous', 'Previous')}
      >
        ‹
      </Button>
      {start > 1 && (
        <>
          <Button variant="ghost" size="sm" onClick={() => onPage(1)}>1</Button>
          {start > 2 && <span className="px-2 text-gray-400">…</span>}
        </>
      )}
      {windowPages.map((p) => (
        <Button
          key={p}
          variant={p === page ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => onPage(p)}
          aria-current={p === page ? 'page' : undefined}
        >
          {p}
        </Button>
      ))}
      {end < pages && (
        <>
          {end < pages - 1 && <span className="px-2 text-gray-400">…</span>}
          <Button variant="ghost" size="sm" onClick={() => onPage(pages)}>{pages}</Button>
        </>
      )}
      <Button
        variant="ghost"
        size="sm"
        disabled={page >= pages}
        onClick={() => onPage(page + 1)}
        aria-label={t('pagination.next', 'Next')}
      >
        ›
      </Button>
    </nav>
  );
}
