/* ---------------------------------------------------------------------
   직원 초대(INVITE_CODE) 타입/상수. InviteMain.tsx(진입) → InviteCreate.tsx(초대하기),
   InviteAccept.tsx(수락하기)에서 참조합니다.

   InviteCodeDTO (백엔드 가정 - 실제 필드명은 구현에 맞춰 조정하세요)
   no         long    - PK
   sno        long    - 초대할 매장번호(SHOP.no)
   mno        long    - 초대를 발급한 점주 회원번호(MEMBER.no)
   code       String  - 랜덤 6자리 초대코드
   expiryDate String  - 만료일시 "YYYY-MM-DD HH:MM:SS"
   cdate      String  - 발급일시

   API (InviteCodeCont, /invite_code) - 실제 엔드포인트/필드명은 백엔드 구현에 맞춰 조정하세요.
   POST /invite_code/create  { sno, mno }  → InviteCodeType (code 포함)
   POST /invite_code/accept  { code, mno } → InviteAcceptResult (성공 시 SHOP_MEMBER 등록)
--------------------------------------------------------------------- */

export interface InviteCodeType {
  no?: number;
  sno: number;
  mno: number;
  code: string;
  expiryDate: string;
  cdate?: string;
}

export interface InviteCreateRequest {
  sno: number;
  mno: number;
}

export interface InviteAcceptRequest {
  code: string;
  mno: number;
}

/** 수락 결과 - 성공 시 어느 매장에 소속되었는지 함께 내려줌 */
export interface InviteAcceptResult {
  success: boolean;
  message: string;
  sno?: number;
  shopTitle?: string;
}

/** 초대코드 유효시간(안내 문구용, 실제 만료 판정은 서버 기준) */
export const INVITE_CODE_VALID_MINUTES = 15;