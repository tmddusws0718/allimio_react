import { axiosInstance } from '../../utils/Tool';


/* ========================================
   관리자 알림 타입
======================================== */

export interface NotificationAdminType {
    no: number;

    // 회원
    mno: number;
    memberName?: string;
    email?: string;
    phone?: string;

    // 알림
    title: string;
    content: string;
    priority?: string | null;
    status: string;
    readyn: string;

    // CCTV / 이슈 이미지
    cino?: number | null;
    aimapno?: number | null;

    // 생성일
    cdate: string;

    // 발송 결과
    emailStatus?: string | null;
    smsStatus?: string | null;
}


/* ========================================
   관리자 알림 목록 조회
======================================== */

export const getNotificationAdminList = async (): Promise<
    NotificationAdminType[]
> => {

    const response = await axiosInstance.get<NotificationAdminType[]>(
        '/api/notifications/admin'
    );

    return response.data;
};


/* ========================================
   알림 상태 한글 변환
======================================== */

export const getNotificationStatusText = (
    status?: string | null
): string => {

    switch (status) {

        case 'READY':
            return '대기';

        case 'SENDING':
            return '발송중';

        case 'SENT':
            return '발송완료';

        case 'FAILED':
            return '발송실패';

        case 'CANCELLED':
            return '취소';

        default:
            return status || '-';
    }
};


/* ========================================
   읽음 상태 한글 변환
======================================== */

export const getReadStatusText = (
    readyn?: string | null
): string => {

    return readyn === 'Y' ? '읽음' : '미확인';
};


/* ========================================
   이메일 / 문자 발송 상태
======================================== */

export const getSendStatusText = (
    status?: string | null
): string => {

    if (!status) {
        return '-';
    }

    switch (status) {

        case 'SUCCESS':
        case 'SENT':
            return '성공';

        case 'FAILED':
            return '실패';

        case 'SENDING':
            return '발송중';

        default:
            return status;
    }
};


/* ========================================
   날짜 표시
======================================== */

export const formatNotificationDate = (
    value?: string | null
): string => {

    if (!value) {
        return '-';
    }

    return value
        .replace('T', ' ')
        .substring(0, 19);
};