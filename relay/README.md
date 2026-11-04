# haiyuki-relay

온라인 대전용 WebSocket 릴레이. Cloudflare Worker가 라우팅하고 방 하나가 Durable Object 하나(`idFromName(CODE)`)다. 서버는 메시지 내용을 보지 않고 상대에게 그대로 넘긴다. 퀵 매치와 접속 인원은 전체에 하나뿐인 로비 Durable Object(`Lobby`, `idFromName('lobby')`)가 맡는다.

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
| 로비 | `GET wss://<host>/lobby`. 접속·종료마다 모두에게 `{"type":"presence","online":N,"queued":N}`. 클라이언트가 `{"type":"queue"}`·`{"type":"unqueue"}`를 보내면 대기열에 넣고 빼며, 대기가 둘이 되면 먼저 기다린 쪽에 `{"type":"match","code":…,"role":"host"}`, 다른 쪽에 같은 코드로 `role:"guest"`를 보내고 둘 다 대기열에서 뺀다. 그 뒤 각자 그 코드로 방에 접속한다. 256자 넘는 메시지·모르는 `type`은 무시 |
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

## 로그

`console.log`로 방 코드와 함께 남기고 메시지 내용은 찍지 않는다(크기·`type`만). `npx wrangler tail`로 실시간으로 본다(배포한 뒤, 로컬은 `npm run dev` 출력).

| 로그 | 시점 |
| --- | --- |
| `[room CODE] join role=host\|guest peer=yes\|no` | 자리 접속 (접속 시점에 상대가 있었는지) |
| `[room CODE] full role=… rejected` | 이미 찬 자리 거절 |
| `[room CODE] bad request 400 role=…` | 코드 형식 오류·잘못된 `role` |
| `[room CODE] too big role=… type=… size=…` | 64KB 초과로 닫음 |
| `[room CODE] leave role=… code=N reason=…\|error idle=Ns peer=… relayed=N dropped=N bytes=N types={…}` | 소켓이 닫힐 때 한 번. `code`·`reason`은 닫힘 코드와 이유(1001은 브라우저가 페이지를 떠남, 1006은 닫힘 인사 없이 끊김), `idle`은 그 방에서 마지막으로 메시지가 오간 뒤 지난 시간. 그 소켓이 보낸 메시지 중 상대에게 중계한 수·상대가 없어 버린 수·글자 수 합·`type`별 개수. 하이버네이션으로 깨어난 뒤에는 그 이후 분만 센다 |
| `[room lobby] join online=N` | 로비 접속 (접속 뒤 인원) |
| `[room lobby] leave code=N reason=… queued=yes\|no online=N` | 로비 소켓이 닫힘 (`error`면 오류로 끊김) |
| `[room lobby] match code=…` | 퀵 매치 한 쌍을 지음 |
| `[room CODE] idle cleanup` | 소켓이 없는 채 10분이 지나 알람이 상태를 지움 |

```bash
npx wrangler tail haiyuki-relay --format pretty
```

## 무료 플랜 한도

Durable Object는 SQLite 백엔드 클래스만 무료 플랜에서 쓸 수 있다(`new_sqlite_classes`). Worker 요청 일 10만 건, DO 요청 일 10만 건, DO 실행 시간 일 13,000 GB-s. 수신 WebSocket 메시지는 20건당 요청 1건으로 계산된다. 한도는 변할 수 있으니 배포 전에 Cloudflare 문서로 확인한다.
