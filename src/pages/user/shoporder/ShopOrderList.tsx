import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PageHeader,
  UserPagination,
  DataTable,
  Modal,
  AlertModal,
  type DataTableColumn,
  Filterbar,
} from '../../../components/ui';
import { axiosInstance } from '../../../utils/Tool';
import { GlobalStoreSession } from '../../../store/LoginStore';
import {
  ORDER_STATUS_MAP,
  PAGE_SIZE,
  type RowType,
  type OrderSearchResult,
  type Filters,
  EMPTY_FILTERS,
  type ShopOrderTypes,
  isExpired,
  canRenew,
  daysUntilExpire,
  canCancel,
  canChange,
} from '../../../components/ts/ShopOrder';
import { usePaging } from '../../../hooks/usePaging';
import RenewModal from './modal/RenewModal';
import CancelModal from './modal/CancelModal';
import ChangeModal from './modal/ChangeModal';

export default function ShopOrderList() {
  const navigate = useNavigate();
  const { no: mno } = GlobalStoreSession();
  const { page, setPage } = usePaging({ basePath: '/user/shoporder' });

  // 상세로 이동할 때 현재 목록 page를 listPage로 실어 보냄
  const goToDetail = (ono: string) => {
    navigate(`/user/shoporder/${ono}?listPage=${page}`);
  };

  /* API 데이터 저장 */
  const [orders, setOrders] = useState<RowType[]>([]);
  const [loading, setLoading] = useState(true);

  /* 필터바 설정 */
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);

  /* 페이징 설정 */
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  const loadList = async () => {
    if (!mno) {
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      const res = await axiosInstance.get<OrderSearchResult>(`/shop_order/list/${mno}`, {
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

      // 목록 데이터 구성
      const withCnt: RowType[] = content.map((item, idx) => ({
        ...item,
        cnt: total - (serverPage * size + idx),
        activeCount: 0,
      }));

      setOrders(withCnt);
      setTotalElements(total);
      setTotalPages(Math.max(1, pages));


      // 갱신 버튼 노출 판단용 — 매장별 정상 구독 개수 조회 (중복 매장만 조회)
      const uniqueSnos = Array.from(new Set(withCnt.filter((o) => o.sno).map((o) => o.sno as number)));
      const counts = await Promise.all(
        uniqueSnos.map((sno) =>
          axiosInstance.get<number>(`/shop_order/active-count/${sno}`).then((r) => [sno, r.data] as const),
        ),
      );
      setActiveCountsMap(Object.fromEntries(counts));


    } catch (error) {
      console.error('구독 내역 조회 실패:', error);
      setOrders([]);
      setTotalElements(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadList();
  }, [mno, applied, page]);

  
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

  /* 변경, 갱신, 취소 */
  const [renewTarget, setRenewTarget] = useState<ShopOrderTypes | null>(null);
  const [cancelTarget, setCancelTarget] = useState<ShopOrderTypes | null>(null);
  const [changeTarget, setChangeTarget] = useState<ShopOrderTypes | null>(null);
  const [alert, setAlert] = useState<{ message: string; variant?: 'success' | 'error' } | null>(null);
  const [activeCountsMap, setActiveCountsMap] = useState<Record<number, number>>({});

  const handleModalSuccess = (message: string) => {
    setAlert({ message, variant: 'success' });
    loadList();
  };

  console.log(activeCountsMap)


  const columns: DataTableColumn<RowType>[] = [
    { header: '번호', width: '64px', mono: true, render: (o) => o.cnt },
    {
      header: '구독권',
      width: '100px',
      render: (o) => (
        <button type="button" className="btn_link" onClick={() => goToDetail(o.no)}>
          {o.pname}
        </button>
      ),
    },
    { header: '기간', width: '80px', mono: true, render: (o) => `${o.pmonth}개월` },
    {
      header: '상태',
      width: '90px',
      render: (o) => {
        const expired = isExpired(o.edate);
        return (
        <span className={`badge ${ORDER_STATUS_MAP[expired ? 3 : o.status].className}`}>
          {ORDER_STATUS_MAP[expired ? 3 : o.status].label}
        </span>
      )},
    },
    {
      header: '연결매장',
      width: '150px',
      render: (o) =>
        o.sno ? (
          <div className='ellipsis'>
            <span className="b_title">{o.sname}</span>
          </div>
        ) : o.status === 2 ? ( // 취소일 때만 매장연결 버튼 숨김
          <span className="cell_sub">-</span>
        ) : (
          <button
            type="button"
            className="btn btn_xsm btn_ghost"
            onClick={() => navigate(`/user/shoporder/${o.no}/match`)}
          >
            매장 연결
          </button>
        ),
    },
    { header: '대수', width: '80px', mono: true, 
      render: (o) => 
        o.status === 1 && o.pstatus != null ? ( // 승인대기 상태일 때
          <>
            <span style={{fontSize:11, color:'var(--danger)'}}>변경대기</span>
          </>
        ): `${o.ccnt}대` 
    },
    {
      header: '구독기간',
      width: '210px',
      mono: true,
      render: (o) => 
        o.sno && o.edate ? (
          <button type="button" className="btn_link" onClick={() => goToDetail(o.no)}>
            {o.sdate} ~ { }
            {canRenew(o, activeCountsMap[o.sno ?? -1] ?? 0) ? <span className='danger'>{o.edate}</span> : o.edate}
          </button>
        ) : <span className="cell_sub">-</span>
      ,
    },
    { header: '결제금액(원)', width: '120px', mono: true, render: (o) => `${o.totalprice.toLocaleString('ko-KR')}` },
    { header: '구매일', width: '120px', mono: true, render: (o) => o.cdate.split(' ')[0] },
    {
      header: '관리',
      width: '190px',
      render: (o) => (
        <div className="actions">
          {canRenew(o, activeCountsMap[o.sno ?? -1] ?? 0) && (
            <button type="button" className="btn btn_xsm btn_ghost" onClick={() => setRenewTarget(o)}>
              갱신
            </button>
          )}
          {canChange(o) && (
            <button type="button" className="btn btn_xsm btn_outline_primary" onClick={() => setChangeTarget(o)}>
              변경
            </button>
          )}
          {canCancel(o) && (
            <button type="button" className="btn btn_xsm btn_danger_outline" onClick={() => setCancelTarget(o)}>
              취소
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <section className="view active">
      <PageHeader
        title="전체 구독 내역"
        description="전체 매장의 현재 이용중이거나 갱신이 필요한 구독을 확인합니다."
        createLabel="+ 새 구독"
        onCreate={() => navigate('/shopplan')}
      />

      <Filterbar
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={totalElements}
        searchValue={draft.word}
        onSearchChange={(value) => setDraft((prev) => ({ ...prev, word: value }))}
        onSearchEnter={onSearch}
        searchPlaceholder="구독권 · 매장명으로 검색"
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
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSearch();
              }}
              aria-label="구매일 시작"
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
        emptyMessage="현재 이용중인 구독이 없습니다."
      />

      <UserPagination
        page={page}
        totalPages={totalPages}
        totalCount={totalElements}
        pageSize={PAGE_SIZE}
        onChange={setPage}
      />

      
    <RenewModal target={renewTarget} onClose={() => setRenewTarget(null)} onSuccess={handleModalSuccess} />
    <CancelModal target={cancelTarget} onClose={() => setCancelTarget(null)} onSuccess={handleModalSuccess} />
    <ChangeModal target={changeTarget} onClose={() => setChangeTarget(null)} onSuccess={handleModalSuccess} />
    <AlertModal open={alert !== null} onClose={() => setAlert(null)} message={alert?.message ?? ''} variant={alert?.variant} />

    </section>
  );
}