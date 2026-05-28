"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createProposalType,
  createSiteType,
  deleteProposalType,
  deleteSiteType,
  setProposalTypeActive,
  setSiteTypeActive,
  updateProposalTypeName,
  updateSiteTypeName,
} from "@/lib/data/types";

export type TypeKind = "proposal" | "site";

const addSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, "슬러그를 입력해주세요")
    .max(64, "슬러그가 너무 깁니다")
    .regex(
      /^[a-z0-9_-]+$/,
      "슬러그는 영문 소문자·숫자·하이픈·언더스코어만 가능합니다",
    ),
  name: z.string().trim().min(1, "이름을 입력해주세요"),
});

export type AddTypeResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

function pathsForKind(kind: TypeKind) {
  return kind === "proposal" ? "/admin/proposal-types" : "/admin/site-types";
}

export async function addCatalogTypeAction(
  kind: TypeKind,
  formData: FormData,
): Promise<AddTypeResult> {
  const parsed = addSchema.safeParse({
    slug: formData.get("slug") ?? "",
    name: formData.get("name") ?? "",
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: "입력값을 확인해주세요",
      fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<
        string,
        string[]
      >,
    };
  }
  try {
    if (kind === "proposal") await createProposalType(parsed.data);
    else await createSiteType(parsed.data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("duplicate") || msg.includes("unique")) {
      return { ok: false, error: "같은 슬러그가 이미 등록되어 있습니다" };
    }
    return { ok: false, error: `등록 실패: ${msg}` };
  }
  revalidatePath(pathsForKind(kind));
  revalidatePath("/");
  return { ok: true };
}

export async function renameCatalogTypeAction(
  kind: TypeKind,
  id: string,
  name: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "이름을 입력해주세요" };
  try {
    if (kind === "proposal") await updateProposalTypeName(id, trimmed);
    else await updateSiteTypeName(id, trimmed);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
  revalidatePath(pathsForKind(kind));
  revalidatePath("/");
  return { ok: true };
}

export async function toggleCatalogTypeActiveAction(
  kind: TypeKind,
  id: string,
  isActive: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    if (kind === "proposal") await setProposalTypeActive(id, isActive);
    else await setSiteTypeActive(id, isActive);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
  revalidatePath(pathsForKind(kind));
  revalidatePath("/");
  return { ok: true };
}

export async function deleteCatalogTypeAction(
  kind: TypeKind,
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    if (kind === "proposal") await deleteProposalType(id);
    else await deleteSiteType(id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("foreign key") || msg.includes("violates")) {
      return {
        ok: false,
        error:
          "이 분류를 사용 중인 카탈로그가 있어 삭제할 수 없습니다. 비활성으로 숨기세요.",
      };
    }
    return { ok: false, error: `삭제 실패: ${msg}` };
  }
  revalidatePath(pathsForKind(kind));
  revalidatePath("/");
  return { ok: true };
}
