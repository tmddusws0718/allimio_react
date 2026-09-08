import { useParams } from "react-router-dom";
import { GlobalStoreSession } from "../../../store/LoginStore";
import { usePaging } from "../../../hooks/usePaging";
import { useEffect, useState } from "react";
import { EMPTY_FILTERS, LOG_ACTION_MAP, PAGE_SIZE, type Filters, type LogSearchResult, type RowType } from "../../../components/ts/ShopOrderLog";
import { axiosInstance } from "../../../utils/Tool";
import { DataTable, Filterbar, UserPagination, type DataTableColumn } from "../../../components/ui";


export default function ShopOrderLog() {
  const { no: mno } = GlobalStoreSession();
  const { ono } = useParams<{ ono: string }>();
  const url = location.pathname.includes('/order') ? 'order' : 'shoporder';

  const { page, setPage, navigateWithQuery } = usePaging({ basePath: `/user/${url}/${ono}/history` });

  const [logs, setLogs] = useState<RowType[]>([]);
  const [loading, setLoading] = useState(true);

  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);

  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalElements, setTotalElements] = useState(0);

  const loadLogs = async () => {
    if (!ono) return;
    setLoading(true);

    try {
      const res = await axiosInstance.get<LogSearchResult>(`/shop_order_log/${mno}/${ono}`, {
        params: {
          page: page - 1,
          size: PAGE_SIZE,
          action: applied.action === '' ? undefined : Number(applied.action),
          dateFrom: applied.dateFrom || undefined,
          dateTo: applied.dateTo || undefined,
        },
      });

      const { content, totalElements: total, totalPages: pages, page: serverPage, size } = res.data;

      if (content.length === 0 && page > 1) {
        setPage(page - 1);
        return;
      }

      const withCnt: RowType[] = content.map((item, idx) => ({
        ...item,
        cnt: total - (serverPage * size + idx),
      }));

      setLogs(withCnt);
      setTotalElements(total);
      setTotalPages(Math.max(1, pages));

    } catch (error) {
      console.error('결제 내역 조회 실패:', error);
      setLogs([]);
      setTotalElements(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mno, ono, applied, page]);

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

  const columns: DataTableColumn<RowType>[] = [
    { header: '번호', width: '64px', mono: true, render: (l) => l.cnt },
    {
      header: '구분',
      width: '90px',
      render: (l) => (
        <span className={`badge ${LOG_ACTION_MAP[l.action].className}`}>{LOG_ACTION_MAP[l.action].label}</span>
      ),
    },
    { header: '발생일시', width: '20%', mono: true, render: (l) => l.cdate },
    {
      header: '기간 변경',
      width: '20%',
      mono: true,
      render: (l) =>
        l.beforeEdate && l.afterEdate ? (
          `${l.beforeEdate} → ${l.afterEdate}`
        ) : l.afterEdate ? (
          `~ ${l.afterEdate}`
        ) : (
          <span className="cell_sub">-</span>
        ),
    },
    {
      header: '금액(원)',
      width: '110px',
      mono: true,
      render: (l) => (l.amount != null ? `${l.amount.toLocaleString('ko-KR')}` : <span className="cell_sub">-</span>),
    },
    { header: '내용', render: (l) => l.memo ?? <span className="cell_sub">-</span> },
  ];

  console.log(logs)
  return (
    <>
      <Filterbar
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={totalElements}
        filters={
          <>
            <select
              className="form_select"
              value={draft.action}
              onChange={(e) => setDraft((prev) => ({ ...prev, action: e.target.value }))}
              aria-label="이벤트 종류 필터"
            >
              <option value="">구분 전체</option>
              <option value="0">결제</option>
              <option value="1">매장연결</option>
              <option value="2">갱신</option>
              <option value="3">취소</option>
            </select>


            <input
              type="date"
              className="form_input"
              value={draft.dateFrom}
              onChange={(e) => setDraft((prev) => ({ ...prev, dateFrom: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSearch();
              }}
              aria-label="기록일 시작"
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
              aria-label="기록일 종료"
            />
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

      <DataTable
        columns={columns}
        data={logs}
        rowKey={(l) => l.no}
        loading={loading}
        emptyMessage="조건에 맞는 변경 이력이 없습니다."
      />

      <UserPagination page={page} totalPages={totalPages} totalCount={totalElements} pageSize={PAGE_SIZE} onChange={setPage} />
    </>
  );
}