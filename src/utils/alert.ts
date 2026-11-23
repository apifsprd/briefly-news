import Swal from 'sweetalert2';

type AlertIcon = 'error' | 'warning' | 'info' | 'success';

const getBaseCustomClasses = () => ({
  popup:
    'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-2xl shadow-xl font-sans',
  title: 'text-base font-bold text-zinc-900 dark:text-zinc-50 font-serif',
  htmlContainer: 'text-sm text-zinc-600 dark:text-zinc-400',
  confirmButton:
    'bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-950 font-semibold px-5 py-2.5 rounded-xl text-sm hover:opacity-90 transition-opacity min-h-[44px]',
});

export const showMonochromeAlert = (
  title: string,
  text: string,
  icon: AlertIcon = 'info'
) => {
  return Swal.fire({
    title,
    text,
    icon,
    confirmButtonText: 'Close',
    customClass: getBaseCustomClasses(),
    buttonsStyling: false,
  });
};

export const showMonochromeToast = (
  title: string,
  icon: AlertIcon = 'warning'
) => {
  return Swal.fire({
    toast: true,
    position: 'bottom-end',
    showConfirmButton: false,
    timer: 3500,
    timerProgressBar: true,
    icon,
    title,
    customClass: {
      popup:
        'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl shadow-lg text-xs font-medium',
      title: 'text-xs font-medium text-zinc-900 dark:text-zinc-100',
    },
  });
};
