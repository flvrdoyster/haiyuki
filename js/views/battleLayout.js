// 전투 화면 좌표의 단일 출처 — 렌더러(그리기)와 battleScene(클릭 판정)이 둘 다 이걸 본다.
const BattleLayout = {
    getVisualMetrics: function (character, groupSize) {
        const m = { totalW: 0, startX: 0, handStartX: 0, openStartX: 0, handW: 0, openW: 0 };

        const tileW = BattleConfig.HAND.tileWidth;
        const gap = BattleConfig.HAND.tileGap;
        // 세트 간 간격은 tileGap과 동일 (extra gap 제거됨)
        const internalSetGap = BattleConfig.HAND.tileGap;
        const drawGap = BattleConfig.HAND.drawGap;
        const sectionGap = BattleConfig.HAND.sectionGap;

        const handSize = character.hand.length;
        let handW = handSize * (tileW + gap);
        if (handSize > 0) handW -= gap;
        if (groupSize > 0) handW += drawGap;

        let openW = 0;
        if (character.openSets && character.openSets.length > 0) {
            character.openSets.forEach(set => {
                openW += (set.tiles.length * tileW) + ((set.tiles.length - 1) * gap) + internalSetGap;
            });
            openW -= internalSetGap;
        }

        let totalW = handW;
        if (openW > 0) totalW += sectionGap + openW;

        const startX = (640 - totalW) / 2;

        m.totalW = totalW;
        m.startX = startX;
        m.handStartX = startX;
        m.openStartX = startX + handW + sectionGap;
        m.handW = handW;
        m.openW = openW;

        return m;
    },

    getPlayerHandPosition: function (index, count, groupSize, startX) {
        const tileW = BattleConfig.HAND.tileWidth;
        const gap = BattleConfig.HAND.tileGap;
        const drawGap = BattleConfig.HAND.drawGap;

        let x = startX + index * (tileW + gap);
        if (groupSize > 0 && index >= count - groupSize) {
            x += drawGap;
        }

        return { x: x, y: BattleConfig.HAND.playerY };
    },

    getMenuMetrics: function (menuItems) {
        const conf = BattleConfig.BATTLE_MENU;
        const lineHeight = conf.fixedLineHeight || 28;
        const topOffset = conf.padding + 7;
        let contentH = 0;
        menuItems.forEach(item => {
            contentH += (item.type === 'SEPARATOR') ? (conf.separatorHeight || 4) : lineHeight;
        });
        const h = topOffset + contentH + conf.padding;
        const y = (conf.y + conf.h) - h; // keep the bottom edge fixed; grow upward
        return { x: conf.x, y, w: conf.w, h, startX: conf.x + conf.padding, startY: y + topOffset, lineHeight };
    },

    getHandTileAt: function (x, y, player, groupSize) {
        const handSize = player.hand.length;
        const metrics = this.getVisualMetrics(player, groupSize);
        const tileW = BattleConfig.HAND.tileWidth;
        const tileH = BattleConfig.HAND.tileHeight;

        // 엣지 오클릭 방지: 패 면적의 15%/10% 안쪽만 히트
        const xPad = tileW * 0.15;
        const yPad = tileH * 0.1;

        const handY = BattleConfig.HAND.playerY;
        if (y < handY + yPad || y > handY + tileH - yPad) return -1;

        for (let i = 0; i < handSize; i++) {
            const pos = this.getPlayerHandPosition(i, handSize, groupSize, metrics.startX);
            if (x >= pos.x + xPad && x < pos.x + tileW - xPad) {
                return i;
            }
        }
        return -1;
    },

    getMenuItemAt: function (mouseX, mouseY, menuItems) {
        const conf = BattleConfig.BATTLE_MENU;
        const m = this.getMenuMetrics(menuItems);
        const x = m.x, y = m.y, w = m.w, h = m.h;
        const startX = m.startX;
        const startY = m.startY;

        if (mouseX < x || mouseX > x + w || mouseY < y || mouseY > y + h) return -1;

        const lineHeight = m.lineHeight;
        const getItemHeight = (item) => {
            if (item.type === 'SEPARATOR') return conf.separatorHeight || 4;
            return lineHeight;
        };

        let currentY = startY;

        for (let i = 0; i < menuItems.length; i++) {
            const item = menuItems[i];
            const itemH = getItemHeight(item);

            if (item.type === 'SEPARATOR') {
                currentY += itemH;
                continue;
            }

            if (mouseY >= currentY && mouseY < currentY + itemH) {
                if (mouseX >= startX && mouseX <= startX + (w - conf.padding * 2)) {
                    return i;
                }
            }
            currentY += itemH;
        }
        return -1;
    }
};
