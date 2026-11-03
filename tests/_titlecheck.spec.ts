import { test } from '@playwright/test';
test('title', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => {
        const G=(0,eval)('Game'); const A=(0,eval)('Assets');
        return G.currentScene === (0,eval)('TitleScene') && A.get('title/PAI.png') && A.get('title/LOGO_REST.png');
    }, { timeout: 30000 });
    const shoot = async (t:number, name:string) => {
        await page.evaluate((t) => { const TS=(0,eval)('TitleScene'); TS.update=function(){}; TS.introTimer=t; (0,eval)('Game').draw(); }, t);
        await page.waitForTimeout(40);
        await page.locator('#game-canvas').screenshot({ path: `.playwright/ti_${name}.png` });
    };
    await shoot(20, 'drop');
    await shoot(55, 'stretch');
    await shoot(999, 'steady');
});
