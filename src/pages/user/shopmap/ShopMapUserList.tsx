import { useEffect, useState } from 'react';

import {
    PageHeader,
    UserPagination,
    AlertModal,
    ConfirmDeleteModal,
} from '../../../components/ui';

import Filterbar from '../../../components/ui/user/Filterbar';
import { axiosInstance } from '../../../utils/Tool';
import { GlobalStoreSession } from '../../../store/LoginStore';

import type {
    ShopType,
    ShopSearchResult,
} from '../../../components/ts/ShopUser';

import './ShopMapUserList.css';

/* =========================================================
   사용자 매장 도면 관리

   - 모든 사용자: 도면 조회 가능
   - 점주(grade === 10): 도면 등록 / 변경 / 삭제 가능
   - 직원 및 일반회원: 조회만 가능
========================================================= */

/* 매장 + 도면 정보 */
interface ShopMapRow extends ShopType {
    shopMap: ShopMap | null;
}

/* SHOPMAP API 데이터 */
interface ShopMap {
    sno: number;
    no: number;
    fname: string;
    fsaved: string;
    cdate: string;
}

const PAGE_SIZE = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function ShopMapUserList() {
    /* =========================================================
       로그인 회원 정보
    ========================================================= */

    const mno = GlobalStoreSession((state) => state.no);
    const grade = GlobalStoreSession((state) => state.grade);

    /* 10등급만 점주 */
    const isShopOwner = grade === 10;

    /* =========================================================
       목록
    ========================================================= */

    const [rows, setRows] = useState<ShopMapRow[]>([]);

    /* =========================================================
       검색
    ========================================================= */

    const [keyword, setKeyword] = useState('');
    const [appliedKeyword, setAppliedKeyword] = useState('');

    /* =========================================================
       페이징
    ========================================================= */

    const [page, setPage] = useState(1);
    const [totalElements, setTotalElements] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    /* =========================================================
       로딩
    ========================================================= */

    const [loading, setLoading] = useState(false);

    /* =========================================================
       등록 / 변경 모달
    ========================================================= */

    const [uploadTarget, setUploadTarget] =
        useState<ShopMapRow | null>(null);

    const [selectedFile, setSelectedFile] =
        useState<File | null>(null);

    const [previewUrl, setPreviewUrl] =
        useState<string | null>(null);

    const [uploading, setUploading] =
        useState(false);

    /* =========================================================
       등록된 도면 보기
    ========================================================= */

    const [viewTarget, setViewTarget] =
        useState<ShopMapRow | null>(null);

    /* =========================================================
       삭제
    ========================================================= */

    const [deleteTarget, setDeleteTarget] =
        useState<ShopMapRow | null>(null);

    const [deleting, setDeleting] =
        useState(false);

    /* =========================================================
       공통 알림
    ========================================================= */

    const [alert, setAlert] = useState<{
        message: string;
        variant?: 'success' | 'error';
    } | null>(null);

    /* =========================================================
       매장 + 도면 목록 조회
    ========================================================= */

    const loadList = async () => {
        setLoading(true);

        try {
            /*
             * 로그인 회원의 매장 조회
             */
            const res =
                await axiosInstance.get<ShopSearchResult>(
                    '/shop/search',
                    {
                        params: {
                            mno,
                            page: page - 1,
                            size: PAGE_SIZE,
                            keyword:
                                appliedKeyword.trim() ||
                                undefined,
                        },
                    }
                );

            const {
                content,
                totalElements: total,
                totalPages: pages,
            } = res.data;

            /*
             * 매장별 도면 존재 여부 조회
             */
            const result: ShopMapRow[] =
                await Promise.all(
                    content.map(async (shop) => {
                        try {
                            const mapRes =
                                await axiosInstance.get<ShopMap>(
                                    `/api/shopmaps/shop/${shop.no}`
                                );

                            return {
                                ...shop,
                                shopMap: mapRes.data,
                            };
                        } catch {
                            /*
                             * 404 = 아직 도면 없음
                             */
                            return {
                                ...shop,
                                shopMap: null,
                            };
                        }
                    })
                );

            setRows(result);

            setTotalElements(total);

            setTotalPages(
                Math.max(1, pages)
            );
        } catch (error) {
            console.error(
                '매장 도면 목록 조회 실패:',
                error
            );

            setRows([]);
            setTotalElements(0);
            setTotalPages(1);

            setAlert({
                message:
                    '매장 도면 목록을 불러오지 못했습니다.',
                variant: 'error',
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadList();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mno, appliedKeyword, page]);

    /* =========================================================
       검색
    ========================================================= */

    const handleSearch = () => {
        setPage(1);
        setAppliedKeyword(keyword);
    };

    const handleReset = () => {
        setKeyword('');
        setAppliedKeyword('');
        setPage(1);
    };

    /* =========================================================
       등록 / 변경 모달 열기
    ========================================================= */

    const openUploadModal = (
        row: ShopMapRow
    ) => {
        /*
         * 프론트에서도 점주 여부 체크
         */
        if (!isShopOwner) {
            setAlert({
                message:
                    '도면 등록 및 변경은 점주만 가능합니다.',
                variant: 'error',
            });

            return;
        }

        setUploadTarget(row);
        setSelectedFile(null);
        setPreviewUrl(null);
    };

    /* =========================================================
       파일 선택
    ========================================================= */

    const handleFileChange = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file =
            e.target.files?.[0];

        if (!file) return;

        /*
         * 이미지 파일만 허용
         */
        if (!file.type.startsWith('image/')) {
            setAlert({
                message:
                    '이미지 파일만 등록할 수 있습니다.',
                variant: 'error',
            });

            e.target.value = '';

            return;
        }

        /*
         * 최대 10MB
         */
        if (file.size > MAX_FILE_SIZE) {
            setAlert({
                message:
                    '도면 이미지는 최대 10MB까지 등록할 수 있습니다.',
                variant: 'error',
            });

            e.target.value = '';

            return;
        }

        setSelectedFile(file);

        /*
         * 기존 미리보기 URL 제거
         */
        if (previewUrl) {
            URL.revokeObjectURL(
                previewUrl
            );
        }

        setPreviewUrl(
            URL.createObjectURL(file)
        );
    };

    /* =========================================================
       도면 등록 / 변경
    ========================================================= */

    const handleUpload = async () => {
        if (!uploadTarget) return;

        /*
         * 점주 조건 재확인
         */
        if (!isShopOwner) {
            setAlert({
                message:
                    '도면 등록 및 변경은 점주만 가능합니다.',
                variant: 'error',
            });

            return;
        }

        if (!selectedFile) {
            setAlert({
                message:
                    '등록할 도면 파일을 선택해주세요.',
                variant: 'error',
            });

            return;
        }

        const formData =
            new FormData();

        formData.append(
            'file',
            selectedFile
        );

        setUploading(true);

        try {
            /*
             * 기존 도면이 있으면 수정
             */
            if (uploadTarget.shopMap) {
                await axiosInstance.put(
                    `/api/shopmaps/${uploadTarget.shopMap.no}`,
                    formData,
                    {
                        headers: {
                            'Content-Type':
                                'multipart/form-data',
                        },
                    }
                );

                setAlert({
                    message:
                        '매장 도면이 변경되었습니다.',
                    variant: 'success',
                });
            }

            /*
             * 기존 도면이 없으면 신규 등록
             */
            else {
                formData.append(
                    'sno',
                    String(uploadTarget.no)
                );

                await axiosInstance.post(
                    '/api/shopmaps',
                    formData,
                    {
                        headers: {
                            'Content-Type':
                                'multipart/form-data',
                        },
                    }
                );

                setAlert({
                    message:
                        '매장 도면이 등록되었습니다.',
                    variant: 'success',
                });
            }

            closeUploadModal();

            await loadList();
        } catch (error: any) {
            console.error(
                '매장 도면 저장 실패:',
                error
            );

            setAlert({
                message:
                    error.response?.data ??
                    '도면 저장 중 오류가 발생했습니다.',
                variant: 'error',
            });
        } finally {
            setUploading(false);
        }
    };

    /* =========================================================
       삭제 확인 모달 열기
    ========================================================= */

    const handleDelete = (
        row: ShopMapRow
    ) => {
        /*
         * 점주만 삭제 가능
         */
        if (!isShopOwner) {
            setAlert({
                message:
                    '도면 삭제는 점주만 가능합니다.',
                variant: 'error',
            });

            return;
        }

        /*
         * 등록된 도면이 없는 경우
         */
        if (!row.shopMap) {
            setAlert({
                message:
                    '삭제할 도면이 없습니다.',
                variant: 'error',
            });

            return;
        }

        /*
         * 공통 ConfirmDeleteModal 표시
         */
        setDeleteTarget(row);
    };

    /* =========================================================
       실제 도면 삭제
    ========================================================= */

    const confirmDelete = async () => {
        if (!deleteTarget?.shopMap) {
            return;
        }

        setDeleting(true);

        try {
            /*
             * DELETE /api/shopmaps/{no}
             */
            await axiosInstance.delete(
                `/api/shopmaps/${deleteTarget.shopMap.no}`
            );

            /*
             * 삭제 모달 닫기
             */
            setDeleteTarget(null);

            /*
             * 도면 보기 모달이 열려있다면 닫기
             */
            setViewTarget(null);

            /*
             * 공통 성공 알림
             */
            setAlert({
                message:
                    '매장 도면이 삭제되었습니다.',
                variant: 'success',
            });

            /*
             * 삭제 후 목록 다시 조회
             */
            await loadList();
        } catch (error: any) {
            console.error(
                '매장 도면 삭제 실패:',
                error
            );

            setAlert({
                message:
                    error.response?.data ??
                    '도면 삭제 중 오류가 발생했습니다.',
                variant: 'error',
            });
        } finally {
            setDeleting(false);
        }
    };

    /* =========================================================
       등록 모달 닫기
    ========================================================= */

    const closeUploadModal = () => {
        if (previewUrl) {
            URL.revokeObjectURL(
                previewUrl
            );
        }

        setUploadTarget(null);
        setSelectedFile(null);
        setPreviewUrl(null);
    };

    /* =========================================================
       조회 정보
    ========================================================= */

    const from =
        totalElements === 0
            ? 0
            : (page - 1) *
            PAGE_SIZE +
            1;

    const to =
        Math.min(
            page * PAGE_SIZE,
            totalElements
        );

    return (
        <section className="view active">
            {/* =====================================================
                페이지 제목
            ===================================================== */}

            <PageHeader
                title="매장 도면 관리"
                description={
                    isShopOwner
                        ? '등록된 매장 도면을 확인하고 새로운 도면을 등록하거나 변경할 수 있습니다.'
                        : '등록된 매장 도면을 확인할 수 있습니다.'
                }
            />

            {/* =====================================================
                검색
            ===================================================== */}

            <Filterbar
                searchValue={keyword}
                onSearchChange={(value) =>
                    setKeyword(value)
                }
                searchPlaceholder="매장명·주소로 검색"
                onSearchEnter={handleSearch}
                left={
                    <span className="pagination_info">
                        전체 {totalElements}건 중{' '}
                        {from}–{to}건 표시
                    </span>
                }
                extra={
                    <>
                        <button
                            type="button"
                            className="btn btn_primary"
                            onClick={handleSearch}
                        >
                            검색
                        </button>

                        <button
                            type="button"
                            className="btn btn_outline_primary"
                            onClick={handleReset}
                        >
                            초기화
                        </button>
                    </>
                }
            />

            {/* =====================================================
                점주 안내
            ===================================================== */}

            {isShopOwner && (
                <div className="shopmap_owner_notice">
                    <div>
                        <strong>
                            도면 등록 안내
                        </strong>

                        <p>
                            매장 도면은 이미지 파일로
                            등록할 수 있으며, 등록된
                            도면은 언제든 변경할 수
                            있습니다.
                        </p>
                    </div>

                    <span className="shopmap_owner_badge">
                        점주
                    </span>
                </div>
            )}

            {/* =====================================================
                도면 목록
            ===================================================== */}

            <div className="shopmap_list">
                {loading ? (
                    <div className="shopmap_empty">
                        매장 도면 정보를
                        불러오는 중입니다.
                    </div>
                ) : rows.length === 0 ? (
                    <div className="shopmap_empty">
                        등록된 매장이 없습니다.
                    </div>
                ) : (
                    rows.map((row) => {
                        const hasMap =
                            row.shopMap !== null;

                        return (
                            <div
                                className="shopmap_row"
                                key={row.no}
                            >
                                {/* 매장 정보 */}
                                <div className="shopmap_store">
                                    <strong className="cell_title">
                                        {row.title}
                                    </strong>

                                    <span className="cell_sub">
                                        {row.address ||
                                            '-'}

                                        {row.address2
                                            ? ` ${row.address2}`
                                            : ''}
                                    </span>
                                </div>

                                {/* 등록 상태 */}
                                <div className="shopmap_status_area">
                                    {hasMap ? (
                                        <span className="shopmap_status registered">
                                            등록
                                        </span>
                                    ) : (
                                        <span className="shopmap_status unregistered">
                                            미등록
                                        </span>
                                    )}
                                </div>

                                {/* 파일 정보 */}
                                <div className="shopmap_file">
                                    {row.shopMap ? (
                                        <>
                                            <strong className="cell_title">
                                                {
                                                    row
                                                        .shopMap
                                                        .fname
                                                }
                                            </strong>

                                            <span className="cell_sub">
                                                등록일&nbsp;
                                                {row
                                                    .shopMap
                                                    .cdate ||
                                                    '-'}
                                            </span>
                                        </>
                                    ) : (
                                        <span className="shopmap_no_file">
                                            등록된 도면이
                                            없습니다.
                                        </span>
                                    )}
                                </div>

                                {/* 관리 버튼 */}
                                <div className="shopmap_actions">
                                    {/* 등록된 도면은 모든 회원 조회 가능 */}
                                    {hasMap && (
                                        <button
                                            type="button"
                                            className="btn btn_sm btn_ghost"
                                            onClick={() =>
                                                setViewTarget(
                                                    row
                                                )
                                            }
                                        >
                                            도면 보기
                                        </button>
                                    )}

                                    {/* 점주만 등록 / 변경 */}
                                    {isShopOwner && (
                                        <button
                                            type="button"
                                            className={
                                                hasMap
                                                    ? 'btn btn_sm btn_outline_primary'
                                                    : 'btn btn_sm btn_primary'
                                            }
                                            onClick={() =>
                                                openUploadModal(
                                                    row
                                                )
                                            }
                                        >
                                            {hasMap
                                                ? '도면 변경'
                                                : '도면 등록'}
                                        </button>
                                    )}

                                    {/* 점주 + 등록 도면 존재 시 삭제 */}
                                    {isShopOwner &&
                                        hasMap && (
                                            <button
                                                type="button"
                                                className="btn btn_sm btn_delete"
                                                onClick={() =>
                                                    handleDelete(
                                                        row
                                                    )
                                                }
                                                disabled={
                                                    deleting
                                                }
                                            >
                                                도면 삭제
                                            </button>
                                        )}

                                    {/* 직원 / 일반회원 */}
                                    {!isShopOwner &&
                                        !hasMap && (
                                            <span className="shopmap_readonly">
                                                조회 전용
                                            </span>
                                        )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* =====================================================
                페이징
            ===================================================== */}

            {totalElements > 0 && (
                <UserPagination
                    page={page}
                    totalPages={totalPages}
                    totalCount={totalElements}
                    pageSize={PAGE_SIZE}
                    onChange={setPage}
                    showInfo={false}
                />
            )}

            {/* =====================================================
                도면 등록 / 변경 모달
            ===================================================== */}

            {uploadTarget && (
                <div
                    className="shopmap_modal_backdrop"
                    onMouseDown={
                        closeUploadModal
                    }
                >
                    <div
                        className="shopmap_modal"
                        onMouseDown={(e) =>
                            e.stopPropagation()
                        }
                    >
                        <div className="shopmap_modal_header">
                            <div>
                                <h3>
                                    {uploadTarget.shopMap
                                        ? '매장 도면 변경'
                                        : '매장 도면 등록'}
                                </h3>

                                <p>
                                    {
                                        uploadTarget.title
                                    }
                                </p>
                            </div>

                            <button
                                type="button"
                                className="shopmap_modal_close"
                                onClick={
                                    closeUploadModal
                                }
                                disabled={
                                    uploading
                                }
                            >
                                ×
                            </button>
                        </div>

                        <div className="shopmap_modal_body">
                            <div className="shopmap_upload_info">
                                <strong>
                                    {
                                        uploadTarget.title
                                    }
                                </strong>

                                <span>
                                    {uploadTarget.address ||
                                        '-'}

                                    {uploadTarget.address2
                                        ? ` ${uploadTarget.address2}`
                                        : ''}
                                </span>
                            </div>

                            <div className="shopmap_upload">
                                <label className="form_label">
                                    도면 이미지

                                    <span className="shopmap_file_help">
                                        JPG, PNG 등
                                        이미지 파일 /
                                        최대 10MB
                                    </span>
                                </label>

                                <label className="shopmap_file_input">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={
                                            handleFileChange
                                        }
                                    />

                                    <span>
                                        {selectedFile
                                            ? selectedFile.name
                                            : '파일을 선택해주세요.'}
                                    </span>

                                    <strong>
                                        파일 선택
                                    </strong>
                                </label>
                            </div>

                            {/* 선택 이미지 미리보기 */}
                            <div className="shopmap_preview">
                                {previewUrl ? (
                                    <img
                                        src={
                                            previewUrl
                                        }
                                        alt="도면 미리보기"
                                    />
                                ) : (
                                    <p>
                                        도면 이미지를
                                        선택하면 미리보기가
                                        표시됩니다.
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="shopmap_modal_footer">
                            <button
                                type="button"
                                className="btn btn_outline_primary"
                                onClick={
                                    closeUploadModal
                                }
                                disabled={
                                    uploading
                                }
                            >
                                취소
                            </button>

                            <button
                                type="button"
                                className="btn btn_primary"
                                onClick={
                                    handleUpload
                                }
                                disabled={
                                    uploading ||
                                    !selectedFile
                                }
                            >
                                {uploading
                                    ? '저장 중...'
                                    : uploadTarget.shopMap
                                        ? '변경'
                                        : '등록'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* =====================================================
                등록된 도면 보기 모달
            ===================================================== */}

            {viewTarget?.shopMap && (
                <div
                    className="shopmap_modal_backdrop"
                    onMouseDown={() =>
                        setViewTarget(null)
                    }
                >
                    <div
                        className="shopmap_modal shopmap_view_modal"
                        onMouseDown={(e) =>
                            e.stopPropagation()
                        }
                    >
                        <div className="shopmap_modal_header">
                            <div>
                                <h3>
                                    등록된 매장 도면
                                </h3>

                                <p>
                                    {
                                        viewTarget.title
                                    }
                                </p>
                            </div>

                            <button
                                type="button"
                                className="shopmap_modal_close"
                                onClick={() =>
                                    setViewTarget(
                                        null
                                    )
                                }
                            >
                                ×
                            </button>
                        </div>

                        <div className="shopmap_modal_body">
                            <div className="shopmap_upload_info">
                                <strong>
                                    {
                                        viewTarget
                                            .shopMap
                                            .fname
                                    }
                                </strong>

                                <span>
                                    등록일{' '}
                                    {viewTarget
                                        .shopMap
                                        .cdate ||
                                        '-'}
                                </span>
                            </div>

                            <div className="shopmap_preview shopmap_view_preview">
                                <img
                                    src={`${axiosInstance.defaults.baseURL}/api/shopmaps/view/${viewTarget.shopMap.no}`}
                                    alt={`${viewTarget.title} 도면`}
                                />
                            </div>
                        </div>

                        <div className="shopmap_modal_footer">
                            <button
                                type="button"
                                className="btn btn_primary"
                                onClick={() =>
                                    setViewTarget(
                                        null
                                    )
                                }
                            >
                                확인
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* =====================================================
                공통 삭제 확인 모달
            ===================================================== */}

            <ConfirmDeleteModal
                open={
                    deleteTarget !== null
                }
                onClose={() => {
                    if (!deleting) {
                        setDeleteTarget(
                            null
                        );
                    }
                }}
                onConfirm={
                    confirmDelete
                }
                title="도면을 삭제하시겠습니까?"
                description="삭제한 도면은 복구할 수 없습니다."
                targetLabel={
                    deleteTarget?.title
                }
                loading={
                    deleting
                }
            />

            {/* =====================================================
                등록 / 변경 / 삭제 결과 공통 Alert
            ===================================================== */}

            <AlertModal
                open={
                    alert !== null
                }
                onClose={() =>
                    setAlert(null)
                }
                message={
                    alert?.message ?? ''
                }
                variant={
                    alert?.variant
                }
            />
        </section>
    );
}