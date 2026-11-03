# haiyuki-relay

온라인 대전용 WebSocket 릴레이. Cloudflare Worker가 라우팅하고 방 하나가 Durable Object 하나(`idFromName(CODE)`)다. 서버는 메시지 내용을 보지 않고 상대에게 그대로 넘긴다.

## 프로토콜

| 항목 | 내용 |
| --- | --- |
| 접속 | `GET wss://<host>/room/<CODE>?role=host\|guest` (WebSocket 업그레이드) |
| 코드 | 대문자 A~Z에서 I·O 제외 다섯 글자. 틀리면 400 |
| 자리 | `host`·`guest` 각 하나. 이미 찬 자리는 업그레이드는 받되 `{"type":"peer","state":"full"}`을 보내고 1008로 닫는다(브라우저는 거절 상태 코드를 읽을 수 없어서). 호스트 없이 게스트가 먼저 와도 됨 |
| 서버 메시지 | `{"type":"peer","state":"joined"}` (상대 접속 시 양쪽에, 접속 직후 상대가 이미 있으면 바로), `{"type":"peer","state":"left"}` (상대 소켓이 닫힐 때) |
| 그 외 텍스트 | 그대로 상대에게 전달. 상대가 없으면 버림. 핑도 `{"type":"ping"}` 애플리케이션 메시지로 전달 |
| 바이너리 | 무시 |
| 크기 상한 | 64KB. 넘으면 1009로 닫음 |
| 정리 | 소켓이 하나도 없으면 10분 뒤 알람으로 DO 상태 삭제 |
| `GET /health` | 200 `ok`, `Access-Control-Allow-Origin: *` |
| 그 밖의 경로 | 404 |

WebSocket Hibernation API를 쓰고, 자리 정보는 `serializeAttachment`로 소켓에 붙인다.

## 로컬 실행과 테스트

```bash
cd relay
npm install
npm run dev
npm test
```

`npm test`는 빈 포트로 `wrangler dev`를 띄워 `ws` 클라이언트 둘로 검증한 뒤 종료한다. 첫 실행은 workerd를 받느라 오래 걸릴 수 있다.

## 배포

```bash
npx wrangler login
npx wrangler deploy
```

배포 뒤 출력되는 `*.workers.dev` 주소를 `docs/js/data/battleConfig.js`의 `BattleConfig.ONLINE.RELAY_URL`에 넣는다.

## 무료 플랜 한도

Durable Object는 SQLite 백엔드 클래스만 무료 플랜에서 쓸 수 있다(`new_sqlite_classes`). Worker 요청 일 10만 건, DO 요청 일 10만 건, DO 실행 시간 일 13,000 GB-s. 수신 WebSocket 메시지는 20건당 요청 1건으로 계산된다. 한도는 변할 수 있으니 배포 전에 Cloudflare 문서로 확인한다.

## 확장: 퀵 매치

대기열 Durable Object 하나가 접속 순서대로 두 명씩 짝지어 방 코드를 발급하고, 각 클라이언트는 받은 코드로 평소처럼 방에 접속한다. 앞선 사람이 호스트, 뒤따른 사람이 게스트가 된다.
