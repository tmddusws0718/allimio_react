import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AdminToolbar, DataTable, PageHeader, DbmsPagination, ConfirmDeleteModal, type DataTableColumn } from '../../../components/ui';
import { axiosInstance } from '../../../utils/Tool.ts';
import {
  PAGE_SIZE,
  CONN_STATE_LABELS,
  CONN_STATE_BADGE,
  EMPTY_FILTERS,
  type CctvStreamSearchResult,
  type RowType,
  type Filters,
} from '../../../components/ts/CctvStream.ts';

// 파일이름 꼭 맞춰주세요
/* ---------------------------------------------------------------------
   CCTV 스트림 관리(/dbms/cctvstream) - 관리자 전용.

   CCTV_STREAM 컬럼: no/cno/streamUrl/protocol/port/connState/lastConnectedAt/cdate
   - CCTV(장비 메타데이터) 자체에는 스트림 접속 주소 컬럼이 없어서(cctv-ai-pipeline-design.md
     "확인/보완이 필요한 것" 1번) 이 화면에서 CCTV별 스트림 연결정보를 따로 등록/관리합니다.
   - CCTV 1대당 스트림 1건(cno UNIQUE). Jetson 워커가 접속/재접속에 성공할 때마다
     connState/lastConnectedAt이 갱신되는 걸 전제로 합니다(연결상태 모니터링 용도).

   API (CctvStreamCont, /cctv_stream)
   GET    /cctv_stream/search?cno=&connState=&keyword=&page=&size=  - 검색 + 페이징
   DELETE /cctv_stream/{pk}
--------------------------------------------------------------------- */

export default function CctvStreamListView() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // CCTV관리(CctvList.tsx)에서 "스트림" 버튼으로 들어오면 ?cno= 쿼리로 해당 CCTV만 미리 필터링
  const initialFilters: Filters = { ...EMPTY_FILTERS, cno: searchParams.get('cno') ?? '' };

  const [draft, setDraft] = useState<Filters>(initialFilters);
  const [applied, setApplied] = useState<Filters>(initialFilters);
  const [page, setPage] = useState(1);

  const [rows, setRows] = useState<RowType[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [deleteTarget, setDeleteTarget] = useState<RowType | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadList = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get<CctvStreamSearchResult>('/cctv_stream/search', {
        params: {
          page: page - 1,
          size: PAGE_SIZE,
          cno: applied.cno.trim() !== '' ? Number(applied.cno.trim()) : undefined,
          connState: applied.connState !== '' ? Number(applied.connState) : undefined,
          keyword: applied.keyword.trim() || undefined,
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
      console.error(err);
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
  }, [applied, page]);

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

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await axiosInstance.delete(`/cctv_stream/${deleteTarget.no}`);
      setDeleteTarget(null);
      if (rows.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        loadList();
      }
    } catch (err) {
      console.error(err);
      alert('삭제에 실패했습니다.\n다시 시도해주세요.');
    } finally {
      setDeleting(false);
    }
  };

  const columns: DataTableColumn<RowType>[] = [
    { header: '번호', width: '64px', mono: true, render: (r) => r.cnt },
    { header: 'CCTV번호', width: '90px', mono: true, render: (r) => `#${r.cno}` },
    {
      header: '스트림 주소',
      width: '28%',
      render: (r) => (
        <div>
          <div className="cell_title mono">{r.streamUrl || '(미등록)'}</div>
          <div className="cell_sub">{r.protocol}{r.port ? `:${r.port}` : ''}</div>
        </div>
      ),
    },
    {
      header: '연결상태',
      width: '100px',
      render: (r) => (
        <span className={`badge ${CONN_STATE_BADGE[r.connState ?? 0] ?? 'badge_neutral'}`}>
          {CONN_STATE_LABELS[r.connState ?? 0] ?? r.connState}
        </span>
      ),
    },
    { header: '최근 연결일시', width: '160px', mono: true, render: (r) => r.lastConnectedAt || '-' },
    { header: '등록일', width: '110px', mono: true, render: (r) => r.cdate },
  ];

  return (
    <section className="view active">
      <PageHeader
        title="CCTV 스트림 관리"
        description="CCTV별 실시간 영상 스트림 접속 정보와 연결상태입니다. Jetson 워커가 접속에 성공할 때마다 연결상태가 갱신됩니다."
        createLabel="+ 스트림 등록"
        onCreate={() => navigate('new')}
      />

      <AdminToolbar
        searchValue={draft.keyword}
        onSearchChange={(value) => setDraft((prev) => ({ ...prev, keyword: value }))}
        searchPlaceholder="스트림 주소로 검색"
        onSearchEnter={onSearch}
        filters={
          <>
            <input
              type="number"
              className="form_input"
              placeholder="CCTV번호"
              value={draft.cno}
              onChange={(e) => setDraft((prev) => ({ ...prev, cno: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSearch();
              }}
              style={{ maxWidth: 110 }}
              aria-label="CCTV번호 필터"
            />

            <select
              className="form_select"
              value={draft.connState}
              onChange={(e) => setDraft((prev) => ({ ...prev, connState: e.target.value }))}
              aria-label="연결상태 필터"
            >
              <option value="">연결상태 전체</option>
              {Object.entries(CONN_STATE_LABELS).map(([state, label]) => (
                <option key={state} value={state}>
                  {label}
                </option>
              ))}
            </select>
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
        rowKey={(r) => r.no ?? r.cnt}
        loading={loading}
        onEdit={(r) => navigate(`${r.no}/edit`)}
        onDelete={(r) => setDeleteTarget(r)}
        emptyMessage="등록된 스트림 연결정보가 없습니다."
      />

      <DbmsPagination page={page} totalPages={totalPages} totalCount={totalElements} pageSize={PAGE_SIZE} onChange={setPage} />

      <ConfirmDeleteModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        targetLabel={deleteTarget ? `No.${deleteTarget.no} · CCTV #${deleteTarget.cno}` : undefined}
        loading={deleting}
      />
    </section>
  );
}
