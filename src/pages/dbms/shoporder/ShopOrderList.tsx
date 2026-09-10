import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, Filterbar, UserPagination, DataTable, type DataTableColumn, DbmsPagination, AdminToolbar } from '../../../components/ui';
import { axiosInstance } from '../../../utils/Tool';
import {
  ORDER_STATUS_MAP,
  PAGE_SIZE,
  EMPTY_FILTERS,
  isExpired,
  type RowType,
  type OrderSearchResult,
  type Filters,
} from '../../../components/ts/ShopOrder';
import { GlobalStoreSession } from '../../../store/LoginStore';
import { usePaging } from '../../../hooks/usePaging';

/* ---------------------------------------------------------------------
   전체 구독권 구매 목록 (관리자, /dbms/shop_order) — mno 구분 없이
   전체 회원의 구독 내역을 검색+페이징으로 조회합니다.

   기존 사용자용 검색 API(GET /shop_order/list/{mno})는 mno가 필수라 그대로
   못 쓰고, 백엔드에 mno 없이 전체 조회 가능한 관리자용 엔드포인트가
   필요합니다 (아래 API 섹션 참고).

   API
   GET /shop_order/list/admin?word=&status=&pmonth=&dateFrom=&dateTo=&page=&size=
--------------------------------------------------------------------- */

export default function ShopOrderList() {
  const navigate = useNavigate();
  const { no: ano } = GlobalStoreSession();
  const { page, setPage } = usePaging({ basePath: '/dbms/shoporder' });

  const [orders, setOrders] = useState<RowType[]>([]);
  const [loading, setLoading] = useState(true);

  /* 필터바 설정 */
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);

  /* 페이징 설정 */
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);


  const loadList = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get<OrderSearchResult>('/shop_order/list/admin', {
        params: {
          page: page - 1,
          size: PAGE_SIZE,
          word: applied.word.trim() || undefined,
          status: applied.status === '' ? undefined : Number(applied.status),
          pmonth: applied.pmonth === '' ? undefined : Number(applied.pmonth),
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

      setOrders(withCnt);
      setTotalElements(total);
      setTotalPages(Math.max(1, pages));
    } catch (error) {
      console.error('전체 구독 내역 조회 실패:', error);
      setOrders([]);
      setTotalElements(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadList();
  }, [ano, applied, page]);

  const onSearch = () => {
    setPage(1);
    setApplied(draft);
  };

  const resetFilters = () => {
    const empty = { ...EMPTY_FILTERS };
    setDraft(empty);
    setApplied(empty);
  };

  const onReset = () => {
    resetFilters();
    setPage(1);
  };

  const columns: DataTableColumn<RowType>[] = [
    { header: '번호', width: '64px', mono: true, render: (o) => o.cnt },
    { header: '회원정보', width: '120px', mono: true, 
      render: (o) => (
        <>
          <div className='cell_title'>{o.id}</div>
          <div className='cell_sub'>No.{o.mno}</div>
        </>
      )
    },
    {
      header: '구매정보',
      width: '190px',
      render: (o) => (
        <>
          <span className='cell_title'>구독권 : {o.pname}</span>
          <div className='cell_sub'>주문번호 {o.no}</div>
        </>
      ),
    },
    { header: '매장', width: '140px', render: (o) => o.sname ?? <span className="cell_sub">연결 대기</span> },
    { header: '기간', width: '80px', mono: true, render: (o) => `${o.pmonth}개월` },
    { header: '대수', width: '70px', mono: true, render: (o) => `${o.ccnt}대` },
    {
      header: '상태',
      width: '90px',
      render: (o) => {
        const expired = isExpired(o.edate);
        const displayStatus = expired ? 3 : o.status;
        return (
          <span className={`badge ${ORDER_STATUS_MAP[displayStatus].className}`}>
            {ORDER_STATUS_MAP[displayStatus].label}
          </span>
        );
      },
    },
    { header: '결제금액(원)', width: '120px', mono: true, render: (o) => 
        <span className={o.status === 2 ? 'text_line' : ''}>{o.totalprice.toLocaleString('ko-KR')}</span> },
    { header: '구매일', width: '180px', mono: true, render: (o) => o.cdate },
  ];

  return (
    <section className="view active">
      <PageHeader title="전체 구독권 구매 목록" description="전체 회원의 구독 내역을 확인합니다." />

      <AdminToolbar
        searchValue={draft.word}
        onSearchChange={(value) => setDraft((prev) => ({ ...prev, word: value }))}
        onSearchEnter={onSearch}
        searchPlaceholder="구독권 · 매장명 · 회원아이디"
        filters={
          <>
            <select
              className="form_select"
              value={draft.pmonth}
              onChange={(e) => setDraft((prev) => ({ ...prev, pmonth: e.target.value }))}
              aria-label="구독기간 필터"
            >
              <option value="">구독기간 전체</option>
              <option value="6">6개월</option>
              <option value="12">12개월</option>
            </select>

            <select
              className="form_select"
              value={draft.status}
              onChange={(e) => setDraft((prev) => ({ ...prev, status: e.target.value }))}
              aria-label="구독 상태 필터"
            >
              <option value="">상태 전체</option>
              {Object.entries(ORDER_STATUS_MAP).map(([type, { label }]) => (
                <option key={type} value={type}>
                  {label}
                </option>
              ))}
            </select>

            <input
              type="date"
              className="form_input"
              value={draft.dateFrom}
              onChange={(e) => setDraft((prev) => ({ ...prev, dateFrom: e.target.value }))}
              aria-label="구매일 시작"
            />
            <span style={{ alignSelf: 'center' }}>~</span>
            <input
              type="date"
              className="form_input"
              value={draft.dateTo}
              onChange={(e) => setDraft((prev) => ({ ...prev, dateTo: e.target.value }))}
              aria-label="구매일 종료"
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
        data={orders}
        rowKey={(o) => o.no}
        loading={loading}
        emptyMessage="구매 내역이 없습니다."
      />

      <DbmsPagination
        page={page}
        totalPages={totalPages}
        totalCount={totalElements}
        pageSize={PAGE_SIZE}
        onChange={setPage}
      />
      
    </section>
  );
}