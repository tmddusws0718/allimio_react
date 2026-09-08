import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Filterbar, UserPagination, DataTable, type DataTableColumn } from '../../../components/ui';
import { axiosInstance } from '../../../utils/Tool';
import { GlobalStoreSession } from '../../../store/LoginStore';
import {
  PMETHOD_MAP,
  PSTATUS_MAP,
  PAGE_SIZE,
  type RowType,
  type SearchResult,
  type ShopRefundTypes,
  REFUND_STATUS_MAP,
  type PayFilters,
  EMPTY_PAY_FILTERS,
} from '../../../components/ts/ShopPayment';
import { usePaging } from '../../../hooks/usePaging';

/* ---------------------------------------------------------------------
   결제 내역 (/user/shoporder/:no/payment) — ShopOrderDetail의 "결제 내역" 탭에서
   Outlet으로 렌더링됩니다. 부모(ShopOrderList)의 목록 페이지(?page=)와는 별개로,
   이 화면 자체의 페이지 상태를 usePaging으로 자기 경로 기준(basePath) 독립적으로
   관리합니다 — 같은 "page" 쿼리스트링 이름이라도 라우트가 다르면 서로 안 겹칩니다.

   검색: 결제수단별(pmethod), 결제상태별(pstatus), 기간별(dateFrom~dateTo)
   취소(pstatus=2) 건은 SHOP_REFUND 계좌 정보 + 처리상태를 같이 조회해서
   금액 컬럼에 뱃지로 붙여 보여줍니다.

   API
   GET /shop_payment/{mno}/{ono} → SearchResult
   GET /shop_refund/{pno}        → ShopRefundTypes[] (취소 건에 대해서만 조회)
--------------------------------------------------------------------- */

export default function ShopPaymentList() {
  const { no: mno } = GlobalStoreSession();
  const { ono } = useParams<{ ono: string }>();

  const url = location.pathname.includes('/order') ? 'order' : 'shoporder';
  const { page, setPage, navigateWithQuery } = usePaging({ basePath: `/user/${url}/${ono}/payment` });

  const [payments, setPayments] = useState<RowType[]>([]);
  const [refund, setRefund] = useState<Record<string, ShopRefundTypes>>({});
  const [loading, setLoading] = useState(true);

  const [draft, setDraft] = useState<PayFilters>(EMPTY_PAY_FILTERS);
  const [applied, setApplied] = useState<PayFilters>(EMPTY_PAY_FILTERS);

  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalElements, setTotalElements] = useState(0);

  const loadPayment = async () => {
    if (!ono) return;
    setLoading(true);

    try {
      const res = await axiosInstance.get<SearchResult>(`/shop_payment/${mno}/${ono}`, {
        params: {
          page: page - 1,
          size: PAGE_SIZE,
          pmethod: applied.pmethod === '' ? undefined : applied.pmethod,
          pstatus: applied.pstatus === '' ? undefined : applied.pstatus,
          dateFrom: applied.dateFrom || undefined,
          dateTo: applied.dateTo || undefined,
        },
      });

      const { content, totalElements: total, totalPages: pages, page: serverPage, size } = res.data;

      if (content.length === 0 && page > 1) {
        setPage(page - 1);
        return;
      }

      const withCnt: RowType[] = content.map((item, idx) => ({
        ...item,
        cnt: total - (serverPage * size + idx),
      }));

      setPayments(withCnt);
      setTotalElements(total);
      setTotalPages(Math.max(1, pages));

      // 취소(pstatus=2) 건만 결제 고유번호(p.no)로 SHOP_REFUND 계좌 정보를 추가 조회
      const refundTargets = withCnt.filter((p) => p.pstatus === 2);
      const refundResults = await Promise.all(
        refundTargets.map((p) =>
          axiosInstance
            .get<ShopRefundTypes[]>(`/shop_refund/${p.no}`)
            .then((r) => r.data[0] ?? null)
            .catch(() => null)
        )
      );

      const map: Record<string, ShopRefundTypes> = {};
      refundTargets.forEach((p, idx) => {
        const r = refundResults[idx];
        if (r) map[p.no] = r;
      });
      setRefund(map);
    } catch (error) {
      console.error('결제 내역 조회 실패:', error);
      setPayments([]);
      setRefund({});
      setTotalElements(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mno, ono, applied, page]);

  const onSearch = () => {
    setPage(1);
    setApplied(draft);
  };

  const resetFilters = () => {
    const empty = { ...EMPTY_PAY_FILTERS };
    setDraft(empty);
    setApplied(empty);
  };

  const onReset = () => {
    resetFilters();
    setPage(1);
  };

  const totalPaid = payments.filter((p) => p.pstatus === 0).reduce((sum, p) => sum + (p.price || 0), 0);
  const totalRefund = payments.filter((p) => p.pstatus === 2).reduce((sum, p) => sum + (p.price || 0), 0);

  const columns: DataTableColumn<RowType>[] = [
    {
      header: '번호',
      width: '70px',
      mono: true,
      render: (p) => <p className="cell_title">{p.cnt}</p>,
    },
    {
      header: '등록일',
      width: '20%',
      mono: true,
      render: (p) =>
        p.pstatus === 2 ? (
          <button type="button" className="btn_link" onClick={() => navigateWithQuery(`${p.no}/refund`)}>
            <span>{p.cdate}</span>
          </button>
        ) : (
          <button type="button" className="btn_link" onClick={() => navigateWithQuery(`${p.no}`)}>
            <span>{p.cdate}</span>
          </button>
        ),
    },
    {
      header: '결제수단',
      width: '10%',
      render: (p) => (p.pmethod !== null && PMETHOD_MAP[p.pmethod] ? PMETHOD_MAP[p.pmethod].label : <span className="cell_sub">-</span>),
    },
    {
      header: '결제상태',
      width: '10%',
      render: (p) => (
        <span className="cell_title" style={{ color: p.pstatus === 2 ? 'var(--red-500)' : undefined }}>
          {PSTATUS_MAP[p.pstatus]?.label ?? '-'}
        </span>
      ),
    },
    {
      header: '환불상태',
      width: '100px',
      render: (p) => {
        const isRefund = p.pstatus === 2;
        const r = refund[p.no];
        return isRefund && r && REFUND_STATUS_MAP[r.status] ? (
          <span
            className={`badge ${REFUND_STATUS_MAP[r.status].className}`}
            style={{ fontSize: 10, marginRight: 4 }}
          >
            {REFUND_STATUS_MAP[r.status].label}
          </span>
        ) : (
          <span className="cell_sub">-</span>
        );
      },
    },
    {
      header: '금액 (원)',
      headerClassName: 'a-r',
      className: 'a-r',
      mono: true,
      render: (p) => {
        const isRefund = p.pstatus === 2;
        return (
          <span style={{ marginLeft: 'auto', color: isRefund ? 'var(--red-200, #ffa4ac)' : undefined }}>
            {isRefund ? '-' : '+'}
            {p.price.toLocaleString('ko-KR')}
          </span>
        );
      },
    },
  ];

  return (
    <>
      <Filterbar
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={totalElements}
        filters={
          <>
            <select
              className="form_select"
              value={draft.pmethod}
              onChange={(e) => setDraft((prev) => ({ ...prev, pmethod: e.target.value }))}
              aria-label="결제수단 필터"
            >
              <option value="">결제수단 전체</option>
              <option value="0">카드</option>
              <option value="1">계좌이체</option>
              <option value="2">토스페이</option>
            </select>

            <select
              className="form_select"
              value={draft.pstatus}
              onChange={(e) => setDraft((prev) => ({ ...prev, pstatus: e.target.value }))}
              aria-label="결제상태 필터"
            >
              <option value="">상태 전체</option>
              <option value="0">결제완료</option>
              <option value="1">결제실패</option>
              <option value="2">결제취소</option>
            </select>

            <input
              type="date"
              className="form_input"
              value={draft.dateFrom}
              onChange={(e) => setDraft((prev) => ({ ...prev, dateFrom: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSearch();
              }}
              aria-label="결제일 시작"
            />
            <span style={{ alignSelf: 'center' }}>~</span>
            <input
              type="date"
              className="form_input"
              value={draft.dateTo}
              onChange={(e) => setDraft((prev) => ({ ...prev, dateTo: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSearch();
              }}
              aria-label="결제일 종료"
            />
          </>
        }
        extra={
          <>
            <button type="button" className="btn btn_ghost" onClick={onReset}>
              초기화
            </button>
            <button type="button" className="btn btn_primary" onClick={onSearch}>
              검색
            </button>
          </>
        }
      />

      <DataTable
        columns={columns}
        data={payments}
        rowKey={(p) => p.no}
        loading={loading}
        emptyMessage="결제 내역이 없습니다."
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <span className="b_title">
              총 결제액:
              <span className="mono" style={{ color: 'var(--text)', fontWeight: 700, marginLeft: 4 }}>
                {totalPaid.toLocaleString('ko-KR')}
              </span>
              원
            </span>
            /
            <span className="b_title">
              총 환불액:
              <span className="mono" style={{ color: 'var(--red-500, #ef4444)', fontWeight: 700, marginLeft: 4 }}>
                {totalRefund.toLocaleString('ko-KR')}
              </span>
              원
            </span>
          </div>
        }
      />

      <UserPagination page={page} totalPages={totalPages} totalCount={totalElements} pageSize={PAGE_SIZE} onChange={setPage} />
    </>
  );
}