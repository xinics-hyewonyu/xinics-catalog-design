"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  addCatalogTypeAction,
  type TypeKind,
} from "@/app/actions/catalog-types";
import { Button } from "@/components/xds/button";
import { Input } from "@/components/xds/input";
import { Label } from "@/components/xds/label";

interface Props {
  kind: TypeKind;
}

export function AddCatalogTypeForm({ kind }: Props) {
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("slug", slug);
    fd.set("name", name);
    startTransition(async () => {
      const result = await addCatalogTypeAction(kind, fd);
      if (result.ok) {
        toast.success("등록되었습니다");
        setSlug("");
        setName("");
        setErrors({});
      } else {
        toast.error(result.error);
        setErrors(result.fieldErrors ?? {});
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-md rounded-md border border-border-default bg-white p-md"
    >
      <div className="grid gap-md sm:grid-cols-2">
        <div className="flex flex-col gap-xs">
          <Label htmlFor="type-slug" required>
            슬러그
          </Label>
          <Input
            id="type-slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="예: final"
          />
          {errors.slug?.[0] ? (
            <p className="text-xs text-error">{errors.slug[0]}</p>
          ) : (
            <p className="text-xs text-text-caption">
              영문 소문자·숫자·하이픈. 등록 후 변경 불가.
            </p>
          )}
        </div>
        <div className="flex flex-col gap-xs">
          <Label htmlFor="type-name" required>
            표시 이름
          </Label>
          <Input
            id="type-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 최종 시안"
          />
          {errors.name?.[0] ? (
            <p className="text-xs text-error">{errors.name[0]}</p>
          ) : null}
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit" variant="primary" loading={pending}>
          {pending ? "등록 중..." : "추가"}
        </Button>
      </div>
    </form>
  );
}
