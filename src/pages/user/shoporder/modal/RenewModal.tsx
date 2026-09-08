import { useState } from 'react';
import { Modal } from '../../../../components/ui';
import { axiosInstance } from '../../../../utils/Tool';
import { PMETHOD_MAP, PMETHOD_ICON } from '../../../../components/ts/ShopPayment';
import type { RenewRequest, RenewResult, ShopOrderTypes } from '../../../../components/ts/ShopOrder';

interface RenewModalProps {
  target: ShopOrderTypes | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export default function RenewModal({ target, onClose, onSuccess }: RenewModalProps) {
  const [newPmonth, setNewPmonth] = useState<number | undefined>(undefined); // undefined면 동일조건
  const [pmethod, setPmethod] = useState<0 | 1 | 2>(0);
  const [renewing, setRenewing] = useState(false);
  const [error, setError] = useState('');

  const close = () => {
    setNewPmonth(undefined);
    setPmethod(0);
    setError('');
    onClose();
  };

  const submit = async () => {
    if (!target) return;
    setRenewing(true);
    setError('');
    try {
      const res = await axiosInstance.put(`/shop_order/${target.no}/renew`, null, {
        params: {
          newPmonth: newPmonth ?? undefined,
          pmethod,
        },
      });
      onSuccess(
        `구독이 갱신되었습니다.\n새 구독 종료일: ${res.data.edate}\n총 결제 금액(누적): ${res.data.totalprice.toLocaleString('ko-KR')}원`,
      );
      close();
    } catch (err) {
      console.error('갱신 실패:', err);
      setError('갱신 처리 중 오류가 발생했습니다.');
    } finally {
      setRenewing(false);
    }
  };

  return (
    <Modal
      open={target !== null}
      onClose={close}
      titleId="renewModalTitle"
      title="구독을 갱신하시겠습니까?"
      footer={
        <>
          <button type="button" className="btn btn_md btn_ghost" onClick={close}>
            취소
          </button>
          <button type="button" className="btn btn_md btn_primary" disabled={renewing} onClick={submit}>
            {renewing ? '처리 중...' : '갱신하기'}
          </button>
        </>
      }
    >
      {target && (
        <div>
          <div className="order_lines">
            <div className="order_line"><span>구독권</span><span>{target.pname}</span></div>
            <div className="order_line"><span>현재 종료일</span><span>{target.edate}</span></div>
            <div className="order_line"><span>CCTV 대수</span><span>{target.ccnt}대 (변경 불가)</span></div>
          </div>

          <div className="form_group" style={{ marginTop: 16 }}>
            <label className="form_label" htmlFor="renewPmonth">연장 기간</label>
            <div className="form_control">
              <select
                id="renewPmonth"
                className="form_select"
                value={newPmonth ?? target.pmonth}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setNewPmonth(v === target.pmonth ? undefined : v);
                }}
              >
                <option value={6}>6개월</option>
                <option value={12}>12개월</option>
              </select>
              <div className="form_hint">
                동일 조건({target.pmonth}개월)으로 두거나, 다른 기간으로 연장할 수 있습니다.
              </div>
            </div>
          </div>

          <div className="pmethod_filter_wrap" style={{ marginTop: 16 }}>
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

          {error && <div className="form_hint error" style={{ marginTop: 10 }}>{error}</div>}
        </div>
      )}
    </Modal>
  );
}