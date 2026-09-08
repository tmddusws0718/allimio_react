import { useEffect, useState } from 'react';
import { axiosInstance } from '../utils/Tool.ts';
import type { CctvIssueCodeType } from '../components/ts/CctvIssueCode.ts';

/* ---------------------------------------------------------------------
   이상행동유형코드(CCTV_ISSUE_CODE) 목록을 화면에서 코드→라벨 매핑으로 쓰기 위한 훅.

   예전에는 CctvIssue.ts에 CODE_LABELS로 01~05가 하드코딩돼 있었는데, 이제 실제
   CCTV_ISSUE_CODE 테이블(관리자 화면 dbms/cctv/CctvIssueCodeList.tsx에서 관리)을
   조회해서 씁니다(GET /cctv_issue_code/list - 사용중(useYn='Y')인 코드만, 정렬순서대로).

   같은 화면 트리 안에서 여러 컴포넌트가 동시에 이 훅을 쓰더라도 API를 여러 번 부르지
   않도록 모듈 스코프에 아주 단순한 캐시를 둡니다(탭 전환/재방문 정도의 짧은 세션 동안만
   유효하면 충분해서 만료 로직 없이 "코드관리 화면에서 저장/삭제할 때 invalidate"만 지원).
--------------------------------------------------------------------- */

let cache: CctvIssueCodeType[] | null = null;
let inFlight: Promise<CctvIssueCodeType[]> | null = null;
const listeners = new Set<() => void>();

async function fetchCodes(): Promise<CctvIssueCodeType[]> {
  if (cache) return cache;
  if (!inFlight) {
    inFlight = axiosInstance
      .get<CctvIssueCodeType[]>('/cctv_issue_code/list')
      .then((res) => {
        cache = res.data;
        inFlight = null;
        return cache;
      })
      .catch((err) => {
        inFlight = null;
        throw err;
      });
  }
  return inFlight;
}

/** 코드관리 화면(CctvIssueCodeForm.tsx)에서 저장/삭제 성공 후 호출 - 다음 조회부터 새로 불러옵니다. */
export function invalidateCctvIssueCodeCache() {
  cache = null;
  listeners.forEach((fn) => fn());
}

export function useCctvIssueCodes() {
  const [codes, setCodes] = useState<CctvIssueCodeType[]>(cache ?? []);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    let alive = true;

    const load = () => {
      setLoading(true);
      fetchCodes()
        .then((list) => {
          if (alive) setCodes(list);
        })
        .catch((err) => {
          console.error('이상행동유형코드 목록 조회 실패:', err);
          if (alive) setCodes([]);
        })
        .finally(() => {
          if (alive) setLoading(false);
        });
    };

    load();
    listeners.add(load);
    return () => {
      alive = false;
      listeners.delete(load);
    };
  }, []);

  // 매핑에 없는 값이 와도 원본 코드를 그대로 보여주므로 화면이 깨지지 않습니다(CctvIssue.ts 기존 관례 유지).
  const codeLabels: Record<string, string> = Object.fromEntries(codes.map((c) => [c.code, c.codeName]));
  const codeLabel = (code: string) => codeLabels[code] ?? code;

  return { codes, codeLabels, codeLabel, loading };
}
