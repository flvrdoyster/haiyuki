// 전투 화면 레이아웃 계산 + 그것에 기반한 히트테스트.
//
// battleRenderer 안에 그리기와 섞여 있던 것을 옮겼다. 히트테스트가 렌더링과 **같은 좌표
// 계산**을 봐야 클릭이 그림과 어긋나지 않는데, 둘이 한 파일에 있으면 어느 쪽이 진실
// 출처인지 흐려진다. 여기가 좌표의 단일 출처고, 렌더러는 이걸 불러서 그린다.
//
//   레이아웃: getVisualMetrics(손패·펑 세트 전체 폭과 시작 x) · getPlayerHandPosition · _menuMetrics
//   히트테스트: getHandTileAt · getMenuItemAt  — 전부 순수 함수(그리기 없이 호출 가능)
//
// 렌더러에 남긴 것: checkActionButton / checkExchangeButton. 이 둘은 draw 가 measureText 로
// 계산해 캐시한 rect(_actionRect / _exchangeBtnRect)를 읽으므로 그리기에 묶여 있다 —
// 한 프레임도 안 그렸으면 항상 false. 그 의존을 여기로 끌어오면 오히려 감춰지므로 draw 옆에 뒀다.
const BattleLayout = {
    getVisualMetrics: function (character, groupSize, target) {
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

    _tempPos: { x: 0, y: 0 },

    getPlayerHandPosition: function (index, count, groupSize, startX) {
        const tileW = BattleConfig.HAND.tileWidth;
        const gap = BattleConfig.HAND.tileGap;
        const drawGap = BattleConfig.HAND.drawGap;

        let x = startX + index * (tileW + gap);
        if (groupSize > 0 && index >= count - groupSize) {
            x += drawGap;
        }

        // GC 압박 최소화: 매 프레임 객체 재사용
        this._tempPos.x = x;
        this._tempPos.y = BattleConfig.HAND.playerY;
        return this._tempPos;
    },

    _menuMetrics: function (menuItems) {
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
        const m = this._menuMetrics(menuItems);
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
