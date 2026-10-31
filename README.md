# haiyuki

환세패유기(Compile, 1998) 웹 이식과 원본 역분석 자료.

- `sq/` — 스크립트 VM·EXE 역분석 문서(`FORMAT.md`, `RULES.md`, `FX.md`)와 도구(`sqdis.py`, `tools/`).
- `assets/` — 원본 에셋 ↔ 웹 에셋 대응표(`INVENTORY.md`)와 추출 스크립트.
- `extracted/` — 원본에서 추출한 그림·소리, 스크립트 덤프, Ghidra 프로젝트. 저장소에 넣지 않는다(`.gitignore`). `assets/extract.sh`, `sq/sqdis.py`, Ghidra로 다시 만든다.
