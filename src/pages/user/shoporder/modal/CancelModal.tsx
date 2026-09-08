import { useState } from 'react';
import { Modal } from '../../../../components/ui';
import { axiosInstance } from '../../../../utils/Tool';
import { estimateCancelRefund, type CancelResult, type ShopOrderTypes } from '../../../../components/ts/ShopOrder';

interface CancelModalProps {
  target: ShopOrderTypes | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export default function CancelModal({ target, onClose, onSuccess }: CancelModalProps) {
  const [bankName, setBankName] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [cancelling, setCancelling] = useState(false);

  const estimate = target ? estimateCancelRefund(target) : null;

  const close = () => {
    setBankName('');
    setAccountNo('');
    setAccountHolder('');
    setErrors({});
    onClose();
  };

  const submit = async () => {
    if (!target || !estimate) return;

    if (estimate.refundAmount > 0) {
      const newErrors: Record<string, string> = {};
      if (!bankName.trim()) newErrors.bankName = '은행명을 입력해주세요.';
      if (!accountNo.trim()) newErrors.accountNo = '계좌번호를 입력해주세요.';
      if (!accountHolder.trim()) newErrors.accountHolder = '예금주명을 입력해주세요.';
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
    }

    setCancelling(true);
    try {
      const res = await axiosInstance.put<CancelResult>(`/shop_order/${target.no}/cancel`, {
        bankName: bankName || undefined,
        accountNo: accountNo || undefined,
        accountHolder: accountHolder || undefined,
      });
      onSuccess(
        `구독이 취소되었습니다.\n사용 개월수 ${res.data.usedMonths.toFixed(2)}개월 · 환불 대상 ${res.data.refundMonths.toFixed(2)}개월\n환불 금액: ${res.data.refundAmount.toLocaleString('ko-KR')}원`,
      );
      close();
    } catch (err) {
      console.error('취소 실패:', err);
      setErrors({ submit: '취소 처리 중 오류가 발생했습니다. 구독 종료까지 28일 미만이면 취소할 수 없습니다.' });
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Modal
      open={target !== null}
      onClose={close}
      titleId="cancelModalTitle"
      title="구독을 취소하시겠습니까?"
      footer={
        <>
          <button type="button" className="btn btn_md btn_ghost" onClick={close}>
            닫기
          </button>
          <button type="button" className="btn btn_md btn_danger" disabled={cancelling} onClick={submit}>
            {cancelling ? '처리 중...' : '구독취소'}
          </button>
        </>
      }
    >
      {target && estimate && (
        <div>
          <p className="b_title">구독 취소 시 해당 구독권은 재사용할 수 없습니다.</p>
          <div className="order_lines">
            <div className="order_line"><span>구독권</span><span>{target.pname} · {target.pmonth}개월 · {target.ccnt}대</span></div>
            <div className="order_line"><span>사용 개월수(예상)</span><span>{estimate.usedMonths.toFixed(2)}개월</span></div>
            <div className="order_line"><span>환불 대상 개월수(예상)</span><span>{estimate.refundMonths.toFixed(2)}개월</span></div>
            <div className="order_line"><span>예상 환불액</span><span>{estimate.refundAmount.toLocaleString('ko-KR')}원</span></div>
          </div>

          {estimate.refundAmount > 0 && (
            <div style={{ marginTop: 16 }}>
              <div className="form_group">
                <label className="form_label" htmlFor="cancelBankName">은행명</label>
                <div className="form_control">
                  <input
                    id="cancelBankName"
                    type="text"
                    className={`form_input ${errors.bankName ? 'is_error' : ''}`}
                    placeholder="예: 국민은행"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                  />
                  {errors.bankName && <div className="form_hint error">{errors.bankName}</div>}
                </div>
              </div>
              <div className="form_group">
                <label className="form_label" htmlFor="cancelAccountNo">계좌번호</label>
                <div className="form_control">
                  <input
                    id="cancelAccountNo"
                    type="text"
                    className={`form_input mono ${errors.accountNo ? 'is_error' : ''}`}
                    placeholder="- 없이 숫자만 입력"
                    value={accountNo}
                    onChange={(e) => setAccountNo(e.target.value)}
                  />
                  {errors.accountNo && <div className="form_hint error">{errors.accountNo}</div>}
                </div>
              </div>
              <div className="form_group">
                <label className="form_label" htmlFor="cancelAccountHolder">예금주명</label>
                <div className="form_control">
                  <input
                    id="cancelAccountHolder"
                    type="text"
                    className={`form_input ${errors.accountHolder ? 'is_error' : ''}`}
                    placeholder="예: 홍길동"
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value)}
                  />
                  {errors.accountHolder && <div className="form_hint error">{errors.accountHolder}</div>}
                </div>
              </div>
            </div>
          )}

          {errors.submit && <div className="form_hint error" style={{ marginTop: 10 }}>{errors.submit}</div>}
        </div>
      )}
    </Modal>
  );
}