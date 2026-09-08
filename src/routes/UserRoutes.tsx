import { Link, Navigate, Route, Routes } from 'react-router-dom';

/* 예시용 입니다. */
import DashboardLayout from '../components/layout/DashboardLayout';
import Test1 from '../pages/user/dashboard/Test1';
import Test2 from '../pages/user/dashboard/Test2';
import Test3 from '../pages/user/dashboard/Test3';
import Test4 from '../pages/user/dashboard/Test4';
import Test5 from '../pages/user/dashboard/Test5';


import QaList from '../pages/user/qa/QaList';
import QaForm from '../pages/user/qa/QaForm';
import QaDetail from '../pages/user/qa/QaDetail';

import NoticeList from '../pages/user/notice/NoticeList';
import NoticeDetail from '../pages/user/notice/NoticeDetail';


import ShopList from '../pages/user/shop/ShopList';
import ShopForm from '../pages/user/shop/ShopForm';
import ShopCalendar from '../pages/user/shop/ShopCalendar';
import CctvIssueList from '../pages/user/cctv/CctvIssueList';
import CctvList from '../pages/user/cctv/CctvList';
import CctvVisitorList from '../pages/user/cctv/CctvVisitorList';

import SurveyUserList from '../pages/user/survey/SurveyUserList';
import SurveyAnswerForm from '../pages/user/survey/SurveyAnswerForm';
import SurveyMyResponse from '../pages/user/survey/SurveyMyResponse';

import ShopMapUserList from '../pages/user/shopmap/ShopMapUserList';

import MyPage from '../pages/main/mypage/MyPage';
import ChangePassword from '../pages/main/mypage/ChangePassword';

import ShopMatch from '../pages/user/shoporder/ShopMatch';
import ShopOrderList from '../pages/user/shoporder/ShopOrderList';
import ShopOrderDetail from '../pages/user/shoporder/ShopOrderDetail';
import ShopPaymentList from '../pages/user/shoporder/ShopPaymentList';
import ShopPaymentDetail from '../pages/user/shoporder/ShopPaymentDetail';
import ShopRefundDetail from '../pages/user/shoporder/ShopRefundDetail';
import ShopOrderLog from '../pages/user/shoporder/ShopOrderLog';
import ShopOrder from '../pages/user/shop/ShopOrderList';
import ShopOrderMatch from '../pages/user/shoporder/ShopOrderMatch';

export default function UserRoutes() {
  return (
    <Routes>
      {/* 참고해서 추가하시면 됩니다 / 페이지 추가 */}
      <Route index element={<Navigate to="shop" replace />} />

      <Route path="qa" element={<QaList />} />
      <Route path="qa/new" element={<QaForm />} />
      <Route path="qa/:no/edit" element={<QaForm />} />
      <Route path="qa/:no" element={<QaDetail />} />

      <Route path="notice" element={<NoticeList />} />
      <Route path="notice/:no" element={<NoticeDetail />} />

      {/* 전체 구독내역 */}
      <Route path="shoporder" element={<ShopOrderList />} />
      <Route path="shoporder/:no/match" element={<ShopMatch />} />
      <Route path="shoporder/:ono" element={<ShopOrderDetail />}>
        <Route path="payment" element={<ShopPaymentList />} />
        <Route path="history" element={<ShopOrderLog />} />
      </Route>
      <Route path="shoporder/:ono/payment/:pno" element={<ShopPaymentDetail />} />
      <Route path="shoporder/:ono/payment/:pno/refund" element={<ShopRefundDetail />} />

      {/* 매장별 구독권 */}
      <Route path="order" element={<ShopOrder />} />
      <Route path="order/:sno/match" element={<ShopOrderMatch />} />
      <Route path="order/:ono" element={<ShopOrderDetail />}>
        <Route path="payment" element={<ShopPaymentList />} />
        <Route path="history" element={<ShopOrderLog />} />
      </Route>
      <Route path="order/:ono/payment/:pno" element={<ShopPaymentDetail />} />
      <Route path="order/:ono/payment/:pno/refund" element={<ShopRefundDetail />} />


      <Route path="shop" element={<ShopList />} />
      <Route path="shop/new" element={<ShopForm />} />
      <Route path="shop/:no/edit" element={<ShopForm />} />
      <Route path="cctv" element={<CctvList />} />
      <Route path="cctvissue" element={<CctvIssueList />} />
      <Route path="cctvvisitor" element={<CctvVisitorList />} />
      <Route path="calendar" element={<ShopCalendar />} />

      <Route path="mypage" element={<MyPage />} />
      <Route path="mypage/change-password" element={<ChangePassword />} />



      {/* 예시용 */}
      <Route element={<DashboardLayout />}>{/* 대시보드용 레이아웃 적용 */}
        <Route path="dashboard/test1" element={<Test1 />} />
        <Route path="dashboard/test2" element={<Test2 />} />
        <Route path="dashboard/test3" element={<Test3 />} />
        <Route path="dashboard/test4" element={<Test4 />} />
        <Route path="dashboard/test5" element={<Test5 />} />
      </Route>

      <Route path="survey" element={<SurveyUserList />} />
      <Route path="survey/:no" element={<SurveyAnswerForm />} />
      <Route path="survey/:no/response" element={<SurveyMyResponse />} />

      <Route path="shopmap" element={<ShopMapUserList />} />


    </Routes>
  );
}