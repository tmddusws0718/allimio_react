import { useEffect, useState } from 'react';
import { GlobalStoreSession } from '../../../store/LoginStore';
import { axiosInstance, getAttachUrl } from '../../../utils/Tool';
import { useTab } from '../../../hooks/useTab';
import { usePaging } from '../../../hooks/usePaging';
import { Filterbar, UserPagination, PageHeader, DataAcc, DataCard } from '../../../components/ui';
import type { DataCardColumn, DataAccColumn } from '../../../components/ui';
import { EMPTY_FILTERS, PAGE_SIZE, QA_STATUS_MAP, QA_TYPE_MAP } from '../../../components/ts/QaType';
import type { Filters, QaSearchResult, QaTypes, TabKey } from '../../../components/ts/QaType';
import type { AttachType } from '../../../components/ts/Attach';

export default function QaList() {
  const { no:mno, id } = GlobalStoreSession();

  /* 탭 이동시 저장 설정 */
  // 범용 useTab 훅 사용 (URL Query Parameter 기반 탭 제어)
  const { tab, changeTab } = useTab<TabKey>({ defaultTab: 'qa' });
  const { page, setPage, navigateWithQuery } = usePaging({ basePath: '/user/qa' });

  // 탭 상태 조건 분기
  const isFaq = tab === 'faq';
  const isQaType = tab === 'qa' || tab === 'my'; // Q&A 카드로 표출할 탭 (전체 문의 or 내 문의)

  /* API 데이터 저장 */
  const [qaList, setQaList] = useState<QaTypes[]>([]);
  const [attachMap, setAttachMap] = useState<Record<number, AttachType[]>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState('');

  /* 필터바 설정 */
  // draft: 입력 중인 값 (타이핑만으로는 검색 안 됨) / applied: "검색" 눌렀을 때 실제 조회에 쓰이는 값
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
    
  /* 페이징 설정 */
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalElements, setTotalElements] = useState(0);

  /* 탭별 API 데이터 URL */
  const urlMap: Record<TabKey, string> = {
    my: `/qa/my/${mno}`,  // 내 문의
    qa: '/qa/list',   // 전체 문의
    faq: '/qa/faq',   // 자주 묻는 질문
  };

  const loadQaList = async () => {
    setLoading(true);
    try {
      const url = urlMap[tab];
      const res = await axiosInstance.get<QaSearchResult>(url, {
        params: {
          page: page - 1,
          size: PAGE_SIZE,
          word: applied.keyword.trim() || undefined,
          type: applied.type === '' ? undefined : Number(applied.type),
          status: isQaType && applied.state !== '' ? Number(applied.state) : undefined,
          mno: tab === 'qa' && applied.mno?.trim() !== '' ? Number(applied.mno?.trim()) : undefined,
        },
      });

      const { content, totalElements: total, totalPages: pages, page: serverPage, size } = res.data;

      // 삭제 등으로 인해 "지금 있는 페이지"에 데이터가 하나도 없는데 1페이지는 아닌 경우
      // (예: 2페이지 마지막 1건을 상세페이지에서 지우고 돌아온 경우) 한 페이지 앞으로 자동 보정합니다.
      // setPage가 바뀌면 이 useEffect가 page를 다시 의존성으로 갖고 있어서 알아서 재조회됩니다.
      if (content.length === 0 && page > 1) {
        setPage(page - 1);
        return;
      }

      // [가상 번호 생성] 전체 데이터 개수 기준 내림차순 순번(cnt) 계산하여 각 로우에 추가
      // 공식: 전체개수 - (현재페이지 * 페이지크기 + 인덱스)
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
  }, [tab, applied, page]);


  /* 첨부파일 목록 조회 */
  useEffect(() => {
    if (tab !== 'faq') return;
 
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
  }, [tab, qaList]);
 

  
  // [검색 버튼 클릭] 현재 작성 중인 draft 값을 applied로 확정짓고 1페이지로 이동
  const onSearch = () => {
    setPage(1);
    setApplied(draft);
  };

  // 필터 입력값(draft)/적용값(applied) 초기화. page는 여기서 안 건드림 — 필요한 곳에서 따로 처리
  const resetFilters = () => {
    const empty = { ...EMPTY_FILTERS };
    setDraft(empty);
    setApplied(empty);
  };

  // [초기화 버튼 클릭] 모든 필터 조건을 초기화하고 1페이지로 이동
  const onReset = () => {
    resetFilters();
    setPage(1);
  };

  // [탭 버튼 클릭] 필터 조건을 초기화. page 쿼리는 changeTab이 알아서 지워줘서(=1페이지로 리셋)
  // 여기서 또 setPage(1)을 부르면 changeTab의 URL 변경이랑 같은 틱에 두 번 겹쳐서
  // 서로 덮어쓰다가 탭 전환 자체가 씹히는 문제가 있었습니다 — 그래서 여기선 안 부릅니다.
  const handleTabChange = (next: TabKey) => {
    changeTab(next, resetFilters);
  };

  console.log(qaList)

  // ==========================================
  // DataCard / DataAcc 컬럼 정의
  // ==========================================
  const qaColumns: DataCardColumn<QaTypes>[] = [
    {
      header: '상태',
      render: (n) => (
        <div className='badge_area'>
          <span className={`badge ${QA_STATUS_MAP[n.status].className}`}>
            {QA_STATUS_MAP[n.status].label}
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
              <button className='link' onClick={() => navigateWithQuery(`${n.no}`)}>
                {n.title}
                {n.vmode === 'Y' ? 
                  (<span className='lock'>
                    <span className='hidden'>비밀글</span>
                  </span> ) : null
                }
              </button>
            </div>
            <div className="cell_sub">
              접수유형: {Object.entries(QA_TYPE_MAP).find(([type]) => Number(type) === n.type)?.[1].label ?? n.type} · {n.cdate.split(' ')[0]}
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

  const faqColumns: DataAccColumn<QaTypes>[] = [
    {
      header: 'A. 답변 내용',
      render: (n) => {
        const images = (attachMap[n.no] ?? []).filter((a) => a.type === 0);
 
        return (
          <>
            <div className="lt">
              <div className="cell_title">{n.answer}</div>
              {images.map((a) => (
                <div className='img_area' key={a.no}>
                  <img src={getAttachUrl(a.purl, a.sname)} alt={a.name} />
                </div>
              ))}
            </div>
 
            <div className="me a-r">
              <div className="cell_sub">{n.cdate}</div>
            </div>
          </>
        )
      }
    },
  ];

  return (
    <section className="view active">
      <PageHeader
        title="문의사항"
        description="자주 묻는 질문과 등록한 문의, 답변 상태를 확인할 수 있습니다."
        createLabel={isFaq ? undefined : '+ 문의 작성'}
        onCreate={() => navigateWithQuery('new')}
      />

      {/* 💡 탭 선택 버튼 3개 분기 */}
      <div className="tabs" role="tablist" aria-label="문의 보기 전환">
        {(['qa', 'my', 'faq'] as TabKey[]).map((tKey) => {
          const labels: Record<TabKey, string> = { qa: '전체 문의', my: '내 문의', faq: '자주 묻는 질문' };
          return (
            <button
              key={tKey}
              type="button"
              role="tab"
              className={`tab${tab === tKey ? ' on' : ''}`}
              aria-selected={tab === tKey}
              onClick={() => handleTabChange(tKey)}
            >
              {labels[tKey]}
            </button>
          );
        })}
      </div>

      <Filterbar
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={totalElements}
        searchValue={draft.keyword}
        onSearchChange={(value) => setDraft((prev) => ({ ...prev, keyword: value }))}
        onSearchEnter={onSearch}
        searchPlaceholder={isFaq ? 'FAQ 제목·답변으로 검색' : '제목으로 검색'}
        filters={
          <>
            {/* 접수 유형 필터 */}
            <select
              className="form_select"
              value={draft.type}
              onChange={(e) => setDraft((prev) => ({ ...prev, type: e.target.value }))}
              aria-label="접수 유형 필터"
              title='접수 유형 선택'
            >
              <option value="">유형 전체</option>
              {Object.entries(QA_TYPE_MAP).map(([type, {label}]) => (
                <option key={type} value={type}>
                  {label}
                </option>
              ))}
            </select>

            {/* 답변 상태 필터 (전체 문의 및 내 문의 탭) */}
            {isQaType && (
              <select
                className="form_select"
                value={draft.state}
                onChange={(e) => setDraft((prev) => ({ ...prev, state: e.target.value }))}
                aria-label="답변 상태 필터"
                title='답변 상태 선택'
              >
                <option value="">답변상태 전체</option>
                {Object.entries(QA_STATUS_MAP).map(([status, {label}]) => (
                  <option key={status} value={status}>
                    {label}
                  </option>
                ))}
              </select>
            )}
          </>
        }
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

      {/* 💡 isQaType (전체 문의/내 문의)인 경우 DataCard, FAQ인 경우 DataAcc 렌더링 */}
      {isQaType ? (
        <DataCard
           columns={qaColumns}
           data={qaList}
           rowKey={(n) => n.no}
           loading={loading}
           emptyMessage="등록된 문의가 없습니다."
         />
      ) : (
        <DataAcc
          title={(r) => (
            <>
            <span className='badge_area'>
              <span className={`badge ${QA_TYPE_MAP[r.type]?.className ?? ''}`}>
                {QA_TYPE_MAP[r.type]?.label ?? r.type}
              </span>{' '}
            </span>
              Q. {r.title}
            </>
          )}
          columns={faqColumns}
          data={qaList}
          rowKey={(r) => r.no}
          loading={loading}
          emptyMessage="등록된 FAQ가 없습니다."
          allowMultiple={false}
        />
      )}

      {/* 페이지네이션 컴포넌트 */}
      <UserPagination
        page={page}
        totalPages={totalPages}
        totalCount={totalElements}
        pageSize={PAGE_SIZE}
        onChange={setPage}
      />

    </section>
  );
}