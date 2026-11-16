(function () {
    const link = document.getElementById('vs-link');
    const sep = document.getElementById('vs-sep');
    if (!link || !sep) return;

    function sync() {
        const offline = navigator.onLine === false;
        link.hidden = offline;
        sep.hidden = offline;
    }

    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    sync();
})();
