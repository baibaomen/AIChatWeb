if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/serviceWorker.js').then(function (registration) {
      console.log('ServiceWorker registration successful with scope: ', registration.scope);
    }, function (err) {
      console.error('ServiceWorker registration failed: ', err);
    });
  });
}

window.localStorage.setItem('lang','cn');
window.localStorage.setItem('app-config','{"state":{"dontShowMaskSplashScreen":true}}');

// 创建一个新的 style 元素
var style = document.createElement('style');
style.type = 'text/css';

// 准备要添加的 CSS 规则
var css = `
@media screen and (min-width: 601px) {
  
  /*不显示桌面版标题栏右侧的分享等按钮*/
  [class="window-actions"]
  {
      display: none !important;
  }
}

@media screen and (max-width: 600px) {
  .nononono
  {
      display: none !important;
  }
}


/*不显示个人中心、服务订阅栏*/
[class^="home_sidebar-header-bar_"]
/*不显示侧边栏头像图标*/
,[class^="home_sidebar-logo_"]
/*不显示侧边栏设置按钮*/
,[class^="home_sidebar-action_"]:nth-of-type(2)
/*不显示github按钮*/
,[class^="home_sidebar-action_"]:nth-of-type(3)
/*不显示移动版标题栏右侧的工具按钮*/
,[class="chat_window-action-button__TozDU"]
/*不显示桌面版发送消息区上方的工具栏*/
,[class^="chat_chat-input-actions_"]
/*不显示AI回复消息下方的操作工具栏*/
,[class^="chat_chat-message-actions_"]
/*不显示“包含0条预设提示词”*/
,[class^="chat_prompt-toast_"]
{
    display: none !important;
}
`;

// 将 CSS 规则添加到 style 元素
if (style.styleSheet) {
    // 适用于 IE8 及以下版本
    style.styleSheet.cssText = css;
} else {
    // 适用于大多数浏览器
    style.appendChild(document.createTextNode(css));
}

// 将 style 元素添加到文档的 head 中
document.head.appendChild(style);
