import { NextResponse, type NextRequest } from "next/server";
import { getClientIp, isIpAllowed } from "@/lib/auth/ip-check-core";
import { updateSession } from "@/lib/supabase/middleware";

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export async function proxy(request: NextRequest) {
  // 로컬 개발 — IP 헤더가 없어 본인도 막히므로 게이팅 우회
  if (process.env.NODE_ENV === "development") {
    return await updateSession(request);
  }

  const { pathname } = request.nextUrl;
  const isWrite = WRITE_METHODS.has(request.method);
  // /admin/* 와 /trash 는 허용 IP만 — 그 외 GET 페이지는 UI/data layer에서 게이팅
  const isPrivatePage =
    pathname.startsWith("/admin") || pathname.startsWith("/trash");

  if (!isWrite && !isPrivatePage) return await updateSession(request);

  const ip = getClientIp(request.headers);
  const allowed = await isIpAllowed(ip);
  if (allowed) return await updateSession(request);

  if (isPrivatePage) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return new NextResponse(
    "접근 권한이 없습니다 — 허용된 IP에서만 가능합니다.",
    { status: 403 },
  );
}

export const config = {
  matcher: [
    // 정적 자원 / Next 내부 경로 제외 (확장자 있는 요청도 제외)
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|woff|woff2|map)$).*)",
  ],
};
