window.GAME = 'haiyuki';

const Analytics = {
    track: function (name) {
        if (typeof Game !== 'undefined' && Game.isAutoTest) return;
        (window.dataLayer = window.dataLayer || []).push({ event: name, game: window.GAME });
    },

    playStart: function () {
        this.track('play_start');
        if (typeof Game !== 'undefined' && Game.isAutoTest) return;
        if (window.PlayTime) PlayTime.start();
    }
};
