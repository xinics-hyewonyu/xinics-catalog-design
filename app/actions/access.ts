"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { ACCESS_COOKIE_NAME } from "@/lib/auth/access-cookie";

export type AccessResult = { ok: true } | { ok: false; error: string };

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 30, // 30 days
  path: "/",
};

export async function submitAccessAction(
  formData: FormData,
): Promise<AccessResult> {
  const password = (formData.get("password") ?? "").toString();
  if (!password) {
    return { ok: false, error: "비밀번호를 입력해주세요" };
  }
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return {
      ok: false,
      error: "관리자 비밀번호가 설정되지 않았습니다 (서버 ADMIN_PASSWORD env)",
    };
  }
  if (password !== expected) {
    return { ok: false, error: "비밀번호가 일치하지 않습니다" };
  }
  const c = await cookies();
  c.set(ACCESS_COOKIE_NAME, expected, COOKIE_OPTIONS);
  revalidatePath("/");
  revalidatePath("/admin");
  return { ok: true };
}

export async function clearAccessAction(): Promise<void> {
  const c = await cookies();
  c.delete(ACCESS_COOKIE_NAME);
  revalidatePath("/");
  revalidatePath("/admin");
}
