# 환세패유기 웹 버전 (haiyuki)

**▶ 바로 플레이: [haiyuki.atah.io](https://haiyuki.atah.io)**

## 개요

환세패유기(幻世牌遊記, Compile, 1998)를 웹으로 구현한 프로젝트. 마작을 바탕으로 한 독자 규칙의 대전 테이블 게임이며, 원본 스크립트·EXE 역분석으로 규칙과 연출을 맞춰 가고 있다.

게임 규칙은 [`docs/RULEBOOK.md`](docs/RULEBOOK.md), 코드 구조는 [`docs/STRUCTURE.md`](docs/STRUCTURE.md), 디버그·치트는 [`docs/CHEAT.md`](docs/CHEAT.md), 남은 작업은 [`docs/IMPROVE.md`](docs/IMPROVE.md)에 있다.

### 구성

+ **`docs/`** — 게임 본체. 빌드 없이 정적 파일 그대로 GitHub Pages로 `haiyuki.atah.io`에 서빙된다.  
`index.html`의 `<script>` 순서가 곧 의존성이고, `js/`는 `core`(루프·입력·에셋·타이머·게임패드) · `data`(캐릭터·패·전투 설정·연출 타임라인) · `logic`(전투 엔진·역 판정·AI) · `scenes` · `views`로 나뉜다. 버전은 `js/core/version.js`가 단일 소스.
+ **`docs/tests/`** — Playwright 회귀 테스트·성능 측정 (저장소에는 없음, 로컬 전용).
+ **`sq/`** — 원본 스크립트 VM·EXE 역분석 문서(`FORMAT.md`, `RULES.md`, `FX.md`)와 도구(`sqdis.py`, `tools/`). `docs/js/data/fxTimelines.js`는 `sq/tools/fxexport.py`가 생성한다.
+ **`assets/`** — 원본 에셋 ↔ 웹 에셋 대응표(`INVENTORY.md`)와 추출 스크립트(`extract.sh`).
+ **`extracted/`** — 원본에서 추출한 그림·소리, 스크립트 덤프 (저장소에는 없음, `.gitignore`).

해설서(`haiyuki_manual`)는 [atah.io](https://atah.io/haiyuki_manual/)에 있고, 게임의 역 일람 패널이 그 페이지를 불러온다. 공용 푸터·폰트(`footer.js`·`footer.css`·`fonts.css`)도 `atah.io`에서 가져온다.

---

## 소프트웨어 고지 / Software Notice

본 저장소는 환세패유기를 브라우저 환경에서 실행하기 위한 웹 구현과 원본 역분석 자료를 포함합니다. 원본 게임에서 추출한 그림·소리·스크립트 덤프(`extracted/`)는 저작권상 저장소에 포함하지 않으며 로컬에서만 사용합니다. 배포용 웹 게임(`docs/`)에는 게임 구동에 필요한 그래픽·음악 등의 에셋이 포함됩니다.

원본 게임은 Compile이 개발하였으며, 게임 자산(그래픽, 음악 등)의 모든 권리는 원저작권자에게 있습니다.

본 프로젝트는 비상업적 보존 및 학습 목적으로만 운영됩니다.
저작권자로서 자료 삭제를 원하실 경우 Issue를 열어주시면 즉시 대응하겠습니다.

This repository contains a web implementation of Gensei Haiyuki (幻世牌遊記) and reverse-engineering notes on the original game. Assets and script dumps extracted from the original (`extracted/`) are excluded from the repository for copyright reasons and are used locally only. The deployed web game (`docs/`) includes the graphics, music, and other assets needed to run it.

The game was originally developed by Compile. All rights to the game and its assets (graphics, music, etc.) belong to their respective copyright holders.

This project exists solely for non-commercial preservation and study.
If you are a rights holder and would like this material removed, please open an issue and it will be promptly addressed.
