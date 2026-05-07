import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Search, Filter, X, Download, ArrowUpDown, ChevronDown, ChevronUp,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Columns3, RotateCcw,
} from "lucide-react";
import { exportToCSV } from "@/lib/exporters";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  accessor: (row: T) => any;
  cell?: (row: T) => ReactNode;
  sortable?: boolean;
  filter?: "text" | "select" | "date" | false;
  options?: string[];
  className?: string;
  align?: "left" | "right" | "center";
  exportable?: boolean;
  exportValue?: (row: T) => string | number;
  hiddenByDefault?: boolean;
  alwaysVisible?: boolean;
}

export interface BulkAction<T> {
  label: string;
  icon?: ReactNode;
  onRun: (rows: T[]) => void | Promise<void>;
  variant?: "default" | "destructive" | "outline" | "secondary";
  disabled?: (rows: T[]) => boolean;
}

interface Props<T> {
  rows: T[];
  columns: DataTableColumn<T>[];
  createdAtKey?: keyof T | ((r: T) => string | Date | null | undefined);
  exportFilename: string;
  rightToolbar?: ReactNode;
  emptyMessage?: string;
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string;
  pageSize?: number;
  tableId?: string;
  persistInUrl?: boolean;
  selectable?: boolean;
  bulkActions?: BulkAction<T>[];
  expandedRowRender?: (row: T) => ReactNode | null;
}

type SortDir = "asc" | "desc" | null;

const alignClass = (a?: "left" | "right" | "center") =>
  a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left";

const PREFS_KEY = (tableId: string) => `dt:prefs:${tableId}`;

interface UserPrefs {
  hidden: string[];
  sortKey: string | null;
  sortDir: SortDir;
  pageSize: number;
}

export function DataTable<T>({
  rows, columns, createdAtKey, exportFilename, rightToolbar,
  emptyMessage = "No records.", rowKey, onRowClick, rowClassName,
  pageSize: initialPageSize = 25, tableId, persistInUrl,
  selectable = false, bulkActions = [],
  expandedRowRender,
}: Props<T>) {
  const useUrl = persistInUrl ?? !!tableId;
  const [searchParams, setSearchParams] = useSearchParams();
  const qp = (k: string) => useUrl ? (searchParams.get(`${tableId ?? "dt"}_${k}`) ?? "") : "";

  const loadPrefs = (): UserPrefs => {
    if (!tableId) return { hidden: [], sortKey: null, sortDir: null, pageSize: initialPageSize };
    try {
      const raw = localStorage.getItem(PREFS_KEY(tableId));
      if (raw) return { hidden: [], sortKey: null, sortDir: null, pageSize: initialPageSize, ...JSON.parse(raw) };
    } catch { /* ignore */ }
    return {
      hidden: columns.filter(c => c.hiddenByDefault).map(c => c.key),
      sortKey: null, sortDir: null, pageSize: initialPageSize,
    };
  };

  const [prefs, setPrefs] = useState<UserPrefs>(loadPrefs);
  useEffect(() => {
    if (!tableId) return;
    try { localStorage.setItem(PREFS_KEY(tableId), JSON.stringify(prefs)); } catch { /* ignore */ }
  }, [prefs, tableId]);

  const parseObj = (s: string): Record<string, string> => {
    if (!s) return {};
    try { return JSON.parse(decodeURIComponent(s)); } catch { return {}; }
  };

  const [search, setSearch] = useState<string>(qp("q") || "");
  const [filters, setFilters] = useState<Record<string, string>>(parseObj(qp("f")));
  const [dateFrom, setDateFrom] = useState<Record<string, string>>(parseObj(qp("df")));
  const [dateTo, setDateTo] = useState<Record<string, string>>(parseObj(qp("dt")));
  const [sortKey, setSortKey] = useState<string | null>(qp("sk") || prefs.sortKey);
  const [sortDir, setSortDir] = useState<SortDir>((qp("sd") as SortDir) || prefs.sortDir);
  const [pageSize, setPageSize] = useState<number>(Number(qp("ps")) || prefs.pageSize);
  const [page, setPage] = useState<number>(Number(qp("p")) || 1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => { setPrefs(p => ({ ...p, sortKey, sortDir, pageSize })); }, [sortKey, sortDir, pageSize]);

  useEffect(() => {
    if (!useUrl) return;
    const next = new URLSearchParams(searchParams);
    const prefix = `${tableId ?? "dt"}_`;
    const set = (k: string, v: string) => v ? next.set(prefix + k, v) : next.delete(prefix + k);
    set("q", search);
    set("f", Object.keys(filters).length ? encodeURIComponent(JSON.stringify(filters)) : "");
    set("df", Object.keys(dateFrom).length ? encodeURIComponent(JSON.stringify(dateFrom)) : "");
    set("dt", Object.keys(dateTo).length ? encodeURIComponent(JSON.stringify(dateTo)) : "");
    set("sk", sortKey || "");
    set("sd", sortDir || "");
    set("ps", pageSize !== initialPageSize ? String(pageSize) : "");
    set("p", page > 1 ? String(page) : "");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filters, dateFrom, dateTo, sortKey, sortDir, pageSize, page]);

  const getCreated = (r: T): Date | null => {
    if (!createdAtKey) return null;
    const v = typeof createdAtKey === "function" ? createdAtKey(r) : (r as any)[createdAtKey];
    return v ? new Date(v) : null;
  };

  const allColumns = useMemo<DataTableColumn<T>[]>(() => {
    if (!createdAtKey) return columns;
    if (columns.some(c => c.key === "__created_at")) return columns;
    return [
      ...columns,
      {
        key: "__created_at",
        header: "Created",
        accessor: (r) => getCreated(r),
        cell: (r) => {
          const d = getCreated(r);
          return d ? <span className="text-xs text-muted-foreground whitespace-nowrap">{d.toLocaleDateString()}</span> : <span className="text-muted-foreground">—</span>;
        },
        sortable: true,
        filter: "date",
        exportable: true,
        exportValue: (r) => { const d = getCreated(r); return d ? d.toISOString() : ""; },
      },
    ];
  }, [columns, createdAtKey]);

  const visibleColumns = useMemo(
    () => allColumns.filter(c => c.alwaysVisible || !prefs.hidden.includes(c.key)),
    [allColumns, prefs.hidden],
  );

  const toggleColumnHidden = (key: string) => {
    setPrefs(p => ({
      ...p,
      hidden: p.hidden.includes(key) ? p.hidden.filter(k => k !== key) : [...p.hidden, key],
    }));
  };

  const resetPrefs = () => {
    setPrefs({
      hidden: allColumns.filter(c => c.hiddenByDefault).map(c => c.key),
      sortKey: null, sortDir: null, pageSize: initialPageSize,
    });
    setSortKey(null); setSortDir(null); setPageSize(initialPageSize);
  };

  const optionsFor = (col: DataTableColumn<T>) => {
    if (col.options) return col.options;
    const set = new Set<string>();
    rows.forEach(r => {
      const v = col.accessor(r);
      if (v !== null && v !== undefined && v !== "") set.add(String(v));
    });
    return Array.from(set).sort();
  };

  const filtered = useMemo(() => {
    let out = rows;
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter(r => allColumns.some(c => {
        const v = c.accessor(r);
        if (v === null || v === undefined) return false;
        return String(v).toLowerCase().includes(q);
      }));
    }
    out = out.filter(r => {
      for (const c of allColumns) {
        if (c.filter === "select") {
          const f = filters[c.key];
          if (f && f !== "__all__") {
            const v = c.accessor(r);
            if (String(v ?? "") !== f) return false;
          }
        } else if (c.filter === "text") {
          const f = filters[c.key];
          if (f) {
            const v = c.accessor(r);
            if (!String(v ?? "").toLowerCase().includes(f.toLowerCase())) return false;
          }
        } else if (c.filter === "date") {
          const v = c.accessor(r);
          const d = v ? new Date(v) : null;
          const from = dateFrom[c.key];
          const to = dateTo[c.key];
          if (from) { if (!d || d < new Date(from)) return false; }
          if (to)   { if (!d || d > new Date(to + "T23:59:59")) return false; }
        }
      }
      return true;
    });
    if (sortKey && sortDir) {
      const col = allColumns.find(c => c.key === sortKey);
      if (col) {
        out = [...out].sort((a, b) => {
          const av = col.accessor(a); const bv = col.accessor(b);
          if (av === bv) return 0;
          if (av === null || av === undefined) return 1;
          if (bv === null || bv === undefined) return -1;
          const cmp = (av instanceof Date || typeof av === "number")
            ? (av as any) - (bv as any)
            : String(av).localeCompare(String(bv));
          return sortDir === "asc" ? cmp : -cmp;
        });
      }
    }
    return out;
  }, [rows, allColumns, search, filters, dateFrom, dateTo, sortKey, sortDir]);

  useEffect(() => { setPage(1); }, [search, filters, dateFrom, dateTo, sortKey, sortDir, pageSize]);

  const totalRows = filtered.length;
  const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(totalRows / pageSize)) : 1;
  const currentPage = Math.min(page, totalPages);
  const paged = useMemo(() => {
    if (pageSize <= 0) return filtered;
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const toggleSort = (key: string) => {
    if (sortKey !== key) { setSortKey(key); setSortDir("asc"); return; }
    if (sortDir === "asc") setSortDir("desc");
    else if (sortDir === "desc") { setSortKey(null); setSortDir(null); }
    else setSortDir("asc");
  };

  const clearAll = () => { setFilters({}); setDateFrom({}); setDateTo({}); setSearch(""); };
  const activeFilters =
    Object.values(filters).filter(v => v && v !== "__all__").length +
    Object.values(dateFrom).filter(Boolean).length +
    Object.values(dateTo).filter(Boolean).length +
    (search ? 1 : 0);

  const exportRows = useCallback((source: T[], suffix: string) => {
    const cols = allColumns.filter(c => c.exportable !== false);
    const headers = cols.map(c => c.header);
    const csvRows = source.map(r => cols.map(c => {
      if (c.exportValue) return c.exportValue(r);
      const v = c.accessor(r);
      if (v === null || v === undefined) return "";
      if (v instanceof Date) return v.toISOString();
      if (typeof v === "object") return JSON.stringify(v);
      return v as string | number;
    }));
    exportToCSV(`${exportFilename}-${suffix}-${Date.now()}.csv`, headers, csvRows);
  }, [allColumns, exportFilename]);

  const pageKeys = useMemo(() => paged.map(rowKey), [paged, rowKey]);
  const allOnPageSelected = pageKeys.length > 0 && pageKeys.every(k => selected.has(k));
  const someOnPageSelected = pageKeys.some(k => selected.has(k)) && !allOnPageSelected;
  const togglePage = () => {
    setSelected(prev => {
      const next = new Set(prev);
      if (allOnPageSelected) pageKeys.forEach(k => next.delete(k));
      else pageKeys.forEach(k => next.add(k));
      return next;
    });
  };
  const toggleRow = (k: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  };
  const selectedRows = useMemo(() => {
    if (selected.size === 0) return [];
    return filtered.filter(r => selected.has(rowKey(r)));
  }, [selected, filtered, rowKey]);
  const clearSelection = () => setSelected(new Set());

  const colCount = visibleColumns.length + (selectable ? 1 : 0);

  return (
    <div className="space-y-3">
      <Card className="page-section p-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9 h-9" placeholder="Search any column…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <Filter className="h-3.5 w-3.5 mr-1.5" />Filters
                {activeFilters > 0 && <Badge className="ml-1.5 h-5 px-1.5">{activeFilters}</Badge>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[420px] max-h-[70vh] overflow-y-auto" align="start">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold">Column filters</div>
                {activeFilters > 0 && <Button variant="ghost" size="sm" onClick={clearAll}><X className="h-3 w-3 mr-1" />Reset</Button>}
              </div>
              <div className="space-y-3">
                {allColumns.filter(c => c.filter).map(c => (
                  <div key={c.key}>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">{c.header}</label>
                    {c.filter === "select" && (
                      <Select value={filters[c.key] ?? "__all__"} onValueChange={v => setFilters({ ...filters, [c.key]: v })}>
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">All</SelectItem>
                          {optionsFor(c).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                    {c.filter === "text" && (
                      <Input className="h-8" value={filters[c.key] ?? ""} onChange={e => setFilters({ ...filters, [c.key]: e.target.value })} placeholder={`Filter ${c.header.toLowerCase()}…`} />
                    )}
                    {c.filter === "date" && (
                      <div className="grid grid-cols-2 gap-2">
                        <Input type="date" className="h-8" value={dateFrom[c.key] ?? ""} onChange={e => setDateFrom({ ...dateFrom, [c.key]: e.target.value })} />
                        <Input type="date" className="h-8" value={dateTo[c.key] ?? ""} onChange={e => setDateTo({ ...dateTo, [c.key]: e.target.value })} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <Columns3 className="h-3.5 w-3.5 mr-1.5" />Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 max-h-[60vh] overflow-y-auto">
              <DropdownMenuLabel>Show columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {allColumns.map(c => (
                <DropdownMenuCheckboxItem
                  key={c.key}
                  checked={!prefs.hidden.includes(c.key)}
                  disabled={c.alwaysVisible}
                  onCheckedChange={() => toggleColumnHidden(c.key)}
                  onSelect={(e) => e.preventDefault()}
                >
                  {c.header}
                </DropdownMenuCheckboxItem>
              ))}
              {tableId && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={resetPrefs}>
                    <RotateCcw className="h-3.5 w-3.5 mr-2" />Reset preferences
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {activeFilters > 0 && (
            <Button variant="ghost" size="sm" className="h-9 text-muted-foreground" onClick={clearAll}>
              <X className="h-3 w-3 mr-1" />Clear
            </Button>
          )}
          <div className="text-xs text-muted-foreground ml-auto">
            <span className="font-semibold text-foreground tabular-nums">{totalRows}</span> of {rows.length}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9" disabled={paged.length === 0 && filtered.length === 0}>
                <Download className="h-3.5 w-3.5 mr-1.5" />Export
                <ChevronDown className="h-3 w-3 ml-1 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportRows(paged, "page")} disabled={paged.length === 0}>
                Current page ({paged.length})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportRows(filtered, "filtered")} disabled={filtered.length === 0}>
                All filtered rows ({filtered.length})
              </DropdownMenuItem>
              {selectable && selected.size > 0 && (
                <DropdownMenuItem onClick={() => exportRows(selectedRows, "selected")}>
                  Selected ({selected.size})
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {rightToolbar}
        </div>

        {selectable && selected.size > 0 && (
          <div className="mt-3 flex items-center gap-2 flex-wrap rounded-md border bg-muted/50 px-3 py-2">
            <span className="text-xs font-medium">{selected.size} selected</span>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearSelection}>
              <X className="h-3 w-3 mr-1" />Clear
            </Button>
            <div className="ml-auto flex items-center gap-2 flex-wrap">
              {bulkActions.map((a, i) => (
                <Button
                  key={i}
                  size="sm"
                  variant={a.variant ?? "outline"}
                  className="h-8"
                  disabled={a.disabled?.(selectedRows)}
                  onClick={() => a.onRun(selectedRows)}
                >
                  {a.icon}{a.icon ? <span className="ml-1.5">{a.label}</span> : a.label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Card className="page-section overflow-hidden">
        <div className="max-h-[calc(100vh-320px)] min-h-[300px] overflow-auto rounded-md relative">
          <Table className="w-full min-w-max table-auto">
            <TableHeader className="sticky top-0 z-10 bg-card shadow-[0_1px_0_0_hsl(var(--border))]">
              <TableRow>
                {selectable && (
                  <TableHead className="bg-card w-10">
                    <Checkbox
                      checked={allOnPageSelected ? true : someOnPageSelected ? "indeterminate" : false}
                      onCheckedChange={togglePage}
                      aria-label="Select page"
                    />
                  </TableHead>
                )}
                {visibleColumns.map(c => (
                  <TableHead key={c.key} className={`${alignClass(c.align)} bg-card whitespace-nowrap ${c.className ?? ""}`}>
                    {c.sortable ? (
                      <button onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                        {c.header}
                        {sortKey === c.key
                          ? (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)
                          : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                      </button>
                    ) : c.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.length === 0 && (
                <TableRow><TableCell colSpan={colCount} className="text-center text-muted-foreground py-12">{emptyMessage}</TableCell></TableRow>
              )}
              {paged.map(r => {
                const k = rowKey(r);
                const isSel = selected.has(k);
                return (
                  <React.Fragment key={k}>
                    <TableRow
                      data-state={isSel ? "selected" : undefined}
                      className={`table-row-hover ${onRowClick ? "cursor-pointer" : ""} ${rowClassName ? rowClassName(r) : ""}`}
                      onClick={onRowClick ? () => onRowClick(r) : undefined}
                    >
                      {selectable && (
                        <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                          <Checkbox checked={isSel} onCheckedChange={() => toggleRow(k)} aria-label="Select row" />
                        </TableCell>
                      )}
                      {visibleColumns.map(c => (
                        <TableCell key={c.key} className={`${alignClass(c.align)} ${c.className ?? ""}`}>
                          {c.cell ? c.cell(r) : (c.accessor(r) ?? <span className="text-muted-foreground">—</span>)}
                        </TableCell>
                      ))}
                    </TableRow>
                    {expandedRowRender && (() => {
                      const expanded = expandedRowRender(r);
                      if (!expanded) return null;
                      return (
                        <TableRow>
                          <TableCell colSpan={colCount} className="p-0">
                            {expanded}
                          </TableCell>
                        </TableRow>
                      );
                    })()}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
        {pageSize > 0 && totalRows > 0 && (
          <div className="flex items-center justify-between gap-3 border-t px-3 py-2 flex-wrap">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Rows per page</span>
              <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                <SelectTrigger className="h-8 w-[80px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[10, 25, 50, 100].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
              <span className="ml-2 tabular-nums">
                {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, totalRows)} of {totalRows}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(1)} disabled={currentPage === 1}><ChevronsLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="px-2 text-xs tabular-nums">Page {currentPage} of {totalPages}</span>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><ChevronRight className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(totalPages)} disabled={currentPage === totalPages}><ChevronsRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}