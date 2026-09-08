import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../../../components/ui';
import { axiosInstance } from '../../../utils/Tool';
import { PMETHOD_MAP, PSTATUS_MAP, type ShopPaymentTypes } from '../../../components/ts/ShopPayment';
import { usePaging } from '../../../hooks/usePaging';

/* ---------------------------------------------------------------------
   결제 상세 (/user/shoporder/:ono/payment/:no) — 결제 고유번호(PK) 하나로 조회합니다.

   API
   GET /shop_payment/{no} → ShopPaymentTypes
--------------------------------------------------------------------- */

export default function ShopPaymentDetail() {
  const navigate = useNavigate();
  const { pno, ono } = useParams<{ pno: string; ono: string }>();
  const url = location.pathname.includes('/order') ? 'order' : 'shoporder';

  const { goToList } = usePaging({ basePath: `/user/${url}/${ono}/payment` });
  const [payment, setPayment] = useState<ShopPaymentTypes | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!pno) return;
    setLoading(true);

    axiosInstance
      .get<ShopPaymentTypes>(`/shop_payment/${pno}`)
      .then((res) => {
        setPayment(res.data);
      })
      .catch((err) => {
        console.error('결제 상세 조회 실패:', err);
        setPayment(null);
      })
      .finally(() => setLoading(false));
  }, [pno, ono]);
  console.log(payment)

  if (loading) {
    return (
      <section className="view active">
        <PageHeader
          title="결제 내역"
          actions={
            <button type="button" className="btn btn_md btn_ghost" onClick={() => goToList()}>
              ← 목록으로
            </button>
          }
        />
        <p className="b_title">결제 결제 내역 정보를 불러오는 중...</p>
      </section>
    );
  }

  if (!payment) {
    return (
      <section className="view active">
        <PageHeader
          title="결제 결제 내역"
          actions={
            <button type="button" className="btn btn_md btn_ghost" onClick={() => goToList()}>
              ← 목록으로
            </button>
          }
        />
        <p className="empty_row">결제 내역을 찾을 수 없습니다.</p>
      </section>
    );
  }

  return (
    <section className="view active">
      <PageHeader
        title="결제 내역"
        description={`결제번호 #${payment.no} · 주문번호 ${payment.ono}`}
        createLabel="목록으로"
        actions={
          <button type="button" className="btn btn_md btn_ghost" onClick={() => goToList()}>
            ← 목록으로
          </button>
        }
      />

      <div className="card card_pad_lg" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div className="cell_sub" style={{ marginBottom: 4 }}>
              {payment.cdate}
            </div>
            <h3 style={{ fontSize: 20, margin: 0 }}>{payment.price.toLocaleString('ko-KR')}원</h3>
          </div>
          <span className={`badge ${PSTATUS_MAP[payment.pstatus]?.className ?? ''}`}>
            {PSTATUS_MAP[payment.pstatus]?.label ?? '-'}
          </span>
        </div>

        <div className="order_lines">
          <div className="order_line">
            <span>결제수단</span>
            <span>{payment.pmethod !== null && PMETHOD_MAP[payment.pmethod] ? PMETHOD_MAP[payment.pmethod].label : '-'}</span>
          </div>
          <div className="order_line">
            <span>결제금액</span>
            <span>{payment.price.toLocaleString('ko-KR')}원</span>
          </div>
        </div>
      </div>
    </section>
  );
}