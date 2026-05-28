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
import { useIsAllowed } from "@/components/providers/access-provider";
import { Input } from "@/components/xds/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/xds/select";
import { Tag } from "@/components/xds/tag";
import type {
  ProposalType,
  SiteType,
} from "@/lib/data/types";

type SortKey = "newest" | "oldest" | "name" | "customer";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "최신순" },
  { value: "oldest", label: "오래된순" },
  { value: "name", label: "사이트명 가나다순" },
  { value: "customer", label: "고객명 가나다순" },
];

// Mirrors DEFAULT_SITE_SLUGS in app/page.tsx — the preset applied when the
// URL has no `site` param. A present-but-empty `site=` means cleared.
const DEFAULT_SITE_SLUGS = ["basic", "open_campus"];

interface Props {
  proposalTypes: ProposalType[];
  siteTypes: SiteType[];
}

export function CatalogListHeader({ proposalTypes, siteTypes }: Props) {
  const router = useRouter();
  const search = useSearchParams();
  const [, startTransition] = useTransition();
  const isAllowed = useIsAllowed();

  const initialQ = search.get("q") ?? "";
  const selectedProposal = useMemo(
    () => new Set((search.get("proposal") ?? "").split(",").filter(Boolean)),
    [search],
  );
  const selectedSite = useMemo(() => {
    const raw = search.get("site");
    if (raw === null) return new Set(DEFAULT_SITE_SLUGS);
    return new Set(raw.split(",").filter(Boolean));
  }, [search]);
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
      // For `site`, an absent param means the default preset is active —
      // seed `current` from the preset so toggling off a default chip
      // doesn't accidentally re-add the others.
      const raw = p.get(key);
      const current =
        key === "site" && raw === null
          ? new Set(DEFAULT_SITE_SLUGS)
          : new Set((raw ?? "").split(",").filter(Boolean));
      if (current.has(id)) current.delete(id);
      else current.add(id);
      if (key === "site") {
        // Always write explicitly once the user has touched the filter so
        // an empty selection stays empty (rather than reverting to default).
        p.set("site", Array.from(current).join(","));
      } else if (current.size === 0) {
        p.delete(key);
      } else {
        p.set(key, Array.from(current).join(","));
      }
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
      <div className="grid gap-md sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div>
          <label htmlFor="catalog-search" className="sr-only">
            사이트명·고객명·주소 검색
          </label>
          <Input
            id="catalog-search"
            type="search"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="사이트명·고객명·주소 검색"
            iconLeading={<Search className="size-4" aria-hidden />}
          />
        </div>
        <div className="flex items-center gap-sm">
          <span
            id="catalog-sort-label"
            className="shrink-0 whitespace-nowrap text-xs text-text-caption"
          >
            정렬
          </span>
          <Select
            value={sort}
            onValueChange={(value) => changeSort(value as SortKey)}
          >
            <SelectTrigger
              aria-labelledby="catalog-sort-label"
              className="w-[170px]"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-xl gap-y-sm">
        {isAllowed ? (
          <FilterRow
            legend="시안 종류"
            options={proposalTypes}
            selected={selectedProposal}
            onToggle={(id) => toggleSetParam("proposal", id)}
          />
        ) : null}
        <FilterRow
          legend="사이트 종류"
          options={siteTypes}
          selected={selectedSite}
          onToggle={(id) => toggleSetParam("site", id)}
        />
      </div>
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
  options: { id: string; slug: string; name: string }[];
  selected: Set<string>;
  onToggle: (slug: string) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div
      role="group"
      aria-label={legend}
      className="flex flex-wrap items-center gap-xs"
    >
      <span className="mr-xs shrink-0 text-xs text-text-caption">
        {legend}
      </span>
      {options.map((o) => {
        const active = selected.has(o.slug);
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onToggle(o.slug)}
            aria-pressed={active}
            className="appearance-none rounded-full transition-transform duration-150 hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--xds-focus-ring-color)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            <Tag
              tone={active ? "info" : "default"}
              size="md"
              className={[
                "transition-colors duration-150 motion-reduce:transition-none",
                active
                  ? "ring-1 ring-info-border hover:bg-info-bg-hover"
                  : "hover:bg-neutral-bg-hover hover:border-neutral-border-hover",
              ].join(" ")}
            >
              {o.name}
            </Tag>
          </button>
        );
      })}
    </div>
  );
}
