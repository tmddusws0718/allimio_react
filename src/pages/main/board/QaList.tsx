import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePaging } from '../../../hooks/usePaging';
import { EMPTY_FILTERS, PAGE_SIZE, QA_STATUS_MAP, QA_TYPE_MAP, type Filters, type QaSearchResult, type QaTypes } from '../../../components/ts/QaType';
import type { AttachType } from '../../../components/ts/Attach';
import { axiosInstance } from '../../../utils/Tool';
import { DataCard, Filterbar, Modal, PageHeader, UserPagination, type DataCardColumn } from '../../../components/ui';

/* ---------------------------------------------------------------------
   비회원 문의 조회 (/board/qa/search) — 이메일/키워드로 본인 작성 문의
   목록을 검색합니다. 목록에서 비밀글(vmode='Y')을 클릭하면 Modal로
   비밀번호 입력을 먼저 받고, 확인되면 상세로 이동합니다. 비밀글이 아니면
   바로 상세로 이동합니다.

   비밀번호는 항상 POST 바디로만 전달합니다(GET 쿼리파라미터 전달 금지 —
   URL/서버 접근로그/브라우저 히스토리 노출 위험).

   API
   GET  /qa/guest/list?word=      → PageResponse<QaResponse>
   POST /qa/{no}/verify            → QaResponse (비밀번호 검증 겸 상세조회)
--------------------------------------------------------------------- */

export default function QaList() {
  const navigate = useNavigate();
  
  const { page, setPage, navigateWithQuery } = usePaging({ basePath: '/board/qa' });

  /* API 데이터 저장 */
  const [qaList, setQaList] = useState<QaTypes[]>([]);
  const [attachMap, setAttachMap] = useState<Record<number, AttachType[]>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState('');
  
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
  
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalElements, setTotalElements] = useState(0);


  // 비밀번호 확인 모달 상태
  const [pwTarget, setPwTarget] = useState<QaTypes | null>(null);
  const [pw, setPw] = useState('');
  const [checking, setChecking] = useState(false);
  const [pwError, setPwError] = useState('');

  const loadQaList = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get<QaSearchResult>('/qa/guest/list', {
        params: {
          page: page - 1,
          size: PAGE_SIZE,
          word: applied.keyword.trim() || undefined,
        },
      });

      const { content, totalElements: total, totalPages: pages, page: serverPage, size } = res.data;

      if (content.length === 0 && page > 1) {
        setPage(page - 1);
        return;
      }

      const withCnt: QaTypes[] = content.map((item, idx) => ({
        ...item,
        cnt: total - (serverPage * size + idx),
      }));

      setQaList(withCnt);
      setTotalElements(total);
      setTotalPages(Math.max(1, pages)); // 최소 1페이지 보장
      
    } catch (error) {
      console.error('목록 조회 실패:', error);
      
      setQaList([]);
      setTotalElements(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  /* Effect 및 이벤트 핸들러 */
  useEffect(() => {
    loadQaList();
  }, [applied, page]);

  /* 첨부파일 목록 조회 */
  useEffect(() => {
    if (!qaList) return;

    const targets = qaList.filter((n) => n.fileyn === 'Y');
    if (targets.length === 0) return;

    Promise.all(
      targets.map((n) =>
        axiosInstance
          .get<AttachType[]>(`/attach/list/${n.no}`)
          .then((res) => [n.no, res.data] as const)
          .catch((err) => {
            console.error(`첨부파일 조회 실패 (no:${n.no}):`, err);
            return [n.no, []] as const;
          }),
      ),
    ).then((results) => {
      setAttachMap(Object.fromEntries(results));
    });
  }, [qaList]);

  // 검색/초기화
  const onSearch = () => {
    setPage(1);
    setApplied(draft);
  };

  const resetFilters = () => {
    const empty = { ...EMPTY_FILTERS };
    setDraft(empty);
    setApplied(empty);
  };

  const onReset = () => {
    resetFilters();
    setPage(1);
  };

  const openPwModal = (item: QaTypes) => {
    setPwTarget(item);
    setPw('');
    setPwError('');
  };

  const closePwModal = () => setPwTarget(null);

  const handleClickItem = (item: QaTypes) => {
    if (item.vmode === 'Y') {
      openPwModal(item);
    } else {
      navigateWithQuery(`${item.no}`);
    }
  };

  const handleVerify = async () => {
    if (!pwTarget) return;
    if (!pw.trim()) {
      setPwError('비밀번호를 입력해주세요.');
      return;
    }
    setPwError('');
    setChecking(true);
    try {
      await axiosInstance.post(`/qa/${pwTarget.no}/verify`, { pw });
      navigate(`/board/qa/${pwTarget.no}`, { state: { pw } });
      setPwTarget(null);
    } catch (err) {
      console.error('비밀번호 확인 실패:', err);
      setPwError('비밀번호가 일치하지 않습니다.');
    } finally {
      setChecking(false);
    }
  };


  // DataCard 컬럼 정의
  const qaColumns: DataCardColumn<QaTypes>[] = [
    {
      header: '상태',
      render: (n) => (
        <div className="badge_area">
          <span className={`badge ${QA_STATUS_MAP[n.status]?.className}`}>
            {QA_STATUS_MAP[n.status]?.label}
          </span>
        </div>
      ),
    },
    {
      header: '제목 및 정보',
      render: (n) => (
        <>
          <div className="lt">
            <div className="cell_title">
              <button type="button" className="link" onClick={() => handleClickItem(n)}>
                {n.title}
                {n.vmode === 'Y' && (
                  <span className="lock">
                    <span className="hidden">비밀글</span>
                  </span>
                )}
              </button>
            </div>
            <div className="cell_sub">
              접수유형: {Object.entries(QA_TYPE_MAP).find(([type]) => Number(type) === n.type)?.[1].label ?? n.type} · {n.cdate?.split(' ')[0]}
            </div>
          </div>
          
          {n.fileyn !== 'Y' && (
            <div className="me">
              <div className='icon_row'>
                <div className='icon file'>
                  <span className='hidden'>첨부파일 포함</span>
                </div>
              </div>
            </div>
          )}

          <div className='me'>
            <div className="cell_sub">
              조회수 {n.vcnt}
            </div>
          </div>
        </>
      ),
    },
  ];

  return (
    <section className="view active">
      <PageHeader
        title="문의 조회"
        description="비회원 문의 작성 시 입력하신 이메일로 내역을 조회합니다."
        createLabel={'+ 비회원 문의 작성'}
        onCreate={() => navigateWithQuery('new')}
      />

      <Filterbar
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={totalElements}
        searchValue={draft.keyword}
        onSearchChange={(value) => setDraft((prev) => ({ ...prev, keyword: value }))}
        onSearchEnter={onSearch}
        searchPlaceholder="제목 · 이메일로 검색"
        extra={
          <>
            <button type="button" className="btn btn_ghost" onClick={onReset}>
              초기화
            </button>
            <button type="button" className="btn btn_primary" onClick={onSearch}>
              검색
            </button>
          </>
        }
      />

      <DataCard
        columns={qaColumns}
        data={qaList}
        rowKey={(n) => n.no}
        loading={loading}
        emptyMessage="등록된 문의가 없습니다."
      />

      {/* 페이지네이션 컴포넌트 */}
      <UserPagination
        page={page}
        totalPages={totalPages}
        totalCount={totalElements}
        pageSize={PAGE_SIZE}
        onChange={setPage}
      />



      <Modal
        open={pwTarget !== null}
        onClose={closePwModal}
        titleId="qaPwCheckTitle"
        title="비밀번호 확인"
        footer={
          <>
            <button type="button" className="btn btn_md btn_ghost" onClick={closePwModal}>
              취소
            </button>
            <button type="button" className="btn btn_md btn_primary" disabled={checking} onClick={handleVerify}>
              {checking ? '확인 중...' : '확인'}
            </button>
          </>
        }
      >
        <div>
          <p className="cell_sub" style={{ marginBottom: 14 }}>
            비밀글입니다. 작성 시 입력한 비밀번호를 입력해주세요.
          </p>
          <div className="form_group">
            <label className="form_label" htmlFor="qaPw">비밀번호</label>
            <div className="form_control">
              <input
                id="qaPw"
                type="password"
                className={`form_input ${pwError ? 'is_error' : ''}`}
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
              />
              {pwError && <div className="form_hint error">{pwError}</div>}
            </div>
          </div>
        </div>
      </Modal>
    </section>
  );
}