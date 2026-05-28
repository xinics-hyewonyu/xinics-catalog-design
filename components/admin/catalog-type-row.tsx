"use client";

import { Check, Pencil, Trash2, X } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  deleteCatalogTypeAction,
  renameCatalogTypeAction,
  toggleCatalogTypeActiveAction,
  type TypeKind,
} from "@/app/actions/catalog-types";
import { Input } from "@/components/xds/input";

interface RowItem {
  id: string;
  slug: string;
  name: string;
  is_active: boolean;
  sort_order: number;
}

interface Props {
  kind: TypeKind;
  item: RowItem;
}

export function CatalogTypeRow({ kind, item }: Props) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [pending, startTransition] = useTransition();

  function startEdit() {
    setName(item.name);
    setEditing(true);
  }

  function cancelEdit() {
    if (name.trim() !== item.name) {
      if (!confirm("수정한 내용이 저장되지 않습니다. 취소하시겠습니까?"))
        return;
    }
    setName(item.name);
    setEditing(false);
  }

  function saveEdit() {
    if (name.trim() === item.name) {
      setEditing(false);
      return;
    }
    startTransition(async () => {
      const r = await renameCatalogTypeAction(kind, item.id, name);
      if (r.ok) {
        toast.success("수정되었습니다");
        setEditing(false);
      } else {
        toast.error(r.error);
      }
    });
  }

  function handleToggle() {
    startTransition(async () => {
      const r = await toggleCatalogTypeActiveAction(
        kind,
        item.id,
        !item.is_active,
      );
      if (!r.ok) toast.error(r.error);
    });
  }

  function handleDelete() {
    if (
      !confirm(
        `'${item.name}' (${item.slug}) 분류를 삭제하시겠습니까?\n사용 중인 카탈로그가 있으면 삭제할 수 없으니, 그 경우엔 비활성으로 숨기세요.`,
      )
    )
      return;
    startTransition(async () => {
      const r = await deleteCatalogTypeAction(kind, item.id);
      if (r.ok) toast.success("삭제되었습니다");
      else toast.error(r.error);
    });
  }

  return (
    <tr className="border-b border-border-subtle text-sm">
      <td className="py-sm pl-md text-xs tabular-nums text-text-caption">
        {item.sort_order}
      </td>
      <td className="py-sm font-mono text-xs text-text-caption">
        {item.slug}
      </td>
      <td className="py-sm pr-md">
        {editing ? (
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                saveEdit();
              } else if (e.key === "Escape") {
                e.preventDefault();
                cancelEdit();
              }
            }}
            autoFocus
            disabled={pending}
          />
        ) : (
          <span className="text-text-body">{item.name}</span>
        )}
      </td>
      <td className="py-sm">
        <StatusBadge
          active={item.is_active}
          editable={editing}
          onToggle={handleToggle}
          disabled={pending}
        />
      </td>
      <td className="py-sm pr-md">
        <div className="flex items-center justify-end gap-xxs">
          {editing ? (
            <>
              <IconButton
                onClick={saveEdit}
                disabled={pending}
                aria-label="저장"
                tone="success"
              >
                <Check aria-hidden className="size-3.5" />
              </IconButton>
              <IconButton
                onClick={cancelEdit}
                disabled={pending}
                aria-label="취소"
              >
                <X aria-hidden className="size-3.5" />
              </IconButton>
            </>
          ) : (
            <>
              <IconButton
                onClick={startEdit}
                disabled={pending}
                aria-label={`${item.name} 수정`}
              >
                <Pencil aria-hidden className="size-3.5" />
              </IconButton>
              <IconButton
                onClick={handleDelete}
                disabled={pending}
                aria-label={`${item.name} 삭제`}
                tone="danger"
              >
                <Trash2 aria-hidden className="size-3.5" />
              </IconButton>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

function StatusBadge({
  active,
  editable,
  onToggle,
  disabled,
}: {
  active: boolean;
  editable: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  const tone = active
    ? "bg-success-bg text-success"
    : "bg-surface-muted text-text-caption";
  const base =
    "inline-flex items-center rounded-md px-xs py-[2px] text-xs leading-none";
  const label = active ? "활성" : "비활성";
  if (!editable) {
    return <span className={`${base} ${tone}`}>{label}</span>;
  }
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={active}
      title={active ? "클릭하여 비활성으로" : "클릭하여 활성으로"}
      className={[
        base,
        tone,
        "cursor-pointer transition-colors hover:opacity-80",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
        "focus-visible:outline-[var(--xds-focus-ring-color)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "motion-reduce:transition-none",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function IconButton({
  onClick,
  disabled,
  tone,
  children,
  ...rest
}: {
  onClick: () => void;
  disabled?: boolean;
  tone?: "success" | "danger";
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const hoverColor =
    tone === "danger"
      ? "hover:bg-error-bg hover:text-error"
      : tone === "success"
        ? "hover:bg-success-bg text-success"
        : "hover:bg-surface-muted hover:text-text-body";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-text-caption",
        "transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
        "focus-visible:outline-[var(--xds-focus-ring-color)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "motion-reduce:transition-none",
        hoverColor,
      ].join(" ")}
      {...rest}
    >
      {children}
    </button>
  );
}
