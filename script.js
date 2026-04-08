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
    ['floating-whatsapp', 'whatsapp-link', 'contact-whatsapp', 'quiz-result-whatsapp'].forEach((id) => {
      const node = document.getElementById(id);
      if (node) {
        node.href = whatsappHref;
        if (whatsappHref.startsWith('http')) {
          node.target = '_blank';
          node.rel = 'noopener';
        }
      }
    });
  }

  function setupBooking() {
    const scheduleLink = document.getElementById('schedule-link');
    const bookButton = document.getElementById('book-button');
    const bookingStatus = document.getElementById('booking-status');
    const appointmentLink = config.appointmentLink;
    const hasAppointmentLink = isRealAppointmentLink(appointmentLink);
    const finalHref = hasAppointmentLink
      ? appointmentLink
      : (config.fallbackBookingLink || config.whatsappLink || '#');

    [scheduleLink, bookButton].forEach((node) => {
      if (!node) return;
      if (node.getAttribute('href') && node.getAttribute('href').startsWith('#') && node.id === 'book-button') return;
      node.href = finalHref;
      if (finalHref.startsWith('http')) {
        node.target = '_blank';
        node.rel = 'noopener';
      }
    });

    if (bookingStatus) {
      bookingStatus.textContent = hasAppointmentLink
        ? 'Agenda online aberta para marcação imediata.'
        : 'Para reservar seu horário neste momento, entre em contato pelo WhatsApp.';
    }
  }

  function populatePrices() {
    const social = config.socialPrice || 60;
    const regular = config.regularPrice || 120;
    const socialNode = document.getElementById('social-price-display');
    const regularNode = document.getElementById('regular-price-display');
    if (socialNode) socialNode.textContent = social;
    if (regularNode) regularNode.textContent = regular;
  }

  function setupSocialQuiz() {
    const form = document.getElementById('social-quiz');
    const result = document.getElementById('quiz-result');
    const title = document.getElementById('quiz-result-title');
    const text = document.getElementById('quiz-result-text');
    const reset = document.getElementById('quiz-reset');
    const resultBook = document.getElementById('quiz-result-book');
    if (!form || !result || !title || !text) return;

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const score = ['q1', 'q2', 'q3', 'q4'].reduce((acc, key) => acc + Number(data.get(key) || 0), 0);

      if (score >= 3) {
        title.textContent = 'Perfil compatível com as vagas de valor social';
        text.textContent = `Pelo que você respondeu, o valor social de R$ ${config.socialPrice || 60} pode ser a opção mais adequada neste momento. Você pode seguir para o agendamento e, se desejar, confirmar os detalhes pelo WhatsApp.`;
        resultBook.textContent = 'Agendar com valor social';
      } else if (score === 2) {
        title.textContent = 'Seu perfil pode ser analisado para valor social';
        text.textContent = `Você demonstrou necessidade de uma condição mais acessível. As vagas sociais são limitadas, então vale seguir para o agendamento ou chamar no WhatsApp para alinhar a melhor possibilidade de atendimento.`;
        resultBook.textContent = 'Prosseguir para agendamento';
      } else {
        title.textContent = 'Valor regular recomendado para este momento';
        text.textContent = `Pelo seu perfil inicial, o valor regular de R$ ${config.regularPrice || 120} por sessão tende a ser a melhor opção para acompanhamento com continuidade e organização da agenda.`;
        resultBook.textContent = 'Agendar valor regular';
      }

      result.hidden = false;
      result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });

    if (reset) {
      reset.addEventListener('click', () => {
        form.reset();
        result.hidden = true;
      });
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
    populatePrices();
    setupSocialQuiz();
    setupInstall();
    registerServiceWorker();
  });
})();
