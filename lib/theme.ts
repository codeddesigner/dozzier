/** Inline script for <head>: apply the saved app theme before first paint (no flash). */
export const THEME_BOOT = `try{var t=localStorage.getItem('dz-theme')||'light';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.dataset.theme='dark'}catch(e){}`;
