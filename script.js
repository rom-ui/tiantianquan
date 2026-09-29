/* 启动入口：时钟 + 装配存储 / 页面管理器 / 主题 / 桌面 / 锁屏 + 设置面板 */
(function () {
  'use strict';

  // 字体预设（值为 CSS font-family 栈）
  var FONT_PRESETS = [
    { label: '系统默认', value: '' },
    {
      label: '无衬线体',
      value: '"Helvetica Neue", Arial, "PingFang SC", "Microsoft YaHei", sans-serif'
    },
    {
      label: '衬线体',
      value: 'Georgia, "Songti SC", "SimSun", serif'
    },
    {
      label: '等宽体',
      value: 'Menlo, Consolas, "Courier New", monospace'
    }
  ];

  function pad(n) {
    return n < 10 ? '0' + n : '' + n;
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // 更新状态栏时间
  function updateClock() {
    var el = document.getElementById('statusTime');
    if (!el) return;
    var now = new Date();
    el.textContent = pad(now.getHours()) + ':' + pad(now.getMinutes());
  }

  function openSettings(panel) {
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
  }

  function closeSettings(panel) {
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
  }

  function init() {
    // 版本标记：控制台看到这行说明加载的是最新代码（排查缓存用）
    console.log('甜甜圈 v20260930i');
    updateClock();
    setInterval(updateClock, 30000);

    var panel = document.getElementById('settingsPanel');
    var screenEl = document.querySelector('.screen');

    // 装配：存储 → 主题 → 页面管理器 → 桌面视图 → 锁屏
    var theme = new Theme({
      storage: AppStorage,
      screenEl: screenEl,
      lockEl: document.getElementById('lockScreen')
    });

    var manager = new PageManager(AppStorage);

    // 总设置：API 配置（地址 / Key / 模型）+ 模块开关
    var settings = new Settings(AppStorage);
    var apiClient = new ApiClient({ settings: settings });

    var desktop = new Desktop({
      manager: manager,
      theme: theme,
      desktop: document.getElementById('desktop'),
      track: document.getElementById('pagesTrack'),
      dots: document.getElementById('pageDots'),
      list: document.getElementById('pageManagerList'),
      addBtn: document.getElementById('addPageBtn')
    });
    theme.desktop = desktop;

    var lock = new Lock({
      storage: AppStorage,
      el: document.getElementById('lockScreen')
    });

    // 聊天 App
    var chat = new ChatApp({
      rootEl: document.getElementById('chatApp'),
      storage: AppStorage,
      settings: settings
    });

    var themeWarn = document.getElementById('themeWarn');

    function showThemeWarn(ok) {
      themeWarn.textContent = ok
        ? ''
        : '本地存储空间不足：本次设置有效，刷新后会丢失（可改用 URL 或更小的文件）';
    }

    /* ---------- 全局美化：图标 / 壁纸（URL + 本地图片） ---------- */

    // 配置三类可自定义图片：icon（图标）、lock（锁屏壁纸）、home（主页壁纸）
    var imageKinds = [
      {
        key: 'icon',
        apply: function (v) {
          return theme.setIcon(v);
        },
        reset: function () {
          return theme.resetIcon();
        },
        current: function () {
          return theme.config.customIcon || Theme.DEFAULT_SETTINGS_ICON;
        }
      },
      {
        key: 'lockWallpaper',
        apply: function (v) {
          return theme.setWallpaper('lock', v);
        },
        reset: function () {
          return theme.resetWallpaper('lock');
        },
        current: function () {
          return theme.config.lockWallpaper;
        }
      },
      {
        key: 'homeWallpaper',
        apply: function (v) {
          return theme.setWallpaper('home', v);
        },
        reset: function () {
          return theme.resetWallpaper('home');
        },
        current: function () {
          return theme.config.homeWallpaper;
        }
      }
    ];

    imageKinds.forEach(function (kind) {
      var preview = document.getElementById(kind.key + 'Preview');
      var urlInput = document.getElementById(kind.key + 'UrlInput');
      var urlApply = document.getElementById(kind.key + 'UrlApply');
      var uploadBtn = document.getElementById(kind.key + 'UploadBtn');
      var resetBtn = document.getElementById(kind.key + 'ResetBtn');
      var fileInput = document.getElementById(kind.key + 'File');

      preview.src = kind.current();

      urlApply.addEventListener('click', function () {
        var v = urlInput.value.trim();
        if (!v) {
          showThemeWarn(false);
          return;
        }
        showThemeWarn(kind.apply(v));
        preview.src = kind.current();
      });

      uploadBtn.addEventListener('click', function () {
        fileInput.click();
      });

      fileInput.addEventListener('change', function () {
        var file = fileInput.files && fileInput.files[0];
        if (!file) return;
        Theme.readFileAsDataURL(file).then(function (data) {
          showThemeWarn(kind.apply(data));
          preview.src = kind.current();
        });
        fileInput.value = '';
      });

      resetBtn.addEventListener('click', function () {
        showThemeWarn(kind.reset());
        urlInput.value = '';
        preview.src = kind.current();
      });
    });

    /* ---------- 字体与颜色 ---------- */

    var fontSelect = document.getElementById('fontSelect');
    var fontUploadBtn = document.getElementById('fontUploadBtn');
    var fontFile = document.getElementById('fontFile');
    var fontColorPicker = document.getElementById('fontColorPicker');
    var fontColorReset = document.getElementById('fontColorReset');

    function renderFontOptions() {
      var html = FONT_PRESETS
        .map(function (p) {
          return '<option value="' + esc(p.value) + '">' + esc(p.label) + '</option>';
        })
        .join('');
      html += theme.config.fonts
        .map(function (f) {
          return '<option value="' + esc(f.name) + '">' + esc(f.name) + '（自定义）</option>';
        })
        .join('');
      if (theme.config.remoteFontFamily) {
        html +=
          '<option value="' +
          esc(theme.config.remoteFontFamily) +
          '">' +
          esc(theme.config.remoteFontFamily) +
          '（远程）</option>';
      }
      fontSelect.innerHTML = html;
      fontSelect.value = theme.config.fontFamily;
    }
    renderFontOptions();

    fontSelect.addEventListener('change', function () {
      showThemeWarn(theme.setFontFamily(fontSelect.value));
    });

    fontUploadBtn.addEventListener('click', function () {
      fontFile.click();
    });

    fontFile.addEventListener('change', function () {
      var file = fontFile.files && fontFile.files[0];
      if (!file) return;
      theme.addFontFile(file).then(function (r) {
        renderFontOptions();
        fontSelect.value = r.name;
        showThemeWarn(r.persisted);
      });
      fontFile.value = '';
    });

    fontColorPicker.value = theme.config.fontColor;
    fontColorPicker.addEventListener('input', function () {
      showThemeWarn(theme.setFontColor(fontColorPicker.value));
    });
    fontColorReset.addEventListener('click', function () {
      showThemeWarn(theme.resetFontColor());
      fontColorPicker.value = Theme.DEFAULT_FONT_COLOR;
    });

    /* ---------- 远程字体（@import CSS） ---------- */
    var remoteFontUrl = document.getElementById('remoteFontUrl');
    var remoteFontFamily = document.getElementById('remoteFontFamily');
    var remoteFontApply = document.getElementById('remoteFontApply');

    function loadRemoteFontUI() {
      remoteFontUrl.value = theme.config.remoteFontUrl || '';
      remoteFontFamily.value = theme.config.remoteFontFamily || '';
    }
    loadRemoteFontUI();

    remoteFontApply.addEventListener('click', function () {
      var url = remoteFontUrl.value.trim();
      var family = remoteFontFamily.value.trim();
      if (!url) {
        showThemeWarn(false);
        return;
      }
      showThemeWarn(theme.applyRemoteFont(url, family));
      renderFontOptions();
      fontSelect.value = theme.config.fontFamily;
    });

    /* ---------- 设置：锁屏与安全 ---------- */
    var lockEnabledToggle = document.getElementById('lockEnabledToggle');
    var notificationToggle = document.getElementById('notificationToggle');
    var managePasswordBtn = document.getElementById('managePasswordBtn');
    var lockNowBtn = document.getElementById('lockNowBtn');

    function syncLockUI() {
      lockEnabledToggle.checked = lock.config.enabled;
      notificationToggle.checked = lock.config.showNotifications;
      managePasswordBtn.textContent = lock.hasPassword() ? '更改密码' : '设置密码';
      // 只有开启锁屏后才能设置密码
      managePasswordBtn.disabled = !lock.config.enabled;
    }
    syncLockUI();

    // 锁屏开关：开启后立即锁屏，关闭则不影响当前
    lockEnabledToggle.addEventListener('change', function () {
      lock.update({ enabled: lockEnabledToggle.checked });
      syncLockUI();
      if (lockEnabledToggle.checked) {
        closeSettings(panel);
        lock.lock();
      }
    });

    // 通知预览开关（锁屏显示时也即时生效）
    notificationToggle.addEventListener('change', function () {
      lock.update({ showNotifications: notificationToggle.checked });
    });

    // 立即锁屏（未启用锁屏时自动启用）
    lockNowBtn.addEventListener('click', function () {
      if (!lock.config.enabled) {
        lock.update({ enabled: true });
        lockEnabledToggle.checked = true;
        syncLockUI();
      }
      closeSettings(panel);
      lock.lock();
    });

    /* ---------- 密码设置模态 ---------- */
    var passwordModal = document.getElementById('passwordModal');
    var newPasswordInput = document.getElementById('newPasswordInput');
    var confirmPasswordInput = document.getElementById('confirmPasswordInput');
    var passwordModalError = document.getElementById('passwordModalError');
    var passwordModalTitle = document.getElementById('passwordModalTitle');

    function openPasswordModal() {
      passwordModalTitle.textContent = lock.hasPassword() ? '更改密码' : '设置密码';
      newPasswordInput.value = '';
      confirmPasswordInput.value = '';
      passwordModalError.textContent = '';
      passwordModal.classList.add('open');
      passwordModal.setAttribute('aria-hidden', 'false');
      setTimeout(function () {
        newPasswordInput.focus();
      }, 60);
    }

    function closePasswordModal() {
      passwordModal.classList.remove('open');
      passwordModal.setAttribute('aria-hidden', 'true');
    }

    function savePassword() {
      if (newPasswordInput.value !== confirmPasswordInput.value) {
        passwordModalError.textContent = '两次输入不一致';
        return;
      }
      lock.setPassword(newPasswordInput.value);
      closePasswordModal();
      syncLockUI();
    }

    managePasswordBtn.addEventListener('click', openPasswordModal);
    document.getElementById('passwordModalCancel').addEventListener('click', closePasswordModal);
    document.getElementById('passwordModalSave').addEventListener('click', savePassword);
    passwordModal.addEventListener('click', function (e) {
      if (e.target === passwordModal) closePasswordModal();
    });
    passwordModal.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') savePassword();
    });

    /* ---------- 设置面板：标签页切换 ---------- */
    var tabButtons = Array.prototype.slice.call(document.querySelectorAll('.st-tab'));
    var tabPanes = Array.prototype.slice.call(document.querySelectorAll('.st-pane'));

    function activateTab(name) {
      tabButtons.forEach(function (b) {
        b.classList.toggle('active', b.getAttribute('data-tab') === name);
      });
      tabPanes.forEach(function (p) {
        p.classList.toggle('active', p.getAttribute('data-pane') === name);
      });
    }

    tabButtons.forEach(function (b) {
      b.addEventListener('click', function () {
        activateTab(b.getAttribute('data-tab'));
      });
    });

    // 标签页左右滑动切换（触摸 + 鼠标拖拽）
    var tabOrder = tabButtons.map(function (b) {
      return b.getAttribute('data-tab');
    });

    function switchTabBy(dir) {
      var active = document.querySelector('.st-tab.active');
      var i = active ? tabOrder.indexOf(active.getAttribute('data-tab')) : 0;
      var j = i + dir;
      if (j < 0 || j >= tabOrder.length) return;
      activateTab(tabOrder[j]);
    }

    function isInteractive(el) {
      if (!el) return true;
      return !!(el.closest('input') || el.closest('textarea') || el.closest('select') ||
        el.closest('button') || el.closest('label') || el.closest('a'));
    }

    var tsx = null;
    panel.addEventListener('touchstart', function (e) {
      if (e.touches.length === 1) tsx = e.touches[0].clientX;
    }, { passive: true });
    panel.addEventListener('touchend', function (e) {
      if (tsx === null) return;
      var dx = e.changedTouches[0].clientX - tsx;
      if (Math.abs(dx) > 48) switchTabBy(dx < 0 ? 1 : -1);
      tsx = null;
    });

    var msx = null, msy = null, mdragged = false;
    panel.addEventListener('mousedown', function (e) {
      if (isInteractive(e.target)) return;
      msx = e.clientX; msy = e.clientY; mdragged = false;
    });
    window.addEventListener('mousemove', function (e) {
      if (msx === null) return;
      var dx = e.clientX - msx;
      var dy = e.clientY - msy;
      if (!mdragged && (Math.abs(dx) > 12 || Math.abs(dy) > 12)) {
        if (Math.abs(dx) > Math.abs(dy)) mdragged = true;
        else { msx = null; msy = null; }
      }
    });
    window.addEventListener('mouseup', function (e) {
      if (msx === null) return;
      var dx = e.clientX - msx;
      if (mdragged && Math.abs(dx) > 48) switchTabBy(dx < 0 ? 1 : -1);
      msx = null; msy = null; mdragged = false;
    });

    /* ---------- 总设置：API 配置 + 模块开关 ---------- */
    var apiBaseUrl = document.getElementById('apiBaseUrl');
    var apiKey = document.getElementById('apiKey');
    var apiModel = document.getElementById('apiModel');
    var apiSave = document.getElementById('apiSave');
    var apiTest = document.getElementById('apiTest');
    var apiStatus = document.getElementById('apiStatus');

    function loadApiUI() {
      apiBaseUrl.value = settings.config.api.baseUrl;
      apiModel.value = settings.config.api.model;
      apiKey.value = settings.getApiKey(); // 回显明文，便于修改
    }
    loadApiUI();

    function setApiStatus(ok, msg) {
      apiStatus.textContent = msg;
      apiStatus.className = 'api-status' + (ok === null ? '' : ok ? ' ok' : ' err');
    }

    apiSave.addEventListener('click', function () {
      settings.setApi({
        baseUrl: apiBaseUrl.value.trim(),
        model: apiModel.value.trim(),
        key: apiKey.value.trim()
      });
      setApiStatus(true, '已保存');
    });

    apiTest.addEventListener('click', function () {
      // 先保存当前输入，再用保存后的值测试
      settings.setApi({
        baseUrl: apiBaseUrl.value.trim(),
        model: apiModel.value.trim(),
        key: apiKey.value.trim()
      });
      setApiStatus(null, '正在测试…');
      apiClient.test().then(function (r) {
        setApiStatus(r.ok, r.message);
      });
    });

    /* 拉取模型：调用 GET {baseUrl}/models，填充到模型输入的下拉候选 */
    var apiPullModels = document.getElementById('apiPullModels');
    var apiModelDatalist = document.getElementById('apiModelDatalist');

    apiPullModels.addEventListener('click', function () {
      settings.setApi({
        baseUrl: apiBaseUrl.value.trim(),
        model: apiModel.value.trim(),
        key: apiKey.value.trim()
      });
      var base = (settings.config.api.baseUrl || '').trim();
      var key = settings.getApiKey();
      if (!base) {
        setApiStatus(false, '请先填写 API 地址');
        return;
      }
      if (!key) {
        setApiStatus(false, '请先填写 API Key');
        return;
      }
      setApiStatus(null, '正在拉取模型…');
      fetch(base.replace(/\/+$/, '') + '/models', { headers: { Authorization: 'Bearer ' + key } })
        .then(function (resp) {
          if (!resp.ok) throw new Error('HTTP ' + resp.status);
          return resp.json();
        })
        .then(function (json) {
          var list = json && Array.isArray(json.data) ? json.data : [];
          var names = list
            .map(function (m) {
              return m && m.id;
            })
            .filter(Boolean);
          if (!names.length) {
            setApiStatus(false, '未获取到模型列表');
            return;
          }
          apiModelDatalist.innerHTML = names
            .map(function (n) {
              return '<option value="' + esc(n) + '"></option>';
            })
            .join('');
          if (!apiModel.value) apiModel.value = names[0];
          setApiStatus(true, '已拉取 ' + names.length + ' 个模型');
        })
        .catch(function (err) {
          setApiStatus(false, '拉取失败：' + (err && err.message ? err.message : err));
        });
    });

    /* ---------- 设置：数据备份 / 导出 / 导入 ---------- */
    var BACKUP_KEY = 'donut-backup-snapshot';
    var DONUT_KEYS = ['donut-desktop-v2', 'donut-theme-v1', 'donut-lock-v1', 'donut-settings-v1', 'donut-chat-v1'];
    var backupStatus = document.getElementById('backupStatus');

    function setBackupStatus(msg, ok) {
      backupStatus.textContent = msg;
      backupStatus.className = 'api-status' + (ok === null ? '' : ok ? ' ok' : ' err');
    }

    function collectAll() {
      var o = {};
      DONUT_KEYS.forEach(function (k) {
        var v = localStorage.getItem(k);
        if (v !== null) o[k] = v;
      });
      return o;
    }

    document.getElementById('backupCreate').addEventListener('click', function () {
      try {
        localStorage.setItem(BACKUP_KEY, JSON.stringify(collectAll()));
        setBackupStatus('已备份于 ' + new Date().toLocaleTimeString(), true);
      } catch (err) {
        setBackupStatus('备份失败：' + err.message, false);
      }
    });

    document.getElementById('backupRestore').addEventListener('click', function () {
      var raw = localStorage.getItem(BACKUP_KEY);
      if (!raw) {
        setBackupStatus('没有可恢复的备份，请先「立即备份」', false);
        return;
      }
      var data;
      try {
        data = JSON.parse(raw);
      } catch (err) {
        setBackupStatus('备份数据已损坏', false);
        return;
      }
      DONUT_KEYS.forEach(function (k) {
        if (data[k] !== undefined) localStorage.setItem(k, data[k]);
      });
      setBackupStatus('已恢复备份，即将刷新…', true);
      setTimeout(function () {
        location.reload();
      }, 600);
    });

    document.getElementById('backupExport').addEventListener('click', function () {
      var blob = new Blob([JSON.stringify(collectAll(), null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'donut-backup-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setBackupStatus('已导出配置文件', true);
    });

    var backupImportFile = document.getElementById('backupImportFile');
    backupImportFile.addEventListener('change', function () {
      var file = this.files && this.files[0];
      if (!file) return;
      var reader = new FileReader();
      var input = this;
      reader.onload = function () {
        var data;
        try {
          data = JSON.parse(reader.result);
        } catch (err) {
          setBackupStatus('文件不是有效的 JSON', false);
          input.value = '';
          return;
        }
        var count = 0;
        DONUT_KEYS.forEach(function (k) {
          if (data[k] !== undefined) {
            localStorage.setItem(k, data[k]);
            count++;
          }
        });
        input.value = '';
        setBackupStatus('已导入 ' + count + ' 项配置，即将刷新…', true);
        setTimeout(function () {
          location.reload();
        }, 600);
      };
      reader.readAsText(file);
    });

    /* ---------- 设置面板：APP 启动式弹出 ---------- */
    // 事件委托：任意页面中的“设置”应用都能打开面板
    document.addEventListener('click', function (e) {
      // 锁屏内部的点击（含锁屏通知）由锁屏模块处理，不走这里
      if (e.target.closest && e.target.closest('.lock-screen')) return;
      var btn = e.target.closest
        ? e.target.closest('[data-action="settings"]')
        : null;
      if (btn && panel) {
        // 以图标中心为缩放原点，模拟手机上点开 APP 的动画
        var sr = screenEl.getBoundingClientRect();
        var br = btn.getBoundingClientRect();
        panel.style.transformOrigin =
          br.left - sr.left + br.width / 2 + 'px ' + (br.top - sr.top + br.height / 2) + 'px';

        syncLockUI();
        openSettings(panel);
      }
    });

    // 事件委托：点击桌面上的“聊天”应用打开聊天
    document.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('.lock-screen')) return;
      var btn = e.target.closest
        ? e.target.closest('[data-action="chat"]')
        : null;
      if (btn && chat) chat.open();
    });

    var closeBtn = document.getElementById('settingsClose');
    if (closeBtn && panel) {
      closeBtn.addEventListener('click', function () {
        closeSettings(panel);
      });
    }

    // 设置面板左上角返回键：回到主页
    var backBtn = document.getElementById('settingsBack');
    if (backBtn && panel) {
      backBtn.addEventListener('click', function () {
        closeSettings(panel);
      });
    }

    // 暴露实例，便于调试与后续任务扩展
    window.__app = {
      manager: manager,
      desktop: desktop,
      lock: lock,
      theme: theme,
      settings: settings,
      api: apiClient,
      chat: chat
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
