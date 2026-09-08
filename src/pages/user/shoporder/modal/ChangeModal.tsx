import { useEffect, useState } from 'react';
import { Modal } from '../../../../components/ui';
import { axiosInstance } from '../../../../utils/Tool';
import type { ShopOrderTypes } from '../../../../components/ts/ShopOrder';
import type { ChangePreview, ChangeRequest } from '../../../../components/ts/ShopOrderPending';
import ChangeConfirmModal from './ChangeConfirmModal';

interface ChangeModalProps {
  target: ShopOrderTypes | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export default function ChangeModal({ target, onClose, onSuccess }: ChangeModalProps) {
  const [pmonth, setPmonth] = useState(6);
  const [ccnt, setCcnt] = useState(1);
  const [minCcnt, setMinCcnt] = useState(1);
  const [maxCcnt, setMaxCcnt] = useState(999);

  const [preview, setPreview] = useState<ChangePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState('');

  // 2단계(결제수단/계좌 입력) 모달 열림 여부
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!target) return;
    setPmonth(target.pmonth);
    setCcnt(target.ccnt);
    setPreview(null);
    setError('');
    setConfirmOpen(false);

    axiosInstance
      .get<ShopOrderTypes>(`/shop_order/set_cctv/${target.no}`)
      .then((res) => {
        setMinCcnt((res.data as any).minCcnt ?? 1);
        setMaxCcnt((res.data as any).maxCcnt ?? 999);
      })
      .catch((err) => console.error('대수 범위 조회 실패:', err));
  }, [target]);

  const close = () => {
    setPreview(null);
    setConfirmOpen(false);
    setError('');
    onClose();
  };

  const ccntChanged = target ? ccnt !== target.ccnt : false;
  const requiresApproval = ccntChanged; // 대수가 바뀌면 승인 필요

  const onCcntChange = (v: number) => {
    setCcnt(Math.min(maxCcnt, Math.max(minCcnt, v)));
    setPreview(null);
  };

  const onPmonthChange = (v: number) => {
    setPmonth(v);
    setPreview(null);
  };

  const checkPreview = async () => {
    if (!target) return;
    setPreviewLoading(true);
    setError('');
    try {
      const request: ChangeRequest = {
        ono: target.no,
        pmonth,
        ccnt,
        pmethod: null,
        bankName: null,
        accountNo: null,
        accountHolder: null,
      };
      const res = await axiosInstance.post<ChangePreview>('/shop_order_pending/preview', request);
      setPreview(res.data);
    } catch (err) {
      console.error('변경 미리보기 실패:', err);
      setError('해당 조건에 맞는 구독권을 찾을 수 없거나, 변경 가능 조건을 만족하지 않습니다.');
      setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <>
      <Modal
        open={target !== null && !confirmOpen}
        onClose={close}
        titleId="changeModalTitle"
        title="구독권 변경"
        footer={
          <>
            <button type="button" className="btn btn_md btn_ghost" onClick={close}>
              취소
            </button>
            <button
              type="button"
              className="btn btn_md btn_primary"
              disabled={!preview}
              onClick={() => setConfirmOpen(true)}
            >
              다음
            </button>
          </>
        }
      >
        {target && (
          <div>
            <p className="cell_sub" style={{ marginBottom: 16 }}>
              현재: {target.pname} · {target.pmonth}개월 · {target.ccnt}대
            </p>

            <div className="form_group">
              <label className="form_label" htmlFor="changePmonth">이용 기간</label>
              <div className="form_control">
                <select id="changePmonth" className="form_select" value={pmonth} onChange={(e) => onPmonthChange(Number(e.target.value))}>
                  <option value={6}>6개월</option>
                  <option value={12}>12개월</option>
                </select>
              </div>
            </div>

            <div className="cctv_stepper">
              <label htmlFor="changeCcnt">CCTV 대수</label>
              <div className="stepper">
                <button type="button" className="stepper_btn" disabled={ccnt <= minCcnt} onClick={() => onCcntChange(ccnt - 1)}>–</button>
                <input
                  id="changeCcnt"
                  type="number"
                  className="stepper_input"
                  value={ccnt}
                  onChange={(e) => onCcntChange(Number(e.target.value) || minCcnt)}
                />
                <button type="button" className="stepper_btn" disabled={ccnt >= maxCcnt} onClick={() => onCcntChange(ccnt + 1)}>+</button>
              </div>
              <p className="cell_sub" style={{ marginTop: 4 }}>
                최소 {minCcnt}대 ~ 최대 {maxCcnt}대까지 선택 가능합니다.
              </p>
            </div>

            <button
              type="button"
              className="btn btn_md btn_outline_primary"
              style={{ width: '100%', marginTop: 12 }}
              disabled={previewLoading}
              onClick={checkPreview}
            >
              {previewLoading ? '계산 중...' : '예상액 확인'}
            </button>

            {preview && (
              <div className="order_lines" style={{ marginTop: 16 }}>
                <div className="order_line"><span>적용될 구독권</span><span>{preview.pname}</span></div>
                <div className="order_line"><span>구독 종료일</span><span>{preview.edate}</span></div>
                {preview.extraCharge > 0 && (
                  <div className="order_line"><span>추가 결제 금액</span><span>{preview.extraCharge.toLocaleString('ko-KR')}원</span></div>
                )}
                {preview.refundAmount > 0 && (
                  <div className="order_line"><span>환불 금액</span><span>{preview.refundAmount.toLocaleString('ko-KR')}원</span></div>
                )}
              </div>
            )}

            {preview && requiresApproval && (
              <p className="form_hint" style={{ marginTop: 10 }}>
                CCTV 대수가 바뀌는 변경이라, 신청 후 관리자가 매장 설치 상태를 확인하고 승인해야 최종 반영됩니다. 승인 전까지는 기존 조건으로 계속 이용하실 수 있습니다.
              </p>
            )}

            {error && <div className="form_hint error" style={{ marginTop: 10 }}>{error}</div>}
          </div>
        )}
      </Modal>

      {target && preview && (
        <ChangeConfirmModal
          open={confirmOpen}
          target={target}
          pmonth={pmonth}
          ccnt={ccnt}
          preview={preview}
          requiresApproval={requiresApproval}
          onBack={() => setConfirmOpen(false)}
          onClose={close}
          onSuccess={onSuccess}
        />
      )}
    </>
  );
}