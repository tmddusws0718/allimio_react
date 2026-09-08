import { useEffect, useMemo, useState } from 'react';

import {
  AdminToolbar,
  DataTable,
  DbmsPagination,
  PageHeader,
  type DataTableColumn,
} from '../../../components/ui';

import {
  formatNotificationDate,
  getNotificationAdminList,
  getNotificationStatusText,
  getReadStatusText,
  getSendStatusText,
  type NotificationAdminType,
} from '../../../components/ts/notificationAdmin';

import './NotificationAdmin.css';


const PAGE_SIZE = 10;


export default function NotificationAdmin() {

  // 입력 중 검색값
  const [draftKeyword, setDraftKeyword] = useState('');
  const [draftStatus, setDraftStatus] = useState('');

  // 실제 검색에 적용되는 값
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');

  // 알림 목록
  const [rows, setRows] = useState<NotificationAdminType[]>([]);

  // 로딩
  const [loading, setLoading] = useState(true);

  // 현재 페이지
  const [page, setPage] = useState(1);


  /**
   * 관리자 전체 알림내역 조회
   */
  const loadNotifications = async () => {

    setLoading(true);

    try {

      const data = await getNotificationAdminList();

      setRows(data);

    } catch (error) {

      console.error('알림내역 조회 실패:', error);

      setRows([]);

    } finally {

      setLoading(false);

    }
  };


  /**
   * 최초 목록 조회
   */
  useEffect(() => {

    loadNotifications();

  }, []);


  /**
   * 검색 / 상태 필터 적용
   */
  const filteredRows = useMemo(() => {

    const search = keyword
      .trim()
      .toLowerCase();

    return rows.filter((row) => {

      // 상태 검색
      const matchStatus =
        status === '' ||
        row.status === status;


      // 키워드 검색
      const matchKeyword =
        search === '' ||

        (row.memberName ?? '')
          .toLowerCase()
          .includes(search) ||

        (row.email ?? '')
          .toLowerCase()
          .includes(search) ||

        (row.phone ?? '')
          .toLowerCase()
          .includes(search) ||

        (row.title ?? '')
          .toLowerCase()
          .includes(search) ||

        (row.content ?? '')
          .toLowerCase()
          .includes(search);


      return matchStatus && matchKeyword;

    });

  }, [rows, keyword, status]);


  /**
   * 전체 페이지 수
   */
  const totalPages = Math.max(
    1,
    Math.ceil(filteredRows.length / PAGE_SIZE)
  );


  /**
   * 현재 페이지 데이터
   */
  const pagedRows = filteredRows.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );


  /**
   * 검색
   */
  const onSearch = () => {

    setPage(1);

    setKeyword(draftKeyword);
    setStatus(draftStatus);
  };


  /**
   * 검색 초기화
   */
  const onReset = () => {

    setDraftKeyword('');
    setDraftStatus('');

    setKeyword('');
    setStatus('');

    setPage(1);
  };


  /**
   * 목록 새로고침
   */
  const onRefresh = () => {

    loadNotifications();
  };


  /**
   * 이메일 / 문자 발송 상태 배지
   */
  const getSendBadgeClass = (
    sendStatus?: string | null
  ) => {

    if (!sendStatus) {
      return 'badge badge_neutral';
    }

    if (
      sendStatus === 'SENT' ||
      sendStatus === 'SUCCESS'
    ) {
      return 'badge badge_success';
    }

    if (sendStatus === 'FAILED') {
      return 'badge badge_danger';
    }

    if (sendStatus === 'SENDING') {
      return 'badge badge_info';
    }

    return 'badge badge_neutral';
  };


  /**
   * 알림 전체 상태 배지
   */
  const getStatusBadgeClass = (
    notificationStatus?: string | null
  ) => {

    switch (notificationStatus) {

      case 'SENT':
        return 'badge badge_success';

      case 'FAILED':
        return 'badge badge_danger';

      case 'SENDING':
        return 'badge badge_info';

      case 'READY':
        return 'badge badge_neutral';

      case 'CANCELLED':
        return 'badge badge_neutral';

      default:
        return 'badge badge_neutral';
    }
  };


  /**
   * 테이블 컬럼
   */
  const columns: DataTableColumn<NotificationAdminType>[] = [

    {
      header: '번호',
      width: '70px',
      mono: true,
      render: (row) => row.no,
    },

    {
      header: '수신자',
      width: '120px',

      render: (row) => (
        <div className="notification_member">

          <span className="notification_member_name">
            {row.memberName || '-'}
          </span>

          <span className="cell_sub">
            #{row.mno}
          </span>

        </div>
      ),
    },

    {
      header: '연락처',
      width: '190px',

      render: (row) => (
        <div className="notification_contact">

          <span
            className="notification_email"
            title={row.email || ''}
          >
            {row.email || '-'}
          </span>

          <span className="cell_sub">
            {row.phone || '-'}
          </span>

        </div>
      ),
    },

    {
      header: '알림 제목',
      width: '30%',

      render: (row) => (
        <span
          className="notification_title"
          title={row.title || ''}
        >
          {row.title || '-'}
        </span>
      ),
    },

    {
      header: '이메일',
      width: '90px',

      render: (row) => (
        <span className={getSendBadgeClass(row.emailStatus)}>
          {getSendStatusText(row.emailStatus)}
        </span>
      ),
    },

    {
      header: '문자',
      width: '90px',

      render: (row) => (
        <span className={getSendBadgeClass(row.smsStatus)}>
          {getSendStatusText(row.smsStatus)}
        </span>
      ),
    },

    {
      header: '상태',
      width: '105px',

      render: (row) => (
        <span className={getStatusBadgeClass(row.status)}>
          {getNotificationStatusText(row.status)}
        </span>
      ),
    },

    {
      header: '확인',
      width: '90px',

      render: (row) => (
        <span
          className={
            row.readyn === 'Y'
              ? 'badge badge_neutral'
              : 'badge badge_warning'
          }
        >
          {getReadStatusText(row.readyn)}
        </span>
      ),
    },

    {
      header: '발생일시',
      width: '180px',
      mono: true,

      render: (row) =>
        formatNotificationDate(row.cdate),
    },
  ];


  return (

    <section className="view active">

      {/* 페이지 제목 */}
      <PageHeader
        title="알림 내역"
        description="회원에게 발송된 이메일 및 문자 알림의 발송 상태를 확인합니다."
      />


      {/* 검색 / 필터 */}
      <AdminToolbar

        searchValue={draftKeyword}

        onSearchChange={setDraftKeyword}

        searchPlaceholder="회원명, 이메일, 전화번호, 제목 검색"

        onSearchEnter={onSearch}

        filters={
          <select
            className="form_select"
            value={draftStatus}
            onChange={(e) =>
              setDraftStatus(e.target.value)
            }
            aria-label="알림 상태"
          >

            <option value="">
              전체 상태
            </option>

            <option value="READY">
              대기
            </option>

            <option value="SENDING">
              발송중
            </option>

            <option value="SENT">
              발송완료
            </option>

            <option value="FAILED">
              발송실패
            </option>

          </select>
        }

        extra={
          <>

            <button
              type="button"
              className="btn btn_primary"
              onClick={onSearch}
            >
              검색
            </button>

            <button
              type="button"
              className="btn btn_outline_primary"
              onClick={onReset}
            >
              초기화
            </button>

            <button
              type="button"
              className="btn btn_ghost"
              onClick={onRefresh}
            >
              새로고침
            </button>

          </>
        }
      />


      {/* 검색 결과 */}
      <div className="notification_result_count">

        전체

        <strong>
          {filteredRows.length}
        </strong>

        건

      </div>


      {/* 알림 목록 */}
      <DataTable
        columns={columns}
        data={pagedRows}
        rowKey={(row) => row.no}
        loading={loading}
        emptyMessage="알림 발송 내역이 없습니다."
      />


      {/* 페이징 */}
      <DbmsPagination
        page={page}
        totalPages={totalPages}
        totalCount={filteredRows.length}
        pageSize={PAGE_SIZE}
        onChange={setPage}
      />

    </section>
  );
}