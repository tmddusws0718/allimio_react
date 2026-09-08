import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader, DataTable, UserPagination, AlertModal, AttachUploader, type AttachUploaderHandle, type DataTableColumn } from '../../../components/ui/index.ts';
import Filterbar from '../../../components/ui/user/Filterbar.tsx';
import { axiosInstance, getNowDate } from '../../../utils/Tool.ts';
import { useCctvIssueCodes } from '../../../hooks/useCctvIssueCodes.ts';
import {
  PAGE_SIZE,
  STATE_LABELS,
  STATE_BADGE,
  EMPTY_FILTERS,
  formatReliability,
  type CctvIssueSearchResult,
  type CctvIssueType,
  type RowType,
  type Filters,
} from '../../../components/ts/CctvIssue.ts';
import { ATTACH_BOARD_LABEL } from '../../../components/ts/Attach.ts';
import { GlobalStoreSession } from '../../../store/LoginStore.ts';
import { GlobalCurrentShop } from '../../../store/UserStore.ts';

// 파일이름 꼭 맞춰주세요
/* ---------------------------------------------------------------------
   CCTV 이슈 내역(/user/cctvissue) - Topbar에서 입장한 매장(GlobalCurrentShop().no)
   소유 CCTV에서 발생한 AI 이상행동 감지 이슈만 노출합니다.
   /user/cctv(CCTV 목록, 조회 전용)에서 특정 CCTV를 클릭해 ?cno= 쿼리로 들어오면
   해당 CCTV 이슈만 미리 필터링해서 보여줍니다("타고 들어가서 상황 처리 확인" 흐름).

   화면 디자인은 대시보드 목업(user/dashboard/Test2.tsx + EventDetailPanel)을 그대로 가져오되,
   실제 CCTV_ISSUE 테이블 데이터를 붙였습니다(목업의 카메라명/EventStatus 등 가상 필드는 없음).

   CCTV_ISSUE 컬럼: no/cno/mno/code/state/comnet/reliability/pdate/noticeyn/cdate
   - cno(CCTV번호)만 있고 매장 컬럼이 없어서, 서버(searchByShop)에서 CNO가 속한 CCTV의
     SNO로 서브쿼리 필터링해 매장별로 걸러줍니다.

   API (CctvIssueCont, /cctv_issue)
   GET  /cctv_issue/search?sno=&cno=&code=&state=&noticeyn=&keyword=&cdateFrom=&cdateTo=&page=&size=
     → { content, totalElements, totalPages, page(0-base), size } (sno 넘기면 매장 필터링, searchByShop)
   PUT  /cctv_issue/update  (오탐/정탐 처리 - state/mno/pdate 갱신)

   상수/타입(PAGE_SIZE, STATE_LABELS, STATE_BADGE, RowType, Filters, EMPTY_FILTERS)은
   dbms 쪽과 동일하게 ./components/ts/CctvIssue.ts 걸 그대로 재사용합니다. 문제유형코드(CODE)
   라벨은 CCTV_ISSUE_CODE 테이블 기준으로 useCctvIssueCodes 훅에서 가져옵니다.
--------------------------------------------------------------------- */

export default function CctvIssueListView() {
  const { codes, codeLabel } = useCctvIssueCodes();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const cnoParam = searchParams.get('cno');

  const { no: mno } = GlobalStoreSession();
  const shopNo = GlobalCurrentShop((state) => state.no);
  const shopTitle = GlobalCurrentShop((state) => state.title);

  // /user/cctv 목록에서 특정 CCTV를 클릭해 들어온 경우, ?cno= 쿼리로 해당 CCTV의
  // 이슈만 미리 필터링합니다(cno 입력창은 따로 없고, CCTV 목록에서 타고 들어올 때만 적용).
  const initialFilters: Filters = { ...EMPTY_FILTERS, cno: cnoParam ?? '' };

  // draft: 입력 중인 값 (타이핑만으로는 검색 안 됨) / applied: "검색" 눌렀을 때 실제 조회에 쓰이는 값
  const [draft, setDraft] = useState<Filters>(initialFilters);
  const [applied, setApplied] = useState<Filters>(initialFilters);
  const [page, setPage] = useState(1); // 화면 표시는 1부터, 서버는 0부터

  const [rows, setRows] = useState<RowType[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // "보기" 클릭 시 열리는 상세 패널 대상 (닫힘 트랜지션 중에도 내용 유지)
  const [detail, setDetail] = useState<RowType | null>(null);
  const [renderDetail, setRenderDetail] = useState<RowType | null>(null);
  const [processing, setProcessing] = useState(false);

  // 증빙 첨부파일(사진/영수증 등) - 이미 저장된 이슈(no)에 바로 업로드/삭제 반영
  const attachRef = useRef<AttachUploaderHandle>(null);
  const [attachSaving, setAttachSaving] = useState(false);

  const [alert, setAlert] = useState<{ message: string; variant?: 'success' | 'error' } | null>(null);

  const loadList = async () => {
    if (!shopNo) {
      setRows([]);
      setTotalElements(0);
      setTotalPages(1);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await axiosInstance.get<CctvIssueSearchResult>('/cctv_issue/search', {
        params: {
          sno: shopNo,
          page: page - 1,
          size: PAGE_SIZE,
          cno: applied.cno.trim() !== '' ? Number(applied.cno.trim()) : undefined,
          code: applied.code || undefined,
          state: applied.state !== '' ? Number(applied.state) : undefined,
          noticeyn: applied.noticeyn || undefined,
          keyword: applied.keyword.trim() || undefined,
          cdateFrom: applied.dateFrom || undefined,
          cdateTo: applied.dateTo || undefined,
        },
      });

      const { content, totalElements: total, totalPages: pages, page: serverPage, size } = res.data;

      const withCnt: RowType[] = content.map((item, idx) => ({
        ...item,
        cnt: total - (serverPage * size + idx),
      }));

      setRows(withCnt);
      setTotalElements(total);
      setTotalPages(Math.max(1, pages));
    } catch (err) {
      console.error('CCTV 이슈 목록 조회 실패:', err);
      setRows([]);
      setTotalElements(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopNo, applied, page]);

  useEffect(() => {
    if (detail) setRenderDetail(detail);
  }, [detail]);

  const onSearch = () => {
    setPage(1);
    setApplied(draft);
  };

  const onReset = () => {
    const empty = { ...EMPTY_FILTERS };
    setDraft(empty);
    setPage(1);
    setApplied(empty);
  };

  const from = totalElements === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, totalElements);

  // 오탐/정탐 처리: state + 처리담당자(mno, 현재 로그인 회원) + 처리일시(pdate) 갱신
  const handleProcess = async (row: RowType, newState: number) => {
    setProcessing(true);
    try {
      const dto: CctvIssueType = {
        ...row,
        state: newState,
        mno: mno ?? row.mno,
        pdate: getNowDate(),
      };

      const res = await axiosInstance.put<CctvIssueType>('/cctv_issue/update', dto);
      const updated = res.data;

      setRows((prev) => prev.map((r) => (r.no === updated.no ? { ...r, ...updated, cnt: r.cnt } : r)));
      setDetail((prev) => (prev && prev.no === updated.no ? { ...prev, ...updated, cnt: prev.cnt } : prev));
      setAlert({ message: '처리 결과가 저장되었습니다.', variant: 'success' });
    } catch (err) {
      console.error('CCTV 이슈 처리 실패:', err);
      setAlert({ message: '처리에 실패했습니다.\n다시 시도해주세요.', variant: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  // 증빙 첨부파일 저장 (업로드/삭제 예정 파일들을 실제 서버에 반영)
  const handleAttachSave = async () => {
    if (!renderDetail || attachSaving) return;
    if (!attachRef.current?.hasPendingChanges()) return;

    setAttachSaving(true);
    try {
      await attachRef.current.commit(renderDetail.no);
      setAlert({ message: '증빙 첨부파일이 저장되었습니다.', variant: 'success' });
    } catch (err) {
      console.error('증빙 첨부파일 저장 실패:', err);
      setAlert({ message: '첨부파일 저장에 실패했습니다.\n다시 시도해주세요.', variant: 'error' });
    } finally {
      setAttachSaving(false);
    }
  };

  /* ---- 매장 미선택 시 안내 ---- */
  if (!shopNo) {
    return (
      <section className="view active cctv-issue-page">
        <PageHeader title="CCTV 이슈 내역" description="매장을 선택하면 해당 매장의 CCTV 이슈 내역을 확인할 수 있습니다." />
        <div
          className="card card_pad_lg"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
            padding: '60px 20px',
            textAlign: 'center',
            color: 'var(--text-faint)',
          }}
        >
          <p className="b_title">먼저 관리할 매장을 선택해주세요.</p>
          <button type="button" className="btn btn_md btn_primary" onClick={() => navigate('/user/shop')}>
            매장 선택하러 가기
          </button>
        </div>
      </section>
    );
  }

  const columns: DataTableColumn<RowType>[] = [
    { header: '번호', width: '64px', mono: true, render: (r) => r.cnt },
    {
      header: '발생일시',
      width: '16%',
      mono: true,
      render: (r) => (
        <span style={{ cursor: 'pointer' }} onClick={() => setDetail(r)}>
          {r.cdate}
        </span>
      ),
    },
    { header: 'CCTV', width: '8%', mono: true, render: (r) => `#${r.cno}` },
    {
      header: '유형',
      width: '12%',
      render: (r) => <span className="badge badge_info">{codeLabel(r.code)}</span>,
    },
    {
      header: '상황설명',
      width: '24%',
      render: (r) => (
        <span title={r.comnet ?? ''}>
          {r.comnet ? (r.comnet.length > 30 ? `${r.comnet.slice(0, 30)}…` : r.comnet) : '-'}
        </span>
      ),
    },
    {
      header: '오탐여부',
      width: '10%',
      render: (r) => (
        <span className={`badge ${STATE_BADGE[r.state] ?? 'badge_neutral'}`}>{STATE_LABELS[r.state] ?? r.state}</span>
      ),
    },
    {
      header: '첨부',
      width: '7%',
      render: (r) =>
        r.hasAttach ? (
          <span className="badge badge_info" title="증빙 첨부파일 있음">
            📎
          </span>
        ) : (
          <span className="cell_sub">-</span>
        ),
    },
    { header: '신뢰도', width: '9%', mono: true, render: (r) => formatReliability(r.reliability) },
    {
      header: '발송여부',
      width: '10%',
      render: (r) => (
        <span className={`badge ${r.noticeyn === 'Y' ? 'badge_success' : 'badge_neutral'}`}>
          {r.noticeyn === 'Y' ? '발송완료' : '미발송'}
        </span>
      ),
    },
  ];

  return (
    <section className="view active cctv-issue-page">
      <PageHeader
        title="CCTV 이슈 내역"
        description={`${shopTitle || '선택한 매장'}의 CCTV에서 감지된 이상행동 이슈입니다. AI가 감지한 폭행·기물파손·쓰러짐·무단침입·장시간체류 이벤트를 확인하고 처리할 수 있습니다.`}
        actions={
          <button type="button" className="btn btn_md btn_ghost" onClick={() => navigate('/user/cctv')}>
            ← CCTV 목록으로
          </button>
        }
      />

      {applied.cno && (
        <div
          className="card card_pad_md"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}
        >
          <span className="b_title" style={{ margin: 0 }}>
            CCTV <b className="mono">#{applied.cno}</b>에서 발생한 이슈만 표시 중입니다.
          </span>
          <button
            type="button"
            className="btn btn_sm btn_outline_primary"
            onClick={() => {
              const empty = { ...EMPTY_FILTERS };
              setDraft(empty);
              setPage(1);
              setApplied(empty);
            }}
          >
            전체 CCTV 이슈 보기
          </button>
        </div>
      )}

      <Filterbar
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={totalElements}
        searchValue={draft.keyword}
        onSearchChange={(value) => setDraft((prev) => ({ ...prev, keyword: value }))}
        searchPlaceholder="상황설명으로 검색"
        onSearchEnter={onSearch}
        filters={
          <>
            <select
              className="form_select"
              value={draft.code}
              onChange={(e) => setDraft((prev) => ({ ...prev, code: e.target.value }))}
              aria-label="유형 필터"
            >
              <option value="">전체 유형</option>
              {codes.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.codeName}
                </option>
              ))}
            </select>

            <select
              className="form_select"
              value={draft.state}
              onChange={(e) => setDraft((prev) => ({ ...prev, state: e.target.value }))}
              aria-label="오탐여부 필터"
            >
              <option value="">전체 상태</option>
              {Object.entries(STATE_LABELS).map(([state, label]) => (
                <option key={state} value={state}>
                  {label}
                </option>
              ))}
            </select>

            <select
              className="form_select"
              value={draft.noticeyn}
              onChange={(e) => setDraft((prev) => ({ ...prev, noticeyn: e.target.value }))}
              aria-label="발송여부 필터"
            >
              <option value="">발송여부 전체</option>
              <option value="Y">발송완료</option>
              <option value="N">미발송</option>
            </select>

            <input
              type="date"
              className="form_input"
              value={draft.dateFrom}
              onChange={(e) => setDraft((prev) => ({ ...prev, dateFrom: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSearch();
              }}
              aria-label="발생일 시작"
            />
            <span style={{ alignSelf: 'center' }}>~</span>
            <input
              type="date"
              className="form_input"
              value={draft.dateTo}
              onChange={(e) => setDraft((prev) => ({ ...prev, dateTo: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSearch();
              }}
              aria-label="발생일 종료"
            />
          </>
        }
        extra={
          <>
            <button type="button" className="btn btn_primary" onClick={onSearch}>
              검색
            </button>
            <button type="button" className="btn btn_outline_primary" onClick={onReset}>
              초기화
            </button>
          </>
        }
      />

      <DataTable<RowType>
        columns={columns}
        data={rows}
        rowKey={(r) => r.no}
        loading={loading}
        onEdit={(r) => setDetail(r)}
        editLabel="보기"
        emptyMessage="조건에 맞는 CCTV 이슈가 없습니다."
      />

      <UserPagination
        page={page}
        totalPages={totalPages}
        totalCount={totalElements}
        pageSize={PAGE_SIZE}
        onChange={setPage}
        showInfo={false}
      />

      {/* ---- 이슈 상세 패널 (EventDetailPanel.tsx 목업 디자인 재사용, 실데이터 버전) ---- */}
      <div className={`overlay_bg${detail ? ' open' : ''}`} onClick={() => setDetail(null)} />
      <div
        className={`detail_panel${detail ? ' open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cctvIssueDetailTitle"
      >
        {renderDetail && (
          <>
            <div className="detail_head">
              <h2 id="cctvIssueDetailTitle">CCTV 이슈 상세</h2>
              <button className="close_btn" onClick={() => setDetail(null)} aria-label="이슈 상세 닫기">
                ✕
              </button>
            </div>
            <div className="detail_body">
              <div className="conf_box">
                <div
                  className="conf_ring"
                  style={{
                    background: 'var(--surface-2)',
                    border: '2px solid var(--border-strong)',
                    color: 'var(--text)',
                  }}
                >
                  {formatReliability(renderDetail.reliability)}
                </div>
                <div>
                  <div className="clabel">AI 감지 신뢰도</div>
                  <div className="ctype">{codeLabel(renderDetail.code)}</div>
                </div>
              </div>

              <div className="detail_info_grid">
                <div className="info_cell">
                  <div className="k">발생 일시</div>
                  <div className="v">{renderDetail.cdate}</div>
                </div>
                <div className="info_cell">
                  <div className="k">CCTV 번호</div>
                  <div className="v">#{renderDetail.cno}</div>
                </div>
                <div className="info_cell">
                  <div className="k">오탐여부</div>
                  <div className="v">
                    <span className={`badge ${STATE_BADGE[renderDetail.state] ?? 'badge_neutral'}`}>
                      {STATE_LABELS[renderDetail.state] ?? renderDetail.state}
                    </span>
                  </div>
                </div>
                <div className="info_cell">
                  <div className="k">발송여부</div>
                  <div className="v">
                    <span className={`badge ${renderDetail.noticeyn === 'Y' ? 'badge_success' : 'badge_neutral'}`}>
                      {renderDetail.noticeyn === 'Y' ? '발송완료' : '미발송'}
                    </span>
                  </div>
                </div>
              </div>

              <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 18, lineHeight: 1.6 }}>
                {renderDetail.comnet || '등록된 상황설명이 없습니다.'}
              </p>

              {/* 증빙 첨부파일 - 현장 사진/영수증 등을 매장에서 직접 등록, 관리자는 dbms에서 확인 */}
              <AttachUploader
                key={renderDetail.no}
                ref={attachRef}
                tname={ATTACH_BOARD_LABEL[2].table}
                bno={renderDetail.no}
                description="현장 사진 · 영수증 등 증빙 파일 (최대 10MB)"
              />
              <div className="form_page_footer" style={{ marginTop: -8, marginBottom: 18 }}>
                <button
                  type="button"
                  className="btn btn_sm btn_outline_primary"
                  disabled={attachSaving}
                  onClick={handleAttachSave}
                >
                  {attachSaving ? '첨부파일 저장 중...' : '첨부파일 저장'}
                </button>
              </div>

              <div className="detail_info_grid">
                <div className="info_cell">
                  <div className="k">처리담당자</div>
                  <div className="v">{renderDetail.mno ? `#${renderDetail.mno}` : '미배정'}</div>
                </div>
                <div className="info_cell">
                  <div className="k">처리일시</div>
                  <div className="v">{renderDetail.pdate || '미처리'}</div>
                </div>
              </div>

              <div className="detail_actions">
                {/* 현재 오탐여부(state) 값과 상관없이 항상 눌러서 재처리할 수 있습니다.
                    (예: 이미 '정탐'으로 처리된 건도 다시 '오탐'으로, 그 반대도 가능) */}
                <button
                  className="btn btn_ghost"
                  disabled={processing}
                  onClick={() => handleProcess(renderDetail, 2)}
                >
                  오탐 처리
                </button>
                <button
                  className="btn btn_primary"
                  disabled={processing}
                  onClick={() => handleProcess(renderDetail, 1)}
                >
                  정탐 확인
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <AlertModal
        open={alert !== null}
        onClose={() => setAlert(null)}
        message={alert?.message ?? ''}
        variant={alert?.variant}
      />
    </section>
  );
}
