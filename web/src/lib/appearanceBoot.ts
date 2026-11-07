export const STORAGE_KEY = "anilist.appearance";

export const BOOT_SCRIPT = `(function(){try{var a=JSON.parse(localStorage.getItem("${STORAGE_KEY}")||"{}");var t=a.theme||"dark";if(t==="system"){var s=window.Telegram&&Telegram.WebApp&&Telegram.WebApp.colorScheme;t=s?(s==="light"?"light":"dark"):(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark")}document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t==="light"?"light":"dark"}catch(e){}})();`;
