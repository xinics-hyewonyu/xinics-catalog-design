import Link from "next/link";
import { AddIpForm } from "@/components/admin/add-ip-form";
import { IpRow } from "@/components/admin/ip-row";
import { getRequestAccess } from "@/lib/auth/ip-check";
import { listAllowedIps } from "@/lib/data/allowed-ips";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "허용 IP 관리 · 자이닉스 디자인 라이브러리",
};

export default async function AllowedIpsPage() {
  const [ips, { ip: currentIp }] = await Promise.all([
    listAllowedIps(),
    getRequestAccess(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-lg p-md sm:p-xl">
      <header className="flex flex-col gap-xs">
        <Link
          href="/"
          className="text-xs text-text-caption transition-colors hover:text-text-body"
        >
          ← 메인으로
        </Link>
        <h1 className="text-xxl font-semibold text-text-heading">
          허용 IP 관리
        </h1>
        <p className="text-sm text-text-caption">
          여기에 등록된 IP에서만 카탈로그 편집·삭제와 어드민 페이지 접근이
          가능합니다. 그 외 사용자는 최종 시안만 읽기 전용으로 볼 수 있습니다.
        </p>
      </header>

      <AddIpForm currentIp={currentIp} />

      <section className="overflow-hidden rounded-md border border-border-default">
        <table className="w-full border-collapse">
          <thead className="border-b border-border-default bg-surface-muted text-xs text-text-caption">
            <tr>
              <th className="py-sm pl-md text-left font-medium">IP 주소</th>
              <th className="py-sm text-left font-medium">라벨</th>
              <th className="py-sm text-left font-medium">상태</th>
              <th className="py-sm text-left font-medium">등록일</th>
              <th className="py-sm pr-md text-right font-medium" />
            </tr>
          </thead>
          <tbody>
            {ips.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="py-lg text-center text-sm text-text-caption"
                >
                  등록된 IP가 없습니다.
                </td>
              </tr>
            ) : (
              ips.map((ip) => (
                <IpRow
                  key={ip.id}
                  ip={ip}
                  isCurrent={ip.ip_address === currentIp}
                />
              ))
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
