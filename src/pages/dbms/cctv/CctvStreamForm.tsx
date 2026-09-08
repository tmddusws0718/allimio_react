import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { PageHeader, ConfirmDeleteModal, AlertModal } from '../../../components/ui';
import { axiosInstance, enter_chk, set_focus } from '../../../utils/Tool.ts';
import { EMPTY_STREAM, PROTOCOL_OPTIONS, CONN_STATE_LABELS, type CctvStreamType } from '../../../components/ts/CctvStream.ts';

// 파일이름 꼭 맞춰주세요
/* ---------------------------------------------------------------------
   CCTV 스트림 등록(/dbms/cctvstream/new) / 수정(/dbms/cctvstream/:no/edit) - 관리자 전용.
   CCTV 목록(CctvList.tsx)에서 "스트림" 버튼으로 들어오면 ?cno= 쿼리로 CCTV번호가 채워집니다.

   CctvStreamDTO (백엔드, dev.jpa.allimio.cctvstream)
   no                long    - PK, 생성 시엔 보내지 않아도 됨(시퀀스 채번)
   cno               long    - CCTV번호(CCTV.no). CCTV 1대당 스트림 1건(UNIQUE) - "CCTV 확인"
                                버튼으로 GET /cctv/{pk}를 호출해 CCTV명을 미리 보여줍니다.
   streamUrl         String  - 스트림 접속 주소 (예: rtsp://192.168.0.10:554/stream1)
   protocol          String  - RTSP/RTMP/HTTP/HLS
   port              Integer - 접속 포트 (선택)
   connState         int     - 연결상태 (0: 미연결, 1: 연결됨, 2: 오류) - 보통은 Jetson 워커가 갱신
   lastConnectedAt   String  - 최근 연결 성공 일시 (선택)
   cdate             String  - 서버(CctvStreamService.save)에서 Tool.getDate()로 채움

   API (CctvStreamCont, /cctv_stream)
   POST /cctv_stream/save         - CctvStreamDTO(JSON) → 등록
   PUT  /cctv_stream/update       - CctvStreamDTO(JSON, no 포함) → 수정
   GET  /cctv_stream/{pk}         - 단건 조회(수정모드 진입 시)
   GET  /cctv_stream/by_cno/{cno} - CCTV번호로 조회(이미 등록된 스트림인지 확인용)
   DELETE /cctv_stream/{pk}       - 삭제
--------------------------------------------------------------------- */

interface FieldErrors {
  cno?: string;
  streamUrl?: string;
}

export default function CctvStreamFormView() {
  const navigate = useNavigate();
  const { no } = useParams<{ no: string }>();
  const [searchParams] = useSearchParams();
  const presetCno = searchParams.get('cno');
  const isEdit = Boolean(no);

  const [input, setInput] = useState<CctvStreamType>({
    ...EMPTY_STREAM,
    cno: presetCno ? Number(presetCno) : undefined,
  });
  const [loading, setLoading] = useState(isEdit);
  const [notFound, setNotFound] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [formAlert, setFormAlert] = useState<{ message: string; variant?: 'success' | 'error'; onConfirm?: () => void } | null>(null);

  // CCTV번호(cno) 확인 - GET /cctv/{pk}로 CCTV명 미리보기 (CctvForm.tsx의 "매장 확인"과 동일 패턴)
  const [cctvCheck, setCctvCheck] = useState<{ loading: boolean; title: string | null; checked: boolean }>({
    loading: false,
    title: null,
    checked: false,
  });

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!isEdit) return;

    axiosInstance
      .get(`/cctv_stream/${no}`)
      .then((result) => result.data)
      .then((data: CctvStreamType) => {
        setInput(data);
      })
      .catch((err) => {
        console.error(err);
        setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [isEdit, no]);

  const onChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { id, value } = e.target;
    setInput((prev) => ({ ...prev, [id]: value }));
    if (id in errors) {
      setErrors((prev) => ({ ...prev, [id]: undefined }));
    }
    if (id === 'cno') {
      setCctvCheck({ loading: false, title: null, checked: false });
    }
  };

  const checkCctv = async () => {
    const cno = input.cno;
    if (!cno) {
      setErrors((prev) => ({ ...prev, cno: 'CCTV번호를 입력해주세요.' }));
      set_focus('cno');
      return;
    }

    setCctvCheck({ loading: true, title: null, checked: false });
    try {
      const res = await axiosInstance.get(`/cctv/${cno}`);
      const title = res.data?.cname as string | undefined;
      setCctvCheck({ loading: false, title: title || '(CCTV명 없음)', checked: true });
    } catch (err) {
      console.error(err);
      setCctvCheck({ loading: false, title: null, checked: true });
    }
  };

  const goBack = () => navigate('/dbms/cctvstream');

  const validate = () => {
    if (!input.cno) {
      setErrors({ cno: 'CCTV번호를 입력해주세요.' });
      set_focus('cno');
      return false;
    }
    if (!input.streamUrl?.trim()) {
      setErrors({ streamUrl: '스트림 접속 주소를 입력해주세요.' });
      set_focus('streamUrl');
      return false;
    }
    setErrors({});
    return true;
  };

  const send = async (e: React.SyntheticEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const payload: CctvStreamType = {
      ...(isEdit ? { no: Number(no) } : {}),
      cno: Number(input.cno),
      streamUrl: input.streamUrl?.trim() ?? '',
      protocol: input.protocol ?? 'RTSP',
      port: input.port ? Number(input.port) : undefined,
      connState: Number(input.connState ?? 0),
      lastConnectedAt: input.lastConnectedAt || undefined,
    };

    setSaving(true);
    try {
      const response = isEdit
        ? await axiosInstance.put('/cctv_stream/update', payload)
        : await axiosInstance.post('/cctv_stream/save', payload);

      if (response.status === 401) {
        setFormAlert({ message: '저장 권한이 없습니다.\n다시 로그인 해주세요.', variant: 'error' });
        return;
      } else if (response.status !== 200) {
        setFormAlert({ message: '저장에 실패했습니다.\n다시 시도해주세요.', variant: 'error' });
        return;
      }

      setFormAlert({
        message: isEdit ? '스트림 정보가 수정되었습니다.' : '스트림이 등록되었습니다.',
        variant: 'success',
        onConfirm: goBack,
      });
    } catch (err) {
      console.error('네트워크 오류:', err);
      setFormAlert({
        message: '네트워크 오류가 발생했습니다.\n이미 해당 CCTV에 등록된 스트림이 있는지 확인해주세요(CCTV 1대당 스트림 1건).',
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!no) return;
    setDeleting(true);
    try {
      await axiosInstance.delete(`/cctv_stream/${no}`);
      goBack();
    } catch (err) {
      console.error(err);
      alert('삭제에 실패했습니다.\n다시 시도해주세요.');
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  if (isEdit && loading) {
    return (
      <section className="view active">
        <PageHeader title="CCTV 스트림 수정" description="불러오는 중..." />
      </section>
    );
  }

  if (isEdit && notFound) {
    return (
      <section className="view active">
        <PageHeader title="CCTV 스트림 수정" description="해당 스트림 정보를 찾을 수 없습니다." />
        <button type="button" className="btn btn_md btn_ghost" onClick={goBack}>
          ← 목록으로
        </button>
      </section>
    );
  }

  return (
    <section className="view active">
      <PageHeader
        title={isEdit ? 'CCTV 스트림 수정' : 'CCTV 스트림 등록'}
        description={
          isEdit
            ? `No.${no}${input.cdate ? ` · 등록일 ${input.cdate}` : ''}`
            : 'CCTV의 실시간 영상 스트림 접속 정보를 등록합니다. (CCTV 1대당 스트림 1건)'
        }
        actions={
          <button type="button" className="btn btn_md btn_ghost" onClick={goBack}>
            ← 목록으로
          </button>
        }
      />

      <form onSubmit={send}>
        <div className="card card_pad_lg form_page">

          {/* CCTV번호 - "CCTV 확인"으로 CCTV명 미리보기 */}
          <div className="form_group">
            <label className="form_label" htmlFor="cno">
              CCTV번호<span className="req" title="필수 입력 요소">*</span>
            </label>
            <div className="form_control">
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  id="cno"
                  type="number"
                  className="form_input"
                  placeholder="예: 3"
                  value={input.cno ?? ''}
                  onChange={onChange}
                  onKeyDown={(e) => enter_chk(e, 'streamUrl')}
                  disabled={isEdit}
                  style={{ maxWidth: 160 }}
                />
                <button type="button" className="btn btn_sm btn_outline_primary" onClick={checkCctv} disabled={cctvCheck.loading}>
                  {cctvCheck.loading ? '확인 중...' : 'CCTV 확인'}
                </button>
              </div>
              {errors.cno && <div className="form_hint error">{errors.cno}</div>}
              {!errors.cno && cctvCheck.checked && (
                <div className="form_hint" style={{ color: cctvCheck.title ? 'var(--text)' : 'var(--danger, #e5484d)' }}>
                  {cctvCheck.title ? `CCTV명: ${cctvCheck.title}` : '해당 CCTV번호를 찾을 수 없습니다. 번호를 다시 확인해주세요.'}
                </div>
              )}
              {!errors.cno && !cctvCheck.checked && (
                <div className="form_hint">CCTV 목록(/dbms/cctv)에서 CCTV번호(No.)를 확인할 수 있습니다.</div>
              )}
            </div>
          </div>

          {/* 스트림 접속 주소 */}
          <div className="form_group">
            <label className="form_label" htmlFor="streamUrl">
              스트림 접속 주소<span className="req" title="필수 입력 요소">*</span>
            </label>
            <div className="form_control">
              <input
                id="streamUrl"
                className={`form_input mono ${errors.streamUrl ? 'is_error' : ''}`}
                placeholder="예: rtsp://192.168.0.10:554/stream1"
                value={input.streamUrl ?? ''}
                onChange={onChange}
                onKeyDown={(e) => enter_chk(e, 'port')}
              />
              {errors.streamUrl && <div className="form_hint error">{errors.streamUrl}</div>}
            </div>
          </div>

          {/* 프로토콜 / 포트 */}
          <div className="form_group">
            <label className="form_label" htmlFor="protocol">프로토콜</label>
            <div className="form_control">
              <div style={{ display: 'flex', gap: 8 }}>
                <select
                  id="protocol"
                  className="form_select"
                  value={input.protocol ?? 'RTSP'}
                  onChange={onChange}
                  style={{ maxWidth: 140 }}
                >
                  {PROTOCOL_OPTIONS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <input
                  id="port"
                  type="number"
                  className="form_input mono"
                  placeholder="포트 (예: 554)"
                  value={input.port ?? ''}
                  onChange={onChange}
                  style={{ maxWidth: 140 }}
                />
              </div>
            </div>
          </div>

          {/* 연결상태 - 등록 시점엔 보통 미연결(0), Jetson 워커가 접속 성공 시 갱신 */}
          <div className="form_group">
            <label className="form_label" htmlFor="connState">연결상태</label>
            <div className="form_control">
              <select
                id="connState"
                className="form_select"
                value={input.connState ?? 0}
                onChange={onChange}
                style={{ maxWidth: 160 }}
              >
                {Object.entries(CONN_STATE_LABELS).map(([state, label]) => (
                  <option key={state} value={state}>
                    {label}
                  </option>
                ))}
              </select>
              <div className="form_hint">실제 운영 중에는 Jetson 워커가 접속/재접속 성공 시 자동으로 갱신합니다.</div>
            </div>
          </div>

          {/* 스트림 삭제 - 수정 모드에서만 노출 */}
          {isEdit && (
            <div className="card card_pad_md danger" style={{ marginTop: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div className="b_title">스트림 삭제</div>
                  <div className="form_hint">삭제하면 해당 CCTV의 실시간 관제가 중단됩니다.</div>
                </div>
                <button
                  type="button"
                  className="btn btn_md btn_danger"
                  onClick={() => setDeleteOpen(true)}
                >
                  스트림 삭제
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
        targetLabel={`No.${no} · CCTV #${input.cno}`}
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
