"use client";

import { createContext, useContext } from "react";

/**
 * 현재 요청이 허용 IP에서 왔는지 — 모든 클라이언트 컴포넌트에서 읽을 수 있게.
 * 값은 root layout에서 SSR로 결정되어 한 번만 내려옴.
 *
 * - true  : 풀 권한 (편집/삭제/비공개 필드 보기)
 * - false : 읽기 전용 (외부 공유 모드)
 */
const AccessContext = createContext<boolean>(false);

export function AccessProvider({
  isAllowed,
  children,
}: {
  isAllowed: boolean;
  children: React.ReactNode;
}) {
  return (
    <AccessContext.Provider value={isAllowed}>
      {children}
    </AccessContext.Provider>
  );
}

/** true = 허용 IP, false = 읽기 전용. */
export function useIsAllowed(): boolean {
  return useContext(AccessContext);
}

/** 편의 — `useIsAllowed()`의 반대값. */
export function useIsReadOnly(): boolean {
  return !useContext(AccessContext);
}
