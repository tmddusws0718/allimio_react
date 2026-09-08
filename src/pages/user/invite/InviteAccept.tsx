import { useState } from 'react';
import { PageHeader, AlertModal } from '../../../components/ui';
import { axiosInstance, set_focus } from '../../../utils/Tool';
import { GlobalStoreSession } from '../../../store/LoginStore';
import type { InviteAcceptRequest, InviteAcceptResult } from '../../../components/ts/Invite';

interface InviteAcceptProps {
  onBack: () => void;
}

/* ---------------------------------------------------------------------
   초대코드 수락 화면 - 6자리 코드를 입력하면 현재 로그인 회원번호(mno)와
   함께 서버로 보내 SHOP_MEMBER에 등록합니다.

   API (가정 - 실제 엔드포인트/DTO 필드명은 백엔드 구현에 맞춰 조정하세요)
   POST /invite_code/accept { code, mno } → InviteAcceptResult
--------------------------------------------------------------------- */
export default function InviteAccept({ onBack }: InviteAcceptProps) {
  const { no: mno } = GlobalStoreSession();

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState<{ message: string; variant?: 'success' | 'error'; onConfirm?: () => void } | null>(null);

  const onCodeChange = (value: string) => {
    // 숫자 + 영문 대문자만 허용, 소문자는 자동 대문자 변환
    const cleaned = value.toUpperCase().replace(/[^0-9A-Z]/g, '');

    // 6자리를 초과하면 아예 무시 (밀림 현상 방지 — slice로 자르지 않고 상태 갱신 자체를 막음)
    if (cleaned.length > 6) return;

    setCode(cleaned);

    if (error) setError(null);
  };

  const validate = () => {
    if (code.length !== 6) {
      setError('6자리 초대코드를 입력해주세요.');
      set_focus('invite_code_input');
      return false;
    }
    setError(null);
    return true;
  };

  const handleSubmit = async () => {
    if (!validate() || submitting) return;

    setSubmitting(true);
    try {
      const payload: InviteAcceptRequest = { code, mno };
      const res = await axiosInstance.post<InviteAcceptResult>('/invite/accept', payload);

      if (res.data.success) {
        setAlert({
          message: res.data.shopTitle
            ? `${res.data.shopTitle} 매장의 직원으로 등록되었습니다.`
            : '매장 직원으로 등록되었습니다.',
          variant: 'success',
          onConfirm: onBack,
        });
      } else {
        setAlert({ message: res.data.message || '유효하지 않거나 만료된 코드입니다.', variant: 'error' });
      }
    } catch (err) {
      console.error('초대코드 수락 실패:', err);
      setAlert({ message: '초대코드 확인 중 오류가 발생했습니다.\n코드를 다시 확인해주세요.', variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="view active">
      <PageHeader
        title="초대코드 입력"
        description="점주에게 받은 6자리 초대코드를 입력해주세요."
        actions={
          <button type="button" className="btn btn_md btn_ghost" onClick={onBack}>
            ← 처음으로
          </button>
        }
      />

      <div className="card card_pad_lg" style={{ maxWidth: 360 }}>
        <div className="form_group">
          <label className="form_label" htmlFor="invite_code_input">
            초대코드<span className="req">*</span>
          </label>
          <div className="form_control">
            <input
              id="invite_code_input"
              type="text"
              maxLength={6}
              className={`form_input mono ${error ? 'is_error' : ''}`}
              placeholder="6자리 초대코드"
              style={{ fontSize: 22, letterSpacing: 6, textAlign: 'center' }}
              value={code}
              onChange={(e) => onCodeChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmit();
              }}
              autoFocus
            />
            {error && <div className="form_hint error">{error}</div>}
          </div>
        </div>

        <div className="form_page_footer">
          <button type="button" className="btn btn_md btn_ghost" onClick={onBack} disabled={submitting}>
            취소
          </button>
          <button type="button" className="btn btn_md btn_primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? '확인 중...' : '수락하기'}
          </button>
        </div>
      </div>

      <AlertModal
        open={alert !== null}
        onClose={() => setAlert(null)}
        onConfirm={alert?.onConfirm}
        message={alert?.message ?? ''}
        variant={alert?.variant}
      />
    </section>
  );
}