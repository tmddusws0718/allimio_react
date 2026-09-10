import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { PageHeader } from '../../../components/ui';
import { axiosInstance } from '../../../utils/Tool';
import { isExpired, ORDER_STATUS_MAP, type ShopOrderTypes } from '../../../components/ts/ShopOrder';
import { GlobalStoreSession } from '../../../store/LoginStore';

/* ---------------------------------------------------------------------
   구독 내역 상세 (/user/shoporder/:no) — 구독내용/결제내역/변경이력을
   탭으로 묶어서 보여주는 조회 전용 화면입니다.

   구독내용: SHOP_ORDER 단건 정보 요약
   결제내역: 이 주문에 딸린 SHOP_PAYMENT 전체 (결제/환불 포함)
   변경이력: 이 주문에 딸린 SHOP_ORDER_LOG 전체 (결제/매장연결/갱신/취소 이벤트)

   API
   GET /shop_order/{no}            → ShopOrderTypes
   GET /shop_payment/order/{ono}   → ShopPaymentTypes[]
   GET /shop_order_log/order/{no} → ShopOrderLogTypes[]
   GET /shop_plan/list, /shop/search   → 구독권 이름/매장 이름 매핑용
--------------------------------------------------------------------- */

type TabKey = 'info' | 'payment' | 'history';

export default function ShopOrderDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { no: mno } = GlobalStoreSession();
  const { ono } = useParams<{ ono: string }>();
  const [searchParams] = useSearchParams();
  const listPage = searchParams.get('listPage') ?? '1';
  
  const url = location.pathname.includes('/order') ? 'order' : 'shoporder';

  const goToTab = (tKey: TabKey) => {
    const path = tKey === 'info' ? `/user/${url}/${ono}` : `/user/${url}/${ono}/${tKey}`;
    navigate(`${path}?listPage=${listPage}`);
  };

  // "목록으로" 버튼 — listPage를 다시 page로 되돌려서 목록의 usePaging이 인식하게 함
  const backToList = () => navigate(`/user/${url}?page=${listPage}`);

  // 현재 URL 기준으로 활성 탭 판단
  const currentTab: TabKey = location.pathname.includes('/payment')
    ? 'payment'
    : location.pathname.includes('/history')
      ? 'history'
      : 'info';

  const [order, setOrder] = useState<ShopOrderTypes | null>(null);
  const [loading, setLoading] = useState(true);

  const loadOrder = async () => {
    if (!ono) return;
    setLoading(true);

    try {
      const res = await axiosInstance.get<ShopOrderTypes>(`/shop_order/${ono}`);
      setOrder(res.data);
    } catch (error) {
      console.error('구독 상세 조회 실패:', error);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mno, ono]);

  if (loading) {
    return (
      <section className="view active">
        <PageHeader
          title="구독 내역 상세"
          actions={
            <button type="button" className="btn btn_md btn_ghost" onClick={backToList}>
              ← 목록으로
            </button>
          }
        />
        <p className="empty_row">로딩 중...</p>
      </section>
    );
  }

  if (!order) {
    return (
      <section className="view active">
        <PageHeader
          title="구독 내역 상세"
          actions={
            <button type="button" className="btn btn_md btn_ghost" onClick={backToList}>
              ← 목록으로
            </button>
          }
        />
        <p className="empty_row">구독 내역을 찾을 수 없습니다.</p>
      </section>
    );
  }

  return (
    <section className="view active">
      <PageHeader
        title="구독 내역 상세"
        description={
          `${url === 'order' ? `${order.sname}에서 구독 중 인 ` : ''}주문번호 ${order.no}에 대한 상세 구독 내역을 확인할 수 있습니다.`
        }
        actions={
          <button type="button" className="btn btn_md btn_ghost" onClick={backToList}>
            ← 목록으로
          </button>
        }
      />

      <div className="tabs" role="tablist" aria-label="구독 내역 보기 전환">
        {(['info', 'payment', 'history'] as TabKey[]).map((tKey) => {
          const labels: Record<TabKey, string> = { info: '상세 내역', payment: '결제 내역', history: '전체 이력' };

          return (
            <button
              key={tKey}
              type="button"
              role="tab"
              className={`tab${currentTab === tKey ? ' on' : ''}`}
              aria-selected={currentTab === tKey}
              onClick={() => goToTab(tKey)}
            >
              {labels[tKey]}
            </button>
          );
        })}
      </div>

      {currentTab === 'info' ? (
        <>
          {/* 상단 헤더 카드 — 구독권명 + 상태 + 핵심 스펙 */}
          <div className="card card_pad_lg" style={{ marginBottom: 16 }}>
            <div className="flex both top" style={{ marginBottom: 16 }}>
              <h3 className="title">{order.pname}</h3>

              <span className={`badge ${ORDER_STATUS_MAP[isExpired(order.edate) ? 3 : order.status].className}`}>
                {ORDER_STATUS_MAP[isExpired(order.edate) ? 3 : order.status].label}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              <div>
                <div className="cell_sub">이용 기간</div>
                <div className="mono" style={{ fontSize: 16, fontWeight: 700 }}>
                  {order.pmonth}개월
                </div>
              </div>
              <div>
                <div className="cell_sub">CCTV 대수</div>
                <div className="mono" style={{ fontSize: 16, fontWeight: 700 }}>
                  {order.ccnt}대
                </div>
              </div>
              <div>
                <div className="cell_sub">대당 단가</div>
                <div className="mono" style={{ fontSize: 16, fontWeight: 700 }}>
                  {order.bprice.toLocaleString('ko-KR')}원
                </div>
              </div>
              <div>
                <div className="cell_sub">결제일</div>
                <div className="mono" style={{ fontSize: 16, fontWeight: 700 }}>
                  {order.cdate}
                </div>
              </div>
            </div>
          </div>

          {/* 취소일 */}
          {order.udate && order.status === 3 && (
            <div className="card card_pad_lg" style={{ marginBottom: 16 }}>
              <div className="cell_sub" style={{ marginBottom: 10 }}>
                취소일
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="mono" style={{ fontSize: 15 }}>
                  {order.udate}
                </span>
              </div>
            </div>
          )}
          
          {/* 매장 연결 카드 */}
          <div className="card card_pad_lg" style={{ marginBottom: 16 }}>
            <div className="cell_sub" style={{ marginBottom: 10 }}>
              연결된 매장
            </div>
            {order.sno ? (
              <div>
                {order.sname}
              </div>
            ) : order.status === 3 ? (
              <div className="cell_title">취소된 구독입니다.</div>
            ) : (
              <div className="no_data">
                <p className="b_title">연결된 매장이 없습니다. 먼저 매장을 연결해 주세요.</p>
                <button
                  type="button"
                  className="btn btn_md btn_primary"
                  onClick={() => navigate(`/user/${url}/${ono}/match`)}
                >
                  + 매장 연결
                </button>
              </div>
            )}
          </div>

          {/* 구독 기간 카드 */}
          <div className="card card_pad_lg" style={{ marginBottom: 16 }}>
            <div className="cell_sub" style={{ marginBottom: 10 }}>
              구독 기간
            </div>
            {order.sdate && order.edate ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="mono" style={{ fontSize: 15 }}>
                  {order.sdate}
                </span>
                <span className="cell_sub">~</span>
                <span className="mono" style={{ fontSize: 15 }}>
                  {order.edate}
                </span>
              </div>
            ) : (
              <div className="no_data">
                <p className="b_title">연결된 매장이 없어, 구독이 시작되지 않았습니다.</p>
              </div>
            )}
          </div>


          {/* 결제 요약 카드 */}
          <div className="card card_pad_lg">
            <div className="cell_sub" style={{ marginBottom: 10 }}>
              결제 요약
            </div>
            <div className="order_lines">
              <div className="order_line">
                <span>대당 단가 × 대수</span>
                <span>
                  {order.bprice.toLocaleString('ko-KR')}원 × {order.ccnt}대
                </span>
              </div>
              <div className="order_line">
                <span>이용 기간</span>
                <span>{order.pmonth}개월</span>
              </div>
            </div>

            <div className="order_total" style={{ marginTop: 12 }}>
              <span>총 결제금액</span>
              <div className="price mono">
                {order.totalprice.toLocaleString('ko-KR')}
                <span>원</span>
              </div>
            </div>
          </div>
        </>
      ) : (
        <Outlet />
      )}
    </section>
  );
}