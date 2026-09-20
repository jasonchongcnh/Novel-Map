/* Novel-Map locale bootstrap. Include this before the page's inline script. */
(function () {
  'use strict';
  var STORAGE_KEY = 'novel-map-locale';
  var LOCALE = 'zh-CN';
  var urlLocale = new URLSearchParams(window.location.search).get('lang');
  if (urlLocale) localStorage.setItem(STORAGE_KEY, urlLocale);
  var current = localStorage.getItem(STORAGE_KEY) || document.documentElement.lang || 'zh-Hant';
  if (current !== LOCALE) return;

  var replacements = {
    '澳門全息地圖': '澳门全息地图', '上載影片': '上传视频', '影片審批後台': '视频审核后台',
    '影片審批': '视频审核', '登入': '登录', '登出': '退出登录', '管理員': '管理员',
    '審批中...': '审核中……', '載入失敗：': '加载失败：', '載入中...': '加载中……',
    '目前沒有待審批影片。': '目前没有待审核视频。', '待審批影片': '待审核视频',
    '批准': '通过', '拒絕': '拒绝', '影片檔案': '视频文件', '標題': '标题', '描述': '描述',
    '選擇影片檔案': '选择视频文件', '請輸入影片標題': '请输入视频标题',
    '請輸入影片描述': '请输入视频描述', '目前位置尚未取得': '尚未获取当前位置',
    '使用目前位置': '使用当前位置', '在地圖上選擇': '在地图上选择', '返回全息地圖': '返回全息地图',
    '選擇地圖位置': '选择地图位置', '關閉': '关闭', '位置：尚未設定': '位置：尚未设置',
    '瀏覽器不支援地理位置功能': '浏览器不支持地理位置功能', '正在取得位置...': '正在获取位置……',
    '無法取得位置：': '无法获取位置：', '請先選擇影片檔案。': '请先选择视频文件。',
    '請先選擇位置。': '请先选择位置。', '影片上載中...': '视频上传中……',
    '影片已成功上載！': '视频已成功上传！', '上載失敗：': '上传失败：', '學校': '学校',
    '博物館': '博物馆', '使用者影片': '用户视频', '取得我的位置': '获取我的位置',
    '新增影片': '添加视频', '地圖載入中...': '地图加载中……', '目前位置：': '当前位置：',
    '準確度：': '准确度：', '地址：': '地址：', '電話：': '电话：', '網站': '网站',
    '審核狀態': '审核状态', '全息定位影片': '全息定位视频', '定位影片 (本地保存)': '定位视频（本地保存）',
    '請先登入管理員帳號：': '请先登录管理员账号：', '無效的審批狀態。': '无效的审核状态。',
    'OpenStreetMap 貢獻者': 'OpenStreetMap 贡献者', '座標：': '坐标：', '地點：': '地点：'
  };
  var keys = Object.keys(replacements).sort(function (a, b) { return b.length - a.length; });
  function translate(value) {
    return keys.reduce(function (text, key) {
      return text.split(key).join(replacements[key]);
    }, value);
  }
  function translateElement(root) {
    if (root.nodeType === Node.TEXT_NODE) {
      root.nodeValue = translate(root.nodeValue);
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE) return;
    ['title', 'placeholder', 'aria-label', 'value'].forEach(function (attr) {
      if (root.hasAttribute(attr)) root.setAttribute(attr, translate(root.getAttribute(attr)));
    });
    root.childNodes.forEach(translateElement);
  }
  function addLanguageMenu() {
    var nav = document.querySelector('.nav');
    if (!nav || document.getElementById('language-switcher')) return;
    var select = document.createElement('select');
    select.id = 'language-switcher';
    select.title = '语言';
    select.innerHTML = '<option value="zh-Hant">繁體中文</option><option value="zh-CN">简体中文</option>';
    select.value = LOCALE;
    select.onchange = function () {
      localStorage.setItem(STORAGE_KEY, select.value);
      location.reload();
    };
    nav.appendChild(select);
  }
  document.documentElement.lang = LOCALE;
  document.title = translate(document.title);
  translateElement(document.body);
  addLanguageMenu();
  new MutationObserver(function (records) {
    records.forEach(function (record) {
      record.addedNodes.forEach(translateElement);
      if (record.type === 'characterData') translateElement(record.target);
    });
    addLanguageMenu();
  }).observe(document.body, { childList: true, subtree: true, characterData: true });
}());
