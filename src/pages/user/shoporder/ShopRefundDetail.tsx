import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../../../components/ui';
import { axiosInstance } from '../../../utils/Tool';
import { PMETHOD_MAP, PSTATUS_MAP, REFUND_STATUS_MAP, type ShopPaymentTypes, type ShopRefundTypes } from '../../../components/ts/ShopPayment';
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
  const [refund, setRefund] = useState<ShopRefundTypes | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!pno) return;
    setLoading(true);

    Promise.all([
      axiosInstance.get<ShopRefundTypes[]>(`/shop_refund/${pno}`),
      axiosInstance.get<ShopPaymentTypes>(`/shop_payment/${pno}`)
    ])
      .then(([refundRes, payRes]) => {
        setRefund(refundRes.data[0] ?? null);
        setPayment(payRes.data);
      })
      .catch((err) => {
        console.error('환불 내역 조회 실패:', err);
        setRefund(null);
        setPayment(null);
      })
      .finally(() => setLoading(false));

  }, [pno, ono]);
  console.log(payment)
  console.log(refund)

  if (loading) {
    return (
      <section className="view active">
        <PageHeader
          title="환불 내역"
          actions={
            <button type="button" className="btn btn_md btn_ghost" onClick={() => goToList()}>
              ← 목록으로
            </button>
          }
        />
        <p className="b_title">환불 내역 정보를 불러오는 중...</p>
      </section>
    );
  }

  if (!payment || !refund) {
    return (
      <section className="view active">
        <PageHeader
          title="환불 내역"
          actions={
            <button type="button" className="btn btn_md btn_ghost" onClick={() => goToList()}>
              ← 목록으로
            </button>
          }
        />
        <p className="empty_row">환불 내역을 찾을 수 없습니다.</p>
      </section>
    );
  }

  return (
    <section className="view active">
      <PageHeader
        title="환불 내역"
        description={`주문번호 ${payment.ono}`}
        createLabel="목록으로"
        actions={
          <button type="button" className="btn btn_md btn_ghost" onClick={() => goToList()}>
            ← 목록으로
          </button>
        }
      />

      <div className="card card_pad_lg" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <h3 style={{ fontSize: 20, margin: 0 }}>{refund.amount.toLocaleString('ko-KR')}원</h3>
          <span className={`badge ${REFUND_STATUS_MAP[refund.status].className}`}>
            {REFUND_STATUS_MAP[refund.status].label}
          </span>
        </div>

        <div className="order_lines">
          <div className="order_line">
            <span>결제 취소일</span>
            <span>{payment.cdate}</span>
          </div>
          <div className="order_line">
            <span>결제수단</span>
            <span>{payment.pmethod !== null && PMETHOD_MAP[payment.pmethod] ? PMETHOD_MAP[payment.pmethod].label : '-'}</span>
          </div>
          <div className="order_line"><span>은행</span><span>{refund.bankName}</span></div>
          <div className="order_line"><span>계좌번호</span><span className="mono">{refund.accountNo}</span></div>
          <div className="order_line"><span>예금주</span><span>{refund.accountHolder}</span></div>
          <div className="order_line"><span>환불금액</span><span>{refund.amount.toLocaleString('ko-KR')}원</span></div>
          <div className="order_line"><span>환불요청일</span><span>{refund.cdate}</span></div>
          {refund.udate && <div className="order_line"><span>처리일시</span><span>{refund.udate}</span></div>}
        </div>
      </div>
    </section>
  );
}