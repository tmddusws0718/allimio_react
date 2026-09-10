import dbms from './dbms.module.css'

interface PaginationProps {
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onChange: (page: number) => void;
  /** false면 '전체 N건 중 ...건 표시' 문구를 숨김 (다른 곳에 따로 배치할 때) */
  showInfo?: boolean;
}

/** 페이지 번호 목록 계산: 현재 페이지 기준 앞뒤 2개씩, 최대 5개 노출 */
function getPageNumbers(page: number, totalPages: number): number[] {
  const span = 2;
  let start = Math.max(1, page - span);
  let end = Math.min(totalPages, page + span);
  if (end - start < span * 2) {
    if (start === 1) end = Math.min(totalPages, start + span * 2);
    else if (end === totalPages) start = Math.max(1, end - span * 2);
  }
  const pages: number[] = [];
  for (let i = start; i <= end; i++) pages.push(i);
  return pages;
}

/**
 * 신규 컴포넌트 (기존에 없던 것) — dbms.css의 .pagination / .page_btn 사용.
 * 사용 예:
 *   <Pagination page={page} totalPages={totalPages} totalCount={filtered.length} pageSize={10} onChange={setPage} />
 */
export default function Pagination({ page, totalPages, totalCount, pageSize, onChange, showInfo = true }: PaginationProps) {
  if (totalCount === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);
  const pages = getPageNumbers(page, totalPages);

  return (
    <div className={dbms.pagination}>
      {showInfo && (
        <span className={dbms.pagination_info}>
          전체 <em className='b_num'>{totalCount}</em>건 중 {from}–{to}건 표시
        </span>
      )}
      <div className="pagination_btns">
        <button type="button" className="page_btn" disabled={page === 1} onClick={() => onChange(1)} aria-label="첫 페이지">
          «
        </button>
        <button
          type="button"
          className="page_btn"
          disabled={page === 1}
          onClick={() => onChange(page - 1)}
          aria-label="이전 페이지"
        >
          ‹
        </button>
        {pages[0] > 1 && <span className="pagination_ellipsis">…</span>}
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            className={`page_btn ${p === page ? 'active' : ''}`}
            onClick={() => onChange(p)}
            aria-current={p === page ? 'page' : undefined}
          >
            {p}
          </button>
        ))}
        {pages[pages.length - 1] < totalPages && <span className="pagination_ellipsis">…</span>}
        <button
          type="button"
          className="page_btn"
          disabled={page === totalPages}
          onClick={() => onChange(page + 1)}
          aria-label="다음 페이지"
        >
          ›
        </button>
        <button
          type="button"
          className="page_btn"
          disabled={page === totalPages}
          onClick={() => onChange(totalPages)}
          aria-label="마지막 페이지"
        >
          »
        </button>
      </div>
    </div>
  );
}