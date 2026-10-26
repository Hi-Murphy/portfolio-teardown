export const THEME_SCRIPT =
  "(()=>{let t;try{t=localStorage.theme;if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}}catch{t='light'}const r=document.documentElement;r.classList.toggle('dark',t==='dark');r.classList.toggle('light',t==='light');r.style.colorScheme=t})()";
