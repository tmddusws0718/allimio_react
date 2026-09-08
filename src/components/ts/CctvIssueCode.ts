export interface CctvIssueCodeType {
  code: string; // PK, VARCHAR2(2) - CCTV_ISSUE.code와 동일한 값 체계
  codeName: string;
  description: string | null;
  severity: number; // 1(낮음) ~ 3(높음)
  ord: number; // 정렬 순서
  useYn: 'Y' | 'N';
  cdate: string;
}

/** GET /cctv_issue_code/search 응답 형태 (Spring Page 대신 서버에서 Map으로 직접 내려줌) */
export interface CctvIssueCodeSearchResult {
  content: CctvIssueCodeType[];
  totalElements: number;
  totalPages: number;
  page: number; // 0부터 시작
  size: number;
}

export const PAGE_SIZE = 10;

export const SEVERITY_LABELS: Record<number, string> = {
  1: '낮음',
  2: '보통',
  3: '높음',
};
export const SEVERITY_BADGE: Record<number, string> = {
  1: 'badge_neutral',
  2: 'badge_warning',
  3: 'badge_danger',
};

export type RowType = CctvIssueCodeType & { cnt: number };

export interface Filters {
  useYn: string; // '' | 'Y' | 'N'
  keyword: string; // code/codeName 포함 검색
}

export const EMPTY_FILTERS: Filters = {
  useYn: '',
  keyword: '',
};

export const EMPTY_CODE: CctvIssueCodeType = {
  code: '',
  codeName: '',
  description: '',
  severity: 1,
  ord: 0,
  useYn: 'Y',
  cdate: '',
};
