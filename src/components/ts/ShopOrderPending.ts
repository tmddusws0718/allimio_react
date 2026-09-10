export interface OrderPendingTypes {
  no: string;
  ono: string;
  sno?: string;
  mno: number;
  pno: number;
  // sno: number | null;
  ccnt: number;
  bprice: number;
  pmonth: number;
  edate: string | null;
  totalprice: number;
  status: number;
  memo: string | null;
  cdate: string;
  udate?: string;

  sname?: string;
  pname?: string;
  oldCcnt?: number;
  minccnt?: number;
  maxccnt?: number;
}


export const STATUS_MAP: Record<number, { label: string; className: string }> = {
  0: { label: '대기', className: 'info' },
  1: { label: '반려', className: 'danger' },
  2: { label: '완료', className: 'success' },
};

export type RowType = OrderPendingTypes & { cnt: number };

export const PAGE_SIZE = 6;

/* 검색필터 */
export interface Filters {
  word: string;
  status: string;
  dateFrom: string;
  dateTo: string;
}

export const EMPTY_FILTERS: Filters = {
  word: '',
  status: '',
  dateFrom: '',
  dateTo: '',
};

/* 검색필터 */
export interface PendingSearchResult {
  content: OrderPendingTypes[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}


/**
 * API 응답형태 타입 정의
 * 
 */
/** 구독권 변경 신청 요청 (기간/대수 중 바꿀 것만 채워서 보냄) */
export interface ChangeRequest {
  ono: string;
  pmonth?: number;
  ccnt?: number;
  
  pmethod: number | null;
  bankName: string | null;
  accountNo: string | null;
  accountHolder: string | null;
}

/** 구독권 변경 예상 결과 미리보기 */
export interface ChangePreview {
  pname: string;
  bprice: number;
  extraCharge: number;
  refundAmount: number;
  edate: string;
}

/** 구독권 변경 신청 결과 */
export interface ChangeResult {
  no: string;
  pending: boolean;
}

/** 관리자용 — 구독권 변경 승인/반려 요청 */
export interface ChangeApprovalRequest {
  approve: boolean;
  memo?: string;
}
