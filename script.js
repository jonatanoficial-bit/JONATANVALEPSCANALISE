(function () {
  const config = window.SITE_CONFIG || {};
  let deferredPrompt = null;

  function isRealAppointmentLink(link) {
    return !!link && !/COLE_AQUI/i.test(link) && /^https?:\/\//i.test(link);
  }

  function isIos() {
    return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  }

  function isInStandaloneMode() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }

  function updateYear() {
    const yearNode = document.getElementById('year');
    if (yearNode) yearNode.textContent = new Date().getFullYear();
  }

  function setupMenu() {
    const toggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('.main-nav');
    if (!toggle || !nav) return;

    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });

    nav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  function bindContactLinks() {
    const whatsappHref = config.whatsappLink || '#';
    ['floating-whatsapp', 'whatsapp-link', 'contact-whatsapp'].forEach((id) => {
      const node = document.getElementById(id);
      if (node) node.href = whatsappHref;
    });
  }

  function setupBooking() {
    const scheduleLink = document.getElementById('schedule-link');
    const bookButton = document.getElementById('book-button');
    const bookingStatus = document.getElementById('booking-status');
    const appointmentLink = config.appointmentLink;
    const finalHref = isRealAppointmentLink(appointmentLink)
      ? appointmentLink
      : (config.fallbackBookingLink || config.whatsappLink || '#');

    [scheduleLink, bookButton].forEach((node) => {
      if (!node) return;
      node.href = finalHref;
      if (finalHref.startsWith('http')) {
        node.target = '_blank';
        node.rel = 'noopener';
      }
    });

    if (bookingStatus) {
      bookingStatus.textContent = isRealAppointmentLink(appointmentLink)
        ? 'Agenda configurada. O botão acima abre sua página oficial de agendamento do Google Calendar.'
        : 'Link da agenda ainda não configurado. Enquanto isso, o botão direciona para o WhatsApp.';
    }
  }

  function installHelpHtml() {
    if (isIos()) {
      return 'No iPhone ou iPad: abra este site no Safari, toque no botão de compartilhar e escolha “Adicionar à Tela de Início”.';
    }
    if (deferredPrompt) {
      return 'Seu navegador é compatível com instalação. Clique em “Instalar agora” para adicionar o app à tela inicial.';
    }
    return 'Se o botão de instalação não aparecer, abra o menu do navegador e procure a opção “Instalar app”, “Adicionar à tela inicial” ou “Criar atalho”.';
  }

  function revealInstallHelp() {
    const help = document.getElementById('install-help');
    if (!help) return;
    help.hidden = false;
    help.textContent = installHelpHtml();
  }

  function setupInstall() {
    const installButtons = [document.getElementById('install-button'), document.getElementById('install-cta')].filter(Boolean);
    const iosHelpButton = document.getElementById('ios-help-button');

    function updateButtons() {
      installButtons.forEach((button) => {
        if (!button) return;
        if (isInStandaloneMode()) {
          button.textContent = 'App já instalado';
          button.disabled = true;
        } else if (deferredPrompt) {
          button.textContent = 'Instalar app';
          button.disabled = false;
        } else if (isIos()) {
          button.textContent = 'Adicionar à tela inicial';
          button.disabled = false;
        } else {
          button.textContent = 'Instalar app';
          button.disabled = false;
        }
      });
    }

    installButtons.forEach((button) => {
      if (!button) return;
      button.addEventListener('click', async () => {
        if (isInStandaloneMode()) {
          revealInstallHelp();
          return;
        }

        if (deferredPrompt) {
          deferredPrompt.prompt();
          try {
            await deferredPrompt.userChoice;
          } catch (error) {
            console.error(error);
          }
          deferredPrompt = null;
          updateButtons();
          revealInstallHelp();
          return;
        }

        revealInstallHelp();
      });
    });

    if (iosHelpButton) {
      iosHelpButton.addEventListener('click', revealInstallHelp);
    }

    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      deferredPrompt = event;
      updateButtons();
    });

    window.addEventListener('appinstalled', () => {
      deferredPrompt = null;
      updateButtons();
      revealInstallHelp();
    });

    updateButtons();
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js').catch((error) => {
        console.error('Falha ao registrar service worker:', error);
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    updateYear();
    setupMenu();
    bindContactLinks();
    setupBooking();
    setupInstall();
    registerServiceWorker();
  });
})();
