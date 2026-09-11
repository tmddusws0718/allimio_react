import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { GlobalStoreSession } from '../../../store/LoginStore';
import axios from 'axios';
import { axiosInstance, getAttachUrl } from '../../../utils/Tool';
import { usePaging } from '../../../hooks/usePaging';
import { AlertModal, AttachViewer, ConfirmDeleteModal, PageHeader, PrevNextNav } from '../../../components/ui';
import { QA_STATUS_MAP, QA_TYPE_MAP, type QaTypes } from '../../../components/ts/QaType';
import type { AttachType } from '../../../components/ts/Attach';

export default function QaDetail() {
  const { no } = useParams<{ no: string }>(); // URL에서 no 추출
  const { no: mno, grade } = GlobalStoreSession(); // 현재 로그인한 회원 번호

  const { goToList, navigateWithQuery } = usePaging({ basePath: '/user/qa' });

  const [qa, setQa] = useState<QaTypes | null>(null);
  const [attach, setAttach] = useState<AttachType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 이전글 다음글
  const [navPosts, setNavPosts] = useState({
    prev: null,
    next: null
  });

  const [deleteTarget, setDeleteTarget] = useState<QaTypes | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [alert, setAlert] = useState<{ message: string; variant?: 'success' | 'error'; onConfirm?: () => void } | null>(null);

  
  /* 문의내용 상세 데이터 */
  const loadQa = () => {
    axiosInstance
      .get(`/qa/${no}`, {
        headers: {
          accessNo: String(mno),
          grade: String(grade),
        },
      })
      .then(res => res.data)
      .then((data) => {
        setQa(data);
        setNavPosts({
          prev : data.prev ?? null,
          next: data.next ?? null,
        })
        console.log(navPosts)

        loadAttachList()
      })
      .catch((err) => {
        console.error('문의사항 상세 조회 실패:', err);
        setError('문의사항 내용을 불러오지 못했습니다.');
      })
      .finally(() => setLoading(false));
  }


  useEffect(() => {
    if (!no) return;
    setLoading(true);
    setError(null);

    loadQa();

  }, [no, mno, grade]);

  

  /* 첨부파일 목록 조회 */
  const loadAttachList = () => {
    setLoading(true);
    axiosInstance.get<AttachType[]>(`/attach/list/${no}`)
      .then((result) => result.data)
      .then((data) => {
        setAttach(data);

      })
      .catch((err) => {
        console.error('첨부파일 목록 조회 실패:', err);
        setError('첨부파일을 불러오지 못했습니다.');
      })
      .finally(() => setLoading(false));
  };


  // 비밀번호 입력 후 삭제 실행
  const handleDeleteWithPw = async (inputPw: string = '') => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      await axiosInstance.delete('/qa', {
        data: { no: deleteTarget.no, pw: inputPw },
      });

      setAlert({ message: '삭제되었습니다.', variant: 'success', onConfirm: () => goToList() });
      setDeleteTarget(null);
    } catch (error) {
      console.error('삭제 실패:', error);
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const data = error.response?.data;

        if (status === 400 || status === 401) {
          setAlert({ message: '비밀번호가 올바르지 않거나 입력값이 잘못되었습니다.', variant: 'error' });
        } else if (status === 404) {
          setAlert({ message: '존재하지 않거나 이미 삭제된 항목입니다.', variant: 'error' });
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
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <section className="view active">
        <PageHeader title="문의사항 상세" description="내용을 불러오는 중입니다." />
      </section>
    );
  }

  if (error || !qa) {
    return (
      <section className="view active">
        <PageHeader
          title="문의사항 상세"
          description={error ?? '등록한 문의와 답변 내용을 확인할 수 있습니다.'}
          actions={
            <button type="button" className="btn btn_md btn_ghost" onClick={() => goToList()}>
              ← 목록으로
            </button>
          }
        />
        <div className="detail_area">
          <div className="card card_pad_lg">
            <div className="empty_row">해당 문의를 찾을 수 없거나 권한이 없습니다.</div>
          </div>
        </div>
      </section>
    );
  }

  // 답변 대기중이 아닌경우만
  const isWait = qa.status !== 0;
  const answered = qa.status === 2 && qa.answer;

  return (
    <section className="view active">
      <PageHeader
        title="문의사항 상세"
        description="등록한 문의와 답변 내용을 확인할 수 있습니다."
        actions={
          <button type="button" className="btn btn_md btn_ghost" onClick={() => goToList()}>
            ← 목록으로
          </button>
        }
      />

      <div className="detail_area">
        {/* 질문 영역 */}
        <div className="card card_pad_lg">
          <div className="card_header">
            <p className="b_title">No.{qa.no}</p>
            {qa.vmode === 'Y' && (
              <span className="badge neutral">
                <span className="lock" aria-hidden="true"></span> 비밀글
              </span>
            )}
          </div>

          <div className="badge_area">
            <span className={`badge ${QA_STATUS_MAP[qa.status].className}`}>{QA_STATUS_MAP[qa.status].label}</span>
            <span className={`badge ${QA_TYPE_MAP[qa.type].className}`}>{QA_TYPE_MAP[qa.type].label}</span>
          </div>

          <div className="title_area">
            <h3 className="title md">
              {qa.title} 
              {qa.fileyn === 'Y' && (
                <span className='icon file'>
                  <span className='hidden'>첨부파일 포함</span>
                </span>
              )}
            </h3>
            <p className="b_title">
              <span>작성자 : 
                {qa.mno !== null ? (
                  ` ${qa.id} (No.${qa.mno})`
                ):(' 비회원')}
              </span>
              <span className="right">
                {qa.cdate} | 조회수 {qa.vcnt}
              </span>
            </p>
          </div>

          <div className="card_contents">
            {qa.content}
          </div>
          
          {qa.fileyn === 'Y' && <AttachViewer bno={qa.no} onlyList={false} />}

          {/* 본인 글인 경우에만 수정/삭제 노출 */}
          {mno === qa.mno && (
            <div className="form_page_footer">
              <button type="button" className="btn btn_danger" onClick={() => setDeleteTarget(qa)}>
                삭제
              </button>
              {/* 답변대기인 경우에만 수정 버튼 노출 */}
              {!isWait && (
                <button
                  type="button"
                  className="btn btn_outline_primary"
                  onClick={() => navigateWithQuery('edit')}
                >
                  수정
                </button>
              )}
            </div>
          )}
        </div>

        {/* 답변 영역 */}
        <div className="card card_pad_lg">
          <h3 className="title sm">답변</h3>
          <div className="answer_area">
            {answered ? (
              <>
                <p className="cell_title">{qa.answer}</p>
                {qa.adate && <div className="cell_sub">답변일 · {qa.adate}</div>}
              </>
            ) : (
              <p className="cell_title">아직 답변이 등록되지 않았습니다.</p>
            )}
          </div>
        </div>
      </div>

      
      {/* 🔑 이전글 / 다음글 컴포넌트 연동 */}
      <PrevNextNav
        prev={navPosts.prev}
        next={navPosts.next}
        basePath="../qa"
      />



      {/* 비밀번호 입력 삭제 모달 */}
      <ConfirmDeleteModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={(pw) => handleDeleteWithPw(pw || '')}
        loading={deleting}
        targetLabel={deleteTarget ? `No.${deleteTarget.no} · ${deleteTarget.title}` : undefined}
        requirePassword={true}
        deleteWithAttach={deleteTarget?.no}
      />

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