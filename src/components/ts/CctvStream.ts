export interface CctvStreamType {
  no?: number;
  cno?: number;
  streamUrl?: string;
  protocol?: string;
  port?: number | null;
  connState?: number;
  lastConnectedAt?: string | null;
  cdate?: string;
}

/** GET /cctv_stream/search 응답 형태 (Spring Page 대신 서버에서 Map으로 직접 내려줌) */
export interface CctvStreamSearchResult {
  content: CctvStreamType[];
  totalElements: number;
  totalPages: number;
  page: number; // 0부터 시작
  size: number;
}

export const PAGE_SIZE = 10;

// CONN_STATE: 0(미연결) / 1(연결됨) / 2(오류)
export const CONN_STATE_LABELS: Record<number, string> = {
  0: '미연결',
  1: '연결됨',
  2: '오류',
};
export const CONN_STATE_BADGE: Record<number, string> = {
  0: 'badge_neutral',
  1: 'badge_success',
  2: 'badge_danger',
};

export const PROTOCOL_OPTIONS = ['RTSP', 'RTMP', 'HTTP', 'HLS'] as const;

export type RowType = CctvStreamType & { cnt: number };

export interface Filters {
  cno: string;
  connState: string; // '' | '0' | '1' | '2'
  keyword: string; // streamUrl 포함 검색
}

export const EMPTY_FILTERS: Filters = {
  cno: '',
  connState: '',
  keyword: '',
};

export const EMPTY_STREAM: CctvStreamType = {
  cno: undefined,
  streamUrl: '',
  protocol: 'RTSP',
  port: undefined,
  connState: 0,
};
