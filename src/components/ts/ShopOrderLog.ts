export interface ShopOrderLogTypes {
  no: number;
  ono: string;
  mno: number;
  pno?: number;
  action: number;
  sno: number | null;
  beforeEdate: string | null;
  afterEdate: string | null;
  amount: number | null;
  memo: string | null;
  cdate: string;

  ccnt: number | null;
  bprice: number | null;
  id?: string;
  sname?: string;
  newPname?: string;
  newCcnt?: number | null;
  pname?: string;
  sdate?: string;

}

export type RowType = ShopOrderLogTypes & { cnt: number };

// ACTION (이벤트 종류)
//  (0 결제 / 1 매장연결 / 2 갱신 / 3 취소 / 4 변경신청 / 5 변경완료 / 6 변경반려)
export const LOG_ACTION_MAP: Record<number, { label: string; className: string }> = {
  0: { label: '신규결제', className: 'orange' },
  1: { label: '매장연결', className: 'info' },
  2: { label: '갱신', className: 'success' },
  3: { label: '취소', className: 'danger' },
  4: { label: '변경신청', className: 'wait' },
  5: { label: '변경완료', className: 'success' },
  6: { label: '변경반려', className: 'danger' },
};

export interface Filters {
  word: string;
  action: string;
  dateFrom: string;
  dateTo: string;
}

export const EMPTY_FILTERS: Filters = {
  word: '',
  action: '',
  dateFrom: '',
  dateTo: '',
};

export const PAGE_SIZE = 6;

/** GET /shop_order_log/mno/{mno}/search, /shop_order_log/list/admin 응답 형태 (PageResponse) */
export interface LogSearchResult {
  content: ShopOrderLogTypes[];
  totalElements: number;
  totalPages: number;
  page: number; // 0부터 시작
  size: number;
}

/**
 * 금액 표시 헬퍼. 백엔드가 AMOUNT를 항상 양수로 저장하므로,
 * action 값을 보고 프론트에서 결제(+)/환불(-)을 판단합니다.
 * - action=3(취소): 항상 환불이므로 음수 표시
 * - 그 외(0 결제, 2 갱신, 4 변경신청, 5 변경확정): 양수(결제) 표시
 */
export function formatLogAmount(amount: number | null, action: number, memo?: string | null): { text: string; className: string } | null {
  if (amount == null) return null;

  let isRefund = action === 3; // 취소는 무조건 환불

  // action=5(변경확정)는 memo 안의 "정산 -숫자원" 패턴으로 부호 추정
  if (action === 5 && memo) {
    isRefund = /환불액\s*\d/.test(memo);
  }
  
  const absAmount = Math.abs(amount);

  return {
    text: `${isRefund ? '-' : '+'}${absAmount.toLocaleString('ko-KR')}`,
    className: isRefund ? 'danger' : 'success',
  };
}