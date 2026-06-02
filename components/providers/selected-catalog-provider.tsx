"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CatalogWithLabels } from "@/lib/data/catalogs";

interface ContextValue {
  selected: CatalogWithLabels | null;
  open: (catalog: CatalogWithLabels) => void;
  close: () => void;
}

const Ctx = createContext<ContextValue | null>(null);

interface Props {
  /** Server-rendered initial catalog when the URL contains a `?catalog=<id>` deep link. */
  initialCatalog: CatalogWithLabels | null;
  /** All catalogs currently on the page — used to resolve catalog id from URL on back/forward. */
  pageCatalogs: CatalogWithLabels[];
  children: ReactNode;
}

/**
 * Holds the catalog detail modal's open/closed state on the client so toggling
 * the modal doesn't trigger a full Next.js server roundtrip (which is what
 * made open/close feel slow). The URL is kept in sync with `history.pushState`
 * so deep-linking and back/forward still work — but URL changes here never
 * re-run the page's server component.
 */
export function SelectedCatalogProvider({
  initialCatalog,
  pageCatalogs,
  children,
}: Props) {
  const [selected, setSelected] = useState<CatalogWithLabels | null>(
    initialCatalog,
  );

  const open = useCallback((catalog: CatalogWithLabels) => {
    setSelected(catalog);
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    params.set("catalog", catalog.id);
    const qs = params.toString();
    window.history.pushState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, []);

  const close = useCallback(() => {
    setSelected(null);
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    params.delete("catalog");
    const qs = params.toString();
    window.history.pushState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, []);

  // Sync state when the user navigates via back / forward.
  useEffect(() => {
    function onPop() {
      const params = new URLSearchParams(window.location.search);
      const id = params.get("catalog");
      if (!id) {
        setSelected(null);
        return;
      }
      const found = pageCatalogs.find((c) => c.id === id);
      // If we can't find the catalog on the current page, just close — a hard
      // refresh on the link would re-render with the server-fetched value.
      setSelected(found ?? null);
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [pageCatalogs]);

  const value = useMemo<ContextValue>(
    () => ({ selected, open, close }),
    [selected, open, close],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSelectedCatalog(): ContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error(
      "useSelectedCatalog must be used inside <SelectedCatalogProvider>",
    );
  }
  return ctx;
}
