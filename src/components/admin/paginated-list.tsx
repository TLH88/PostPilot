"use client";

import { useState, type ReactNode } from "react";

interface PaginatedListProps {
  total: number;
  defaultCount?: number;
  pageSize?: number;
  children: (start: number, end: number) => ReactNode;
}

export function PaginatedList({
  total,
  defaultCount = 10,
  pageSize = 25,
  children,
}: PaginatedListProps) {
  const [expanded, setExpanded] = useState(false);
  const [page, setPage] = useState(0);

  const start = expanded ? page * pageSize : 0;
  const end = expanded ? (page + 1) * pageSize : defaultCount;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <>
      {children(start, end)}

      {total > defaultCount && (
        <tr>
          <td colSpan={100} className="py-2">
            {!expanded ? (
              <button
                onClick={() => { setExpanded(true); setPage(0); }}
                className="w-full text-center text-xs font-medium text-primary hover:underline"
              >
                View All ({total})
              </button>
            ) : (
              <div className="space-y-2">
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-2">
                    <button
                      onClick={() => setPage(Math.max(0, page - 1))}
                      disabled={page === 0}
                      className="text-xs font-medium text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
                    >
                      Previous
                    </button>
                    <span className="text-[10px] text-muted-foreground">
                      Page {page + 1} of {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                      disabled={page >= totalPages - 1}
                      className="text-xs font-medium text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
                    >
                      Next
                    </button>
                  </div>
                )}
                <button
                  onClick={() => { setExpanded(false); setPage(0); }}
                  className="w-full text-center text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  Show Less
                </button>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
