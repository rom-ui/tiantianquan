(function () {
  'use strict';

  function pad(n) {
    return n < 10 ? '0' + n : '' + n;
  }

  // 更新状态栏时间
  function updateClock() {
    var el = document.getElementById('statusTime');
    if (!el) return;
    var now = new Date();
    el.textContent = pad(now.getHours()) + ':' + pad(now.getMinutes());
  }

  function init() {
    updateClock();
    setInterval(updateClock, 30000);

    var settingsEntry = document.getElementById('settingsEntry');
    var settingsPanel = document.getElementById('settingsPanel');
    var settingsClose = document.getElementById('settingsClose');

    // 设置入口：打开占位面板
    if (settingsEntry && settingsPanel) {
      settingsEntry.addEventListener('click', function () {
        settingsPanel.classList.add('open');
        settingsPanel.setAttribute('aria-hidden', 'false');
      });
    }

    // 关闭占位面板
    if (settingsClose && settingsPanel) {
      settingsClose.addEventListener('click', function () {
        settingsPanel.classList.remove('open');
        settingsPanel.setAttribute('aria-hidden', 'true');
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
