import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, AlertModal } from '../../../components/ui';
import { axiosInstance, getNowDate } from '../../../utils/Tool';
import { GlobalStoreSession } from '../../../store/LoginStore';
import { GlobalCurrentShop } from '../../../store/UserStore';
import type { ShopPlanTypes } from '../../../components/ts/ShopPlan';
import './shoPlan.css'
import type { ORRequest, ShopOrderTypes } from '../../../components/ts/ShopOrder';
import { PMETHOD_MAP, PMETHOD_ICON } from '../../../components/ts/ShopPayment';


/* ---------------------------------------------------------------------
   구독권 안내 · 결제 (/user/subscribe) — 3단계 위저드
   1. 기간 토글(슬라이딩) + 요금제 카드 선택
   2. CCTV 대수 선택 (결제수단과 분리)
   3. 결제하기 — 최종 확인 + 결제수단(필터칩) 선택 + 결제

   ShopPlanTypes의 pmonth/bprice/mincctv/maxcctv가 폼(ShopPlanForm.tsx) 쪽 입력
   상태 타입 때문에 number | '' 로 잡혀있어서, 이 화면에서 산술 비교/계산할 때는
   전부 Number()로 감싸서 씁니다.

   API
   GET  /shop_plan/list  → ShopPlanTypes[] (issell='Y'만 내려옴)
   POST /shop_order        → ORRequest → 주문 생성
   POST /shop_payment       → PRequest → 결제 등록
--------------------------------------------------------------------- */


export default function ShopPlan() {
  const navigate = useNavigate();
  const { no: mno, login } = GlobalStoreSession();
  const shopNo = GlobalCurrentShop((state) => state.no);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [plans, setPlans] = useState<ShopPlanTypes[]>([]);
  const [loading, setLoading] = useState(true);

  const [month, setMonth] = useState<number | null>(null);
  const [plan, setPlan] = useState<ShopPlanTypes | null>(null);
  const [qty, setQty] = useState(1);
  const [pmethod, setPmethod] = useState<0 | 1 | 2>(0);

  const [paying, setPaying] = useState(false);
  const [alert, setAlert] = useState<{ message: string; variant?: 'success' | 'error', onConfirm?: () => void } | null>(null);

  useEffect(() => {
    axiosInstance
      .get<ShopPlanTypes[]>('/shop_plan/list')
      .then((res) => {
        setPlans(res.data);
        const months = Array.from(new Set(res.data.map((p) => Number(p.pmonth)))).sort((a, b) => a - b);
        if (months.length > 0) setMonth(months[0]);
      })
      .catch((err) => console.error('구독권 목록 조회 실패:', err))
      .finally(() => setLoading(false));

  }, [mno]);

  const months = Array.from(new Set(plans.map((p) => Number(p.pmonth)))).sort((a, b) => a - b);
  const plansForMonth = plans.filter((p) => Number(p.pmonth) === month);
  const monthIndex = month !== null ? months.indexOf(month) : 0;
  const longestMonth = months.length > 0 ? Math.max(...months) : null;

  const totalPrice = plan && month ? Number(plan.bprice) * qty * month : 0;

  const selectPlan = (p: ShopPlanTypes) => {
    setPlan(p);
    setQty(Number(p.mincctv));
    setStep(2);
  };

  const changeQty = (delta: number) => {
    if (!plan) return;
    const min = Number(plan.mincctv);
    const max = Number(plan.maxcctv);
    setQty((prev) => Math.min(max, Math.max(min, prev + delta)));
  };

  const goBack = (n: 1 | 2) => setStep(n);



  const handlePay = async () => {
    if (!mno) {
      setAlert({ message: '로그인이 필요합니다.', variant: 'error' });
      return;
    }
    if (!plan || !month) return;

    const orderPayload: ORRequest = {
      pno: plan.no,
      mno,
      pmonth: month,
      ccnt: qty,
      bprice: Number(plan.bprice),
      totalprice: totalPrice,
      pmethod
    };

    setPaying(true);
    try {
      const orderRes = await axiosInstance.post<ShopOrderTypes>('/shop_order', orderPayload);
      navigate(`/user/shoporder/${orderRes.data.no}/match`);

      const getGrade = await axiosInstance.get(`/shop_order/grade/${mno}`)
      GlobalStoreSession.getState().setGrade(getGrade.data);
      
    } catch (err) {
      console.error('결제 실패:', err);
      setAlert({ message: '결제 처리 중 오류가 발생했습니다.', variant: 'error' });
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return <p className="b_title">구독권 정보를 불러오는 중...</p>;
  }

  return (
    <>
      {/* 프로그레스 스테퍼 */}
      {(() => {
        const STEPS = ['요금제 선택', 'CCTV 대수 선택', '결제하기'];
        return (
          <div className="progress_stepper" role="list" aria-label="구독 결제 진행 단계">
            {STEPS.map((label, idx) => {
              const n = idx + 1;
              const state = step === n ? 'on' : step > n ? 'done' : '';
              return (
                <div className={`progress_step ${state}`} key={n} role="listitem">
                  <div className="progress_step_row">
                    <span className="progress_step_circle">
                      {step > n ? 
                        (<span className='check'>
                          <span className='hidden'>{n} 단계 완료</span>
                        </span> )
                        : n
                      }
                    </span>

                    {idx < STEPS.length - 1 && <span className="progress_step_line" />}
                  </div>
                  <span className="progress_step_label">{label}</span>
                </div>
              );
            })}
          </div>
        );
      })()}


      {/* STEP 1 : 기간 슬라이딩 토글 + 요금제 카드 */}
      {step === 1 && (
        <section className="view active">
          <div className="ott_hero">
            <h2 className="title xlg">한 개의 매장에 맞는 요금제를 선택하세요</h2>
            <p className="b_title lg">매장에 필요한 CCTV 대수에 맞춰 필요한 만큼만 결제하세요.</p>
          </div>
          
          <div className="ott_toggle_wrap">
            {longestMonth !== null && (
              <span
                className="ott_free_badge"
                style={{
                  left: `${(100 / Math.max(months.length, 1)) * (months.indexOf(longestMonth) + 0.5)}%`,
                }}
              >
                🎁 {longestMonth}개월 선택 시 2개월 무료
              </span>
            )}

            <div className="ott_toggle" role="radiogroup" aria-label="이용 기간 선택">
              <span
                className="ott_toggle_slider"
                style={{
                  width: `calc(${100 / Math.max(months.length, 1)}% - 10px)`,
                  left: `calc(${(100 / Math.max(months.length, 1)) * monthIndex}% + 5px)`,
                }}
              />
              {months.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`ott_toggle_btn${month === m ? ' on' : ''}`}
                  onClick={() => setMonth(m)}
                >
                  {m}개월
                </button>
              ))}
            </div>
          </div>
            
          <div className="panel">
            <p className="b_caption">* 구독권 선택시 만료 전까지 변경할 수 없습니다.</p>
            <div className='plan_grid'>
              {plansForMonth.map((p) => {
                const highlighted = p.isreco === 'Y' || p.popular;
                return (
                  <button
                    key={p.no}
                    type="button"
                    className={`card plan_card${highlighted ? ' plan_highlight' : ''}`}
                    onClick={() => selectPlan(p)}
                  >
                    {p.isreco === 'Y' ? (
                      /* 사용자가 선택한 통계가 없는 경우 관리자 추천 */
                      <span className="plan_tag reco">추천</span>
                    ) : p.popular ? (
                      <span className="plan_tag popular">인기</span>
                    ) : null}
                    

                    <h3>{p.pname}</h3>
                    <div className="plan_range mono">{Number(p.mincctv)} ~ {Number(p.maxcctv)}대</div>
                    <div className="plan_unit mono">
                      대당 <span className='price'>{Number(p.bprice).toLocaleString('ko-KR')}</span>원 / {month}개월
                    </div>
                    {p.description && (
                      <ul>
                        {p.description.split('|').filter(Boolean).map((f) => (
                          <li key={f}>{f}</li>
                        ))}
                      </ul>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}


      {/* STEP 2 : CCTV 대수 선택 */}
      {step === 2 && (
        <section className="view active">
          <div className="ott_hero">
            <h2 className="title xlg">연동 CCTV 대수 선택</h2>
            <p className="b_title lg">allimio 관제 서비스를 연동할 정확한 CCTV 대수를 선택해주세요</p>
          </div>
          
          {step === 2 && plan && month !== null && (
            <div className="panel flex">
              <div className="order_summary">
                <div className="cctv_stepper">
                  <label htmlFor="cctvQty">CCTV 대수</label>

                  <div className="stepper">
                    <button
                      type="button"
                      className="stepper_btn"
                      disabled={qty <= Number(plan.mincctv)}
                      onClick={() => changeQty(-1)}
                      aria-label="대수 1대 줄이기"
                    >
                      –
                    </button>
                    <input
                      id="cctvQty"
                      type="number"
                      className="stepper_input"
                      value={qty}
                      onChange={(e) => {
                        const min = Number(plan.mincctv);
                        const max = Number(plan.maxcctv);
                        const v = Number(e.target.value) || min;
                        setQty(Math.min(max, Math.max(min, v)));
                      }}
                    />
                    <button
                      type="button"
                      className="stepper_btn"
                      disabled={qty >= Number(plan.maxcctv)}
                      onClick={() => changeQty(1)}
                      aria-label="대수 1대 늘리기"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="gd_label">
                  <p className='b_title sm'>
                    {plan.pname} 요금제는 {Number(plan.mincctv)}~{Number(plan.maxcctv)}대의 CCTV를 지정 할 수 있습니다.
                  </p>

                  <button type="button" className="wz_back" onClick={() => goBack(1)}>요금제 다시 선택</button>
                </div>

                <div className="order_lines">
                  <div className="order_line"><span>요금제</span><span>{plan.pname}</span></div>
                  <div className="order_line"><span>결제 주기</span><span>{month}개월</span></div>
                  <div className="order_line"><span>대당 단가</span><span>{Number(plan.bprice).toLocaleString('ko-KR')}원</span></div>
                  <div className="order_line"><span>선택 대수</span><span>{qty}대</span></div>
                </div>

                <button
                  type="button"
                  className="btn btn_lg btn_primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => setStep(3)}
                >
                  결제하기
                </button>
              </div>
            </div>
          )}

        </section>
      )}


      {/* STEP 3 : 결제하기 — 최종 확인 + 결제수단 필터칩 */}
      {step === 3 && (
        <section className="view active">
          <div className="ott_hero">
            <h2 className="title xlg">선택한 내용을 확인하고 결제하세요</h2>
            <p className="b_title lg">결제 후 CCTV 대수 변경은 가능하나 구독권 종류는 변경할 수 없습니다.</p>
          </div>

          {plan && month !== null && (
            <div className="panel flex">
              <div className="order_summary">
                <div className="gd_label">
                  결제하기
                  <button type="button" className="wz_back" onClick={() => goBack(2)}>대수 다시 선택</button>
                </div>
                
                <div className="order_lines">
                  <div className="order_line"><span>요금제</span><span>{plan.pname}</span></div>
                  <div className="order_line"><span>결제 주기</span><span>{month}개월</span></div>
                  <div className="order_line"><span>대당 단가</span><span>{Number(plan.bprice).toLocaleString('ko-KR')}원</span></div>
                  <div className="order_line"><span>CCTV 대수</span><span>{qty}대</span></div>
                </div>

                <div className="pmethod_filter_wrap">
                  <div className="form_label" style={{ marginBottom: 10 }}>결제수단</div>
                  <div className="pmethod_filter" role="radiogroup" aria-label="결제수단 선택">
                    {[0, 1, 2].map((m) => (
                      <button
                        key={m}
                        type="button"
                        className={`pmethod_chip${pmethod === m ? ' on' : ''}`}
                        onClick={() => setPmethod(m as 0 | 1 | 2)}
                        aria-pressed={pmethod === m}
                      >
                        <span className="pmethod_chip_icon">{PMETHOD_ICON[m]}</span>
                        {PMETHOD_MAP[m].label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="order_total">
                  <span>총 결제 금액</span>
                  <div className="price mono">
                    {totalPrice.toLocaleString('ko-KR')}<span>원</span>
                  </div>
                </div>

                {!shopNo && (
                  <div className="form_hint" style={{ marginBottom: 16 }}>
                    결제 완료 후 매장을 등록하여 구독권을 연결할 수 있습니다.
                  </div>
                )}
                
                <button
                  type="button"
                  className="btn btn_lg btn_primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                  disabled={paying}
                  onClick={handlePay}
                >
                  {paying ? '결제 처리 중...' : '결제하기'}
                </button>

              </div>
            </div>
          )}
        </section>
      )}

      <AlertModal
        open={alert !== null}
        onClose={() => {
          const success = alert?.variant === 'success';
          setAlert(null);
          if (success) navigate('/');
        }}
        message={alert?.message ?? ''}
        variant={alert?.variant}
      />
    </>

  );
}