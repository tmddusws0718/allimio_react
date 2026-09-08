import { useEffect, useState } from 'react';
import { PageHeader, AlertModal } from '../../../components/ui';
import { axiosInstance } from '../../../utils/Tool';
import { GlobalStoreSession } from '../../../store/LoginStore';
import type { ShopType, ShopSearchResult } from '../../../components/ts/ShopUser';
import type { InviteCodeType, InviteCreateRequest } from '../../../components/ts/Invite';
import { INVITE_CODE_VALID_MINUTES } from '../../../components/ts/Invite';

interface InviteCreateProps {
  onBack: () => void;
}

/* ---------------------------------------------------------------------
   초대코드 발급 화면 - 점주가 보유한 매장 목록에서 하나를 선택하면
   해당 매장번호(sno)로 6자리 초대코드를 발급받습니다. 매장은 한 번에
   하나만 선택할 수 있고, "선택" 클릭 즉시 발급 API를 호출합니다.

   API (가정 - 실제 엔드포인트/DTO 필드명은 백엔드 구현에 맞춰 조정하세요)
   GET  /shop/search?mno=&grade=&page=0&size=50 → 보유 매장 목록 (ShopList.tsx/Topbar.tsx와 동일 패턴)
   POST /invite_code/create { sno, mno }         → InviteCodeType (code, expiryDate 포함)
--------------------------------------------------------------------- */
export default function InviteCreate({ onBack }: InviteCreateProps) {
  const { no: mno, grade } = GlobalStoreSession();

  const [shops, setShops] = useState<ShopType[]>([]);
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState<number | null>(null); // 발급 중인 sno
  const [issued, setIssued] = useState<{ shop: ShopType; code: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [alert, setAlert] = useState<{ message: string; variant?: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!mno) {
      setLoading(false);
      return;
    }
    setLoading(true);
    axiosInstance
      .get<ShopSearchResult>('/shop/search', {
        params: { mno, grade, page: 0, size: 50 },
      })
      .then((res) => setShops(res.data.content ?? []))
      .catch((err) => {
        console.error('매장 목록 조회 실패:', err);
        setShops([]);
      })
      .finally(() => setLoading(false));
  }, [mno, grade]);

  const selectShop = async (shop: ShopType) => {
  if (!shop.no || issuing) return;
  setIssuing(shop.no);
  try {
    const res = await axiosInstance.post<string>(`/invite/create/${shop.no}`);
    setIssued({ shop, code: res.data });
    setCopied(false);
  } catch (err) {
    console.error('초대코드 발급 실패:', err);
    setAlert({ message: '초대코드 발급에 실패했습니다.\n다시 시도해주세요.', variant: 'error' });
  } finally {
    setIssuing(null);
  }
};

  const copyCode = async () => {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(issued.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 클립보드 권한이 없는 환경 — 조용히 무시
    }
  };

  // 발급 완료 화면 — 코드 + 대상 매장 + 만료 안내
  if (issued) {
    return (
      <section className="view active">
        <PageHeader
          title="초대코드 발급 완료"
          description={`${issued.shop.title} 매장에 초대할 코드가 발급되었습니다.`}
          actions={
            <button type="button" className="btn btn_md btn_ghost" onClick={onBack}>
              ← 처음으로
            </button>
          }
        />

        <div className="card card_pad_lg" style={{ textAlign: 'center' }}>
          <p className="b_title" style={{ marginBottom: 16 }}>
            아래 코드를 초대할 직원에게 전달해주세요.
          </p>

          <div
            className="mono"
            style={{
              display: 'inline-block',
              padding: '18px 32px',
              fontSize: 32,
              fontWeight: 800,
              letterSpacing: 8,
              color: 'var(--primary)',
              background: 'var(--surface-2)',
              border: '1px solid var(--border-strong)',
              borderRadius: 12,
              marginBottom: 16,
            }}
          >
            {issued.code}
          </div>

          <div>
            <button type="button" className="btn btn_sm btn_outline_primary" onClick={copyCode}>
              {copied ? '복사됨 ✓' : '코드 복사'}
            </button>
          </div>

          <p className="form_hint" style={{ marginTop: 16 }}>
              : `발급 후 약 ${INVITE_CODE_VALID_MINUTES}분간 사용할 수 있습니다.`
          </p>
        </div>

        <AlertModal open={alert !== null} onClose={() => setAlert(null)} message={alert?.message ?? ''} variant={alert?.variant} />
      </section>
    );
  }

  return (
    <section className="view active">
      <PageHeader
        title="초대할 매장 선택"
        description="직원을 초대할 매장을 하나 선택해주세요."
        actions={
          <button type="button" className="btn btn_md btn_ghost" onClick={onBack}>
            ← 처음으로
          </button>
        }
      />

      {loading ? (
        <p className="b_title">불러오는 중...</p>
      ) : shops.length === 0 ? (
        <div className="card card_pad_lg no_data">
          <p className="b_title">등록된 매장이 없습니다. 먼저 매장을 등록해주세요.</p>
        </div>
      ) : (
        <div className="store_grid">
          {shops.map((s) => (
            <div className="card store_card" key={s.no}>
              <div className="store_body">
                <div className="sname">{s.title}</div>
                <div className="saddr">
                  {s.address}
                  {s.address2 ? ` ${s.address2}` : ''}
                </div>
                <button
                  type="button"
                  className="btn btn_primary"
                  disabled={issuing === s.no}
                  onClick={() => selectShop(s)}
                >
                  {issuing === s.no ? '발급 중...' : '선택'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AlertModal open={alert !== null} onClose={() => setAlert(null)} message={alert?.message ?? ''} variant={alert?.variant} />
    </section>
  );
}