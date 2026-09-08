import { useState } from 'react';
import { Modal } from '../../../../components/ui';
import { axiosInstance } from '../../../../utils/Tool';
import { PMETHOD_MAP, PMETHOD_ICON } from '../../../../components/ts/ShopPayment';
import type { ShopOrderTypes } from '../../../../components/ts/ShopOrder';
import type { ChangePreview, ChangeRequest, ChangeResult } from '../../../../components/ts/ShopOrderPending';

interface ChangeConfirmModalProps {
  open: boolean;
  target: ShopOrderTypes;
  pmonth: number;
  ccnt: number;
  preview: ChangePreview;
  requiresApproval: boolean;
  onBack: () => void; // 이전 모달로 돌아가기
  onClose: () => void; // 전체 닫기
  onSuccess: (message: string) => void;
}

export default function ChangeConfirmModal({
  open,
  target,
  pmonth,
  ccnt,
  preview,
  requiresApproval,
  onBack,
  onClose,
  onSuccess,
}: ChangeConfirmModalProps) {
  const [pmethod, setPmethod] = useState<0 | 1 | 2>(0);
  const [bankName, setBankName] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const needsPayment = preview.extraCharge > 0;
  const needsBank = requiresApproval || preview.refundAmount > 0;

  const submit = async () => {
    if (needsBank) {
      if (!bankName.trim() || !accountNo.trim() || !accountHolder.trim()) {
        setError('환불계좌 정보를 모두 입력해주세요.');
        return;
      }
    }

    setSubmitting(true);
    setError('');
    try {
      const request: ChangeRequest = {
        ono: target.no,
        pmonth,
        ccnt,
        pmethod: needsPayment ? pmethod : null,
        bankName: needsBank ? bankName : null,
        accountNo: needsBank ? accountNo : null,
        accountHolder: needsBank ? accountHolder : null,
      };
      const res = await axiosInstance.post<ChangeResult>('/shop_order_pending', request);

      onSuccess(
        res.data.pending
          ? '구독권 변경이 신청되었습니다.\nCCTV 대수 변경은 관리자 확인 후 최종 반영됩니다.'
          : '구독권이 변경되었습니다.',
      );
      onClose();
    } catch (err) {
      console.error('변경 신청 실패:', err);
      setError('변경 신청 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      titleId="changeConfirmModalTitle"
      title="결제 정보 입력"
      footer={
        <>
          <button type="button" className="btn btn_md btn_ghost" onClick={onBack}>
            이전
          </button>
          <button type="button" className="btn btn_md btn_primary" disabled={submitting} onClick={submit}>
            {submitting ? '처리 중...' : '변경 신청'}
          </button>
        </>
      }
    >
      <div>
        <div className="order_lines" style={{ marginBottom: 16 }}>
          <div className="order_line"><span>적용될 구독권</span><span>{preview.pname}</span></div>
          <div className="order_line"><span>구독 종료일</span><span>{preview.edate}</span></div>
          {preview.extraCharge > 0 && (
            <div className="order_line"><span>추가 결제 금액</span><span>{preview.extraCharge.toLocaleString('ko-KR')}원</span></div>
          )}
          {preview.refundAmount > 0 && (
            <div className="order_line"><span>환불 금액</span><span>{preview.refundAmount.toLocaleString('ko-KR')}원</span></div>
          )}
        </div>

        {needsPayment && (
          <div className="pmethod_filter_wrap">
            <div className="form_label" style={{ marginBottom: 10 }}>결제 수단</div>
            <div className="pmethod_filter" role="radiogroup" aria-label="결제수단 선택">
              {[0, 1, 2].map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`pmethod_chip${pmethod === m ? ' on' : ''}`}
                  onClick={() => setPmethod(m as 0 | 1 | 2)}
                  aria-pressed={pmethod === m}
                >
                  <span className="pmethod_chip_icon">{PMETHOD_ICON[m]}</span>
                  {PMETHOD_MAP[m].label}
                </button>
              ))}
            </div>
          </div>
        )}

        {needsBank && (
          <div style={{ marginTop: needsPayment ? 16 : 0 }}>
            <div className="form_hint" style={{ marginBottom: 10 }}>
              환불이 발생할 수 있는 변경입니다. 환불계좌를 입력해주세요.
            </div>
            <div className="form_group">
              <label className="form_label" htmlFor="confirmBankName">은행명</label>
              <div className="form_control">
                <input id="confirmBankName" type="text" className="form_input" value={bankName} onChange={(e) => setBankName(e.target.value)} />
              </div>
            </div>
            <div className="form_group">
              <label className="form_label" htmlFor="confirmAccountNo">계좌번호</label>
              <div className="form_control">
                <input id="confirmAccountNo" type="text" className="form_input mono" value={accountNo} onChange={(e) => setAccountNo(e.target.value)} />
              </div>
            </div>
            <div className="form_group">
              <label className="form_label" htmlFor="confirmAccountHolder">예금주명</label>
              <div className="form_control">
                <input id="confirmAccountHolder" type="text" className="form_input" value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {!needsPayment && !needsBank && (
          <p className="form_hint">별도 결제나 환불 없이 즉시 반영됩니다. 아래 버튼으로 확정해주세요.</p>
        )}

        {error && <div className="form_hint error" style={{ marginTop: 10 }}>{error}</div>}
      </div>
    </Modal>
  );
}