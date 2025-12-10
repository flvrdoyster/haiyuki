
const CreditsScene = {
    timer: 0,

    init: function () {
        this.timer = 0;
        Assets.stopMusic();
        // Play Ending Theme if available, or just silence/fanfare
        console.log("Credits Scene Initialized");
    },

    update: function () {
        this.timer++;

        // Allow exit after 5 seconds
        if (this.timer > 300) {
            if (Input.isJustPressed(Input.SPACE) || Input.isJustPressed(Input.Z) || Input.isJustPressed(Input.ENTER) || Input.isMouseJustPressed()) {
                Game.changeScene(TitleScene);
            }
        }
    },

    draw: function (ctx) {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, 640, 480);

        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.font = '30px "KoddiUDOnGothic-Bold", sans-serif';

        ctx.fillText("ALL CLEAR!", 320, 240);

        ctx.font = '20px "KoddiUDOnGothic-Regular", sans-serif';
        ctx.fillText("Thank you for playing.", 320, 300);
    }
};
