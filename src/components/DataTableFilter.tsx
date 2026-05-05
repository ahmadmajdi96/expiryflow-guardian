import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DataTableFilterProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const DataTableFilter = ({ value, onChange, placeholder = "Search…" }: DataTableFilterProps) => (
  <div className="relative">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input
      className="pl-9 pr-8 h-9"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
    {value && (
      <button
        onClick={() => onChange("")}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    )}
  </div>
);

export default DataTableFilter;

/** Generic client-side filter: returns true if any of `fields` contains `query` (case-insensitive) */
export function matchesSearch(item: any, query: string, fields: string[]): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return fields.some((f) => {
    const parts = f.split(".");
    let val = item;
    for (const p of parts) {
      val = val?.[p];
    }
    return String(val ?? "").toLowerCase().includes(q);
  });
}