import type { ReactNode } from 'react';

export interface DataTableColumn<T> {
  /** thead에 표시할 라벨 */
  header: string;
  /** 값을 렌더링하는 함수. 지정 안 하면 accessor 키로 row[key] 출력 */
  render?: (row: T) => ReactNode;
  /** render 없이 단순 필드 출력할 때 사용 */
  accessor?: keyof T;
  /** 숫자/코드처럼 고정폭 폰트로 보여줄 컬럼이면 true (기존 .mono 클래스 사용) */
  mono?: boolean;
  /** 컬럼 폭. table-layout:fixed라 <colgroup>으로 적용됨. 예: 120, '120px', '20%' */
  width?: number | string;
  /** th/td 폭 등 커스텀 클래스 */
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string | number;
  /** 지정하면 각 행 우측에 수정 버튼 노출 */
  onEdit?: (row: T) => void;
  /** 지정하면 각 행 우측에 삭제 버튼 노출 */
  onDelete?: (row: T) => void;
  editLabel?: string;
  deleteLabel?: string;
  emptyMessage?: string;
  loading?: boolean;
  /** 지정하면 표 하단(<tfoot>)에 합계/요약 행으로 렌더링됨. colSpan은 전체 컬럼수로 자동 적용 */
  footer?: ReactNode;
}

export default function DataTable<T>({
  columns,
  data,
  rowKey,
  onEdit,
  onDelete,
  editLabel = '수정',
  deleteLabel = '삭제',
  emptyMessage = '등록된 데이터가 없습니다.',
  loading = false,
  footer,
}: DataTableProps<T>) {
  const hasActions = Boolean(onEdit || onDelete);
  const colCount = columns.length + (hasActions ? 1 : 0);

  return (
    <div className="table_wrap">
      <table className="table">
        <colgroup>
          {columns.map((col) => (
            <col key={col.header} style={data.length > 0 && col.width ? { width: col.width } : undefined} />
          ))}
          {hasActions && <col />}
        </colgroup>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.header} className={col.headerClassName}>
                {col.header}
              </th>
            ))}
            {hasActions && <th></th>}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr className="empty_row">
              <td colSpan={colCount}>불러오는 중...</td>
            </tr>
          ) : data.length === 0 ? (
            <tr className="empty_row">
              <td colSpan={colCount}>{emptyMessage}</td>
            </tr>
          ) : (
            data.map((row) => (
              <tr key={rowKey(row)}>
                {columns.map((col) => (
                  <td key={col.header} className={col.className}>
                    {(() => {
                      // 1. 값 추출 (render 함수 우선, 없으면 accessor 사용)
                      const content = col.render
                        ? col.render(row)
                        : col.accessor
                        ? String(row[col.accessor] ?? '')
                        : '';

                      // 2. mono 옵션이 true이고 값이 존재하면 <span className="mono">로 감싸기
                      if (col.mono && content !== '') {
                        return <span className="mono">{content}</span>;
                      }

                      return content;
                    })()}
                  </td>
                ))}
                {hasActions && (
                  <td>
                    <div className="actions" style={{ justifyContent: 'flex-end' }}>
                      {onEdit && (
                        <button type="button" className="btn btn_sm btn_ghost" onClick={() => onEdit(row)}>
                          {editLabel}
                        </button>
                      )}
                      {onDelete && (
                        <button type="button" className="btn btn_sm btn_danger_outline" onClick={() => onDelete(row)}>
                          {deleteLabel}
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
        {footer && !loading && data.length > 0 && (
          <tfoot>
            <tr className="table_footer_row">
              <td colSpan={colCount}>{footer}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}