import React, { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { AlertModal, AttachUploader, PageHeader, type AttachUploaderHandle } from '../../../components/ui';
import { axiosInstance, cutByByte, getByteLength, getNowDate, set_focus } from '../../../utils/Tool';
import { QA_TYPE_MAP, type QCRequest } from '../../../components/ts/QaType';
import { GlobalStoreSession } from '../../../store/LoginStore';
import { usePaging } from '../../../hooks/usePaging';
import { ATTACH_BOARD_LABEL } from '../../../components/ts/Attach';
import type { MyMemberInfo } from '../../../components/ts/MyPage';

/**
 * 
 * USER QaForm.tsx 에서는 본인의 문의사항만 CRUD 가능합니다.
 * 
 */

export default function QaForm() {
  const { no } = useParams<{ no: string }>(); // URL에 no가 있으면 수정 모드
  const { no: mno, grade } = GlobalStoreSession();
  const isEdit = Boolean(no);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [alert, setAlert] = useState<{ message: string; variant?: 'success' | 'error'; onConfirm?: () => void } | null>(null);

  /* 첨부파일 변경확인 */
  const attachRef = useRef<AttachUploaderHandle>(null);

  /* 에러타입 정의 */
  type FormErrors = Partial<Record<keyof QCRequest, string>>;
  const [errors, setErrors] = useState<FormErrors>({});

  const { goToList, navigateWithQuery } = usePaging({ basePath: '../qa' });

  // 뒤로 가기 (수정이면 상세로, 신규 작성이면 목록으로)
  const goBack = () => {
    if (isEdit) {
      navigateWithQuery(`../qa/${no}`);
    } else {
      goToList();
    }
  };

  const [input, setInput] = useState<QCRequest>({
    mno: mno,
    type: 0,
    title: '',
    content: '',
    cdate: '',
    pw: '',
    vmode: 'N',
    fileyn : 'N',
    guestEmail: ''
  });

  
  // 수정 모드일 때 기존 게시글 정보 조회
  const loadQaList = () => {
    axiosInstance
      .get(`/qa/${no}`, {
        headers: {
          accessNo: String(mno),
          grade: String(grade),
        },
      })
      .then((result) => result.data)
      .then((data) => {
        setInput((prev) => ({
          ...prev,
          mno: mno,
          type: data.type,
          title: data.title,
          content: data.content,
          vmode: data.vmode === 'Y' || data.vmode === true ? 'Y' : 'N',
          fileyn: data.fileyn === 'Y' || data.fileyn === true ? 'Y' : 'N'
        }));
      })
      .catch((err) => console.error('게시물 상세 조회 실패:', err));
  };

  useEffect(() => {
    if (!isEdit) return;
    loadQaList();
    
  }, [isEdit, no]);


  // 입력 필드 변경
  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let newValue = type === 'checkbox' ? ((e.target as HTMLInputElement).checked ? 'Y' : 'N') : value;

    // 제목(title) 입력 필드인 경우 200바이트 제한 적용
    if (name === 'title' && typeof newValue === 'string') {
      if (getByteLength(newValue) > 200) {
        // 200 바이트 넘어가면 자동으로 200바이트까지 잘라서 설정
        newValue = cutByByte(newValue, 200);
      }
    }
    
    setInput((prev) => ({ ...prev, [name]: newValue }));

    // 에러 해제
    if (name in errors) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  // 필수 필드 정의
  const REQUIRED_FIELDS: { field: keyof FormErrors; label: string; id: string }[] = [
    { field: 'title', label: '문의 제목', id: 'qa_title' },
    { field: 'content', label: '문의 내용', id: 'qa_content' },
    { field: 'pw', label: '게시글 비밀번호', id: 'password' },
    { field: 'guestEmail', label: '이메일', id: 'guestEmail' },
  ];

  // 유효성 검사: 필수 필드 전부 검사해서 전부 에러로 잡고, 포커스는 맨 첫 번째 오류 필드로만 이동
  const validate = () => {
    const newErrors: FormErrors = {};
    let firstErrorId: string | null = null;

    for (const { field, label, id } of REQUIRED_FIELDS) {
      if (field === 'guestEmail' && mno !== 0) {
        continue;
      }

      if (!String(input[field] ?? '').trim()) {
        newErrors[field] = `${label}을(를) 입력해주세요.`;
        if (!firstErrorId) firstErrorId = id;
      }
    }

    setErrors(newErrors);

    if (firstErrorId) {
      set_focus(firstErrorId);
      return false;
    }

    return true;
  };

  // 저장 (등록 / 수정)
  const send = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!validate() || submitting) return;

    setSubmitting(true);
    try {
      const payload: QCRequest = {
        mno: mno,
        type: Number(input.type),
        title: input.title,
        content: input.content,
        cdate: getNowDate(),
        pw: input.pw,
        vmode: input.vmode,
        fileyn: input.fileyn,
        guestEmail: input.guestEmail
      };

      if (isEdit) {
        await axiosInstance.put(`/qa/${no}`, payload);
        // 수정: 이미 있는 bno로, 그동안 담아둔 업로드/삭제 예정 파일들을 실제로 반영
        if (attachRef.current?.hasPendingChanges()) {
          try {
            await attachRef.current.commit();
          } catch (attachErr) {
            console.error('첨부파일 반영 실패 (글은 정상 저장됨):', attachErr);
          }
        }
      } else {
        const res = await axiosInstance.post('/qa', payload);
        const newNo = res.data;

        if (newNo && attachRef.current?.hasPendingChanges()) {
          try {
            await attachRef.current.commit(Number(newNo));
          } catch (attachErr) {
            console.error('첨부파일 반영 실패 (글은 정상 저장됨):', attachErr);
          }
        }
      }

      setAlert({
        message: isEdit ? '문의사항이 수정되었습니다.' : '문의사항이 등록되었습니다.',
        variant: 'success',
        onConfirm: goBack,
      });
    } catch (error) {
      console.error('문의사항 저장 중 오류 발생:', error);

      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const data = error.response?.data;

        if (status === 400 || status === 401) {
          setAlert({ message: '입력값을 확인하거나 비밀번호를 다시 확인해주세요.', variant: 'error' });
        } else if (status === 404) {
          setAlert({ message: '존재하지 않거나 이미 삭제된 게시글입니다.', variant: 'error' });
        } else if (status === 500) {
          if (data?.message?.includes('비밀번호') || data?.message?.includes('password')) {
            setAlert({ message: '비밀번호가 일치하지 않습니다.', variant: 'error' });
          } else {
            setAlert({ message: '서버 내부 오류가 발생했습니다. 관리자에게 문의하세요.', variant: 'error' });
          }
        } else {
          setAlert({ message: `오류가 발생했습니다. (에러 코드: ${status || 'Unknown'})`, variant: 'error' });
        }
      } else {
        setAlert({ message: '알 수 없는 오류가 발생했습니다.', variant: 'error' });
      }
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <section className="view active">
      <PageHeader
        title={isEdit ? '문의 수정' : '문의 작성'}
        description={
          isEdit
            ? `No.${no} 문의사항 항목을 수정합니다.`
            : '서비스 이용에 문의할 내용을 등록합니다.'
        }
        actions={
          <button type="button" className="btn btn_md btn_ghost" onClick={() => goToList()}>
            ← 목록으로
          </button>
        }
      />

      <form onSubmit={send}  encType="multipart/form-data">
        <div className="card card_pad_lg form_page">
          {/* 문의 유형 */}
          <div className="form_group">
            <label className="form_label" htmlFor="qa_type">
              문의 유형<span className="req" title="필수 입력 요소">*</span>
            </label>
            <div className="form_control">
              <select
                id="qa_type"
                name="type"
                className="form_select"
                value={input.type}
                onChange={onChange}
                style={{ maxWidth: 200 }}
              >
                {Object.entries(QA_TYPE_MAP).map(([type, {label}]) => (
                  <option key={type} value={type}>
                    {label}
                  </option>
                ))}
              </select>
              <div className="form_hint">유형을 선택하지 않을 경우 기타유형으로 등록됩니다.</div>
            </div>
          </div>

          {/* 이메일 (비회원용) */}
          {(mno == null || mno == 0) &&(
            <div className="form_group">
              <label className="form_label" htmlFor="guestEmail">
                이메일<span className="req" title="필수 입력 요소">*</span>
              </label>
              <div className="form_control">
                <input
                  type="text"
                  id="guestEmail"
                  className={`form_input ${errors.guestEmail ? 'is_error' : ''}`}
                  placeholder="이메일을 입력하세요"
                  name="guestEmail"
                  value={input.guestEmail}
                  onChange={onChange}
                />
                {errors.guestEmail && <div className="form_hint error">{errors.guestEmail}</div>}
              </div>
            </div>
          )}

          {/* 문의 제목 */}
          <div className="form_group">
            <label className="form_label" htmlFor="qa_title">
              문의 제목<span className="req" title="필수 입력 요소">*</span>
            </label>
            <div className="form_control">
              <input
                type="text"
                id="qa_title"
                className={`form_input ${errors.title ? 'is_error' : ''}`}
                placeholder="문의사항 제목을 입력하세요"
                name="title"
                value={input.title}
                onChange={onChange}
              />
              {errors.title && <div className="form_hint error">{errors.title}</div>}
            </div>
          </div>

          {/* 문의 내용 */}
          <div className="form_group">
            <label className="form_label" htmlFor="qa_content">
              문의 내용<span className="req" title="필수 입력 요소">*</span>
            </label>
            <div className="form_control">
              <textarea
                id="qa_content"
                className={`form_textarea ${errors.content ? 'is_error' : ''}`}
                placeholder="문의사항 내용을 입력하세요"
                value={input.content}
                name="content"
                onChange={onChange}
                style={{ minHeight: 220 }}
              />
              {errors.content ? (
                <div className="form_hint error">{errors.content}</div>
              ) : (
                <div className="form_hint">등록 후에도 내 문의 목록에서 수정할 수 있습니다.</div>
              )}
            </div>
          </div>

          
        
        {/* 파일영역 */}
        <AttachUploader 
            ref={attachRef} 
            tname={ATTACH_BOARD_LABEL[0].table} 
            bno={isEdit ? Number(no) : undefined}
            onCountChange={(count) => {
              setInput((prev) => ({ ...prev, fileyn: count > 0 ? 'Y' : 'N' }))
            }}
        />

          {/* 비밀글 설정 */}
          <div className="form_group">
            <div className="form_label">비밀글 여부</div>
            <div className="form_control">
              <div className="form_check">
                <input
                  type="checkbox"
                  id="label_08"
                  name="vmode"
                  checked={input.vmode === 'Y'}
                  onChange={onChange}
                />
                <label htmlFor="label_08" className="b_title">
                  비밀글 설정
                </label>
              </div>
              <div className="form_hint">비밀글 미설정시 전체공개됩니다.</div>
            </div>
          </div>

          {/* 게시글 비밀번호 */}
          <div className="form_group">
            <label className="form_label" htmlFor="password">
              게시글 비밀번호<span className="req" title="필수 입력 요소">*</span>
            </label>
            <div className="form_control">
              <input
                type="password"
                id="password"
                name="pw"
                className={`form_input ${errors.pw ? 'is_error' : ''}`}
                value={input.pw}
                onChange={onChange}
                style={{ maxWidth: 200 }}
              />
              {errors.pw && <div className="form_hint error">{errors.pw}</div>}
            </div>
          </div>

          {/* 푸터 버튼 */}
          <div className="form_page_footer">
            <button type="button" className="btn btn_md btn_ghost" onClick={goBack}>
              취소
            </button>
            <button
              type="submit"
              className="btn btn_md btn_primary"
              disabled={submitting}
            >
              {submitting ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </form>

      {/* 안내 알림 모달 */}
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