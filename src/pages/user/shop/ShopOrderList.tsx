import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PageHeader, Filterbar, UserPagination, DataTable, type DataTableColumn, Modal, AlertModal } from '../../../components/ui';
import { axiosInstance } from '../../../utils/Tool';
import { GlobalStoreSession } from '../../../store/LoginStore';
import { canCancel, canChange, canRenew, daysUntilExpire, EMPTY_FILTERS, estimateCancelRefund, getDaysFromStart, isExpired, ORDER_STATUS_MAP, PAGE_SIZE, type CancelResult, type Filters, type OrderSearchResult, type RenewRequest, type RenewResult, type RowType, type ShopOrderTypes } from '../../../components/ts/ShopOrder';
import { GlobalCurrentShop } from '../../../store/UserStore';
import { usePaging } from '../../../hooks/usePaging';
import { EMPTY_ACCOUNT, PMETHOD_ICON, PMETHOD_MAP, type RefundAccount } from '../../../components/ts/ShopPayment';
import type { OrderPendingTypes } from '../../../components/ts/ShopOrderPending';
import RenewModal from '../shoporder/modal/RenewModal';
import CancelModal from '../shoporder/modal/CancelModal';
import ChangeModal from '../shoporder/modal/ChangeModal';

/* ---------------------------------------------------------------------
   매장별 구독 내역 (/user/shop/:sno/orders) — 회원+매장 기준 단일 검색 API를
   두 번 호출해서 상단(정상 구독 1건, status=1 고정)과 하단(검색+페이징,
   status 필터는 사용자가 선택)으로 나눠 보여줍니다.

   API
   GET /shop_order/mno/sno/&status=1&page=0&size=1        → 상단(정상 구독)
   GET /shop_order/mno/sno/&word=&status=&...&page=&size= → 하단(검색+페이징, 상태 필터는 만료/취소 위주로 쓰되 전체도 가능)
--------------------------------------------------------------------- */


export default function ShopOrderBySno() {
  const navigate = useNavigate();
  const { no: mno } = GlobalStoreSession();
  const sno = GlobalCurrentShop((state) => state.no);
  const shopTitle = GlobalCurrentShop((state) => state.title);
  const { page, setPage, navigateWithQuery } = usePaging({ basePath: '/user/order' });

  
  // 상세로 이동할 때 현재 목록 page를 listPage로 실어 보냄
  const goToDetail = (ono: string) => {
    navigate(`/user/order/${ono}?listPage=${page}`);
  };

  const [active, setActive] = useState<ShopOrderTypes | null>(null);
  const [pending, setPending] = useState<OrderPendingTypes | null>(null);
  const [orders, setOrders] = useState<RowType[]>([]);

  const [activeLoading, setActiveLoading] = useState(true);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [loading, setLoading] = useState(true);

  
  /* 필터바 설정 */
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);

  /* 페이징 설정 */
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  const loadList = async () => {
    if (!sno && !mno) return;

    setLoading(true);

    try {
      const res = await axiosInstance.get<OrderSearchResult>(`/shop_order/list/${mno}/${sno}`, {
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

      setOrders(withCnt)
      setTotalElements(total);
      setTotalPages(Math.max(1, pages));


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
  }, [sno, mno, applied, page]);
  
  useEffect(() => {
    loadActive();
  }, [sno, mno]);


  const loadActive = async () => {
    if (!sno && !mno) return;
    setActiveLoading(true);

    try {
      const res = await axiosInstance.get<ShopOrderTypes>(`/shop_order/top/${mno}/${sno}`, {
        params: {status: 1}
      });

      setActive(res.data)

      if (res.data.pstatus === 0) {
        setPendingLoading(true);

        axiosInstance.get<OrderPendingTypes>(`/shop_order_pending/${res.data.no}`)
          .then(res => res.data)
          .then(data => {
            setPending(data);
            setPendingLoading(false);
          })
          .catch((err) => console.error('변경내역 조회실패', err))
      } else {
        setPending(null);
        setPendingLoading(false);
      }

    } catch (error) {
      console.error('구독 내역 조회 실패:', error);
      setActive(null);
    } finally {
      setActiveLoading(false);
    }
  };

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

  const handleModalSuccess = (message: string) => {
    setAlert({ message, variant: 'success' });
    loadList();
  };

  const ordersColumns: DataTableColumn<RowType>[] = [
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
    { header: '대수', width: '60px', mono: true, render: (o) => `${o.ccnt}대` },
    { header: '결제금액', width: '110px', mono: true, render: (o) => 
        <span className={o.status === 2 ? 'text_line' : ''}>{o.totalprice.toLocaleString('ko-KR')}</span> },
    {
      header: '구독기간',
      width: '180px',
      mono: true,
      render: (o) => 
        o.sno && o.edate ? (
          <button type="button" className="btn_link" onClick={() => goToDetail(o.no)}>
            {o.sdate} ~ {o.edate}
          </button>
        ) : <span className="cell_sub">-</span>
    },
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
  ];

  if (!sno) {
    return (
      <section className="view active">
        <PageHeader title="구독 내역" description="매장을 선택하면 해당 매장에 연결된 현재 구독과 지난 이력을 확인할 수 있습니다." />
        <div
          className="card card_pad_sm"
        >
          <div className='no_data'>
            <p className="b_title">먼저 확인할 매장을 선택해주세요.</p>
            <button type="button" className="btn btn_md btn_primary" onClick={() => navigate('/user/shop')}>
              매장 선택하러 가기
            </button>
          </div>
        </div>
      </section>
    );
  }
  

  return (
    <section className="view active">
      <PageHeader 
        title="구독 내역" 
        description={`${shopTitle}에 연결된 현재 구독과 지난 이력을 확인합니다.`} 
        actions={
          <div className='actions'>
            {active ? (
              <>
                {canChange(active) && (<button type='button' className='btn btn_primary' onClick={() => setChangeTarget(active)}>변경 신청</button>)}
                {canCancel(active) && (<button type='button' className='btn btn_danger' onClick={() => setCancelTarget(active)}>구독 취소</button>)}
                {isExpired(active.edate) && (<button type='button' className='btn btn_primary' onClick={() => navigate('/shopplan')}>+ 새 구독</button>)}
              </>
            ):(
              <button type='button' className='btn btn_primary' onClick={() => navigate('/shopplan')}>+ 새 구독</button>
            )}
          </div>
        }
      />

      {activeLoading ? (
        <div className="card card_pad_lg" style={{ marginBottom: 32, textAlign: 'center' }}>
          <div className='no_data' style={{padding: 0}}>
            <p className="b_title">불러오는 중...</p>
          </div>
        </div>
      ) : active ? (
        <>
        {isExpired(active.edate) ? (
          <div className='alert_mode'>
            <div className="alert_banner info">
              <div className="aicon">!</div>
              <div className="atext">
                <div className="t1">구독권이 만료되었습니다.</div>
                <div className="t2">서비스를 계속 사용하시려면 새로운 구독권을 구매하시거나 구매하신 구독권을 연결해주세요.</div>
              </div>
              <button type='button' className="abtn" onClick={() => navigateWithQuery(`${sno}/match`)}>
                구독권 연결
              </button>
            </div>
          </div>
          ): canRenew(active) && (
            <div className='alert_mode'>
              <div className="alert_banner">
                <div className="aicon">!</div>
                <div className="atext">
                  <div className="t1">구독권이 {daysUntilExpire(active.edate)}일 뒤 만료됩니다.</div>
                  <div className="t2">현재 구독권을 계속 이용하시려면 갱신버튼을 눌러 갱신해주세요.</div>
                  <div className="t2">갱신 가능 기간동안은 취소, 변경 신청을 할 수 없습니다.</div>
                </div>
                <button type='button' className="abtn" onClick={() => setRenewTarget(active)}>갱신하기</button>
              </div>
            </div>
        )}

        <div className='order_top' style={{margin: '24px 0 40px'}}>
          <div onClick={() => goToDetail(active.no)} className="card card_pad_lg">
            <div className='flex top both'>
              <div>
                <div className="cell_sub" style={{ marginBottom: 4 }}>현재 이용중인 구독권</div>
                <p className='b_title' style={{margin:0}}>{active.no}</p>
              </div>
              
              <p className='title' style={{margin:0}}>{active.pname}</p>
            </div>

            <div className='flex center both' style={{marginTop:8 }}>
              <div className="cell_sub">구독 상태</div>
              <span className={`badge ${ORDER_STATUS_MAP[isExpired(active.edate) ? 3 : active.status].className}`}>
                {ORDER_STATUS_MAP[isExpired(active.edate) ? 3 : active.status].label}
              </span>
            </div>
            
            {!isExpired(active.edate) && (
              <div className='flex center both' style={{marginTop:8 }}>
                <div className="cell_sub">구독일</div>
                <span>{getDaysFromStart(active.sdate || '-')}일</span>
              </div>
            )}

            
            <div className='flex center both' style={{borderTop:'1px solid var(--border)', paddingTop:20, marginTop:20 }}>
              <div className="cell_sub" style={{ margin: 0 }}>CCTV 대수</div>
              <div className='b_title lg' style={{margin:0}}>{active.ccnt} 대</div>
            </div>

            <div className='flex center both' style={{marginTop:4 }}>
              <div className="cell_sub" style={{ margin: 0 }}>구독기간</div>
              <p className='b_title lg mono' style={{margin:0}}>{active.sdate} ~ {active.edate} ({active.pmonth}개월)</p>
            </div>
          </div>

          {pendingLoading ? (
            <p className="b_title">불러오는 중...</p>
          ) : pending && (
            <div className="card card_pad_lg wait">
              <div className='flex both top' style={{marginTop:8 }}>
                <div>
                  <div className="cell_sub" style={{ marginBottom: 4 }}>변경될 구독권</div>
                  <p className='title' style={{margin:0, color:'var(--text)'}}>{active.pno !== pending.pno ? pending.pname : '-'}</p>
                </div>

                <span className='badge info'>관리자 승인 대기 중</span>
              </div>

              <div className='flex both center' style={{marginTop:8 }}>
                <div className='cell_sub' style={{margin:0}}>변경 신청일</div>
                <div className='cell_title' style={{margin:0}}>{pending.cdate}</div>
              </div>

              
              <div className='flex center both' style={{borderTop:'1px solid var(--border)', paddingTop:20, marginTop:20 }}>
                <div className="cell_sub" style={{ margin: 0 }}>신청 CCTV 대수</div>
                <div className='b_title lg' style={{margin:0}}>{pending.ccnt} 대</div>
              </div>

                <div className='flex center both' style={{marginTop:4 }}>
                  <div className="cell_sub" style={{ margin: 0 }}>신청 구독개월 수</div>
                  <p className='b_title lg mono' style={{margin:0}}>{active.pmonth !== pending.pmonth ? (`${pending.pmonth}개월`): '-'}</p>
                </div>

            </div>
          )}
        </div>
        </>
      ) : (
        <div className="card card_pad_lg" style={{ marginBottom: 32, textAlign: 'center' }}>
          <div className='no_data' style={{padding: 0}}>
            <p className="b_title">연결된 구독권이 없습니다.</p>
            <button type="button" className="btn btn_md btn_primary" onClick={() => navigateWithQuery(`${sno}/match`)}>
              구독권 연결
            </button>

          </div>
        </div>
      )}

      <h3 className="title md" style={{ marginBottom: 10 }}>지난 구독 이력</h3>

      <Filterbar
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={totalElements}
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
              <option value="2">취소</option>
              <option value="3">만료</option>
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
        columns={ordersColumns}
        data={orders}
        rowKey={(o) => o.no}
        loading={loading}
        emptyMessage="지난 구독 이력이 없습니다."
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