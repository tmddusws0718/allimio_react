import { useEffect, useMemo, useState } from 'react';
import { GlobalStoreSession } from '../../../store/LoginStore';
import { PageHeader, Filterbar, UserPagination } from '../../../components/ui';

import {
    getAiIssueMap,
    getAiIssueMapImageUrl,
    getNotificationDetail,
    getNotificationList,
    getPriorityLabel,
    hasAiMap,
    readNotification,
    type AiIssueMap,
    type NotificationItem,
} from '../../../components/ts/notification';

import bellUnread from '../../../assets/images/icon/notification-bell-unread.svg';
import bellRead from '../../../assets/images/icon/notification-bell-read.svg';

import './Notification.css';

const PAGE_SIZE = 10;

// ========================================
// 알림 관리
// ========================================

export default function Notification() {
    const mno = GlobalStoreSession((state) => state.no);

    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
    const [aiIssueMap, setAiIssueMap] = useState<AiIssueMap | null>(null);
    const [aiMapLoading, setAiMapLoading] = useState(false);
    const [keyword, setKeyword] = useState('');
    const [readFilter, setReadFilter] = useState<'ALL' | 'READ' | 'UNREAD'>('ALL');
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);

    // ========================================
    // 알림 목록 조회
    // ========================================

    const loadNotifications = async () => {
        if (!mno) {
            console.warn('로그인 회원번호를 찾을 수 없습니다.');
            return;
        }

        setLoading(true);

        try {
            const data = await getNotificationList(mno);
            setNotifications(data);
        } catch (error) {
            console.error('알림 목록 조회 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadNotifications();
    }, [mno]);

    // ========================================
    // 검색 + 읽음 필터
    // ========================================

    const filteredNotifications = useMemo(() => {
        const searchKeyword = keyword.trim().toLowerCase();

        return notifications.filter((notification) => {
            const matchKeyword =
                searchKeyword === '' ||
                notification.atitle.toLowerCase().includes(searchKeyword) ||
                (notification.content ?? '').toLowerCase().includes(searchKeyword);

            const matchRead =
                readFilter === 'ALL' ||
                (readFilter === 'READ' && notification.readyn === 'Y') ||
                (readFilter === 'UNREAD' && notification.readyn === 'N');

            return matchKeyword && matchRead;
        });
    }, [notifications, keyword, readFilter]);

    // ========================================
    // 페이지
    // ========================================

    const totalPages = Math.max(1, Math.ceil(filteredNotifications.length / PAGE_SIZE));

    const pagedNotifications = filteredNotifications.slice(
        (page - 1) * PAGE_SIZE,
        page * PAGE_SIZE
    );

    const from = filteredNotifications.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
    const to = Math.min(page * PAGE_SIZE, filteredNotifications.length);

    // ========================================
    // 검색 / 필터
    // ========================================

    const handleSearch = (value: string) => {
        setKeyword(value);
        setPage(1);
    };

    const handleReadFilter = (value: 'ALL' | 'READ' | 'UNREAD') => {
        setReadFilter(value);
        setPage(1);
    };

    // ========================================
    // 알림 상세보기
    // ========================================

    const openDetail = async (notification: NotificationItem) => {
        if (!mno) return;

        setDetailLoading(true);
        setAiIssueMap(null);
        setAiMapLoading(false);

        try {
            const detail = await getNotificationDetail(notification.no, mno);

            // 안 읽은 알림이면 읽음 처리
            if (detail.readyn === 'N') {
                await readNotification(detail.no, mno);
                detail.readyn = 'Y';

                setNotifications((prev) =>
                    prev.map((item) =>
                        item.no === detail.no ? { ...item, readyn: 'Y' } : item
                    )
                );
            }

            setSelectedNotification(detail);

            // AI 이슈맵 조회
            if (detail.aimapno !== null && detail.aimapno !== undefined) {
                setAiMapLoading(true);

                try {
                    const mapData = await getAiIssueMap(detail.aimapno);
                    setAiIssueMap(mapData);
                } catch (error) {
                    console.error('AI 이슈맵 조회 실패:', error);
                    setAiIssueMap(null);
                } finally {
                    setAiMapLoading(false);
                }
            }
        } catch (error) {
            console.error('알림 상세 조회 실패:', error);
        } finally {
            setDetailLoading(false);
        }
    };

    // ========================================
    // 상세 닫기
    // ========================================

    const closeDetail = () => {
        setSelectedNotification(null);
        setAiIssueMap(null);
        setAiMapLoading(false);
    };

    // ========================================
    // 중요도 Badge
    // ========================================

    const getPriorityBadgeClass = (priority?: string | null): string => {
        if (!priority) return 'badge_neutral';

        switch (priority.toUpperCase()) {
            case 'LOW':
                return 'badge_neutral';
            case 'NORMAL':
            case 'MEDIUM':
                return 'badge_warning';
            case 'HIGH':
            case 'EMERGENCY':
            case 'CRITICAL':
                return 'badge_danger';
            default:
                return 'badge_neutral';
        }
    };

    return (
        <>
            <section className="view active">
                <PageHeader
                    title="알림 관리"
                    description="CCTV 이슈 알림을 확인할 수 있습니다."
                />

                <Filterbar
                    searchValue={keyword}
                    onSearchChange={handleSearch}
                    searchPlaceholder="알림 제목 또는 내용 검색"
                    left={
                        <span className="pagination_info">
                            전체 {filteredNotifications.length}건 중 {from}–{to}건 표시
                        </span>
                    }
                    filters={
                        <select
                            className="form_select"
                            value={readFilter}
                            onChange={(e) =>
                                handleReadFilter(e.target.value as 'ALL' | 'READ' | 'UNREAD')
                            }
                            aria-label="읽음 상태 필터"
                        >
                            <option value="ALL">전체 알림</option>
                            <option value="UNREAD">안 읽은 알림</option>
                            <option value="READ">읽은 알림</option>
                        </select>
                    }
                />

                {/* 알림 목록 */}
                <div className="table_wrap">
                    <table className="table">
                        <colgroup>
                            <col style={{ width: 70 }} />
                            <col />
                            <col style={{ width: 120 }} />
                            <col style={{ width: 110 }} />
                            <col style={{ width: 170 }} />
                            <col style={{ width: 100 }} />
                        </colgroup>

                        <thead>
                            <tr>
                                <th>상태</th>
                                <th>알림</th>
                                <th>중요도</th>
                                <th>AI 도면</th>
                                <th>등록일</th>
                                <th></th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                <tr className="empty_row">
                                    <td colSpan={6}>알림을 불러오는 중입니다.</td>
                                </tr>
                            ) : pagedNotifications.length === 0 ? (
                                <tr className="empty_row">
                                    <td colSpan={6}>등록된 알림이 없습니다.</td>
                                </tr>
                            ) : (
                                pagedNotifications.map((notification) => (
                                    <tr
                                        key={notification.no}
                                        className={
                                            notification.readyn === 'N'
                                                ? 'notification_row_unread'
                                                : ''
                                        }
                                    >
                                        <td>
                                            <span className="notification_bell">
                                                <img
                                                    src={
                                                        notification.readyn === 'N'
                                                            ? bellUnread
                                                            : bellRead
                                                    }
                                                    alt={
                                                        notification.readyn === 'N'
                                                            ? '안 읽은 알림'
                                                            : '읽은 알림'
                                                    }
                                                    title={
                                                        notification.readyn === 'N'
                                                            ? '안 읽은 알림'
                                                            : '읽은 알림'
                                                    }
                                                />
                                            </span>
                                        </td>

                                        <td>
                                            <div className="notification_content">
                                                <div className="cell_title">
                                                    {notification.atitle}
                                                </div>
                                                <div className="cell_sub">
                                                    {notification.content || '-'}
                                                </div>
                                            </div>
                                        </td>

                                        <td>
                                            {notification.priority ? (
                                                <span
                                                    className={`badge ${getPriorityBadgeClass(
                                                        notification.priority
                                                    )}`}
                                                >
                                                    {getPriorityLabel(notification.priority)}
                                                </span>
                                            ) : (
                                                <span className="cell_sub">-</span>
                                            )}
                                        </td>

                                        <td>
                                            {hasAiMap(notification) ? (
                                                <span className="badge badge_info">도면 있음</span>
                                            ) : (
                                                <span className="badge badge_neutral">도면 없음</span>
                                            )}
                                        </td>

                                        <td className="mono">{notification.cdate}</td>

                                        <td>
                                            <button
                                                type="button"
                                                className="btn btn_sm btn_ghost"
                                                onClick={() => openDetail(notification)}
                                            >
                                                상세보기
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <UserPagination
                    page={page}
                    totalPages={totalPages}
                    totalCount={filteredNotifications.length}
                    pageSize={PAGE_SIZE}
                    onChange={setPage}
                />
            </section>

            {/* Overlay */}
            <div
                className={`overlay_bg${selectedNotification ? ' open' : ''}`}
                onClick={closeDetail}
            />

            {/* 상세 슬라이드 */}
            <div
                className={`detail_panel notification_detail_panel${selectedNotification ? ' open' : ''
                    }`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="notificationDetailTitle"
            >
                <div className="detail_head notification_detail_head">
                    <div>
                        <h2 id="notificationDetailTitle">알림 상세</h2>
                        <p>감지된 CCTV 이슈와 AI 도면을 확인합니다.</p>
                    </div>

                    <button
                        type="button"
                        className="close_btn"
                        onClick={closeDetail}
                        aria-label="알림 상세 닫기"
                    >
                        ✕
                    </button>
                </div>

                <div className="detail_body notification_detail_body">
                    {detailLoading ? (
                        <div className="notification_detail_loading">
                            상세 정보를 불러오는 중입니다.
                        </div>
                    ) : selectedNotification ? (
                        <>
                            {/* 알림 제목 */}
                            <div className="notification_detail_title">
                                <span className="notification_bell notification_detail_bell">
                                    <img
                                        src={
                                            selectedNotification.readyn === 'N'
                                                ? bellUnread
                                                : bellRead
                                        }
                                        alt=""
                                    />
                                </span>

                                <div className="notification_detail_title_text">
                                    <div className="notification_detail_label">CCTV ALERT</div>
                                    <div className="notification_detail_name">
                                        {selectedNotification.atitle}
                                    </div>
                                    <div className="notification_detail_summary">
                                        {selectedNotification.content || '알림 내용이 없습니다.'}
                                    </div>
                                </div>
                            </div>

                            {/* 기본 정보 */}
                            <div className="notification_info_grid">
                                <div className="notification_info_item">
                                    <div className="notification_info_label">읽음 상태</div>
                                    <div className="notification_info_value">
                                        <span
                                            className={`notification_status_dot ${selectedNotification.readyn === 'Y'
                                                ? 'is_read'
                                                : 'is_unread'
                                                }`}
                                        />
                                        {selectedNotification.readyn === 'Y'
                                            ? '읽음'
                                            : '안읽음'}
                                    </div>
                                </div>

                                <div className="notification_info_item">
                                    <div className="notification_info_label">중요도</div>
                                    <div className="notification_info_value">
                                        {selectedNotification.priority ? (
                                            <span
                                                className={`badge ${getPriorityBadgeClass(
                                                    selectedNotification.priority
                                                )}`}
                                            >
                                                {getPriorityLabel(
                                                    selectedNotification.priority
                                                )}
                                            </span>
                                        ) : (
                                            '-'
                                        )}
                                    </div>
                                </div>

                                <div className="notification_info_item">
                                    <div className="notification_info_label">AI 도면</div>
                                    <div className="notification_info_value">
                                        {hasAiMap(selectedNotification) ? (
                                            <span className="notification_map_available">
                                                도면 있음
                                            </span>
                                        ) : (
                                            '도면 없음'
                                        )}
                                    </div>
                                </div>

                                <div className="notification_info_item notification_info_date">
                                    <div className="notification_info_label">등록일</div>
                                    <div className="notification_info_value">
                                        {selectedNotification.cdate}
                                    </div>
                                </div>
                            </div>

                            {/* 알림 내용 */}
                            <section className="notification_detail_content">
                                <div className="notification_section_title">알림 내용</div>
                                <div className="content_text">
                                    {selectedNotification.content ||
                                        '알림 내용이 없습니다.'}
                                </div>
                            </section>

                            {/* AI 이슈 도면 */}
                            <section className="notification_map_section">
                                <div className="notification_map_header">
                                    <div>
                                        <div className="notification_section_title">
                                            AI 이슈 도면
                                        </div>
                                        <div className="notification_section_description">
                                            AI가 분석한 이슈 발생 위치를 도면에서 확인할 수 있습니다.
                                        </div>
                                    </div>

                                    {hasAiMap(selectedNotification) && (
                                        <span className="badge badge_info">도면 있음</span>
                                    )}
                                </div>

                                {!hasAiMap(selectedNotification) ? (
                                    <div className="notification_map_empty">
                                        <div className="notification_map_empty_title">
                                            AI 이슈 도면 없음
                                        </div>
                                        <div className="notification_map_empty_text">
                                            이 알림에는 생성된 AI 이슈 도면이 없습니다.
                                        </div>
                                    </div>
                                ) : aiMapLoading ? (
                                    <div className="notification_map_empty">
                                        <div className="notification_map_empty_title">
                                            AI 이슈 도면 조회 중
                                        </div>
                                        <div className="notification_map_empty_text">
                                            도면 이미지를 불러오고 있습니다.
                                        </div>
                                    </div>
                                ) : aiIssueMap?.fsaved ? (
                                    <div className="notification_map_box">
                                        <div className="notification_map_image_wrap">
                                            <img
                                                src={getAiIssueMapImageUrl(
                                                    aiIssueMap.fsaved
                                                )}
                                                alt="AI 이슈 도면"
                                                className="notification_map_image"
                                            />
                                        </div>

                                        <div className="notification_map_meta">
                                            <span>
                                                이슈 위치가 표시된 AI 도면입니다.
                                            </span>

                                            {aiIssueMap.color && (
                                                <span className="notification_map_point">
                                                    <span
                                                        className="notification_map_point_color"
                                                        style={{
                                                            backgroundColor:
                                                                aiIssueMap.color,
                                                        }}
                                                    />
                                                    이슈 발생 위치
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="notification_map_empty">
                                        <div className="notification_map_empty_title">
                                            이미지를 찾을 수 없습니다.
                                        </div>
                                        <div className="notification_map_empty_text">
                                            AI 이슈맵 정보는 존재하지만 이미지 파일을 불러올 수 없습니다.
                                        </div>
                                    </div>
                                )}
                            </section>

                            {/* 하단 버튼 */}
                            <div className="detail_actions notification_detail_actions">
                                <button
                                    type="button"
                                    className="btn btn_primary"
                                    onClick={closeDetail}
                                >
                                    확인
                                </button>
                            </div>
                        </>
                    ) : null}
                </div>
            </div>
        </>
    );
}