"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/xds/input";
import { Tag } from "@/components/xds/tag";
import type {
  ProposalType,
  SiteType,
} from "@/lib/data/types";

type SortKey = "newest" | "oldest" | "customer";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "최신순" },
  { value: "oldest", label: "오래된순" },
  { value: "customer", label: "고객명 가나다순" },
];

interface Props {
  proposalTypes: ProposalType[];
  siteTypes: SiteType[];
}

export function CatalogListHeader({ proposalTypes, siteTypes }: Props) {
  const router = useRouter();
  const search = useSearchParams();
  const [, startTransition] = useTransition();

  const initialQ = search.get("q") ?? "";
  const selectedProposal = useMemo(
    () => new Set((search.get("proposal") ?? "").split(",").filter(Boolean)),
    [search],
  );
  const selectedSite = useMemo(
    () => new Set((search.get("site") ?? "").split(",").filter(Boolean)),
    [search],
  );
  const sort = (search.get("sort") as SortKey) ?? "newest";

  const [qInput, setQInput] = useState(initialQ);

  // Keep input synced if URL changes from outside (e.g. back/forward).
  useEffect(() => {
    setQInput(initialQ);
  }, [initialQ]);

  const setParam = useCallback(
    (mutate: (p: URLSearchParams) => void) => {
      const next = new URLSearchParams(search.toString());
      mutate(next);
      const qs = next.toString();
      startTransition(() => {
        router.replace(qs ? `/?${qs}` : "/", { scroll: false });
      });
    },
    [router, search],
  );

  // Debounce search input -> URL
  useEffect(() => {
    if (qInput === initialQ) return;
    const t = setTimeout(() => {
      setParam((p) => {
        if (qInput) p.set("q", qInput);
        else p.delete("q");
      });
    }, 250);
    return () => clearTimeout(t);
  }, [qInput, initialQ, setParam]);

  function toggleSetParam(key: "proposal" | "site", id: string) {
    setParam((p) => {
      const current = new Set(
        (p.get(key) ?? "").split(",").filter(Boolean),
      );
      if (current.has(id)) current.delete(id);
      else current.add(id);
      if (current.size === 0) p.delete(key);
      else p.set(key, Array.from(current).join(","));
    });
  }

  function changeSort(value: SortKey) {
    setParam((p) => {
      if (value === "newest") p.delete("sort");
      else p.set("sort", value);
    });
  }

  return (
    <section className="flex flex-col gap-md">
      <div className="flex flex-col gap-md sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:max-w-md">
          <label htmlFor="catalog-search" className="sr-only">
            고객명 또는 도메인 검색
          </label>
          <Input
            id="catalog-search"
            type="search"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="고객명·도메인 검색"
            iconLeading={<Search className="size-4" aria-hidden />}
          />
        </div>
        <div className="flex items-center gap-sm">
          <label
            htmlFor="catalog-sort"
            className="text-xs text-text-caption"
          >
            정렬
          </label>
          <select
            id="catalog-sort"
            value={sort}
            onChange={(e) => changeSort(e.target.value as SortKey)}
            className="h-[var(--xds-control-height-md)] rounded-md border border-border-default bg-surface-elevated px-sm text-sm text-text-body focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[var(--xds-focus-ring-color)]"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <FilterRow
        legend="시안 종류"
        options={proposalTypes}
        selected={selectedProposal}
        onToggle={(id) => toggleSetParam("proposal", id)}
      />
      <FilterRow
        legend="사이트 종류"
        options={siteTypes}
        selected={selectedSite}
        onToggle={(id) => toggleSetParam("site", id)}
      />
    </section>
  );
}

function FilterRow({
  legend,
  options,
  selected,
  onToggle,
}: {
  legend: string;
  options: { id: string; name: string }[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  if (options.length === 0) return null;
  return (
    <fieldset className="flex flex-wrap items-center gap-xs">
      <legend className="mr-sm text-xs text-text-caption">{legend}</legend>
      {options.map((o) => {
        const active = selected.has(o.id);
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onToggle(o.id)}
            aria-pressed={active}
            className="appearance-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--xds-focus-ring-color)] rounded-full"
          >
            <Tag
              tone={active ? "info" : "default"}
              size="md"
              className={active ? "ring-1 ring-info-border" : ""}
            >
              {o.name}
            </Tag>
          </button>
        );
      })}
    </fieldset>
  );
}
