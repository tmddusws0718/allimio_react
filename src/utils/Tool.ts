import axios from 'axios';
import { useEffect, type KeyboardEvent } from 'react';
import { useLocation } from 'react-router-dom';

const getIP = () => {
  return "10.1.205.118"; // 학원
  // return "1.201.122.84"; // 가비아
}

const getCopyright = () => {
  return "© 2026 allimio Team2 Project";
}

const getNowDate = () => {
  const now = new Date();

  // 💡 1. 24시간제를 확실하게 보장하기 위해 hourCycle: 'h23'을 사용합니다.
  const rdate = now.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23' // 👈 24시간 형식 강제 (오전/오후 텍스트 제거)
  }).replace(/\./g, '-').replace(/- /g, '-').replace(/ /, ' ').trim();

  // rdate 결과물 예시: "2026. 07. 12. 14:12:00" (맨 끝에 마침표가 안 붙음)

  // 💡 2. 점(.)과 공백을 하이픈(-)과 한 칸 공백으로 깔끔하게 정리합니다.
  // return rdate.

  return rdate.replace(/-([0-9]{2}:)/, ' $1'); // 2024-11-06 16:29:5
  // 최종 결과: "2026-07-12 14:12:00" (초 단위 00까지 완벽하게 보존!)
};
// 포커스 이동
function enter_chk(e: React.KeyboardEvent<HTMLInputElement> | KeyboardEvent, nextTag: string) {
  if (e.key === 'Enter') { // 엔터키
    e.preventDefault();
    const nextElement = document.getElementById(nextTag);
    if (nextElement) {
      nextElement.focus();
    }
  }
}

function set_focus(nextTag: string) {
  const nextElement = document.getElementById(nextTag);
  if (nextElement) {
    nextElement.focus();
  }
}

// Ajax 통신 패키지 설정
const axiosInstance = axios.create({
  // 개발 환경과 배포 환경에 따라 baseURL 설정
  // Vite 환경 변수 사용
  // 개발 환경: http://localhost:4000
  // 배포 환경: 상대 경로 ''
  // import.meta.env.PROD : vite 자동 제공 환경 변수 true: 배포, false: 개발,
  // npm run dev: import.meta.env.PROD -> false로 자동 설정
  // npm run build: import.meta.env.PROD -> true로 자동 설정
  // '': 같은 ip에 Backend 서버가 있다는 가정하에 상대경로로 요청을 보냄.
  baseURL: import.meta.env.PROD ? `http://${getIP()}:9102` : `http://${getIP()}:9102`
})

/**
 * 첨부파일(이미지 등)의 절대 URL을 만듭니다. <img src>는 axios를 안 거치고 브라우저가
 * 직접 요청하기 때문에 절대경로가 필요한데, 그 origin을 axiosInstance의 baseURL과
 * 똑같이 맞춰줍니다 (매 컴포넌트마다 http://${getIP()}:9102를 직접 조합하지 않도록).
 *
 * @param purl AttachType.purl (예: '/attach/storage/notice/images')
 * @param sname AttachType.sname (서버 저장 파일명)
 */
const getAttachUrl = (purl: string, sname: string) => `${axiosInstance.defaults.baseURL}${purl}/${sname}`;



// 파일 다운로드 함수
const download = async (dir: string, filename: string, downname: string, displayName?: string) => {
  try {
    // ① Spring Boot의 /download 엔드포인트 호출
    // dir: 폴더명, filename: 서버에 저장된 파일명, downname: 원래 파일명
    // Donwload.java 호출
    const response = await axiosInstance.get("/download", {
      params: { dir, filename, downname },  // 쿼리 파라미터 전달 (Download.java 조회 로직은 그대로 downname을 씀)
      responseType: "blob",                 // 응답을 binary(blob)로 받기
    });

    // ② 서버에서 받은 데이터를 Blob(바이너리) 객체로 생성
    const blob = new Blob([response.data]);

    // ③ Blob 데이터를 브라우저가 다운로드할 수 있는 URL로 변환
    const url = window.URL.createObjectURL(blob);

    // ④ 임시로 <a> 태그를 만들어서 클릭 이벤트를 트리거
    const link = document.createElement("a");
    link.href = url;                          // Blob 데이터의 URL 지정
    link.download = displayName ?? downname;  // 실제 저장될 파일 이름 지정
    // ⭐ displayName을 넘기면 그걸로, 안 넘기면 기존처럼 downname을 그대로 씁니다.
    // (downname이 서버 조회용 경로일 때 저장 파일명까지 그 경로로 나오는 걸 막고 싶을 때 씁니다 —
    //  예: 첨부파일 다운로드에서 조회는 "notice/images/abc123.jpg"로 하되, 저장 파일명은
    //  displayName="고양이.jpg"로 예쁘게 보이게)

    // ⑤ <a> 태그를 문서에 추가하고, 강제로 클릭해서 다운로드 실행
    document.body.appendChild(link);
    link.click();

    link.remove(); // ⑥ 클릭 후 <a> 태그 제거 
    window.URL.revokeObjectURL(url); // Blob URL 해제(메모리 누수 방지)

  } catch (err) {
    // ⑦ 예외 처리: 다운로드 실패 시 경고 및 로그 출력
    alert("파일 다운로드 중 오류가 발생했습니다.");
    console.error(err);
  }
};


const isImage = (file1 = "") => {
  // console.log('-> file1.toLowerCase():', "ABC.jpg".toLowerCase());
  // console.log('-> file1.toLowerCase().endsWith(\'jpg\'):', "ABC.jpg".toLowerCase().endsWith('jpg'));

  if (file1 != null) {
    return ['jpg', 'jpeg', 'png', 'gif', 'jfif', 'webp', 'avif'].some(ext => file1.toLowerCase().endsWith(ext));
  } else {
    return false;
  }

}



/**
 * 문자열의 UTF-8 바이트(Byte) 수를 계산합니다.
 * - 영문, 숫자, 공백, 기본 기호: 1 Byte
 * - 한글, 한자, 기타 특수문자: 3 Byte
 */
export const getByteLength = (str: string): number => {
  let byte = 0;
  for (let i = 0; i < str.length; i++) {
    byte += str.charCodeAt(i) > 128 ? 3 : 1;
  }
  return byte;
};

/**
 * 지정한 최대 바이트(maxBytes)를 초과하지 않도록 문자열을 잘라냅니다.
 * 한글 중간에 잘리는 현상을 방지합니다.
 */
export const cutByByte = (str: string, maxBytes: number): string => {
  let byte = 0;
  let result = '';

  for (let i = 0; i < str.length; i++) {
    const char = str.charAt(i);
    const charByte = str.charCodeAt(i) > 128 ? 3 : 1;

    if (byte + charByte > maxBytes) {
      break;
    }

    byte += charByte;
    result += char;
  }

  return result;
};



function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // 페이지가 바뀔 때 스크롤을 맨 위, 맨 왼쪽으로 이동
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'auto' // 부드러운 스크롤 효과
    });
  }, [pathname]);

  // 화면에 아무것도 렌더링하지 않으므로 null 반환
  return null;
}


export { getIP, getCopyright, getNowDate, enter_chk, set_focus, axiosInstance, download, isImage, getAttachUrl, ScrollToTop };
// import {getIP, getCopyright, getNowDate, enter_chk, set_focus} from 'Tool';