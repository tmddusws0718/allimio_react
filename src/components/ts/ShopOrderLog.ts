export interface ShopOrderLogTypes {
  no: number;
  ono: string;
  mno: number;
  action: number;
  sno: number | null;
  beforeEdate: string | null;
  afterEdate: string | null;
  amount: number | null;
  memo: string | null;
  cdate: string;
}

export type RowType = ShopOrderLogTypes & { cnt: number };

// ACTION (이벤트 종류)
export const LOG_ACTION_MAP: Record<number, { label: string; className: string }> = {
  0: { label: '신규결제', className: 'orange' },
  1: { label: '매장연결', className: 'info' },
  2: { label: '갱신', className: 'success' },
  3: { label: '취소', className: 'danger' },
  4: { label: '승인대기', className: 'danger' },
};

export interface Filters {
  sno: string;
  action: string;
  dateFrom: string;
  dateTo: string;
}

export const EMPTY_FILTERS: Filters = {
  sno: '',
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