import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader, ConfirmDeleteModal, AlertModal } from '../../../components/ui';
import { axiosInstance, enter_chk, set_focus } from '../../../utils/Tool.ts';
import { invalidateCctvIssueCodeCache } from '../../../hooks/useCctvIssueCodes.ts';
import { EMPTY_CODE, type CctvIssueCodeType } from '../../../components/ts/CctvIssueCode.ts';

// 파일이름 꼭 맞춰주세요
/* ---------------------------------------------------------------------
   이상행동유형코드 등록(/dbms/cctvissuecode/new) / 수정(/dbms/cctvissuecode/:code/edit) - 관리자 전용.

   CctvIssueCodeDTO (백엔드, dev.jpa.allimio.cctvissuecode)
   code        String  - PK, VARCHAR2(2). 등록 후에는 수정 불가(자연키) - AI/Jetson이 이미 이
                          값으로 CCTV_ISSUE.CODE를 저장하므로 값이 바뀌면 기존 이슈와 연결이 끊어짐.
   codeName    String  - 코드명 (예: 폭행)
   description String  - 설명
   severity    int     - 심각도 1(낮음)~3(높음)
   ord         int     - 정렬 순서 (필터 드롭다운 노출 순서)
   useYn       String  - 사용여부 Y/N (기본 Y) - 더 이상 안 쓰는 코드는 삭제 대신 N 권장
   cdate       String  - 서버(CctvIssueCodeService.save)에서 Tool.getDate()로 채움

   API (CctvIssueCodeCont, /cctv_issue_code)
   POST /cctv_issue_code/save    - CctvIssueCodeDTO(JSON) → 등록
   PUT  /cctv_issue_code/update  - CctvIssueCodeDTO(JSON, code 포함) → 수정
   GET  /cctv_issue_code/{pk}    - 단건 조회
   DELETE /cctv_issue_code/{pk}  - 삭제

   저장/삭제에 성공하면 invalidateCctvIssueCodeCache()를 호출해서, 이미 열려있는 다른 화면의
   useCctvIssueCodes 캐시도 다음 조회 때 새로 불러오게 합니다(코드→라벨 매핑 즉시 반영).
--------------------------------------------------------------------- */

interface FieldErrors {
  code?: string;
  codeName?: string;
}

export default function CctvIssueCodeFormView() {
  const navigate = useNavigate();
  const { code } = useParams<{ code: string }>();
  const isEdit = Boolean(code);

  const [input, setInput] = useState<CctvIssueCodeType>({ ...EMPTY_CODE });
  const [loading, setLoading] = useState(isEdit);
  const [notFound, setNotFound] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [formAlert, setFormAlert] = useState<{ message: string; variant?: 'success' | 'error'; onConfirm?: () => void } | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!isEdit) return;

    axiosInstance
      .get(`/cctv_issue_code/${code}`)
      .then((result) => result.data)
      .then((data: CctvIssueCodeType) => {
        setInput(data);
      })
      .catch((err) => {
        console.error(err);
        setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [isEdit, code]);

  const onChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { id, value } = e.target;
    setInput((prev) => ({ ...prev, [id]: value }));
    if (id in errors) {
      setErrors((prev) => ({ ...prev, [id]: undefined }));
    }
  };

  const goBack = () => navigate('/dbms/cctvissuecode');

  const validate = () => {
    if (!isEdit && !input.code?.trim()) {
      setErrors({ code: '코드를 입력해주세요. (예: 06)' });
      set_focus('code');
      return false;
    }
    if (!isEdit && !/^[0-9A-Za-z]{1,2}$/.test(input.code.trim())) {
      setErrors({ code: '코드는 영문/숫자 1~2자리로 입력해주세요.' });
      set_focus('code');
      return false;
    }
    if (!input.codeName?.trim()) {
      setErrors({ codeName: '코드명을 입력해주세요.' });
      set_focus('codeName');
      return false;
    }
    setErrors({});
    return true;
  };

  const send = async (e: React.SyntheticEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const payload: CctvIssueCodeType = {
      code: input.code.trim(),
      codeName: input.codeName.trim(),
      description: input.description?.trim() ?? '',
      severity: Number(input.severity ?? 1),
      ord: Number(input.ord ?? 0),
      useYn: input.useYn ?? 'Y',
    };

    setSaving(true);
    try {
      const response = isEdit
        ? await axiosInstance.put('/cctv_issue_code/update', payload)
        : await axiosInstance.post('/cctv_issue_code/save', payload);

      if (response.status === 401) {
        setFormAlert({ message: '저장 권한이 없습니다.\n다시 로그인 해주세요.', variant: 'error' });
        return;
      } else if (response.status !== 200) {
        setFormAlert({ message: '저장에 실패했습니다.\n다시 시도해주세요.', variant: 'error' });
        return;
      }

      invalidateCctvIssueCodeCache();
      setFormAlert({
        message: isEdit ? '코드가 수정되었습니다.' : '코드가 등록되었습니다.',
        variant: 'success',
        onConfirm: goBack,
      });
    } catch (err) {
      console.error('네트워크 오류:', err);
      setFormAlert({ message: '네트워크 오류가 발생했습니다.\n다시 시도해주세요.', variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!code) return;
    setDeleting(true);
    try {
      await axiosInstance.delete(`/cctv_issue_code/${code}`);
      invalidateCctvIssueCodeCache();
      goBack();
    } catch (err) {
      console.error(err);
      alert('삭제에 실패했습니다.\n이미 CCTV 이슈에서 사용 중인 코드는 삭제 대신 사용여부를 N으로 바꿔주세요.');
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  if (isEdit && loading) {
    return (
      <section className="view active">
        <PageHeader title="이상행동유형코드 수정" description="불러오는 중..." />
      </section>
    );
  }

  if (isEdit && notFound) {
    return (
      <section className="view active">
        <PageHeader title="이상행동유형코드 수정" description="해당 코드를 찾을 수 없습니다." />
        <button type="button" className="btn btn_md btn_ghost" onClick={goBack}>
          ← 목록으로
        </button>
      </section>
    );
  }

  return (
    <section className="view active">
      <PageHeader
        title={isEdit ? '이상행동유형코드 수정' : '이상행동유형코드 등록'}
        description={
          isEdit
            ? `코드 ${code}${input.cdate ? ` · 등록일 ${input.cdate}` : ''}`
            : 'AI가 CCTV 이슈 저장 시 사용할 문제유형코드를 등록합니다.'
        }
        actions={
          <button type="button" className="btn btn_md btn_ghost" onClick={goBack}>
            ← 목록으로
          </button>
        }
      />

      <form onSubmit={send}>
        <div className="card card_pad_lg form_page">

          {/* 코드 - 등록 후에는 수정 불가(자연키) */}
          <div className="form_group">
            <label className="form_label" htmlFor="code">
              코드<span className="req" title="필수 입력 요소">*</span>
            </label>
            <div className="form_control">
              <input
                id="code"
                className={`form_input mono ${errors.code ? 'is_error' : ''}`}
                placeholder="예: 06"
                value={input.code ?? ''}
                onChange={onChange}
                onKeyDown={(e) => enter_chk(e, 'codeName')}
                disabled={isEdit}
                style={{ maxWidth: 120 }}
              />
              {errors.code && <div className="form_hint error">{errors.code}</div>}
              {!errors.code && (
                <div className="form_hint">
                  {isEdit
                    ? 'CCTV_ISSUE.CODE와 연결된 값이라 등록 후에는 수정할 수 없습니다.'
                    : 'CCTV_ISSUE.CODE에 저장될 값과 동일해야 합니다(영문/숫자 1~2자리, 예: 01).'}
                </div>
              )}
            </div>
          </div>

          {/* 코드명 */}
          <div className="form_group">
            <label className="form_label" htmlFor="codeName">
              코드명<span className="req" title="필수 입력 요소">*</span>
            </label>
            <div className="form_control">
              <input
                id="codeName"
                className={`form_input ${errors.codeName ? 'is_error' : ''}`}
                placeholder="예: 폭행"
                value={input.codeName ?? ''}
                onChange={onChange}
                onKeyDown={(e) => enter_chk(e, 'description')}
              />
              {errors.codeName && <div className="form_hint error">{errors.codeName}</div>}
            </div>
          </div>

          {/* 설명 */}
          <div className="form_group">
            <label className="form_label" htmlFor="description">설명</label>
            <div className="form_control">
              <textarea
                id="description"
                className="form_input"
                rows={3}
                placeholder="이 코드가 어떤 상황을 의미하는지 설명을 입력하세요"
                value={input.description ?? ''}
                onChange={onChange}
              />
            </div>
          </div>

          {/* 심각도 */}
          <div className="form_group">
            <label className="form_label" htmlFor="severity">심각도</label>
            <div className="form_control">
              <select
                id="severity"
                className="form_select"
                value={input.severity ?? 1}
                onChange={onChange}
                style={{ maxWidth: 160 }}
              >
                <option value={1}>낮음</option>
                <option value={2}>보통</option>
                <option value={3}>높음</option>
              </select>
            </div>
          </div>

          {/* 정렬 순서 */}
          <div className="form_group">
            <label className="form_label" htmlFor="ord">정렬 순서</label>
            <div className="form_control">
              <input
                type="number"
                id="ord"
                className="form_input"
                value={input.ord ?? 0}
                onChange={onChange}
                style={{ maxWidth: 160 }}
              />
              <div className="form_hint">CCTV 이슈 목록 필터 드롭다운에 노출되는 순서입니다.</div>
            </div>
          </div>

          {/* 사용 여부 */}
          <div className="form_group">
            <label className="form_label" htmlFor="useYn">사용 여부</label>
            <div className="form_control">
              <select
                id="useYn"
                className="form_select"
                value={input.useYn ?? 'Y'}
                onChange={onChange}
                style={{ maxWidth: 160 }}
              >
                <option value="Y">사용</option>
                <option value="N">미사용</option>
              </select>
              <div className="form_hint">미사용으로 바꾸면 목록 필터/라벨에서는 계속 보이되(기존 이슈 표시용), 새 코드 선택 대상에서는 빠집니다.</div>
            </div>
          </div>

          {/* 삭제 - 수정 모드에서만 노출 */}
          {isEdit && (
            <div className="card card_pad_md danger" style={{ marginTop: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div className="b_title">코드 삭제</div>
                  <div className="form_hint">이미 CCTV_ISSUE에서 사용 중인 코드는 삭제 대신 사용여부를 N으로 바꿔주세요.</div>
                </div>
                <button
                  type="button"
                  className="btn btn_md btn_danger"
                  onClick={() => setDeleteOpen(true)}
                >
                  코드 삭제
                </button>
              </div>
            </div>
          )}

          <div className="form_page_footer">
            <button type="button" className="btn btn_md btn_ghost" onClick={goBack}>
              취소
            </button>
            <button type="button" className="btn btn_md btn_primary" onClick={send} disabled={saving}>
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </form>

      <ConfirmDeleteModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        targetLabel={input.codeName ? `${code} · ${input.codeName}` : code}
        loading={deleting}
      />

      <AlertModal
        open={formAlert !== null}
        onClose={() => setFormAlert(null)}
        onConfirm={formAlert?.onConfirm}
        message={formAlert?.message ?? ''}
        variant={formAlert?.variant}
      />
    </section>
  );
}
