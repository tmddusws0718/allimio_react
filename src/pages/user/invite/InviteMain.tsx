import { useState } from 'react';
import { PageHeader } from '../../../components/ui';
import { GlobalStoreSession } from '../../../store/LoginStore';
import InviteCreate from './InviteCreate'
import InviteAccept from './InviteAccept';

type InviteView = 'select' | 'create' | 'accept';

/* ---------------------------------------------------------------------
   회원 초대(/user/invite) - 진입 화면.

   - "초대하기": 점주(grade === 10)만 가능. 보유 매장 목록에서 하나를 선택하면
     해당 매장번호(sno)로 6자리 초대코드를 발급받습니다.
   - "수락하기": 누구나 가능. 발급받은 6자리 코드를 입력하면 내 회원번호(mno)와
     함께 서버로 보내 SHOP_MEMBER에 등록됩니다.

   grade 값 기준(store/LoginStore.ts 주석): 1~5 관리자, 6~10 회원.
   점주 판별은 다른 화면(SurveyAnswerForm.tsx, ShopMapUserList.tsx)과 동일하게
   grade === 10 을 기준으로 합니다.
--------------------------------------------------------------------- */
export default function InviteMain() {
  const { grade } = GlobalStoreSession();
  const isShopOwner = grade === 10;

  const [view, setView] = useState<InviteView>('select');

  if (view === 'create') {
    return <InviteCreate onBack={() => setView('select')} />;
  }

  if (view === 'accept') {
    return <InviteAccept onBack={() => setView('select')} />;
  }

  return (
    <section className="view active">
      <PageHeader title="회원 초대" description="매장 직원을 초대하거나, 받은 초대코드로 매장에 합류할 수 있습니다." />

      <div className="grid_2">
        <div className="card card_pad_lg">
          <h3 className="title md" style={{ marginBottom: 8 }}>
            초대하기
          </h3>
          <p className="b_title" style={{ marginBottom: 20 }}>
            보유한 매장 중 하나를 선택해 직원 초대코드를 발급합니다. 점주만 이용할 수 있습니다.
          </p>
          {isShopOwner ? (
            <button type="button" className="btn btn_md btn_primary" onClick={() => setView('create')}>
              초대코드 발급하기
            </button>
          ) : (
            <p className="form_hint error">점주만 초대코드를 발급할 수 있습니다.</p>
          )}
        </div>

        <div className="card card_pad_lg">
          <h3 className="title md" style={{ marginBottom: 8 }}>
            수락하기
          </h3>
          <p className="b_title" style={{ marginBottom: 20 }}>
            점주에게 받은 6자리 초대코드를 입력하면 해당 매장의 직원으로 등록됩니다.
          </p>
          <button type="button" className="btn btn_md btn_outline_primary" onClick={() => setView('accept')}>
            초대코드 입력하기
          </button>
        </div>
      </div>
    </section>
  );
}