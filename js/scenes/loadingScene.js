const LoadingScene = {
    isLoaded: false,
    delayTimer: 0,
    
    init: function () {
        this.isLoaded = false;
        this.delayTimer = 0;
        
        Assets.load(() => {
            console.log('Assets loaded.');
            this.isLoaded = true;
        });
    },

    update: function (dt) {
        if (this.isLoaded) {
            this.delayTimer += dt;
            if (this.delayTimer > 30) {
                const urlParams = new URLSearchParams(window.location.search);
                const mode = urlParams.get('mode');

                if (mode === 'story' || mode === 'watch') {
                    console.log("Direct access to Story/Watch Mode detected.");
                    Game.changeScene(CharacterSelectScene, { mode: 'WATCH' });
                } else {
                    Game.changeScene(TitleScene);
                }
            }
        }
    },

    draw: function (ctx) {
        ctx.fillStyle = 'rgba(0, 0, 0, 1)';
        ctx.fillRect(0, 0, Game.canvas.width, Game.canvas.height);
        
        const total = Assets.toLoad.length;
        const loaded = Assets.loadedCount;
        const progress = total > 0 ? loaded / total : 0;
        
        const barW = 320;
        const barH = 24;
        const barX = 320 - barW / 2;
        const barY = 250;
        const radius = 10;
        
        const drawRoundRectPath = (x, y, w, h, r) => {
            if (ctx.roundRect) {
                ctx.roundRect(x, y, w, h, r);
            } else {
                ctx.moveTo(x + r, y);
                ctx.lineTo(x + w - r, y);
                ctx.quadraticCurveTo(x + w, y, x + w, y + r);
                ctx.lineTo(x + w, y + h - r);
                ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
                ctx.lineTo(x + r, y + h);
                ctx.quadraticCurveTo(x, y + h, x, y + h - r);
                ctx.lineTo(x, y + r);
                ctx.quadraticCurveTo(x, y, x + r, y);
            }
        };

        ctx.fillStyle = 'rgba(0, 0, 0, 1)';
        ctx.beginPath();
        drawRoundRectPath(barX + 2, barY + 2, barW, barH, radius);
        ctx.fill();
        
        ctx.fillStyle = 'rgba(255, 255, 255, 1)';
        ctx.strokeStyle = 'rgba(0, 0, 0, 1)';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        drawRoundRectPath(barX, barY, barW, barH, radius);
        ctx.fill();
        ctx.stroke();
        
        if (progress > 0) {
            ctx.save();
            ctx.beginPath();
            drawRoundRectPath(barX, barY, barW, barH, radius);
            ctx.clip();
            
            ctx.fillStyle = 'rgba(255, 215, 0, 1)';
            ctx.fillRect(barX, barY, barW * progress, barH);
            ctx.restore();
            
            ctx.strokeStyle = 'rgba(0, 0, 0, 1)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            drawRoundRectPath(barX, barY, barW, barH, radius);
            ctx.stroke();
        }
    }
};
