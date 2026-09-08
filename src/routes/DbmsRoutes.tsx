

import { Navigate, Route, Routes } from 'react-router-dom';
import ShopList from '../pages/dbms/shop/ShopList';
import ShopForm from '../pages/dbms/shop/ShopForm';
import InMenuList from '../pages/dbms/menu/InMenuList';
import InMenuForm from '../pages/dbms/menu/InMenuForm';
import ShopMenuList from '../pages/dbms/menu/ShopMenuList';
import ShopMenuForm from '../pages/dbms/menu/ShopMenuForm';
import CctvIssueList from '../pages/dbms/cctv/CctvIssueList';
import CctvVisitorList from '../pages/dbms/cctv/CctvVisitorList';
import CctvList from '../pages/dbms/cctv/CctvList';
import CctvForm from '../pages/dbms/cctv/CctvForm';
import CctvIssueCodeList from '../pages/dbms/cctv/CctvIssueCodeList';
import CctvIssueCodeForm from '../pages/dbms/cctv/CctvIssueCodeForm';
import CctvStreamList from '../pages/dbms/cctv/CctvStreamList';
import CctvStreamForm from '../pages/dbms/cctv/CctvStreamForm';
import SurveyForm from '../pages/dbms/survey/SurveyForm';
import SurveyList from '../pages/dbms/survey/SurveyList';
import SurveyResponseList from '../pages/dbms/survey/SurveyResponseList';
import ShopMapList from '../pages/dbms/shopmap/ShopMapList';
import MemberList from '../pages/dbms/member/MemberList';
import DbmsLogin from '../pages/main/DbmsLogin'
import MemberDetail from '../pages/dbms/member/MemberDetail';
import UpdateHistory from '../pages/dbms/member/UpdateHistoryList';
import LoginHistory from '../pages/dbms/member/LoginHistoryList';
import MyPage from '../pages/main/mypage/MyPage';
import ChangePassword from '../pages/main/mypage/ChangePassword';

import QaForm from '../pages/dbms/qa/QaForm';
import QaList from '../pages/dbms/qa/QaList';
import QaDetail from '../pages/dbms/qa/QaDetail';
import NoticeList from '../pages/dbms/notice/NoticeList';
import NoticeDetail from '../pages/dbms/notice/NoticeDetail';
import NoticeForm from '../pages/dbms/notice/NoticeForm';
import AttachList from '../pages/dbms/attach/AttachList';
import ShopPlanForm from '../pages/dbms/shopplan/ShopPlanForm';
import ShopPlanList from '../pages/dbms/shopplan/ShopPlanList';

import NotificationAdmin from '../pages/dbms/notification/NotificationAdmin';

export default function DbmsRoutes() {
  return (
    <Routes>

      {/* 참고해서 추가하시면 됩니다 / 페이지 추가 */}
      <Route path="notice" element={<NoticeList />} />
      <Route path="notice/:no" element={<NoticeDetail />} />
      <Route path="notice/new" element={<NoticeForm />} />
      <Route path="notice/:no/edit" element={<NoticeForm />} />

      <Route path="qa" element={<QaList />} />
      <Route path="qa/new" element={<QaForm />} />
      <Route path="qa/:no/edit" element={<QaForm />} />
      <Route path="qa/:no" element={<QaDetail />} />

      <Route path="attach" element={<AttachList />} />

      <Route path="shopplan" element={<ShopPlanList />} />
      <Route path="shopplan/new" element={<ShopPlanForm />} />
      <Route path="shopplan/:no/edit" element={<ShopPlanForm />} />


      <Route path="inmenu" element={<InMenuList />} />
      <Route path="inmenu/new" element={<InMenuForm />} />
      <Route path="inmenu/:no/edit" element={<InMenuForm />} />

      <Route path="shopmenu" element={<ShopMenuList />} />
      <Route path="shopmenu/new" element={<ShopMenuForm />} />
      <Route path="shopmenu/:no/edit" element={<ShopMenuForm />} />

      <Route path="shop" element={<ShopList />} />
      <Route path="shop/:no/edit" element={<ShopForm />} />

      <Route path="cctvissue" element={<CctvIssueList />} />
      <Route path="cctvvisitor" element={<CctvVisitorList />} />

      <Route path="cctv" element={<CctvList />} />
      <Route path="cctv/new" element={<CctvForm />} />
      <Route path="cctv/:no/edit" element={<CctvForm />} />

      {/* 이상행동유형코드 관리 (CCTV_ISSUE_CODE) */}
      <Route path="cctvissuecode" element={<CctvIssueCodeList />} />
      <Route path="cctvissuecode/new" element={<CctvIssueCodeForm />} />
      <Route path="cctvissuecode/:code/edit" element={<CctvIssueCodeForm />} />

      {/* CCTV 스트림 연결정보 관리 (CCTV_STREAM) */}
      <Route path="cctvstream" element={<CctvStreamList />} />
      <Route path="cctvstream/new" element={<CctvStreamForm />} />
      <Route path="cctvstream/:no/edit" element={<CctvStreamForm />} />


      <Route path="survey" element={<SurveyList />} />
      <Route path="survey/create" element={<SurveyForm />} />
      <Route path="survey/:no/edit" element={<SurveyForm />} />
      <Route path="survey/:no/responses" element={<SurveyResponseList />} />

      <Route path="shopmap" element={<ShopMapList />} />

      <Route path="login" element={<DbmsLogin />} />{/* 관리자 로그인 */}
      <Route path="memberlist" element={<MemberList />} />
      <Route path="memberlist/:role/:no" element={<MemberDetail />} />
      <Route path="history/update" element={<UpdateHistory />} />
      <Route path="history/login" element={<LoginHistory />} />

      <Route path="mypage" element={<MyPage />} />
      <Route path="mypage/change-password" element={<ChangePassword />} />

      {/* 관리자 알림 조회*/}
      <Route path="notification" element={<NotificationAdmin />} />
    </Routes>
  );
}
