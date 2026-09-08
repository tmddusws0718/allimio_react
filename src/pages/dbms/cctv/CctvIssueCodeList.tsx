import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminToolbar, DataTable, PageHeader, DbmsPagination, ConfirmDeleteModal, type DataTableColumn } from '../../../components/ui';
import { axiosInstance } from '../../../utils/Tool.ts';
import { invalidateCctvIssueCodeCache } from '../../../hooks/useCctvIssueCodes.ts';
import {
  PAGE_SIZE,
  SEVERITY_LABELS,
  SEVERITY_BADGE,
  EMPTY_FILTERS,
  type CctvIssueCodeSearchResult,
  type RowType,
  type Filters,
} from '../../../components/ts/CctvIssueCode.ts';

// 파일이름 꼭 맞춰주세요
/* ---------------------------------------------------------------------
   이상행동유형코드 관리(/dbms/cctvissuecode) - 관리자 전용.

   CCTV_ISSUE_CODE 컬럼: code(PK)/codeName/description/severity/ord/useYn/cdate
   - CctvIssue.ts에 하드코딩돼 있던 01~05 매핑(CODE_LABELS)을 대체하는 실제 참조 테이블입니다.
     여기서 등록/수정/삭제한 내용이 dbms·user 양쪽 CCTV 이슈 목록 화면의 코드 라벨/필터
     드롭다운에 그대로 반영됩니다(useCctvIssueCodes 훅이 /cctv_issue_code/list를 조회).
   - 이미 CCTV_ISSUE에서 쓰이고 있는 코드는 삭제 대신 "사용여부(N)"로 바꾸는 걸 권장합니다.

   API (CctvIssueCodeCont, /cctv_issue_code)
   GET    /cctv_issue_code/search?useYn=&keyword=&page=&size=  - 검색 + 페이징
   DELETE /cctv_issue_code/{code}
--------------------------------------------------------------------- */

export default function CctvIssueCodeListView() {
  const navigate = useNavigate();

  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
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
      const res = await axiosInstance.get<CctvIssueCodeSearchResult>('/cctv_issue_code/search', {
        params: {
          page: page - 1,
          size: PAGE_SIZE,
          useYn: applied.useYn || undefined,
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
      await axiosInstance.delete(`/cctv_issue_code/${deleteTarget.code}`);
      invalidateCctvIssueCodeCache();
      setDeleteTarget(null);
      if (rows.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        loadList();
      }
    } catch (err) {
      console.error(err);
      alert('삭제에 실패했습니다.\n이미 CCTV 이슈에서 사용 중인 코드는 삭제 대신 사용여부를 N으로 바꿔주세요.');
    } finally {
      setDeleting(false);
    }
  };

  const columns: DataTableColumn<RowType>[] = [
    { header: '번호', width: '64px', mono: true, render: (r) => r.cnt },
    { header: '코드', width: '80px', mono: true, render: (r) => r.code },
    {
      header: '코드명',
      width: '18%',
      render: (r) => (
        <div>
          <div className="cell_title">{r.codeName}</div>
          <div className="cell_sub">정렬순서 {r.ord}</div>
        </div>
      ),
    },
    { header: '설명', width: '32%', render: (r) => r.description || '-' },
    {
      header: '심각도',
      width: '90px',
      render: (r) => (
        <span className={`badge ${SEVERITY_BADGE[r.severity] ?? 'badge_neutral'}`}>
          {SEVERITY_LABELS[r.severity] ?? r.severity}
        </span>
      ),
    },
    {
      header: '사용여부',
      width: '90px',
      render: (r) => (
        <span className={`badge ${r.useYn === 'Y' ? 'badge_success' : 'badge_neutral'}`}>
          {r.useYn === 'Y' ? '사용' : '미사용'}
        </span>
      ),
    },
    { header: '등록일', width: '110px', mono: true, render: (r) => r.cdate },
  ];

  return (
    <section className="view active">
      <PageHeader
        title="이상행동유형코드 관리"
        description="AI가 CCTV 이슈에 저장하는 문제유형코드(CODE) 참조 테이블입니다. 여기서 등록·수정한 코드가 CCTV 이슈 목록의 유형 라벨/필터에 바로 반영됩니다."
        createLabel="+ 코드 등록"
        onCreate={() => navigate('new')}
      />

      <AdminToolbar
        searchValue={draft.keyword}
        onSearchChange={(value) => setDraft((prev) => ({ ...prev, keyword: value }))}
        searchPlaceholder="코드·코드명으로 검색"
        onSearchEnter={onSearch}
        filters={
          <select
            className="form_select"
            value={draft.useYn}
            onChange={(e) => setDraft((prev) => ({ ...prev, useYn: e.target.value }))}
            aria-label="사용여부 필터"
          >
            <option value="">사용여부 전체</option>
            <option value="Y">사용</option>
            <option value="N">미사용</option>
          </select>
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
        rowKey={(r) => r.code}
        loading={loading}
        onEdit={(r) => navigate(`${r.code}/edit`)}
        onDelete={(r) => setDeleteTarget(r)}
        emptyMessage="등록된 이상행동유형코드가 없습니다."
      />

      <DbmsPagination page={page} totalPages={totalPages} totalCount={totalElements} pageSize={PAGE_SIZE} onChange={setPage} />

      <ConfirmDeleteModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        targetLabel={deleteTarget ? `${deleteTarget.code} · ${deleteTarget.codeName}` : undefined}
        loading={deleting}
      />
    </section>
  );
}
