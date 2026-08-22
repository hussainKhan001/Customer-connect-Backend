/* Small toast wrapper around sweetalert2 (already a dependency, used
   for the Portfolio Statement's blocked-send dialog) — corner
   auto-dismissing notices for background-y confirmations, as opposed
   to Swal.fire's blocking modal for things the user must acknowledge. */
import Swal from 'sweetalert2';

const isDark = () => document.documentElement.classList.contains('dark');

const mixin = () =>
  Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3200,
    timerProgressBar: true,
    background: isDark() ? '#1f2937' : '#ffffff',
    color: isDark() ? '#f3f4f6' : '#111827',
    didOpen: (el) => {
      el.addEventListener('mouseenter', Swal.stopTimer);
      el.addEventListener('mouseleave', Swal.resumeTimer);
    },
  });

export const toast = {
  success: (title, text) => mixin().fire({ icon: 'success', title, text }),
  error: (title, text) => mixin().fire({ icon: 'error', title, text, timer: 4500 }),
  info: (title, text) => mixin().fire({ icon: 'info', title, text }),
};
