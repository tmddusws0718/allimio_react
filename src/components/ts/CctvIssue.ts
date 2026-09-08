export interface CctvIssueType {
  no: number;
  cno: number;
  mno: number | null;
  code: string;
  state: number;
  comnet: string | null;
  reliability: string | null;
  pdate: string | null;
  noticeyn: 'Y' | 'N';
  cdate: string;
}

/**
 * GET /cctv_issue/search 목록 응답 항목.
 * hasAttach: ATTACH 테이블(tname='CCTV_ISSUE')에 등록된 첨부파일이 있는지 여부.
 * 서버에서 이슈 조회 쿼리에 EXISTS 서브쿼리로 함께 계산해서 내려주므로(N+1 없음),
 * "보기" 누르기 전에 목록에서 바로 첨부 유무를 표시할 수 있습니다.
 */
export interface CctvIssueListItem extends CctvIssueType {
  hasAttach: boolean;
}

/** GET /cctv_issue/search 응답 형태 (Spring Page 대신 서버에서 Map으로 직접 내려줌) */
export interface CctvIssueSearchResult {
  content: CctvIssueListItem[];
  totalElements: number;
  totalPages: number;
  page: number; // 0부터 시작
  size: number;
}

/* ---------------------------------------------------------------------
   CctvIssueList.tsx에서 쓰는 상수/타입.

   문제유형코드(CODE)는 이제 CCTV_ISSUE_CODE 참조 테이블로 관리합니다
   (관리자 화면: dbms/cctv/CctvIssueCodeList.tsx). 예전에 여기 있던 CODE_LABELS
   하드코딩(01~05)은 제거했고, 화면에서는 src/hooks/useCctvIssueCodes.ts 훅으로
   GET /cctv_issue_code/list를 조회해서 코드→라벨 매핑을 만듭니다.
   (매핑에 없는 값은 원본 코드를 그대로 보여주므로 깨지지 않음 - useCctvIssueCodes의 codeLabel 참고)

   ⚠️ STATE(오탐여부) 값 체계는 아직 참조 테이블이 없어서 처리 상태 워크플로우
     기준으로 임시 매핑해뒀습니다. 실제 코드값이 다르면 아래 STATE_LABELS만 고치면 됩니다.
--------------------------------------------------------------------- */

export const PAGE_SIZE = 10;

// 오탐여부(STATE) - NUMBER(3,0), 처리 상태 워크플로우로 가정
export const STATE_LABELS: Record<number, string> = {
  0: '미확인',
  1: '정탐',
  2: '오탐',
};
export const STATE_BADGE: Record<number, string> = {
  0: 'badge_warning',
  1: 'badge_danger',
  2: 'badge_neutral',
};

export type RowType = CctvIssueListItem & { cnt: number };

/** 신뢰도 문자열을 '74%' 형태로 통일 (저장값에 이미 %가 붙어있어도 중복으로 나오지 않게 방지) */
export function formatReliability(reliability: string | null | undefined): string {
  if (!reliability) return '-';
  const trimmed = String(reliability).trim();
  if (trimmed === '') return '-';
  return trimmed.endsWith('%') ? trimmed : `${trimmed}%`;
}

export interface Filters {
  cno: string;
  code: string;
  state: string; // '' | '0' | '1' | '2' ...
  noticeyn: string; // '' | 'Y' | 'N'
  keyword: string; // comnet(상황설명) 포함 검색
  dateFrom: string; // yyyy-MM-dd
  dateTo: string; // yyyy-MM-dd
}

export const EMPTY_FILTERS: Filters = {
  cno: '',
  code: '',
  state: '',
  noticeyn: '',
  keyword: '',
  dateFrom: '',
  dateTo: '',
};