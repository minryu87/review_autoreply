# 병원 리뷰 자동 답변 생성 서비스 (review_autoreply)

## 개요
- 병원 리뷰(긍정/부정)에 대해 자동으로 답변을 생성하는 서비스입니다.
- 메인화면은 좌우 2분할(좌: 긍정, 우: 부정) 구조로, 각 패널에서 스타일/리뷰/답변 미리보기를 독립적으로 관리합니다.

---

## 주요 파일 구조

```
review_autoreply/
├── index.html            # 메인화면(2분할 구조, 반드시 최신 버전 사용)
├── static/
│   ├── main.js           # 프론트엔드 JS (긍정/부정 분리 렌더링)
│   └── style.css         # 메인 스타일 (2분할 레이아웃 포함)
├── ...                   # 기타 백엔드/서버 파일
```

---

## 배포/업데이트 방법

1. **index.html 최신화**
   - 반드시 2분할 구조(긍정/부정)로 작성된 최신 index.html을 사용하세요.
   - `id="positiveStyleList"`, `id="negativeStyleList"` 등 JS에서 참조하는 id가 모두 포함되어야 합니다.

2. **static/main.js, static/style.css 최신화**
   - main.js: 긍정/부정 패널 분리 렌더링 로직이 반영된 최신 버전 사용
   - style.css: `.main-layout`, `.main-left-panel`, `.main-right-panel` 등 2분할 레이아웃 스타일 포함

3. **서버 재배포**
   - 최신 파일(index.html, main.js, style.css 등)을 서버에 반영 후, 서버를 재시작하세요.
   - 배포 후 브라우저에서 강력 새로고침(Ctrl+Shift+R 또는 Cmd+Shift+R)으로 캐시를 비우고 확인하세요.

---

## 자주 발생하는 문제 및 해결법

- **Cannot set properties of null (setting 'onclick')**
  - index.html에 필요한 id가 누락된 경우 발생. 최신 index.html을 반드시 사용하세요.

- **화면이 2분할로 보이지 않음**
  - index.html, style.css가 최신이 아니거나, 브라우저 캐시 문제일 수 있음. 강력 새로고침 필수.

- **JS/HTML 동기화 문제**
  - main.js와 index.html의 id/class가 반드시 일치해야 합니다.

---

## 기타

- 추가적인 기능/버그 수정이 필요하면 언제든 문의해 주세요.