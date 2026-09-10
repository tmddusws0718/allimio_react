import type { ReactNode } from 'react';

interface AdminToolbarProps {
  /** 검색어 (controlled) */
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  /** 셀렉트 필터 등 검색 입력 옆에 추가로 넣을 요소들 (상태 필터, 기간 필터 등) */
  filters?: ReactNode;
  /** 우측 끝에 붙는 보조 버튼 (예: 엑셀 다운로드, 새로고침) — 생성 버튼은 PageHeader에서 처리 */
  extra?: ReactNode;
  /** 검색어 입력창에서 Enter 입력 시 실행할 검색 함수 (예: onSearch) */
  onSearchEnter?: () => void;
  width?: string;
}

/**
 * 리스트 상단 검색/필터 바. 기존 .filter_bar 클래스를 그대로 사용
 * (HistoryView.tsx의 필터 바와 동일한 톤), 검색 입력만 .search_box로 새로 추가.
 *
 * 사용 예:
 *   <AdminToolbar
 *     searchValue={keyword}
 *     onSearchChange={setKeyword}
 *     searchPlaceholder="제목으로 검색"
 *     filters={
 *       <select value={tag} onChange={(e) => setTag(e.target.value)}>
 *         <option value="">전체</option>
 *         <option value="긴급">긴급</option>
 *       </select>
 *     }
 *   />
 */
export default function AdminToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = '검색어를 입력하세요',
  filters,
  extra,
  onSearchEnter,
  width
}: AdminToolbarProps) {
  return (
    <div className="filter_bar">
      <div className="search_box">
        <span className="search_ic" aria-hidden>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </span>
        <input
          type="text"
          className='form_input'
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onSearchEnter?.();
            }
          }}
          style={{width: width ?? width}}
        />
        {searchValue && (
          <button
            type="button"
            className="search_clear"
            aria-label="검색어 지우기"
            onClick={() => onSearchChange('')}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {filters}

      {extra && <div className='actions'>{extra}</div>}
    </div>
  );
}
