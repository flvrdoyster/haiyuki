import { test } from '@playwright/test';
test('copyright logo', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => { const A=(0,eval)('Assets'); return A && A.get('ui/logo_compile_1998.png') && A.get('bg/STAFFBAK.png'); }, { timeout: 30000 });
    await page.evaluate(() => {
        const G=(0,eval)('Game'); const CS=(0,eval)('CreditsScene');
        G.changeScene(CS, { endingType: 'TRUE' });
        CS.update = function(){};
        CS.idx = 12; CS.t = 60; CS.finished = false; CS.fade = 0;
        G.draw();
    });
    await page.waitForTimeout(40);
    await page.locator('#game-canvas').screenshot({ path: '.playwright/cr_logo.png' });
});
