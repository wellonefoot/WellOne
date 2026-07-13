(function(){
  'use strict';

  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || Boolean(window.navigator.standalone);
  const installButton = document.getElementById('pwaInstallBtn');
  const installSection = document.querySelector('.install-app-section');
  const installHint = document.getElementById('pwaInstallHint');
  const installHelp = document.getElementById('pwaInstallHelp');
  const launchSplash = document.getElementById('pwaLaunchSplash');
  let deferredPrompt = null;

  if('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')){
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js?v=55', {updateViaCache:'none'}).catch(() => {}), {once:true});
  }

  function closeLaunchSplash(){
    if(!launchSplash){
      document.documentElement.classList.remove('pwa-launching');
      return;
    }
    window.setTimeout(() => {
      launchSplash.classList.add('is-leaving');
      window.setTimeout(() => {
        document.documentElement.classList.remove('pwa-launching');
        launchSplash.remove();
      }, 320);
    }, 720);
  }

  if(document.documentElement.classList.contains('pwa-launching')){
    requestAnimationFrame(closeLaunchSplash);
  }else if(launchSplash){
    launchSplash.remove();
  }

  function markInstalled(){
    document.documentElement.classList.add('is-pwa');
    if(installSection) installSection.classList.add('hidden');
  }

  function showHelp(message){
    if(!installHelp) return;
    installHelp.textContent = message;
    installHelp.classList.remove('hidden');
    window.clearTimeout(showHelp.timer);
    showHelp.timer = window.setTimeout(() => installHelp.classList.add('hidden'), 9000);
  }

  async function installWebApp(){
    if(isStandalone()){
      markInstalled();
      return;
    }

    if(deferredPrompt){
      installButton?.setAttribute('aria-busy', 'true');
      try{
        deferredPrompt.prompt();
        const result = await deferredPrompt.userChoice;
        if(result && result.outcome === 'accepted'){
          if(installHint) installHint.textContent = 'Installing Wellone on your device…';
        }else{
          showHelp('Installation was cancelled. Tap Install Wellone whenever you are ready.');
        }
      }catch(_error){
        showHelp('Open your browser menu and choose “Install app” or “Add to Home screen”.');
      }finally{
        deferredPrompt = null;
        installButton?.removeAttribute('aria-busy');
      }
      return;
    }

    const ua = navigator.userAgent || '';
    const isIos = /iphone|ipad|ipod/i.test(ua);
    if(isIos){
      showHelp('On iPhone or iPad: tap the Share button, then choose “Add to Home Screen”.');
    }else{
      showHelp('Open your browser menu (⋮), then choose “Install app” or “Add to Home screen”.');
    }
  }

  if(isStandalone()) markInstalled();
  if(installButton) installButton.addEventListener('click', installWebApp);

  window.addEventListener('beforeinstallprompt', event => {
    if(isStandalone()) return;
    event.preventDefault();
    deferredPrompt = event;
    if(installHint) installHint.textContent = 'Ready to install directly from this website.';
    installButton?.classList.add('is-ready');
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    markInstalled();
  });
})();
