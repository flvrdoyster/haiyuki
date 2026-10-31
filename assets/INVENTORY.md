# 원본 에셋 ↔ 웹 에셋 대응표

원본 추출본(`graph/`, `audio/`)은 `extracted/assets/` 아래에 두며 저장소에 넣지 않는다(`.gitignore`). `extract.sh`로 다시 만든다. 아래 표의 경로는 `extracted/assets/` 기준.

원본: `haiyuki_win_kr/` (Compile, 1998, Windows판 한글화). 웹: `docs/assets/`.

## 추출 방법과 읽는 법

- `graph/*.cnx` 99개(`graph/` 직속 75개와 `graph/jp/` 24개) 전부 `compile-gfx batch`로 풀었다. 실패 0, 여러 장이 든 파일 없음(`_0` 접미사 쓴 파일 없음). `jp/`는 `graph/jp/`에 그대로 둔다.
- PNG는 전부 알파 없는 불투명 그림이다. 투명색 처리는 하지 않아 파일마다 바탕색이 다르다(단색 회색 129, 녹색, 파랑 등). 팔레트가 어긋난 파일은 눈으로는 발견하지 못했다.
- `graph/jp/`는 일본어 글자가 든 그림 24개다. 스크립트(`seq/*.sq`)는 이 이름들을 참조한다. `graph/title.cnx`와 `graph/jp/title.cnx`는 추출 PNG가 동일하다.
- 대응 판정은 웹 PNG를 원본 PNG 안에서 위치를 바꿔 가며 찾아 투명이 아닌 픽셀이 일치하는 비율로 정했다. 일치율이 100%면 `확실`, 그림을 열어 보고 같은 용도라고 본 것에 `?`를 붙였다(일치율은 비고에 적음).
- 웹 경로는 `haiyuki_web/assets/` 기준. 오디오는 웹 매니페스트(`js/core/assets.js`의 `toLoad`) id를 함께 적는다.

집계(그림 99개): 확실 51, 불확실(?) 32, 대응 없음 16.

## 표 A. 원본 그림 → 웹

| 원본 파일 | 추출 PNG | 크기(px) | 내용 | 웹 | 비고 |
|---|---|---|---|---|---|
| `graph/00.cnx` | `graph/00.png` | 640x280 | 전투 배경 무늬 남보라 구름 | `bg/00.png` | 픽셀 동일, 640x280 |
| `graph/01.cnx` | `graph/01.png` | 640x280 | 전투 배경 무늬 회색 벽돌 타일 | `bg/01.png` | 픽셀 동일, 640x280 |
| `graph/02.cnx` | `graph/02.png` | 640x280 | 전투 배경 무늬 연분홍 물결 | `bg/02.png` | 픽셀 동일, 640x280 |
| `graph/03.cnx` | `graph/03.png` | 640x280 | 전투 배경 무늬 주황 얼룩 | `bg/03.png` | 픽셀 동일, 640x280 |
| `graph/04.cnx` | `graph/04.png` | 640x280 | 전투 배경 무늬 살구색 결 | `bg/04.png` | 픽셀 동일, 640x280 |
| `graph/05.cnx` | `graph/05.png` | 640x280 | 전투 배경 무늬 붉은 점 무늬 | `bg/05.png` | 픽셀 동일, 640x280 |
| `graph/06.cnx` | `graph/06.png` | 640x280 | 전투 배경 무늬 남색 결 | `bg/06.png` | 픽셀 동일, 640x280 |
| `graph/07.cnx` | `graph/07.png` | 640x280 | 전투 배경 무늬 연보라 얼음 | `bg/07.png` | 픽셀 동일, 640x280 |
| `graph/08.cnx` | `graph/08.png` | 640x280 | 전투 배경 무늬 베이지 모자이크 타일 | `bg/08.png` | 픽셀 동일, 640x280 |
| `graph/09.cnx` | `graph/09.png` | 640x280 | 전투 배경 무늬 붉은 벽돌 | `bg/09.png` | 픽셀 동일, 640x280 |
| `graph/10.cnx` | `graph/10.png` | 640x280 | 전투 배경 무늬 청록 물결 | `bg/10.png` | 픽셀 동일, 640x280 |
| `graph/11.cnx` | `graph/11.png` | 640x280 | 전투 배경 무늬 녹색 물결 | `bg/11.png` | 픽셀 동일, 640x280 |
| `graph/chr0_l.cnx` | `graph/chr0_l.png` | 640x280 | 호랑이(ATA) 상반신 + 부품(왼쪽 방향 버전), 단색 배경 | `face/ATA_*.png` ? | 색 배경 위 인물 + 오른쪽에 눈·입 부품. 웹 face/ATA_*는 face·part 쪽과 겹침(이 파일과의 대응은 부분 일치) |
| `graph/chr0_r.cnx` | `graph/chr0_r.png` | 640x280 | 호랑이(ATA) 상반신 + 부품(오른쪽 방향 버전), 단색 배경 | `face/ATA_*.png` ? | 색 배경 위 인물 + 오른쪽에 눈·입 부품. 웹 face/ATA_*는 face·part 쪽과 겹침(이 파일과의 대응은 부분 일치) |
| `graph/chr1_l.cnx` | `graph/chr1_l.png` | 640x280 | 보라 고양이귀(RIN) 상반신 + 부품(왼쪽 방향 버전), 단색 배경 | `face/RIN_*.png` ? | 색 배경 위 인물 + 오른쪽에 눈·입 부품. 웹 face/RIN_*는 face·part 쪽과 겹침(이 파일과의 대응은 부분 일치) |
| `graph/chr1_r.cnx` | `graph/chr1_r.png` | 640x280 | 보라 고양이귀(RIN) 상반신 + 부품(오른쪽 방향 버전), 단색 배경 | `face/RIN_*.png` ? | 색 배경 위 인물 + 오른쪽에 눈·입 부품. 웹 face/RIN_*는 face·part 쪽과 겹침(이 파일과의 대응은 부분 일치) |
| `graph/chr2_l.cnx` | `graph/chr2_l.png` | 640x280 | 녹색 머리(PET) 상반신 + 부품(왼쪽 방향 버전), 단색 배경 | `face/PET_*.png` ? | 색 배경 위 인물 + 오른쪽에 눈·입 부품. 웹 face/PET_*는 face·part 쪽과 겹침(이 파일과의 대응은 부분 일치) |
| `graph/chr2_r.cnx` | `graph/chr2_r.png` | 640x280 | 녹색 머리(PET) 상반신 + 부품(오른쪽 방향 버전), 단색 배경 | `face/PET_*.png` ? | 색 배경 위 인물 + 오른쪽에 눈·입 부품. 웹 face/PET_*는 face·part 쪽과 겹침(이 파일과의 대응은 부분 일치) |
| `graph/chr3_l.cnx` | `graph/chr3_l.png` | 640x280 | 청록 머리 모자(FARI) 상반신 + 부품(왼쪽 방향 버전), 단색 배경 | `face/FARI_*.png` ? | 색 배경 위 인물 + 오른쪽에 눈·입 부품. 웹 face/FARI_*는 face·part 쪽과 겹침(이 파일과의 대응은 부분 일치) |
| `graph/chr3_r.cnx` | `graph/chr3_r.png` | 640x280 | 청록 머리 모자(FARI) 상반신 + 부품(오른쪽 방향 버전), 단색 배경 | `face/FARI_*.png` ? | 색 배경 위 인물 + 오른쪽에 눈·입 부품. 웹 face/FARI_*는 face·part 쪽과 겹침(이 파일과의 대응은 부분 일치) |
| `graph/chr4_l.cnx` | `graph/chr4_l.png` | 640x280 | 노란 개(SMSH) 상반신 + 부품(왼쪽 방향 버전), 단색 배경 | `face/SMSH_*.png` ? | 색 배경 위 인물 + 오른쪽에 눈·입 부품. 웹 face/SMSH_*는 face·part 쪽과 겹침(이 파일과의 대응은 부분 일치) |
| `graph/chr4_r.cnx` | `graph/chr4_r.png` | 640x280 | 노란 개(SMSH) 상반신 + 부품(오른쪽 방향 버전), 단색 배경 | `face/SMSH_*.png` ? | 색 배경 위 인물 + 오른쪽에 눈·입 부품. 웹 face/SMSH_*는 face·part 쪽과 겹침(이 파일과의 대응은 부분 일치) |
| `graph/chr5_l.cnx` | `graph/chr5_l.png` | 640x280 | 갈색 포니테일(YURI) 상반신 + 부품(왼쪽 방향 버전), 단색 배경 | `face/YURI_*.png` ? | 색 배경 위 인물 + 오른쪽에 눈·입 부품. 웹 face/YURI_*는 face·part 쪽과 겹침(이 파일과의 대응은 부분 일치) |
| `graph/chr5_r.cnx` | `graph/chr5_r.png` | 640x280 | 갈색 포니테일(YURI) 상반신 + 부품(오른쪽 방향 버전), 단색 배경 | `face/YURI_*.png` ? | 색 배경 위 인물 + 오른쪽에 눈·입 부품. 웹 face/YURI_*는 face·part 쪽과 겹침(이 파일과의 대응은 부분 일치) |
| `graph/chr6_l.cnx` | `graph/chr6_l.png` | 640x280 | 흰 강아지(MAYU) 얼굴+부품, 회청색 배경 | `face/MAYU_base.png`<br>`face/MAYU_blink-1.png`<br>`face/MAYU_blink-2.png`<br>`face/MAYU_shocked.png`<br>`face/MAYU_smile.png` | 부분 픽셀 동일(웹 MAYU_* 5장이 이 파일 안에서 오프셋 포함 일치) |
| `graph/chr6_r.cnx` | `graph/chr6_r.png` | 640x280 | 보라 불꽃 속 검은 실루엣(마유 정체불명 버전), 녹색 배경 | `face/MAYU_unknown.png`<br>`face/MAYU_unknown_smile.png` | MAYU_unknown 픽셀 동일, unknown_smile은 71% |
| `graph/chrsele.CNX` | `graph/chrsele.png` | 640x32 | 노란 "CHARACTER SELECT" 글자 | — | 웹은 이 그림 안 씀 |
| `graph/chrselef.CNX` | `graph/chrselef.png` | 640x160 | 캐릭터 선택 얼굴 아이콘 7명(밝음·어두운 디더 2벌) + PLAYER/CPU 커서 틀 | `face/select_ATA.png`<br>`face/select_RIN.png`<br>`face/select_PET.png`<br>`face/select_FARI.png`<br>`face/select_SMSH.png`<br>`face/select_YURI.png`<br>`face/select_MAYU.png`<br>`face/select_cursor.png` | 얼굴 7개 픽셀 동일(64x80씩 잘라 씀), 커서 80% 일치 |
| `graph/clr.cnx` | `graph/clr.png` | 640x16 | 검은 띠(화면 지우기용) | — |  |
| `graph/Complogo.cnx` | `graph/Complogo.png` | 277x30 | 분홍 "COMPILE" 로고 | `ui/logo_compile.png` | 웹 276x30, 겹치는 픽셀 91%만 일치(1px 어긋남·색 차이 추정) |
| `graph/CONTMOJI.CNx` | `graph/CONTMOJI.png` | 288x32 | 노란 글자 "CONTINUE?" | — | 웹에는 이 그림 없음 |
| `graph/endata.CNx` | `graph/endata.png` | 320x240 | 엔딩 일러스트(ATA): 술병을 든 보라 머리 인물과 호랑이 | `ending/ending_ATA.png` | 픽셀 동일 |
| `graph/endfar.CNX` | `graph/endfar.png` | 320x240 | 엔딩 일러스트(FARI) | `ending/ending_FARI.png` | 픽셀 동일 |
| `graph/endmay.CNX` | `graph/endmay.png` | 320x240 | 엔딩 일러스트(MAYU): 울고 있는 인물과 흰 강아지 | `ending/ending_MAYU.png` | 픽셀 동일 |
| `graph/endrin.CNX` | `graph/endrin.png` | 320x240 | 엔딩 일러스트(RIN) | `ending/ending_RIN.png` | 픽셀 동일 |
| `graph/endsma.CNX` | `graph/endsma.png` | 320x240 | 엔딩 일러스트(SMSH) | `ending/ending_SMSH.png` | 픽셀 동일 |
| `graph/endyur.CNX` | `graph/endyur.png` | 320x240 | 엔딩 일러스트(YURI) | `ending/ending_YURI.png` | 픽셀 동일 |
| `graph/faceata.CNX` | `graph/faceata.png` | 560x304 | 호랑이 대화 포트레이트(좌·우 두 방향) | `face/ATA_base.png` | 좌·우 향한 두 그림이 한 장에 든 대화 포트레이트. 웹 ATA_base는 픽셀 동일. 웹 ATA_blink/shocked/smile/talk는 이 그림 위 일부 영역만 덮는 조각(대응은 part 쪽과 부분 일치) |
| `graph/facefari.CNx` | `graph/facefari.png` | 560x304 | 청록 머리 모자 대화 포트레이트(좌·우 두 방향) | `face/FARI_base.png` | 좌·우 향한 두 그림이 한 장에 든 대화 포트레이트. 웹 FARI_base는 픽셀 동일. 웹 FARI_blink/shocked/smile/talk는 이 그림 위 일부 영역만 덮는 조각(대응은 part 쪽과 부분 일치) |
| `graph/FACEMAYK.CNx` | `graph/FACEMAYK.png` | 208x256 | 보라 불꽃 속 검은 실루엣(정체 모를 마유) | `face/MAYU_unknown.png` | 웹은 280x256, 오프셋 -36에서 픽셀 동일(chr6_r.png와도 겹침) |
| `graph/facemayu.CNX` | `graph/facemayu.png` | 288x304 | 흰 강아지 대화 포트레이트(한 방향) | `face/MAYU_base.png` | 웹 280x304, 원본 288x304와 오프셋 4px에서 동일(웹은 좌우 4px 잘라냄) |
| `graph/facepet.CNX` | `graph/facepet.png` | 576x304 | 녹색 머리 대화 포트레이트(좌·우 두 방향) | `face/PET_base.png` | 좌·우 향한 두 그림이 한 장에 든 대화 포트레이트. 웹 PET_base는 픽셀 동일. 웹 PET_blink/shocked/smile/talk는 이 그림 위 일부 영역만 덮는 조각(대응은 part 쪽과 부분 일치) |
| `graph/facerin.CNx` | `graph/facerin.png` | 560x304 | 보라 고양이귀 대화 포트레이트(좌·우 두 방향) | `face/RIN_base.png` | 좌·우 향한 두 그림이 한 장에 든 대화 포트레이트. 웹 RIN_base는 픽셀 동일. 웹 RIN_blink/shocked/smile/talk는 이 그림 위 일부 영역만 덮는 조각(대응은 part 쪽과 부분 일치) |
| `graph/facesmsh.CNX` | `graph/facesmsh.png` | 560x304 | 노란 개 대화 포트레이트(좌·우 두 방향) | `face/SMSH.png`<br>`face/SMSH_base.png`<br>`face/SMSH_idle.png` | 좌·우 향한 두 그림이 한 장에 든 대화 포트레이트. 웹 SMSH_base는 픽셀 동일. SMSH.png·SMSH_idle은 같은 기본 얼굴(일부 부위만 남기고 투명). 웹 SMSH_blink/shocked/smile/talk는 이 그림 위 일부 영역만 덮는 조각(대응은 part 쪽과 부분 일치) |
| `graph/faceyuri.CNX` | `graph/faceyuri.png` | 560x304 | 갈색 포니테일 대화 포트레이트(좌·우 두 방향) | `face/YURI_base.png` | 좌·우 향한 두 그림이 한 장에 든 대화 포트레이트. 웹 YURI_base는 픽셀 동일. 웹 YURI_blink/shocked/smile/talk는 이 그림 위 일부 영역만 덮는 조각(대응은 part 쪽과 부분 일치) |
| `graph/fuki.cnx` | `graph/fuki.png` | 640x88 | 말풍선 틀 2개(검은 안쪽, 가운데 꼬리) | `ui/short_bubble.png` ? | short_bubble과 84% 일치. FUKIDASI와 유사한 변형 |
| `graph/FUKIDASI.CNx` | `graph/FUKIDASI.png` | 640x160 | 말풍선 틀 2종(긴 것, 짧은 것+꼬리) | `ui/long_bubble.png`<br>`ui/long_bubble_tail.png`<br>`ui/short_bubble.png` | long_bubble 99.5%(높이 136으로 잘림), tail 93%, short 92.5%: 웹에서 다듬음 |
| `graph/gamebg.cnx` | `graph/gamebg.png` | 640x480 | 전투 화면 배경: 녹색 바탕에 위 노란 선, 아래 HP 막대 | `bg/GAMEBG.png` | 웹은 아래 24줄(y336~359, HP 막대 줄)이 다르고 일부가 투명 처리됨(투명 17만 픽셀) |
| `graph/gameover.CNX` | `graph/gameover.png` | 576x64 | 노란 "GAME OVER" 글자 | — |  |
| `graph/herecome.CNX` | `graph/herecome.png` | 448x128 | 노란 "HERE COMES A NEW CHALLENGER" 글자(2벌) | — |  |
| `graph/jp/CHRBAK.CNx` | `graph/jp/CHRBAK.png` | 640x480 | 캐릭터 선택 배경: 파란 "幻世牌遊記" 무늬 | `bg/CHRBAK.png` | 픽셀 동일 |
| `graph/jp/draw.cnx` | `graph/jp/draw.png` | 640x192 | 큰 흰 글씨 "流局" | `fx/nagari.png` ? | 웹은 한글 "나가리" 새로 그림 640x192(원본 640x192) |
| `graph/jp/fake.cnx` | `graph/jp/fake.png` | 640x48 | 일본어 안내 문장 조각(교환·라스트찬스 등) | — |  |
| `graph/jp/help.cnx` | `graph/jp/help.png` | 640x112 | 도움말 조각(탭 버튼 글자, 화살표 아이콘, 바) | — |  |
| `graph/jp/helpbg.cnx` | `graph/jp/helpbg.png` | 640x392 | 도움말 배경: 녹색 바탕, 남색 패널, 버튼 | `bg/HELPBG.png` | 픽셀 동일 |
| `graph/jp/MAYUBAK.cnx` | `graph/jp/MAYUBAK.png` | 640x480 | 마유 난입 배경: 빨간 로고 무늬 띠와 검은 가운데 | `bg/MAYUBAK.png` | 픽셀 동일 |
| `graph/jp/name.cnx` | `graph/jp/name.png` | 640x120 | 일본어 이름 글자 파란 버전 640x120 | — | NAMEFONT와 같은 글자 다른 색 |
| `graph/jp/NAMEFONT.CNx` | `graph/jp/NAMEFONT.png` | 576x192 | 일본어 이름 글자(카타카나): スマッシュ リンシャン ユリワカマル アターホー ファーリン ペトゥム 眉犬 ??? | — | 웹엔 한글 이름 그림 없음 |
| `graph/jp/opmenu.CNX` | `graph/jp/opmenu.png` | 512x320 | 옵션 메뉴 항목 글자: エフェクト・秘技・BGM・SE | — |  |
| `graph/jp/oponoff.CNX` | `graph/jp/oponoff.png` | 160x72 | "おん/おふ" 아이콘 4개 | `ui/on.png`<br>`ui/off.png` ? | 웹은 "켠다/끈다" 한글 80x56으로 새로 그림(53% 정도 닮음) |
| `graph/jp/opt.cnx` | `graph/jp/opt.png` | 640x120 | 옵션 화면 글자 조각(OPTION, GAME, EXIT, おん/おふ 등) | — |  |
| `graph/jp/overbak.CNX` | `graph/jp/overbak.png` | 640x480 | 게임 오버 배경: 짙은 남색 패 무늬 | `bg/OVERBAK.png` | 픽셀 동일 |
| `graph/jp/pai.cnx` | `graph/jp/pai.png` | 640x512 | 게임 화면 스프라이트 시트: 패 이미지, 숫자, 프레임, 턴·라운드 글자, 하단 일본어 글자 | `tiles/pai_*.png`<br>`tiles/back-*.png`<br>`tiles/side-*.png`<br>`ui/dora.png`<br>`ui/number.png`<br>`ui/riichi.png`<br>`ui/turn.png`<br>`ui/round.png`<br>`ui/frame/corner-*.png`<br>`tiles/pai_all.png` | 웹 타일·숫자·프레임 대부분 이 시트에서 오프셋 포함 픽셀 동일. ui/round는 64%, tiles/side-bottom은 88% |
| `graph/jp/pon.cnx` | `graph/jp/pon.png` | 640x186 | 큰 흰 글씨 "ポン" | `fx/pon.png` ? | 웹은 한글 "펑" 새로 그림 |
| `graph/jp/reach.cnx` | `graph/jp/reach.png` | 640x176 | 큰 흰 글씨 "リーチ" | `fx/riichi.png` ? | 웹은 한글 "리치" 새로 그림 |
| `graph/jp/ron.cnx` | `graph/jp/ron.png` | 640x176 | 큰 흰 글씨 "ロン" | `fx/ron.png` ? | 웹은 한글 "론" 새로 그림 |
| `graph/jp/staffbak.cnx` | `graph/jp/staffbak.png` | 640x480 | 스탭롤 배경: 푸른 "幻世牌遊記" 무늬 | `bg/STAFFBAK.png` | 픽셀 동일 |
| `graph/jp/STAFFHAI.CNx` | `graph/jp/STAFFHAI.png` | 640x384 | 일본어 스탭롤 글자 아틀라스(패 모양 칸 6줄) | `ending/staff.png`<br>`tiles/pai_haiyuki.png` | staff.png는 웹 640x512: 위 6줄이 이 파일과 동일, 아래 2줄은 한글 추가. pai_haiyuki는 맨 윗줄 "幻世牌遊記" 200x64 |
| `graph/jp/tenpai.cnx` | `graph/jp/tenpai.png` | 640x108 | 큰 흰 글씨 "ノーテンパイ" | `fx/noten.png` ? | 웹은 한글 "노텐" 새로 그림. fx/tenpai(텐파이)에 해당하는 원본 그림은 없음 |
| `graph/jp/THEEND.CNx` | `graph/jp/THEEND.png` | 160x48 | 일본어 "おしまい" 글자 | `ending/theend.png` ? | 웹은 한글 72x48(60% 일치 정도만, 새로 그림) |
| `graph/jp/title.CNX` | `graph/jp/title.png` | 632x184 | 타이틀 로고(일본어) | `ui/title.png` ? | graph/title.png와 바이트 동일 |
| `graph/jp/ttmoji.CNX` | `graph/jp/ttmoji.png` | 528x160 | 타이틀 글자 "幻世 遊記" 금색(위)+흰 윤곽(아래) | `title/LOGO_REST.png` ? | 웹은 한글 "환세 유기" 금색으로 새로 그림 |
| `graph/jp/ttmoji2.CNX` | `graph/jp/ttmoji2.png` | 528x176 | 타이틀 글자 "牌" 빨강·은색·은색(3벌) | `title/LOGO_PAI_TOP.png`<br>`title/LOGO_PAI_BOTTOM.png` ? | 웹은 한글 "패" 은색·빨강 2벌 |
| `graph/jp/tumo.cnx` | `graph/jp/tumo.png` | 640x176 | 큰 흰 글씨 "ツモ" | `fx/tsumo.png` ? | 웹은 한글 "쯔모" 새로 그림 |
| `graph/jp/yaku.cnx` | `graph/jp/yaku.png` | 640x320 | 일본어 역 이름 글자 모음과 숫자 | `ui/number.png`<br>`ui/number_yellow.png` ? | 숫자 두 가지만 웹과 동일, 일본어 역 글자는 웹엔 없음 |
| `graph/key.cnx` | `graph/key.png` | 640x16 | 방향키·숫자 키보드 가이드 띠 | `ui/keyboard.png` | 웹 244x16, 앞쪽 244px 동일 |
| `graph/mouse.cnx` | `graph/mouse.png` | 192x32 | 초록 화살표 커서 6프레임(청록 바탕) | `ui/mouse1.png` | 픽셀 동일 |
| `graph/mousecur.cnx` | `graph/mousecur.png` | 304x24 | 초록 화살표 커서 5프레임 | `ui/mouse2.png` | 픽셀 동일, sq에서 참조되지 않음 |
| `graph/opmenu2.CNX` | `graph/opmenu2.png` | 256x160 | 옵션 메뉴 틀(보라 바탕, 노란 테두리) | — | 웹 ui/battle_menu(120x160)와 높이만 같고 내용은 다름 |
| `graph/opmoji.CNX` | `graph/opmoji.png` | 288x48 | 빨간 "OPTION" 글자 | — |  |
| `graph/opmoji2.CNX` | `graph/opmoji2.png` | 192x96 | 빨간 "EXIT" 글자(2벌) | — |  |
| `graph/optbg.cnx` | `graph/optbg.png` | 640x480 | 옵션 화면 배경: 녹색 바탕에 빨간 "OPTION" 글자와 4분할 틀 | `bg/OPTBG.png` | 픽셀 동일 |
| `graph/partata.CNX` | `graph/partata.png` | 512x112 | 호랑이 표정 조각(눈 깜빡임·웃음·놀람·말하는 입) | `face/ATA_blink-*.png`<br>`face/ATA_shocked.png`<br>`face/ATA_smile.png`<br>`face/ATA_talk-*.png` ? | 표정 조각 모음(눈·입 프레임). 웹 표정 프레임은 이 조각들을 face 위 위치에 맞춰 잘라 쓴 것으로 추정(부분 일치 60~90%) |
| `graph/partfari.CNX` | `graph/partfari.png` | 480x152 | 청록 머리 모자 표정 조각(눈 깜빡임·웃음·놀람·말하는 입) | `face/FARI_blink-*.png`<br>`face/FARI_shocked.png`<br>`face/FARI_smile.png`<br>`face/FARI_talk-*.png` ? | 표정 조각 모음(눈·입 프레임). 웹 표정 프레임은 이 조각들을 face 위 위치에 맞춰 잘라 쓴 것으로 추정(부분 일치 60~90%) |
| `graph/partmayu.CNX` | `graph/partmayu.png` | 360x200 | 흰 강아지 표정 조각(눈 깜빡임·웃음·놀람·말하는 입) | `face/MAYU_blink-*.png`<br>`face/MAYU_shocked.png`<br>`face/MAYU_smile.png`<br>`face/MAYU_talk-*.png` | 웹 MAYU_blink-1/-2, shocked, smile이 이 파일 안에서 픽셀 동일 |
| `graph/partpet.CNX` | `graph/partpet.png` | 272x144 | 녹색 머리 표정 조각(눈 깜빡임·웃음·놀람·말하는 입) | `face/PET_blink-*.png`<br>`face/PET_shocked.png`<br>`face/PET_smile.png`<br>`face/PET_talk-*.png` ? | 표정 조각 모음(눈·입 프레임). 웹 표정 프레임은 이 조각들을 face 위 위치에 맞춰 잘라 쓴 것으로 추정(부분 일치 60~90%) |
| `graph/partrin.CNX` | `graph/partrin.png` | 408x144 | 보라 고양이귀 표정 조각(눈 깜빡임·웃음·놀람·말하는 입) | `face/RIN_blink-*.png`<br>`face/RIN_shocked.png`<br>`face/RIN_smile.png`<br>`face/RIN_talk-*.png` ? | 표정 조각 모음(눈·입 프레임). 웹 표정 프레임은 이 조각들을 face 위 위치에 맞춰 잘라 쓴 것으로 추정(부분 일치 60~90%) |
| `graph/partsmsh.CNX` | `graph/partsmsh.png` | 576x280 | 노란 개 표정 조각(눈 깜빡임·웃음·놀람·말하는 입) | `face/SMSH_blink-*.png`<br>`face/SMSH_shocked.png`<br>`face/SMSH_smile.png`<br>`face/SMSH_talk-*.png` ? | 표정 조각 모음(눈·입 프레임). 웹 표정 프레임은 이 조각들을 face 위 위치에 맞춰 잘라 쓴 것으로 추정(부분 일치 60~90%) |
| `graph/partyuri.CNX` | `graph/partyuri.png` | 400x120 | 갈색 포니테일 표정 조각(눈 깜빡임·웃음·놀람·말하는 입) | `face/YURI_blink-*.png`<br>`face/YURI_shocked.png`<br>`face/YURI_smile.png`<br>`face/YURI_talk-*.png` ? | 표정 조각 모음(눈·입 프레임). 웹 표정 프레임은 이 조각들을 face 위 위치에 맞춰 잘라 쓴 것으로 추정(부분 일치 60~90%) |
| `graph/POINTCUR.CNx` | `graph/POINTCUR.png` | 64x32 | 원숭이 얼굴 포인터 2종 | `ui/pointer.png` | 픽셀 동일 |
| `graph/PUSHOK.CNx` | `graph/PUSHOK.png` | 224x64 | 빨간 "PUSH SPACE KEY" 글자 | `ui/pushok.png` | 웹은 위쪽 절반 224x32만 씀 |
| `graph/SCMPLOGO.CNx` | `graph/SCMPLOGO.png` | 282x20 | "© COMPILE 1998" 로고 | `ui/logo_compile_1998.png` | 웹 282x20, 88% 일치(1px 어긋남·색 차이 추정) |
| `graph/title.CNX` | `graph/title.png` | 632x184 | 타이틀 로고 "幻世牌遊記"(일본어, 푸른 줄무늬 띠) | `ui/title.png`<br>`title/LOGO_REST.png`<br>`title/LOGO_PAI_TOP.png`<br>`title/LOGO_PAI_BOTTOM.png` ? | jp/title.png와 바이트 동일. 웹은 한글 "환세패유기"로 새로 그림, 레이어 분리. 같은 632x184 |
| `graph/TITLMOJI.CNx` | `graph/TITLMOJI.png` | 192x192 | 노란 "START / OPTION / EXIT" 글자(밝음·어두움 2벌) | — | 웹은 이 그림 안 씀 |
| `graph/ttbak.CNx` | `graph/ttbak.png` | 580x86 | 타이틀 로고 배경(녹색 물결 무늬) | `title/BACK.png` | 픽셀 동일 |
| `graph/tthai.CNX` | `graph/tthai.png` | 80x128 | 타이틀 로고 패 한 장(베이지+빨간 아래) | `title/PAI.png` | 웹은 80x120, 원본 80x128의 위쪽 |
| `graph/ttnaruto.CNX` | `graph/ttnaruto.png` | 616x22 | 타이틀 로고 위·아래 소용돌이 무늬 띠 | `title/LINE_NARUTO.png` | 픽셀 동일 |
| `graph/VS.CNx` | `graph/VS.png` | 112x80 | 노란 "VS" 로고 | `ui/vs.png` | 픽셀 동일 |
| `graph/yesno.CNX` | `graph/yesno.png` | 96x128 | 노란 "YES / NO" 글자(밝음·어두움) | — |  |

## 표 B. 웹 그림 중 원본에 대응이 없는 것

| 웹 에셋 | 크기 | 내용 | 비고 |
|---|---|---|---|
| `ui/alphabet.png` | 960x64 | 노란 알파벳 A~Z와 기호, 2줄 | 원본에서 못 찾음. `herecome`·`gameover` 글자와 같은 서체 |
| `ui/number_big.png` | 398x52 | 노란 큰 숫자 0~9 | 원본에서 못 찾음(`herecome` 44%만) |
| `ui/bar_blue.png`, `ui/bar_yellow.png`, `ui/bar_green.png` | 1x10 | 막대 그라데이션 한 줄 | 웹에서 만든 것으로 추정 |
| `ui/easy.png`, `ui/normal.png`, `ui/difficult.png` | 120x56 | 한글 "쉬움/중간/어려움" 패 아이콘 | 원본에 난이도 그림 없음 |
| `fx/tenpai.png` | 320x96 | 한글 "텐파이" | 원본 `jp/tenpai`는 "ノーテンパイ"(웹 `fx/noten`에 해당)뿐 |
| `ui/battle_menu.png` | 120x160 | 흰 바탕에 빨간 테두리 메뉴 틀 | 원본에서 못 찾음. `tchrsel.sq`가 참조하는 `statmenu.cnx`일 가능성(표 C) ? |
| `bg/ENDING.png` | 300x168 | 검은 바탕에 엔딩 그림(ATA)과 "おしまい" 합성 | 원본 `endata`와 `jp/THEEND`로 만든 합성으로 보임 ? |
| `face/PET_shocked.png` | 576x304 | 땀 흘리는 표정 조각 | `partpet`에서 일치 못 찾음(색 조정?) ? |
| `face/SMSH_blink-2.png` | 560x304 | 눈 깜빡임 조각 | `partsmsh`에서 일치 못 찾음 ? |
| `ui/frame/line-top.png` 등 4개 | 1x14, 14x1 | 프레임 가장자리 한 줄 | 원본 `pai`·`helpbg` 프레임 모서리 옆 한 줄을 떼 낸 것으로 추정 ? |
| `ui/title.png`, `title/LOGO_REST.png`, `title/LOGO_PAI_TOP.png`, `title/LOGO_PAI_BOTTOM.png` | 632x184 | 한글 "환세패유기" 로고와 레이어 | 일본어 원본(`title`, `ttmoji`, `ttmoji2`)을 한글로 새로 그림. 표 A 참조 |
| `fx/pon.png`, `fx/ron.png`, `fx/riichi.png`, `fx/tsumo.png`, `fx/nagari.png`, `fx/noten.png` | 320~640 x 96~192 | 한글 선언 글자 | 원본 일본어 글자를 한글로 새로 그림. 표 A 참조 |
| `ui/on.png`, `ui/off.png`, `ending/theend.png` | | 한글 "켠다/끈다", 끝 글자 | 원본 일본어 글자를 한글로 새로 그림 |
| `ending/staff.png` | 640x512 | 스탭롤 글자 아틀라스 | 위 6줄은 `jp/STAFFHAI`와 동일, 아래 2줄은 한글 추가 |
| `audio/correct.mp3`, `fanfare.mp3`, `gong.mp3`, `hit-1.mp3`~`hit-4.mp3`, `lose.mp3`, `quake.mp3`, `recovery.mp3`, `roar.mp3`, `tragic-1.mp3`, `tragic-2.mp3`, `victory.mp3`, `wrong.mp3` | | 효과음·짧은 곡 | 원본 효과음 17개와 파형이 안 맞음(상관 0.4 이하). 웹에서 따로 구한 것 |
| `audio/bgm_basic.mp3`·`bgm_chrsel.mp3`·`bgm_compile.mp3`·`bgm_inn.mp3`·`bgm_option.mp3`·`bgm_showdown.mp3`·`bgm_tension.mp3` | | 곡 | 표 D 참조. 일부는 원본 곡과 `?` 대응 |

## 표 C. 스크립트가 참조하지만 `graph/`에 파일이 없는 이름

`seq/*.sq`(및 `seq/jp/*.sq`)의 `.cnx` 이름 전체를 대소문자 무시하고 `graph/`·`graph/jp/`와 비교했다.

| 이름 | 참조한 스크립트 | 추정 |
|---|---|---|
| `statmenu.cnx` | `tchrsel.sq` | 파일 없음. 이름으로 보아 전투 중 상태 메뉴로 보임. 웹 `ui/battle_menu.png`(120x160)가 이에 해당할 가능성 ? |
| `dummy.cnx` | `tlogo.sq` (`complogo.cnx` 다음) | 파일 없음. 이름대로 자리 채우기용 빈 항목으로 보임 ? |

반대로 스크립트에서 이름으로 참조되지 않는 원본 그림: `00`~`11`(EXE 문자열 `%2d.cnx`), `chr0_l`~`chr6_r`(EXE 문자열 `%1d_l.cnx`·`%1d_r.cnx`), `clr`(EXE 문자열 `graph\clr.cnx`), `mousecur`(스크립트는 `pointcur`·`mouse`만 참조).

## 표 D. 오디오

### 효과음 (`haiyuki.wlk`, 17개 → `audio/haiyuki.wlk/se_NN.wav`)

웹 mp3와 원본 wav를 11025Hz로 맞춰 파형 상관으로 비교했다(1.0이면 같은 소리).

| 원본 | 길이 | 형식 | 웹 | 비고 |
|---|---|---|---|---|
| `se_00.wav` | 0.23s | 44100Hz 16bit | `audio/pon.mp3` (`audio/pon`) | 재생 파형 상관 0.93~1.0; se_01과 파형 동일 |
| `se_01.wav` | 0.23s | 44100Hz 16bit | `audio/pon.mp3` (`audio/pon`) | 재생 파형 상관 0.93~1.0; se_00과 파형 동일 |
| `se_02.wav` | 0.15s | 44100Hz 16bit | — | 웹에서 안 씀 |
| `se_03.wav` | 1.28s | 22050Hz 16bit | `audio/riichi.mp3` (`audio/riichi`) | 재생 파형 상관 0.93~1.0 |
| `se_04.wav` | 1.72s | 22050Hz 8bit | — | 웹에서 안 씀 |
| `se_05.wav` | 0.55s | 22050Hz 8bit | — | 웹에서 안 씀 |
| `se_06.wav` | 0.25s | 22050Hz 8bit | `audio/draw.mp3` (`audio/draw, audio/deal`) | 재생 파형 상관 0.93~1.0; 파형 일치도 0.93 |
| `se_07.wav` | 0.14s | 22050Hz 16bit | `audio/discard.mp3` (`audio/discard`) | 재생 파형 상관 0.93~1.0 |
| `se_08.wav` | 0.1s | 22050Hz 8bit | `audio/tick.mp3` (`audio/tick`) | 재생 파형 상관 0.93~1.0 |
| `se_09.wav` | 0.34s | 11025Hz 16bit | — | 웹에서 안 씀 |
| `se_10.wav` | 0.8s | 22050Hz 8bit | `audio/whoosh.mp3` (`audio/skill_activate`) | 재생 파형 상관 0.93~1.0 |
| `se_11.wav` | 0.95s | 22050Hz 8bit | `audio/buff.mp3` (`audio/buff`) | 재생 파형 상관 0.93~1.0 |
| `se_12.wav` | 1.31s | 44100Hz 16bit | `audio/barrier.mp3` (`audio/barrier`) | 재생 파형 상관 0.93~1.0 |
| `se_13.wav` | 0.42s | 22050Hz 16bit | — | 웹에서 안 씀 |
| `se_14.wav` | 0.31s | 22050Hz 8bit | — | 웹에서 안 씀 |
| `se_15.wav` | 0.21s | 22050Hz 8bit | `audio/flip.mp3` (`audio/flip`) | 재생 파형 상관 0.93~1.0 |
| `se_16.wav` | 0.12s | 22050Hz 8bit | — | 웹에서 안 씀 |

### 곡 (`haiyuki.mlk`, 14곡 → `audio/haiyuki.mlk/bgm_NN.mid`)

원본은 MIDI이고 웹은 mp3라 파형 비교가 안 된다. 곡 길이 비율과 곡 제목(트랙 이름, Shift-JIS)으로 판단했다.

| 원본 | 제목 | 길이 | 음표 수 | 웹 | 비고 |
|---|---|---|---|---|---|
| `bgm_00.mid` | (제목 없음) | 4.6s | 72 | — |  |
| `bgm_01.mid` | (제목 없음, 드럼·베이스 트랙 16개) | 24.4s | 1463 | — |  |
| `bgm_02.mid` | オープニング | 29.6s | 1402 | `audio/bgm_title.mp3` (`audio/bgm_title`) | 웹 30.84s / 원본 29.6s = 1.042 |
| `bgm_03.mid` | 戦闘勝利 | 1.4s | 107 | — |  |
| `bgm_04.mid` | 山道 | 59.1s | 1212 | `audio/bgm_trail.mp3` (`audio/bgm_trail`) | 웹 61.33s / 59.1s = 1.038 |
| `bgm_05.mid` | 町 | 48.1s | 1147 | `audio/bgm_basic.mp3` (`audio/bgm_basic`) ? | 웹 54.06s, 비 1.12 |
| `bgm_06.mid` | (제목 없음, 음표 3060개로 가장 촘촘) | 68.6s | 3060 | `audio/bgm_tension.mp3` (`audio/bgm_tension`) ? | 웹 75.49s, 비 1.10 |
| `bgm_07.mid` | 修業 | 33.3s | 945 | `audio/bgm_chrsel.mp3` 또는 `audio/bgm_showdown.mp3` ? | 웹 chrsel 31.79s / showdown 38.22s, 길이만으로 못 정함 |
| `bgm_08.mid` | アイテム入手 | 1.9s | 48 | — |  |
| `bgm_09.mid` | (제목 없음, 트랙 이름 Remixed) | 2.0s | 66 | — |  |
| `bgm_10.mid` | スタッフロール | 99.1s | 2958 | `audio/bgm_ending.mp3` (`audio/bgm_ending`) | 웹 103.08s / 99.1s = 1.040: 세 곡이 같은 비율이라 같은 곡을 렌더한 것으로 판단 |
| `bgm_11.mid` | (제목 없음) | 4.6s | 20 | — |  |
| `bgm_12.mid` | (제목 없음, 드럼·베이스 트랙 9개) | 15.1s | 645 | `audio/bgm_compile.mp3` ? | 웹 13.63s, 비 0.90 |
| `bgm_13.mid` | スマッシュトイレ | 1.9s | 32 | `audio/bgm_toilet.mp3` ? (3.9s = 1.9s x 2) | 웹 3.92s, 곡 길이 2배 |

웹 곡 중 원본과 대응을 못 찾은 것: `bgm_inn`(7.1s), `bgm_option`(21.7s)와 위 `?` 후보로 잡히지 않은 것. 원본 곡 중 웹에서 안 쓰는 것으로 보이는 것: 0, 1, 3, 8, 9, 11, 12(12는 `bgm_compile` 후보 ?).
