import { Button } from "@/components/xds/button";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-md p-xl">
      <h1 className="text-xxl font-semibold text-text-heading">
        Xinics 카탈로그 아카이브
      </h1>
      <p className="text-text-caption">
        Stage 1 셋업 완료. 인증(Stage 2)은 OAuth 권한 확보 시까지 보류, 다음
        단계로 DB 스키마(Stage 3) 진행 중.
      </p>
      <div className="flex gap-sm pt-md">
        <Button variant="primary">새 카탈로그 등록</Button>
        <Button variant="default">필터</Button>
        <Button variant="dashed">초기화</Button>
        <Button variant="danger">삭제</Button>
      </div>
    </main>
  );
}
