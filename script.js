// script.js
// This file handles basic interactivity on the Jonatan Vale Psicanálise site,
// including the mobile navigation menu and registering the service worker for
// PWA install support. It is intentionally lightweight to keep the site
// responsive even on slow devices.

document.addEventListener('DOMContentLoaded', () => {
  const menuIcon = document.querySelector('.mobile-menu-icon');
  const navLinks = document.querySelector('.nav-links');

  if (menuIcon) {
    menuIcon.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });
  }

  // Register service worker if supported
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js')
      .then(reg => {
        console.log('Service worker registered:', reg);
      })
      .catch(err => {
        console.error('Service worker registration failed:', err);
      });
  }
});