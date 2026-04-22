"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface Option {
  id: string;
  name: string;
  description?: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder?: string;
  onSearch: (query: string) => void;
  isLoading?: boolean;
  label?: string;
  helperText?: string;
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder,
  searchPlaceholder = "Search...",
  onSearch,
  isLoading,
  label,
  helperText,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.id === value);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch(query);
  };

  return (
    <div className="space-y-2" ref={containerRef}>
      {label && (
        <label className="block text-xs font-bold text-neutral-500 uppercase">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
            !selectedOption && "text-stone-400"
          )}
        >
          <span className="truncate">
            {selectedOption ? selectedOption.name : placeholder}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>

        {isOpen && (
          <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 p-1 shadow-xl animate-in fade-in-0 zoom-in-95">
            <div className="flex items-center border-b border-stone-100 dark:border-stone-800 px-3 py-2">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <input
                className="flex h-8 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-stone-500 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={handleSearchChange}
                autoFocus
              />
            </div>
            <div className="mt-1">
              {isLoading ? (
                <div className="py-6 text-center text-sm text-stone-400">
                  Loading...
                </div>
              ) : options.length === 0 ? (
                <div className="py-6 text-center text-sm text-stone-400">
                  No results found.
                </div>
              ) : (
                options.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      onValueChange(option.id);
                      setIsOpen(false);
                      setSearchQuery("");
                    }}
                    className={cn(
                      "relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-stone-100 dark:hover:bg-stone-800 focus:bg-stone-100 dark:focus:bg-stone-800 transition-colors",
                      value === option.id && "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
                    )}
                  >
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{option.name}</span>
                      {option.description && (
                        <span className="text-[10px] text-stone-500 line-clamp-1">
                          {option.description}
                        </span>
                      )}
                    </div>
                    {value === option.id && (
                      <Check className="ml-auto h-4 w-4" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      {helperText && (
        <p className="text-[10px] text-stone-400 italic">{helperText}</p>
      )}
    </div>
  );
}
