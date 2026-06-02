# Travel Itinerary

공개 Google Sheets를 데이터 소스로 사용하는 React + TypeScript 여행 일정 웹앱입니다.

## 실행

```bash
npm install
npm run dev
```

## Google Sheets 연동

`.env` 파일을 만들고 아래 중 하나를 설정합니다.

```bash
VITE_GOOGLE_SHEET_URL=https://docs.google.com/spreadsheets/d/193dTJ1DzyQN7kTtzOoVMgyFykCFU8PjEnOawXD74EYs/edit?usp=sharing
```

또는

```bash
VITE_GOOGLE_SHEET_ID=193dTJ1DzyQN7kTtzOoVMgyFykCFU8PjEnOawXD74EYs
```

## 필요한 시트명

- `여행정보`
- `여행일정`
- `예상경비`
- `준비물 체크리스트`

브라우저에서 Google Sheets의 공개 CSV 엔드포인트를 탭별로 읽습니다.

```text
https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv&sheet={SHEET_NAME}
```

구글 시트 내용을 수정한 뒤 웹에서 `새로고침` 버튼을 누르면 반영됩니다.
