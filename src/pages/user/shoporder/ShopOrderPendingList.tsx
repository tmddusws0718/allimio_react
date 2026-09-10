import { useEffect, useState } from 'react';
import { PageHeader, Filterbar, UserPagination, DataTable, Modal, AlertModal, type DataTableColumn, AdminToolbar, DbmsPagination } from '../../../components/ui';
import { axiosInstance } from '../../../utils/Tool';
import {
  PAGE_SIZE,
  EMPTY_FILTERS,
  type RowType,
  type Filters,
  type PendingSearchResult,
  type ChangeApprovalRequest,
  STATUS_MAP,
} from '../../../components/ts/ShopOrderPending';
import { GlobalStoreSession } from '../../../store/LoginStore';
import { usePaging } from '../../../hooks/usePaging';

/* ---------------------------------------------------------------------
   CCTV 대수 변경 신청 관리 (/dbms/shop_order_pending) — SHOP_ORDER_PENDING
   승인대기 목록을 조회하고, 관리자가 실제 매장 CCTV 설치 상태를 확인한 뒤
   승인/반려 처리합니다.

   승인 시 서버가 실제 매장 등록 CCTV 대수와 신청 대수(ccnt)가 일치하는지
   검증하고, 불일치하면 400을 반환합니다(프론트에서 안내 문구로 처리).
   반려 시에는 사유(memo)를 필수로 입력받습니다.

   API
   GET /shop_order_pending/list?status=&word=&dateFrom=&dateTo=&page=&size=
   PUT /shop_order_pending/{no}/approve → {approve, memo}
--------------------------------------------------------------------- */

export default function ShopOrderPendingnList() {
  const { no: mno } = GlobalStoreSession();
  const [items, setItems] = useState<RowType[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailTarget, setDetailTarget] = useState<RowType | null>(null);

  const { page, setPage } = usePaging({ basePath: '/dbms/pending' });

  /* 필터바 설정 */
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);

  /* 페이징 설정 */
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);


  const [alert, setAlert] = useState<{ message: string; variant?: 'success' | 'error' } | null>(null);

  const loadList = async () => {
    setLoading(true);

    try {
      const res = await axiosInstance.get<PendingSearchResult>(`/shop_order_pending/list/${mno}`, {
        params: {
          status: applied.status === '' ? undefined : Number(applied.status),
          word: applied.word.trim() || undefined,
          dateFrom: applied.dateFrom || undefined,
          dateTo: applied.dateTo || undefined,
          page: page - 1,
          size: PAGE_SIZE,
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

      setItems(withCnt);
      setTotalElements(total);
      setTotalPages(Math.max(1, pages));
      
    } catch (error) {
      console.error('변경 신청 목록 조회 실패:', error);
      setItems([]);
      setTotalElements(0);
      setTotalPages(1);

    } finally {
      setLoading(false)
    }
  };

  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mno, applied, page]);

  const onSearch = () => {
    setPage(1);
    setApplied(draft);
  };

  const onReset = () => {
    setDraft(EMPTY_FILTERS);
    setPage(1);
    setApplied(EMPTY_FILTERS);
  };


  const columns: DataTableColumn<RowType>[] = [
    { header: '번호', width: '64px', mono: true, render: (o) => o.cnt },
    { header: '매장 정보', width: '140px', render: (o) => (
      <>
        <div className='cell_sub'>No.{o.sno}</div>
        <div className='cell_title'>{o.sname}</div>
      </>
    )},
    { header: '신청 구독권', width: '120px', render: (o) => o.pname ?? <span className="cell_sub">-</span> },
    {
      header: '신청 대수',
      width: '100px',
      mono: true,
      render: (o) => `${o.ccnt}대`,
    },
    { header: '신청 기간', width: '90px', mono: true, render: (o) => `${o.pmonth}개월` },
    { header: '신청일', width: '170px', mono: true, render: (o) => o.cdate },
    {
      header: '상태',
      width: '100px',
      render: (o) => <span className={`badge ${STATUS_MAP[o.status].className}`}>{STATUS_MAP[o.status].label}</span>,
    },
    {
      header: '상세',
      width: '180px',
      render: (o) =>
        o.status === 1 && (
          <button type="button" className="btn btn_xsm btn_ghost" onClick={() => setDetailTarget(o)}>
            반려사유 보기
          </button>
        ),
    },
  ];

  return (
    <section className="view active">
      <PageHeader title="CCTV 대수 변경 신청 내역" description="신청한 CCTV 대수 변경 건의 내역을 확인합니다." />

      <Filterbar
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={totalElements}
        searchValue={draft.word}
        onSearchChange={(value) => setDraft((prev) => ({ ...prev, word: value }))}
        onSearchEnter={onSearch}
        searchPlaceholder="매장명으로 검색"
        filters={
          <>
            <select
              className="form_select"
              value={draft.status}
              onChange={(e) => setDraft((prev) => ({ ...prev, status: e.target.value }))}
              aria-label="상태 필터"
            >
              <option value="">상태 전체</option>
              {Object.entries(STATUS_MAP).map(([type, { label }]) => (
                <option key={type} value={type}>
                  {label}
                </option>
              ))}
            </select>

            <input
              type="date"
              className="form_input"
              value={draft.dateFrom}
              onChange={(e) => setDraft((prev) => ({ ...prev, dateFrom: e.target.value }))}
              aria-label="신청일 시작"
            />
            <span style={{ alignSelf: 'center' }}>~</span>
            <input
              type="date"
              className="form_input"
              value={draft.dateTo}
              onChange={(e) => setDraft((prev) => ({ ...prev, dateTo: e.target.value }))}
              aria-label="신청일 종료"
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
        data={items}
        rowKey={(o) => o.no}
        loading={loading}
        emptyMessage="변경 신청 내역이 없습니다."
      />

      <UserPagination
        page={page}
        totalPages={totalPages}
        totalCount={totalElements}
        pageSize={PAGE_SIZE}
        onChange={setPage}
      />



      {/* 사유 상세 모달 */}
      <Modal
        open={detailTarget !== null}
        onClose={() => setDetailTarget(null)}
        titleId="logDetailTitle"
        title="반려사유 상세"
        footer={
          <button type="button" className="btn btn_md btn_ghost" onClick={() => setDetailTarget(null)}>
            닫기
          </button>
        }
      >
        {detailTarget && (
          <div className="order_lines">
            {detailTarget.memo && (
              <p style={{ whiteSpace: 'pre-wrap' }}>{detailTarget.memo}</p>
            )}
          </div>
        )}
      </Modal>

      <AlertModal open={alert !== null} onClose={() => setAlert(null)} message={alert?.message ?? ''} variant={alert?.variant} />
    </section>
  );
}