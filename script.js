(() => {
  const config = window.SITE_CONFIG || {};
  const state = {
    selectedPlan: null,
    unlockedPlan: null,
    unlockMethod: null
  };

  let deferredPrompt = null;

  function isIos() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
  }

  function isInStandaloneMode() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  }

  function money(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
  }

  function getPlanDetails(plan) {
    const socialPrice = Number(config.socialPrice || 60);
    const regularPrice = Number(config.regularPrice || 120);
    if (plan === 'social') {
      return { key: 'social', title: 'Valor social', price: socialPrice, paymentLink: config.socialPaymentLink || '#', method: 'Taxa social' };
    }
    if (plan === 'regular') {
      return { key: 'regular', title: 'Valor regular', price: regularPrice, paymentLink: config.regularPaymentLink || '#', method: 'Taxa regular' };
    }
    if (plan === 'isencao') {
      return { key: 'isencao', title: 'Isenção total', price: 0, paymentLink: config.appointmentLink || '#', method: 'Isenção por cupom' };
    }
    return null;
  }

  function setBuildMeta() {
    const yearNode = document.getElementById('year');
    if (yearNode) yearNode.textContent = new Date().getFullYear();
    const buildNode = document.getElementById('build-meta');
    if (buildNode) {
      buildNode.textContent = `Build ${config.buildVersion || 'v1.0.0'} · ${config.buildTimestamp || ''}`.trim();
    }
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
      if (!node) return;
      node.href = whatsappHref;
      if (/^https?:\/\//i.test(whatsappHref)) {
        node.target = '_blank';
        node.rel = 'noopener';
      }
    });
  }

  function populatePrices() {
    const social = Number(config.socialPrice || 60);
    const regular = Number(config.regularPrice || 120);
    const socialNode = document.getElementById('social-price-display');
    const regularNode = document.getElementById('regular-price-display');
    if (socialNode) socialNode.textContent = social;
    if (regularNode) regularNode.textContent = regular;
    document.querySelectorAll('.social-price-inline').forEach((node) => { node.textContent = social; });
    document.querySelectorAll('.regular-price-inline').forEach((node) => { node.textContent = regular; });
  }

  function updateSelectedPlanUi() {
    const boxTitle = document.getElementById('selected-plan-title');
    const boxPrice = document.getElementById('selected-plan-price');
    const payButton = document.getElementById('pay-selected-button');
    const plan = getPlanDetails(state.selectedPlan);

    document.querySelectorAll('.plan-select-card, .plan-trigger').forEach((node) => {
      const matches = node.dataset.plan === state.selectedPlan;
      if (node.classList.contains('plan-select-card')) {
        node.classList.toggle('is-active', matches);
      }
    });

    if (!plan) {
      if (boxTitle) boxTitle.textContent = 'Escolha uma modalidade para continuar';
      if (boxPrice) boxPrice.textContent = 'A taxa será exibida aqui.';
      if (payButton) {
        payButton.href = '#';
        payButton.textContent = 'Ir para pagamento';
      }
      return;
    }

    if (boxTitle) boxTitle.textContent = plan.title;
    if (boxPrice) {
      boxPrice.textContent = plan.price > 0
        ? `${money(plan.price)} por sessão. Após concluir o pagamento, volte e clique em “Já concluí o pagamento”.`
        : 'Agenda liberada sem pagamento por isenção total.';
    }

    if (payButton) {
      if (plan.key === 'isencao') {
        payButton.href = config.appointmentLink || '#';
        payButton.textContent = 'Abrir agenda';
      } else {
        payButton.href = plan.paymentLink || '#';
        payButton.textContent = `Pagar ${plan.title.toLowerCase()}`;
      }
      if (/^https?:\/\//i.test(payButton.href)) {
        payButton.target = '_blank';
        payButton.rel = 'noopener';
      }
    }
  }

  function setSelectedPlan(plan, scroll = true) {
    state.selectedPlan = plan;
    sessionStorage.setItem('jv_selected_plan', plan);
    updateSelectedPlanUi();
    if (scroll) {
      document.getElementById('agendamento')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function fillReceiptDefaults(planKey, unlockMethod) {
    const plan = getPlanDetails(planKey);
    if (!plan) return;
    const receiptPlan = document.getElementById('receipt-plan');
    const receiptValue = document.getElementById('receipt-value');
    if (receiptPlan) {
      receiptPlan.value = unlockMethod === 'cupom' ? `${plan.title} (${plan.method})` : plan.title;
    }
    if (receiptValue) {
      receiptValue.value = money(plan.price);
    }
  }

  function releaseAgenda(planKey, unlockMethod = 'manual') {
    const plan = getPlanDetails(planKey);
    if (!plan) return;

    state.unlockedPlan = planKey;
    state.unlockMethod = unlockMethod;
    localStorage.setItem('jv_unlocked_plan', planKey);
    localStorage.setItem('jv_unlock_method', unlockMethod);

    const agenda = document.getElementById('agenda-release');
    const receipt = document.getElementById('receipt-panel');
    const title = document.getElementById('release-title');
    const text = document.getElementById('release-text');
    const directLink = document.getElementById('schedule-link');
    const iframe = document.getElementById('appointment-iframe');

    if (title) title.textContent = `Agenda liberada para ${plan.title.toLowerCase()}`;
    if (text) {
      text.textContent = plan.price > 0
        ? `Pagamento indicado para ${plan.title.toLowerCase()}. Agora escolha abaixo o melhor horário disponível para sua sessão.`
        : 'Cupom especial validado. Agora escolha abaixo o melhor horário disponível para sua sessão.';
    }

    if (directLink) {
      directLink.href = config.appointmentLink || '#';
      if (/^https?:\/\//i.test(directLink.href)) {
        directLink.target = '_blank';
        directLink.rel = 'noopener';
      }
    }

    if (iframe && !iframe.src) {
      iframe.src = config.appointmentLink || '';
    }

    if (agenda) agenda.hidden = false;
    if (receipt) receipt.hidden = false;
    fillReceiptDefaults(planKey, unlockMethod);
    agenda?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function setupPlanTriggers() {
    document.querySelectorAll('.plan-trigger').forEach((button) => {
      button.addEventListener('click', () => setSelectedPlan(button.dataset.plan));
    });

    document.querySelectorAll('.quiz-choose-plan').forEach((button) => {
      button.addEventListener('click', () => setSelectedPlan(button.dataset.plan));
    });
  }

  function setupPaymentFlow() {
    const payButton = document.getElementById('pay-selected-button');
    const confirmButton = document.getElementById('confirm-payment-button');
    const couponButton = document.getElementById('apply-coupon-button');
    const couponInput = document.getElementById('coupon-input');
    const couponFeedback = document.getElementById('coupon-feedback');

    if (payButton) {
      payButton.addEventListener('click', () => {
        const plan = getPlanDetails(state.selectedPlan);
        if (!plan) {
          setSelectedPlan('regular');
          return;
        }
        if (plan.key === 'isencao') {
          releaseAgenda('isencao', 'cupom');
          return;
        }
        sessionStorage.setItem('jv_last_payment_intent', plan.key);
      });
    }

    if (confirmButton) {
      confirmButton.addEventListener('click', () => {
        const plan = getPlanDetails(state.selectedPlan || sessionStorage.getItem('jv_last_payment_intent'));
        if (!plan || plan.key === 'isencao') {
          if (couponFeedback) {
            couponFeedback.textContent = 'Escolha primeiro valor social ou valor regular para continuar.';
            couponFeedback.className = 'coupon-feedback is-error';
          }
          return;
        }
        if (couponFeedback) {
          couponFeedback.textContent = 'Pagamento confirmado por você. A agenda foi liberada.';
          couponFeedback.className = 'coupon-feedback is-success';
        }
        releaseAgenda(plan.key, 'pagamento');
      });
    }

    if (couponButton) {
      couponButton.addEventListener('click', () => {
        const value = String(couponInput?.value || '').trim().toLowerCase();
        const expected = String(config.specialCoupon || 'valeespecial').trim().toLowerCase();
        if (!value) {
          couponFeedback.textContent = 'Digite o cupom para validar a isenção.';
          couponFeedback.className = 'coupon-feedback is-error';
          return;
        }
        if (value === expected) {
          couponFeedback.textContent = 'Cupom validado com sucesso. A agenda foi liberada.';
          couponFeedback.className = 'coupon-feedback is-success';
          setSelectedPlan('isencao', false);
          releaseAgenda('isencao', 'cupom');
        } else {
          couponFeedback.textContent = 'Cupom não reconhecido. Verifique o código e tente novamente.';
          couponFeedback.className = 'coupon-feedback is-error';
        }
      });
    }
  }

  function setupSocialQuiz() {
    const form = document.getElementById('social-quiz');
    const result = document.getElementById('quiz-result');
    const title = document.getElementById('quiz-result-title');
    const text = document.getElementById('quiz-result-text');
    const reset = document.getElementById('quiz-reset');
    const socialBtn = document.getElementById('quiz-result-social');
    const regularBtn = document.getElementById('quiz-result-regular');
    if (!form || !result || !title || !text) return;

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const score = ['q1', 'q2', 'q3', 'q4'].reduce((acc, key) => acc + Number(data.get(key) || 0), 0);

      if (score >= 3) {
        title.textContent = 'Seu perfil está alinhado com as vagas de valor social';
        text.textContent = `Pelo que você respondeu, o valor social de ${money(config.socialPrice || 60)} pode ser a opção mais adequada neste momento.`;
        if (socialBtn) socialBtn.hidden = false;
        if (regularBtn) regularBtn.hidden = false;
      } else if (score === 2) {
        title.textContent = 'Seu perfil pode ser analisado para valor social';
        text.textContent = 'Você demonstrou necessidade de uma condição mais acessível. Caso prefira, escolha o valor social e prossiga para o fluxo de pagamento.';
        if (socialBtn) socialBtn.hidden = false;
        if (regularBtn) regularBtn.hidden = false;
      } else {
        title.textContent = 'O valor regular é a opção mais indicada neste momento';
        text.textContent = `Pelo seu perfil inicial, o valor regular de ${money(config.regularPrice || 120)} tende a ser a melhor opção para acompanhamento com continuidade e organização da agenda.`;
        if (socialBtn) socialBtn.hidden = false;
        if (regularBtn) regularBtn.hidden = false;
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

  function setupReceiptForm() {
    const form = document.getElementById('receipt-form');
    if (!form) return;

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const name = document.getElementById('receipt-name')?.value?.trim() || '';
      const email = document.getElementById('receipt-email')?.value?.trim() || '';
      const plan = document.getElementById('receipt-plan')?.value?.trim() || '';
      const value = document.getElementById('receipt-value')?.value?.trim() || '';
      const date = document.getElementById('receipt-date')?.value || '';
      const time = document.getElementById('receipt-time')?.value || '';
      const issueDate = new Date();
      const issueLabel = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full', timeStyle: 'short' }).format(issueDate);
      const bookingLabel = date ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(`${date}T12:00:00`)) : '';

      const popup = window.open('', '_blank', 'width=960,height=720');
      if (!popup) return;
      const logoUrl = new URL('assets/logo.png', window.location.href).href;
      popup.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<title>Comprovante - Jonatan Vale Psicanálise</title>
<style>
  body { font-family: Arial, sans-serif; margin: 0; padding: 32px; color: #0d1b35; }
  .sheet { max-width: 760px; margin: 0 auto; border: 1px solid #d8e1f0; border-radius: 20px; padding: 32px; }
  .brand { text-align: center; margin-bottom: 24px; }
  .brand img { max-width: 240px; }
  h1 { margin: 0 0 10px; font-size: 28px; }
  p { line-height: 1.6; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 24px; }
  .item { background: #f7faff; border-radius: 14px; padding: 14px 16px; }
  .label { font-size: 12px; text-transform: uppercase; letter-spacing: .08em; color: #567; display:block; margin-bottom:6px; }
  .value { font-weight: 700; }
  .note { margin-top: 22px; padding: 16px 18px; border-radius: 14px; background: #fff8ef; }
  .meta { margin-top: 24px; font-size: 13px; color: #567; }
  @media print { body { padding: 0; } .sheet { border: 0; border-radius: 0; } }
</style>
</head>
<body>
  <div class="sheet">
    <div class="brand">
      <img src="${logoUrl}" alt="Logo da clínica" />
      <h1>Comprovante de Pagamento e Agendamento</h1>
      <p>Jonatan Vale Psicanálise</p>
    </div>
    <div class="grid">
      <div class="item"><span class="label">Paciente</span><span class="value">${name}</span></div>
      <div class="item"><span class="label">E-mail</span><span class="value">${email}</span></div>
      <div class="item"><span class="label">Modalidade</span><span class="value">${plan}</span></div>
      <div class="item"><span class="label">Valor</span><span class="value">${value}</span></div>
      <div class="item"><span class="label">Data agendada</span><span class="value">${bookingLabel}</span></div>
      <div class="item"><span class="label">Horário</span><span class="value">${time}</span></div>
    </div>
    <div class="note">
      Este comprovante foi gerado para organização do atendimento online e pode ser salvo em PDF pelo navegador.
    </div>
    <div class="meta">
      Emitido em ${issueLabel}<br/>
      Build ${config.buildVersion || 'v1.0.0'} · ${config.buildTimestamp || ''}
    </div>
  </div>
  <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 250); };</script>
</body>
</html>`);
      popup.document.close();
    });
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

    if (iosHelpButton) iosHelpButton.addEventListener('click', revealInstallHelp);

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

  function restoreState() {
    const params = new URLSearchParams(window.location.search);
    const paid = params.get('paid');
    const coupon = params.get('cupom');

    if (coupon && coupon.toLowerCase() === String(config.specialCoupon || 'valeespecial').toLowerCase()) {
      setSelectedPlan('isencao', false);
      releaseAgenda('isencao', 'cupom');
      history.replaceState({}, '', `${window.location.pathname}#agendamento`);
      return;
    }

    if (paid === 'social' || paid === 'regular') {
      setSelectedPlan(paid, false);
      releaseAgenda(paid, 'pagamento');
      history.replaceState({}, '', `${window.location.pathname}#agendamento`);
      return;
    }

    const storedSelected = sessionStorage.getItem('jv_selected_plan');
    if (storedSelected) {
      state.selectedPlan = storedSelected;
      updateSelectedPlanUi();
    }

    const unlocked = localStorage.getItem('jv_unlocked_plan');
    const unlockMethod = localStorage.getItem('jv_unlock_method') || 'pagamento';
    if (unlocked === 'social' || unlocked === 'regular' || unlocked === 'isencao') {
      state.selectedPlan = unlocked;
      updateSelectedPlanUi();
      releaseAgenda(unlocked, unlockMethod);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    setBuildMeta();
    setupMenu();
    bindContactLinks();
    populatePrices();
    setupPlanTriggers();
    updateSelectedPlanUi();
    setupPaymentFlow();
    setupSocialQuiz();
    setupReceiptForm();
    setupInstall();
    restoreState();
    registerServiceWorker();
  });
})();
