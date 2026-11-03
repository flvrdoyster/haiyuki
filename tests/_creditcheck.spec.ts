import { test } from '@playwright/test';
test('script typo', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => { const A=(0,eval)('Assets'); return A && A.get('ending/staff.png') && A.get('bg/STAFFBAK.png'); }, { timeout: 30000 });
    const shoot = async (idx:number, name:string) => {
        await page.evaluate((idx) => {
            const G=(0,eval)('Game'); const CS=(0,eval)('CreditsScene');
            G.changeScene(CS, { endingType: 'TRUE' }); CS.update=function(){};
            CS.idx=idx; CS.t = CS.sections[idx].typoStart - 2; CS.finished=false; CS.fade=0; G.draw();
        }, idx);
        await page.waitForTimeout(35);
        await page.locator('#game-canvas').screenshot({ path: `.playwright/s_${name}.png` });
    };
    await shoot(1, '1_kr_jp');     // 플래너(kr) / 南 千晶·さかや☆(jp)
    await shoot(5, '5_kr_num');    // 사운드&이펙트(kr) / 324(an)
    await shoot(7, '7_kr_an');     // 스페셜 땡스(kr) / ALL COMPILE STAFF(an)
    await shoot(11, '11_kr');      // 팬 / 맛굴(kr)
});
