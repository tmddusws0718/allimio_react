export interface ShopOrderTypes {
  no: string;
  mno: number;
  pno: number;
  sno: number | null;
  pmonth: number;
  ccnt: number;
  bprice: number;
  totalprice: number;
  status: number;
  sdate: string | null;
  edate: string | null;
  cdate: string;
  udate?: string;

  sname?: string;
  pname?: string;
  pstatus?: number;
}

/* 구독 상태 */
export const ORDER_STATUS_MAP: Record<number, { label: string; className: string }> = {
  0: { label: '대기', className: 'wait' },
  1: { label: '정상', className: 'success' },
  2: { label: '취소', className: 'danger' },
  3: { label: '만료', className: 'warn' }, /* edate 기준 노출 */
};

export type RowType = ShopOrderTypes & { cnt: number, activeCount?: number };

export const PAGE_SIZE = 6;

/* 검색필터 */
export interface Filters {
  word: string;
  status: string;
  pmonth: string;
  dateFrom: string;
  dateTo: string;
}

export const EMPTY_FILTERS: Filters = {
  word: '',
  status: '',
  pmonth: '',
  dateFrom: '',
  dateTo: '',
};

/* 검색필터 */
export interface OrderSearchResult {
  content: ShopOrderTypes[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

/**
 * API 응답형태 타입 정의
 * 
 */

/** 등록 (구독권 구매) 요청 */
export interface ORRequest {
  pno: number;
  mno: number;
  pmonth: number;
  ccnt: number;
  bprice: number;
  totalprice: number;
  pmethod: number; // 0 카드 / 1 계좌이체 / 2 토스페이 (ShopPayment.ts)
}

/* 매장연결 요청 */
export interface LinkShopRequest {
  sno: number;
}

/* 갱신 요청 - 기간변경, 추가금 결제방식 */
export interface RenewRequest  {
  newPmonth?: number; // 안 보내면 동일조건 갱신
  pmethod: number;
}
/** 갱신결과 */
export interface RenewResult {
  no: string;
  ccnt: number;
  totalprice: number;
  edate: string | null;
}


/* 취소결과 */
export interface CancelResult {
  no: string;
  usedMonths: number;
  refundMonths: number;
  refundAmount: number;
}

/** 취소 시 예상 환불액 계산 (프론트 대략치, 최종 확정은 서버 응답 기준) */
export function estimateCancelRefund(order: ShopOrderTypes) {
  // 매장 미연결(SDATE 없음) — 아직 이용 시작 전이므로 전액 환불
  if (!order.sdate) {
    return {
      usedMonths: 0,
      refundMonths: order.pmonth,
      refundAmount: order.bprice * order.ccnt * order.pmonth,
    };
  }

  const usedDays = Math.floor((Date.now() - new Date(order.sdate).getTime()) / 86400000);
  const usedMonths = Math.max(1, Math.ceil(usedDays / 30));
  const refundMonths = Math.max(0, order.pmonth - usedMonths);
  const refundAmount = order.bprice * order.ccnt * refundMonths;

  return { usedMonths, refundMonths, refundAmount };
}


/**
 * 갱신 가능 여부
 * @param order 
 * @returns 
 */
export const canRenew = (order: RowType | ShopOrderTypes, activeCount = 0) => {
  // if (isExpired(order.edate) && activeCount === 0) return true;
  const daysLeft = daysUntilExpire(order.edate);
  return daysLeft !== null && daysLeft <= 7 && daysLeft >= 0;
};


/**
 * 구독 취소 버튼 노출 조건.
 * - 매장 미연결(edate 없음) 상태: 조건 없이 취소 가능 (아직 서비스 이용 전이므로)
 * - 매장 연결됨: 오늘부터 종료일까지 28일 이상 남아있어야 취소 가능
 * - 이미 취소(status=2)된 건은 대상 아님
 */
export function canCancel(order: ShopOrderTypes): boolean {
  if (order.status === 2) return false; // 이미 취소됨

  if (!order.edate) return true; // 매장 미연결 — 조건 없이 취소 가능

  const daysLeft = daysUntilExpire(order.edate);
  return daysLeft !== null && daysLeft >= 28;
}

/**
 * 구독권 변경 버튼 노출 조건 (기간변경 또는 대수변경 중 하나라도 가능하면 true).
 * - 정상(status===1) 상태여야 하고, 매장 연결(edate 있음)까지 되어 있어야 함
 * - 최소한 대수변경(28일 이상 남음) 또는 기간확장(6→12, 조건 없음)이 가능해야 노출
 */
export function canChange(order: ShopOrderTypes): boolean {
  if (order.status !== 1) return false; // 정상 상태만 변경 가능
  if (!order.edate) return false; // 매장 미연결이면 변경 대상 아님
  if (order.pstatus === 0) return false; // 승인대기 중 이면 변경 대상 아님
  if (isExpired(order.edate)) return false // 만료상태면 변경 불가

  // 대수 변경 가능(28일 조건) 또는 기간 확장(6→12, 조건 없음)이 가능하면 버튼 노출
  return canChangeCcnt(order);
}






/**
 * CCTV 대수 변경 가능 조건 — 오늘부터 종료일까지 28일 이상 남아야 함.
 */
export function canChangeCcnt(order: ShopOrderTypes): boolean {
  const daysLeft = daysUntilExpire(order.edate);
  return daysLeft !== null && daysLeft >= 28;
}

/**
 * 기간을 늘리는 변경(6→12개월) 가능 조건 — 기간측정 없이 항상 가능.
 * 단, 이미 12개월 구독이면 더 늘릴 곳이 없으므로 불가.
 */
export function canIncreasePeriod(order: ShopOrderTypes): boolean {
  return order.pmonth < 12;
}

/**
 * 기간을 줄이는 변경(12→6개월) 가능 조건 — 남은 기간이 275일 이상이어야 함.
 * 6개월 구독은 더 줄일 곳이 없으므로 애초에 대상 아님.
 */
export function canDecreasePeriod(order: ShopOrderTypes): boolean {
  if (order.pmonth <= 6) return false;

  const daysLeft = daysUntilExpire(order.edate);
  return daysLeft !== null && daysLeft >= 275;
}















/**
 * "YYYY-MM-DD" 형식 문자열을 로컬 타임존 기준 Date로 안전하게 파싱합니다.
 * new Date(str) 방식은 UTC로 해석되어 타임존에 따라 하루 어긋날 수 있어서 직접 파싱합니다.
 */
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * 구독한지 -일째 계산
 * 
 * 
 * 시작일부터 오늘까지의 경과 일수를 계산합니다.
 * @param {string | Date} startDate - 시작일 (예: "2026-01-01" 또는 Date 객체)
 * @returns {number} 오늘까지의 일수 (당일 = 1일, 1일 경과 = 2일)
 */
export const getDaysFromStart = (startDate: string) => {
  if (!startDate) return 0;

  const start = new Date(startDate);
  const today = new Date();

  // 시간을 00:00:00으로 맞춰 순수 날짜(일수) 차이만 계산
  start.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const diffTime = today.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // 당일을 1일로 취급하려면 + 1, 순수 경과 일수만 구하려면 diffDays 반환
  return diffDays + 1; 
};



/**
 * 구독 종료일(edate)이 오늘 이전인지(만료됐는지) 확인합니다.
 * edate는 "YYYY-MM-DD" 형식 문자열입니다.
 * @param edate 구독 종료일 (없으면 매장 미연결 상태이므로 false 반환)
 * @returns 만료 여부
 */
export function isExpired(edate: string | null | undefined): boolean {
  if (!edate) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endDate = parseLocalDate(edate);
  endDate.setHours(0, 0, 0, 0);

  return endDate < today;
}

/**
 * 오늘부터 종료일(edate)까지 남은 일수를 계산합니다. 음수면 이미 지난 것입니다.
 * 
 * @param edate 
 * @returns 
 */
export function daysUntilExpire(edate: string | null | undefined): number | null {
  if (!edate) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endDate = parseLocalDate(edate);
  endDate.setHours(0, 0, 0, 0);

  const diffMs = endDate.getTime() - today.getTime();
  return Math.round(diffMs / 86400000);
}
