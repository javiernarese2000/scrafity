import Script from "next/script";

// Se ejecuta antes del primer paint para evitar flash de tema incorrecto.
// Usa next/script (beforeInteractive): Next lo inyecta en el HTML del servidor,
// no lo renderiza como <script> en el cliente (evita el warning de React 19).
export function ThemeScript() {
  const code = `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;
  return (
    <Script
      id="theme-init"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{ __html: code }}
    />
  );
}
