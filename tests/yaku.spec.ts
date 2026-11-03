import { test, expect } from '@playwright/test';
import {
    waitForGame,
    stopHarness,
    getSnap,
} from './helpers';

const GAME_URL = '/';

test.beforeEach(async ({ page }) => {
    await page.goto(GAME_URL);
    await waitForGame(page);
});

test.afterEach(async ({ page }) => {
    await stopHarness(page);
});

// ============================================================================
// Yaku 단위 검증
//
// YakuLogic.checkYaku(hand, charId) — hand.length === 12 이 필수 조건.
// 게임 상태와 무관하게 브라우저 내 전역 객체를 직접 호출한다.
// ============================================================================

test.describe('Yaku 단위 검증', () => {

    test('SAM_DO_RIP: 4종 트리플렛 → 점수 2400', async ({ page }) => {
        const result = await page.evaluate(() => {
            const yl = (0, eval)('YakuLogic');
            const mk = (type: string, color: string) => ({ type, color, img: '' });
            // ataho(red)×3 + smash(blue)×3 + yuri(blue)×3 + pet(yellow)×3
            // 무기 없음 → 상위 역 불성립 → SAM_DO_RIP
            const hand = [
                ...Array(3).fill(null).map(() => mk('ataho', 'red')),
                ...Array(3).fill(null).map(() => mk('smash', 'blue')),
                ...Array(3).fill(null).map(() => mk('yuri', 'blue')),
                ...Array(3).fill(null).map(() => mk('pet', 'yellow')),
            ];
            return yl.checkYaku(hand, null);
        });
        expect(result).not.toBeNull();
        expect(result!.score).toBe(2400);
    });

    // 회귀: SUN_IL_SAEK은 색 변형 역명({red,blue,yellow}, default 없음)이라 isSunIlSaek가
    // meta.color를 줘야 resolveYakuName이 한글 역명을 고른다. 예전엔 bare boolean을
    // 반환해 매치 결과/라운드 기록에 원시 키 'SUN_IL_SAEK'가 그대로 떴다.
    test('SUN_IL_SAEK: 색 변형 역명이 원시 키가 아닌 한글로 해석된다 (순 적/청/황일색)', async ({ page }) => {
        const r = await page.evaluate(() => {
            const yl = (0, eval)('YakuLogic');
            const mk = (type: string, color: string) => ({ type, color, img: '' });
            // 12 red, 6+3+3 더미 → 순일색 성립
            const hand = [
                ...Array(6).fill(null).map(() => mk('ataho', 'red')),
                ...Array(3).fill(null).map(() => mk('punch', 'red')),
                ...Array(3).fill(null).map(() => mk('sword', 'red')),
            ];
            const m = yl.isSunIlSaek(yl.analyzeHand(hand));
            return {
                meta: m && m.match ? m.meta : null,
                red: yl.resolveYakuName('SUN_IL_SAEK', { color: 'red' }, 0),
                blue: yl.resolveYakuName('SUN_IL_SAEK', { color: 'blue' }, 0),
                yellow: yl.resolveYakuName('SUN_IL_SAEK', { color: 'yellow' }, 0),
            };
        });
        expect(r.meta, 'isSunIlSaek must supply meta.color').toEqual({ color: 'red' });
        expect(r.red).toBe('순 적일색');
        expect(r.blue).toBe('순 청일색');
        expect(r.yellow).toBe('순 황일색');
    });

    // 원본(sq/RULES.md 4절): 네 색(보라 포함) 중 세 색에서 한 종류씩 4장.
    test('JAYU_BAKAE_PYEONGDEUNG: 3색×4 성립, 보라색도 한 색으로 센다', async ({ page }) => {
        const r = await page.evaluate(() => {
            const yl = (0, eval)('YakuLogic');
            const mk = (type: string, color: string) => ({ type, color, img: '' });
            const four = (id: string, color: string) => Array(4).fill(null).map(() => mk(id, color));
            const valid = [...four('ataho', 'red'), ...four('pet', 'blue'), ...four('rin', 'yellow')];
            const withPurple = [...four('ataho', 'red'), ...four('rin', 'yellow'), ...four('mayu_purple', 'purple')];
            return {
                valid: yl.isJaYuBakAePyeongDeung(yl.analyzeHand(valid)),
                withPurple: yl.isJaYuBakAePyeongDeung(yl.analyzeHand(withPurple)),
                validTop: (yl.checkYaku(valid, 0) || {}).yaku,
            };
        });
        expect(r.valid, '빨/파/노 3색×4').toBe(true);
        expect(r.withPurple, '보라색 포함도 성립').toBe(true);
        expect(r.validTop).toEqual(['자유 박애 평등']);
    });

    // 회귀: 순일색/초일색은 빨/파/노 단색만 — 보라 단색은 불성립.
    // 예전엔 색을 안 가려 12장 전부 보라인 손도 매칭 후보에 올랐다(실제론 보라 9장뿐이라
    // 도달 불가 + IP_E_DAM이 더 높아 표시도 안 됐지만, 규칙 정합성 차원에서 수정).
    test('SUN_IL_SAEK/CHO_IL_SAEK: 보라 단색은 일색류 불성립(빨/파/노만)', async ({ page }) => {
        const r = await page.evaluate(() => {
            const yl = (0, eval)('YakuLogic');
            const mk = (type: string, color: string) => ({ type, color, img: '' });
            const rep = (id: string, color: string, n: number) => Array(n).fill(null).map(() => mk(id, color));
            const A = (h: any) => yl.analyzeHand(h);
            const purple12 = [...rep('mayu_purple', 'purple', 6), ...rep('mayu_purple', 'purple', 3), ...rep('mayu_purple', 'purple', 3)];
            const redSun = [...rep('ataho', 'red', 6), ...rep('punch', 'red', 3), ...rep('sword', 'red', 3)];
            const redCho = [...rep('ataho', 'red', 4), ...rep('punch', 'red', 4), ...rep('sword', 'red', 4)];
            return {
                sunPurple: yl.isSunIlSaek(A(purple12)),
                choPurple: yl.isChoIlSaek(A(purple12)),
                sunRed: !!(yl.isSunIlSaek(A(redSun)) || {}).match,
                choRed: !!(yl.isChoIlSaek(A(redCho)) || {}).match,
            };
        });
        expect(r.sunPurple, '순일색: 보라 불성립').toBe(false);
        expect(r.choPurple, '초일색: 보라 불성립').toBe(false);
        expect(r.sunRed, '순일색: 빨강 성립').toBe(true);
        expect(r.choRed, '초일색: 빨강 성립').toBe(true);
    });

    // 원본(sq/RULES.md 4절): 순일색은 최다 종류 6장 + 남은 같은 색에서 3장 묶음 둘(같은 종류 거듭 가능 — [6,6] OK).
    // 초일색은 "같은 색 4개씩 3벌"(세트 기반 — 8+4 OK, 6+6는 4벌 안 됨 ✗). 보라는 둘 다 제외.
    test('SUN_IL_SAEK/CHO_IL_SAEK: 구조 검증 (순일색=6+3묶음 둘 / 초일색=세트 4×3벌)', async ({ page }) => {
        const r = await page.evaluate(() => {
            const yl = (0, eval)('YakuLogic');
            const mk = (type: string, color: string) => ({ type, color, img: '' });
            const rep = (id: string, color: string, n: number) => Array(n).fill(null).map(() => mk(id, color));
            const A = (h: any) => yl.analyzeHand(h);
            const B = (x: any) => !!(x && x.match);
            return {
                sun633: B(yl.isSunIlSaek(A([...rep('ataho', 'red', 6), ...rep('punch', 'red', 3), ...rep('sword', 'red', 3)]))),
                sun651: B(yl.isSunIlSaek(A([...rep('ataho', 'red', 6), ...rep('punch', 'red', 5), ...rep('sword', 'red', 1)]))),
                sun66: B(yl.isSunIlSaek(A([...rep('ataho', 'red', 6), ...rep('punch', 'red', 6)]))),
                sun444: B(yl.isSunIlSaek(A([...rep('ataho', 'red', 4), ...rep('punch', 'red', 4), ...rep('sword', 'red', 4)]))),
                cho444: B(yl.isChoIlSaek(A([...rep('ataho', 'red', 4), ...rep('punch', 'red', 4), ...rep('sword', 'red', 4)]))),
                cho84: B(yl.isChoIlSaek(A([...rep('ataho', 'red', 8), ...rep('punch', 'red', 4)]))),
                cho66: B(yl.isChoIlSaek(A([...rep('ataho', 'red', 6), ...rep('punch', 'red', 6)]))),
                cho633: B(yl.isChoIlSaek(A([...rep('ataho', 'red', 6), ...rep('punch', 'red', 3), ...rep('sword', 'red', 3)]))),
            };
        });
        expect(r.sun633, '순일색 [6,3,3] 성립').toBe(true);
        expect(r.sun651, '순일색 [6,5,1] 불성립').toBe(false);
        expect(r.sun66, '순일색 [6,6] 성립(6 + 3묶음 둘)').toBe(true);
        expect(r.sun444, '순일색 [4,4,4]는 순일색 아님(초일색)').toBe(false);
        expect(r.cho444, '초일색 [4,4,4] 성립').toBe(true);
        expect(r.cho84, '초일색 [8,4] 성립(세트 기반 3벌)').toBe(true);
        expect(r.cho66, '초일색 [6,6] 불성립(4벌 안 됨)').toBe(false);
        expect(r.cho633, '초일색 [6,3,3] 불성립(순일색)').toBe(false);
    });

    // 회귀: "N종류(타입)" 요구 역은 같은 타입을 여러 세트 쌓아도 종류 수를 부풀리면 안 된다.
    // 콤비/크로스(캐릭터 2종류), 스페셜(4종류), 변태개(여성 3종류).
    test('종류 기반 역: 같은 타입 더미로 종류 수를 부풀리면 불성립', async ({ page }) => {
        const r = await page.evaluate(() => {
            const yl = (0, eval)('YakuLogic');
            const mk = (type: string, color: string) => ({ type, color, img: '' });
            const rep = (id: string, color: string, n: number) => Array(n).fill(null).map(() => mk(id, color));
            const A = (h: any) => yl.analyzeHand(h);
            const B = (x: any) => !!(x === true || (x && x.match));
            return {
                // COMBINATION: 같은 색 캐릭터 2종류 + 무기. 1종류(ataho×6)는 불성립.
                comboValid: B(yl.isCombination(A([...rep('ataho', 'red', 3), ...rep('rin', 'red', 3), ...rep('sword', 'red', 3), ...rep('smash', 'blue', 3)]))),
                combo1Type: B(yl.isCombination(A([...rep('ataho', 'red', 6), ...rep('punch', 'red', 3), ...rep('smash', 'blue', 3)]))),
                // CROSS: 같은 색 캐릭터 2종류 + 무기 ×4. 1캐릭터종류는 불성립.
                crossValid: B(yl.isCrossCombination(A([...rep('ataho', 'red', 4), ...rep('rin', 'red', 4), ...rep('sword', 'red', 4)]))),
                cross1Type: B(yl.isCrossCombination(A([...rep('ataho', 'red', 8), ...rep('sword', 'red', 4)]))),
                // SPECIAL: 같은 색 4종류 ×3. 3종류(6+3+3=순일색)는 불성립.
                specialValid: B(yl.isSpecialCombination(A([...rep('ataho', 'red', 3), ...rep('rin', 'red', 3), ...rep('sword', 'red', 3), ...rep('wand', 'red', 3)]))),
                special3Type: B(yl.isSpecialCombination(A([...rep('ataho', 'red', 6), ...rep('punch', 'red', 3), ...rep('sword', 'red', 3)]))),
                // BYEON: 스마슈 + 여성 3종류. 여성 2종류는 불성립.
                byeonValid: B(yl.isByeonTaeGae(A([...rep('smash', 'blue', 3), ...rep('rin', 'yellow', 3), ...rep('yuri', 'blue', 3), ...rep('fari', 'red', 3)]))),
                byeon2Type: B(yl.isByeonTaeGae(A([...rep('smash', 'blue', 3), ...rep('rin', 'yellow', 6), ...rep('yuri', 'blue', 3)]))),
            };
        });
        expect(r.comboValid, 'COMBINATION 정상(캐릭터 2종)').toBe(true);
        expect(r.combo1Type, 'COMBINATION 캐릭터 1종(6장) 불성립').toBe(false);
        expect(r.crossValid, 'CROSS 정상(캐릭터 2종)').toBe(true);
        expect(r.cross1Type, 'CROSS 캐릭터 1종(8장) 불성립').toBe(false);
        expect(r.specialValid, 'SPECIAL 정상(4종)').toBe(true);
        expect(r.special3Type, 'SPECIAL 3종(6+3+3) 불성립').toBe(false);
        expect(r.byeonValid, 'BYEON 정상(여성 3종)').toBe(true);
        expect(r.byeon2Type, 'BYEON 여성 2종 불성립').toBe(false);
    });

    // 회귀: 캐릭터 변형 역명(필살기/장기)은 "플레이 캐릭터"가 아니라 "역을 이룬 캐릭터 패"로
    // 정해진다 — is*가 meta.char를 주고 resolveYakuName이 그걸 우선한다.
    test('PIL_SAL_GI/JANG_GI: 역명은 들어간 캐릭터 패로 결정(플레이어 무관)', async ({ page }) => {
        const r = await page.evaluate(() => {
            const yl = (0, eval)('YakuLogic');
            const mk = (type: string, color: string) => ({ type, color, img: '' });
            const rep = (id: string, color: string, n: number) => Array(n).fill(null).map(() => mk(id, color));
            const nm = (h: any, charId: any) => { const x = yl.checkYaku(h, charId); return x ? x.yaku[0] : null; };
            // 필살기: 같은 색 캐릭터+무기 ×4 + 아무거나 ×4
            const pil = (charTile: string) => [...rep(charTile, 'red', 4), ...rep('punch', 'red', 4), ...rep('sword', 'blue', 4)];
            // 장기: 같은 색 캐릭터+무기 ×3 + 2 아무거나
            const jang = (charTile: string, charColor: string, wep: string) =>
                [...rep(charTile, charColor, 3), ...rep(wep, charColor, 3), ...rep('smash', 'blue', 3), ...rep('mayu_red', 'red', 3)];
            return {
                pilAtaho: nm(pil('ataho'), null),
                pilRin: nm(pil('rin'), null),
                jangAtaho: nm(jang('ataho', 'red', 'punch'), null),
                jangPet: nm(jang('pet', 'yellow', 'wand'), null),
                // 플레이어 charId를 유리로 줘도 타일(아타호) 기준 → 맹호난무
                pilAtaho_playerYuri: nm(pil('ataho'), 'yuri'),
            };
        });
        expect(r.pilAtaho, '필살기 아타호 패 → 맹호난무').toBe('맹호난무');
        expect(r.pilRin, '필살기 린샹 패 → 유미쌍조').toBe('유미쌍조');
        expect(r.jangAtaho, '장기 아타호 패 → 호격권').toBe('호격권');
        expect(r.jangPet, '장기 페톰 패 → 폭염의 주문').toBe('폭염의 주문');
        expect(r.pilAtaho_playerYuri, '플레이어 유리여도 타일 기준 → 맹호난무').toBe('맹호난무');
    });

    test('JANG_GI: 동색 캐릭터+무기 트리플렛 포함 4세트 → 점수 2800', async ({ page }) => {
        const result = await page.evaluate(() => {
            const yl = (0, eval)('YakuLogic');
            const mk = (type: string, color: string) => ({ type, color, img: '' });
            // red: ataho(char)×3 + punch(wep)×3 → 동색 캐릭+무기 성립
            // + yuri(blue char)×3 + pet(yellow char)×3 → 나머지 2세트
            const hand = [
                ...Array(3).fill(null).map(() => mk('ataho', 'red')),
                ...Array(3).fill(null).map(() => mk('punch', 'red')),
                ...Array(3).fill(null).map(() => mk('yuri', 'blue')),
                ...Array(3).fill(null).map(() => mk('pet', 'yellow')),
            ];
            return yl.checkYaku(hand, null);
        });
        expect(result).not.toBeNull();
        expect(result!.score).toBe(2800);
    });

    test('SAEK_HANA_SSIK: 4색 각 1트리플렛 → 점수 3200', async ({ page }) => {
        const result = await page.evaluate(() => {
            const yl = (0, eval)('YakuLogic');
            const mk = (type: string, color: string) => ({ type, color, img: '' });
            // red + blue + yellow + purple 각 3장 = 12패
            const hand = [
                ...Array(3).fill(null).map(() => mk('ataho', 'red')),
                ...Array(3).fill(null).map(() => mk('smash', 'blue')),
                ...Array(3).fill(null).map(() => mk('pet', 'yellow')),
                ...Array(3).fill(null).map(() => mk('mayu_purple', 'purple')),
            ];
            return yl.checkYaku(hand, null);
        });
        expect(result).not.toBeNull();
        expect(result!.score).toBe(3200);
    });

    test('COMBINATION: 동색 캐릭터 2+무기 1 트리플렛 + 임의 1세트 → 점수 4000', async ({ page }) => {
        const result = await page.evaluate(() => {
            const yl = (0, eval)('YakuLogic');
            const mk = (type: string, color: string) => ({ type, color, img: '' });
            // red: ataho(char)×3 + rin(char)×3 + punch(wep)×3 → COMBINATION
            // + smash(blue char)×3 as "임의 1세트"
            const hand = [
                ...Array(3).fill(null).map(() => mk('ataho', 'red')),
                ...Array(3).fill(null).map(() => mk('rin',   'red')),
                ...Array(3).fill(null).map(() => mk('punch', 'red')),
                ...Array(3).fill(null).map(() => mk('smash', 'blue')),
            ];
            return yl.checkYaku(hand, null);
        });
        expect(result).not.toBeNull();
        expect(result!.score).toBe(4000);
    });

    test('MAYU: 빨+노+파 마유 트리플렛 각 1 + 임의 1세트 → 점수 4800', async ({ page }) => {
        const result = await page.evaluate(() => {
            const yl = (0, eval)('YakuLogic');
            const mk = (type: string, color: string) => ({ type, color, img: '' });
            // 마유 3색 각 3장 + punch×3 (임의)
            const hand = [
                ...Array(3).fill(null).map(() => mk('mayu_red',    'red')),
                ...Array(3).fill(null).map(() => mk('mayu_yellow', 'yellow')),
                ...Array(3).fill(null).map(() => mk('mayu_blue',   'blue')),
                ...Array(3).fill(null).map(() => mk('punch',       'red')),
            ];
            return yl.checkYaku(hand, null);
        });
        expect(result).not.toBeNull();
        expect(result!.score).toBe(4800);
    });

    test('ALL_STARS: 6 캐릭터 페어 → 점수 2400', async ({ page }) => {
        const result = await page.evaluate(() => {
            const yl = (0, eval)('YakuLogic');
            const mk = (type: string, color: string) => ({ type, color, img: '' });
            // 6종 캐릭터 각 2장 = 12패
            const hand = [
                ...Array(2).fill(null).map(() => mk('ataho', 'red')),
                ...Array(2).fill(null).map(() => mk('rin',   'red')),
                ...Array(2).fill(null).map(() => mk('smash', 'blue')),
                ...Array(2).fill(null).map(() => mk('yuri',  'blue')),
                ...Array(2).fill(null).map(() => mk('pet',   'yellow')),
                ...Array(2).fill(null).map(() => mk('fari',  'yellow')),
            ];
            return yl.checkYaku(hand, null);
        });
        expect(result).not.toBeNull();
        expect(result!.score).toBe(2400);
    });

    test('SAM_YEON_GYEOK: 3색 각 캐릭터+무기 페어 → 점수 2000', async ({ page }) => {
        const result = await page.evaluate(() => {
            const yl = (0, eval)('YakuLogic');
            const mk = (type: string, color: string) => ({ type, color, img: '' });
            // red: ataho+punch / blue: smash+sword / yellow: pet+wand (각 2장)
            const hand = [
                ...Array(2).fill(null).map(() => mk('ataho', 'red')),
                ...Array(2).fill(null).map(() => mk('punch', 'red')),
                ...Array(2).fill(null).map(() => mk('smash', 'blue')),
                ...Array(2).fill(null).map(() => mk('sword', 'blue')),
                ...Array(2).fill(null).map(() => mk('pet',   'yellow')),
                ...Array(2).fill(null).map(() => mk('wand',  'yellow')),
            ];
            return yl.checkYaku(hand, null);
        });
        expect(result).not.toBeNull();
        expect(result!.score).toBe(2000);
    });

    test('Yaku 없음: 12장 전부 단장 → null 반환', async ({ page }) => {
        const result = await page.evaluate(() => {
            const yl = (0, eval)('YakuLogic');
            const mk = (type: string, color: string) => ({ type, color, img: '' });
            // 13종 중 12종 각 1장 → 역 없음
            const hand = [
                mk('ataho',       'red'),    mk('rin',         'red'),    mk('smash',       'blue'),
                mk('yuri',        'blue'),   mk('pet',         'yellow'), mk('fari',        'yellow'),
                mk('punch',       'red'),    mk('sword',       'blue'),   mk('wand',        'yellow'),
                mk('mayu_red',    'red'),    mk('mayu_blue',   'blue'),   mk('mayu_yellow', 'yellow'),
            ];
            return yl.checkYaku(hand, null);
        });
        expect(result).toBeNull();
    });
});

// ============================================================================
// Yaku 우선순위 검증 (중첩 역 최고점 보장)
//
// 동일 패가 여러 역의 성립 조건을 동시에 만족하는 케이스를 구성해,
// checkYaku 가 항상 최고점 역을 반환하는지 확인한다.
//
// 버그 패턴: 상위 역 판정 함수(isXxx)가 valid 패에 false 반환
//   → matches[] 에서 누락 → 하위 역이 matches[0] 이 됨 → 낮은 점수 반환
//
// 각 테스트는 "중첩되는 하위 역" 을 주석으로 명시해 실패 시 원인 추적을 돕는다.
// ============================================================================

test.describe('Yaku 우선순위 검증 (중첩 역 최고점 보장)', () => {

    /** checkYaku 를 직접 호출해 반환 점수를 가져온다. */
    async function checkYakuScore(
        page: Parameters<typeof getSnap>[0],
        tiles: Array<{ type: string; color: string }>
    ): Promise<number | null> {
        return page.evaluate((hand) => {
            const yl = (0, eval)('YakuLogic');
            const result = yl.checkYaku(hand.map((t: { type: string; color: string }) => ({ ...t, img: '' })), null);
            return result?.score ?? null;
        }, tiles);
    }

    /** tiles 를 n 장 복사한다. */
    function rep(type: string, color: string, n: number) {
        return Array.from({ length: n }, () => ({ type, color }));
    }

    // ── 3-piece 역 중첩 ─────────────────────────────────────────────────────

    test('SPECIAL_COMBINATION(8000) > COMBINATION(4000) > JANG_GI(2800) > SAM_DO_RIP(2400)', async ({ page }) => {
        // 동색 4종×3: ataho·rin·punch·mayu_red 모두 red
        // COMBINATION(2char+1wep 동색) 과 SAM_DO_RIP(4트리플렛) 도 성립
        const hand = [
            ...rep('ataho',    'red', 3),
            ...rep('rin',      'red', 3),
            ...rep('punch',    'red', 3),
            ...rep('mayu_red', 'red', 3),
        ];
        expect(await checkYakuScore(page, hand)).toBe(8000);
    });

    test('DOUBLE_COMBINATION(4800) > JANG_GI(2800) > SAM_DO_RIP(2400)', async ({ page }) => {
        // red: ataho(char)+punch(wep), blue: smash(char)+sword(wep) — 2색 캐릭+무기 쌍
        // JANG_GI(동색 캐릭+무기 포함) 와 SAM_DO_RIP(4트리플렛) 도 성립
        const hand = [
            ...rep('ataho', 'red',  3),
            ...rep('punch', 'red',  3),
            ...rep('smash', 'blue', 3),
            ...rep('sword', 'blue', 3),
        ];
        expect(await checkYakuScore(page, hand)).toBe(4800);
    });

    test('CHO_MAYU(6400) > MAYU(4800) > SAM_DO_RIP(2400)', async ({ page }) => {
        // 4색 마유 각 3장 — CHO_MAYU(4색) 와 MAYU(3색+임의) 모두 성립
        const hand = [
            ...rep('mayu_red',    'red',    3),
            ...rep('mayu_yellow', 'yellow', 3),
            ...rep('mayu_blue',   'blue',   3),
            ...rep('mayu_purple', 'purple', 3),
        ];
        expect(await checkYakuScore(page, hand)).toBe(6400);
    });

    test('BYEON_TAE_GAE(6400) > SAM_DO_RIP(2400)', async ({ page }) => {
        // smash×3 + 여성 3종(rin·yuri·fari)×3 — SAM_DO_RIP(4트리플렛) 도 성립
        const hand = [
            ...rep('smash', 'blue',   3),
            ...rep('rin',   'red',    3),
            ...rep('yuri',  'blue',   3),
            ...rep('fari',  'yellow', 3),
        ];
        expect(await checkYakuScore(page, hand)).toBe(6400);
    });

    // ── 4-piece 역 중첩 ─────────────────────────────────────────────────────

    test('CROSS_COMBINATION(9600) > PIL_SAL_GI(5600) > SA_CHEON_YO_RI(3200)', async ({ page }) => {
        // 동색 2캐릭+1무기×4: red ataho·rin·punch 각 4장
        // PIL_SAL_GI(동색 캐릭+무기) 와 SA_CHEON_YO_RI(임의 3세트×4) 도 성립
        const hand = [
            ...rep('ataho', 'red', 4),
            ...rep('rin',   'red', 4),
            ...rep('punch', 'red', 4),
        ];
        expect(await checkYakuScore(page, hand)).toBe(9600);
    });

    test('MAGU_DDAERIGI(9600) > SA_CHEON_YO_RI(3200)', async ({ page }) => {
        // 3무기×4: punch·sword·wand 각 4장 — SA_CHEON_YO_RI 도 성립
        const hand = [
            ...rep('punch', 'red',    4),
            ...rep('sword', 'blue',   4),
            ...rep('wand',  'yellow', 4),
        ];
        expect(await checkYakuScore(page, hand)).toBe(9600);
    });

    test('JIN_MAYU(9600) > SA_CHEON_YO_RI(3200)', async ({ page }) => {
        // 3색 마유×4: mayu_red·mayu_yellow·mayu_blue 각 4장 — SA_CHEON_YO_RI 도 성립
        // (MAYU 는 totalSets<4 로 불성립 → JIN_MAYU 가 유일 고점)
        const hand = [
            ...rep('mayu_red',    'red',    4),
            ...rep('mayu_yellow', 'yellow', 4),
            ...rep('mayu_blue',   'blue',   4),
        ];
        expect(await checkYakuScore(page, hand)).toBe(9600);
    });

    test('NAM_TANG(7200) > JAYU_BAKAE_PYEONGDEUNG(6400) > SA_CHEON_YO_RI(3200)', async ({ page }) => {
        // 남성 3종×4: ataho·smash·pet 각 4장
        // JAYU_BAKAE_PYEONGDEUNG(3색×4) 와 SA_CHEON_YO_RI 도 성립
        const hand = [
            ...rep('ataho', 'red',    4),
            ...rep('smash', 'blue',   4),
            ...rep('pet',   'yellow', 4),
        ];
        expect(await checkYakuScore(page, hand)).toBe(7200);
    });

    test('YEO_TANG(7200) > JAYU_BAKAE_PYEONGDEUNG(6400) > SA_CHEON_YO_RI(3200)', async ({ page }) => {
        // 여성 3종×4: rin·yuri·fari 각 4장
        // JAYU_BAKAE_PYEONGDEUNG(3색×4) 와 SA_CHEON_YO_RI 도 성립
        const hand = [
            ...rep('rin',  'red',    4),
            ...rep('yuri', 'blue',   4),
            ...rep('fari', 'yellow', 4),
        ];
        expect(await checkYakuScore(page, hand)).toBe(7200);
    });

    test('CHWI_HO_JEON(7200) > SA_CHEON_YO_RI(3200)', async ({ page }) => {
        // 취호전 3종(ataho·rin·smash)×4 — SA_CHEON_YO_RI 도 성립
        const hand = [
            ...rep('ataho', 'red',  4),
            ...rep('rin',   'red',  4),
            ...rep('smash', 'blue', 4),
        ];
        expect(await checkYakuScore(page, hand)).toBe(7200);
    });

    test('PO_MUL_JANG(7200) > SA_CHEON_YO_RI(3200)', async ({ page }) => {
        // 포물장 3종(fari·smash·yuri)×4 — SA_CHEON_YO_RI 도 성립
        const hand = [
            ...rep('fari',  'yellow', 4),
            ...rep('smash', 'blue',   4),
            ...rep('yuri',  'blue',   4),
        ];
        expect(await checkYakuScore(page, hand)).toBe(7200);
    });

    test('PIL_SAL_GI(5600) > SA_CHEON_YO_RI(3200)', async ({ page }) => {
        // 동색 캐릭+무기 포함 4-piece (cross-color): red ataho+punch, blue smash
        // SA_CHEON_YO_RI(임의 3세트×4) 도 성립, CROSS_COMBINATION 은 불성립(red 2종뿐)
        const hand = [
            ...rep('ataho', 'red',  4),
            ...rep('punch', 'red',  4),
            ...rep('smash', 'blue', 4),
        ];
        expect(await checkYakuScore(page, hand)).toBe(5600);
    });
});
