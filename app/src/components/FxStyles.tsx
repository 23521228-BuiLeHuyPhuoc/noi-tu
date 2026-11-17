/**
 * Inject bộ @keyframes CSS thuần GPU, Design Tokens từ Open Props / Animate.css & phông Be Vietnam Pro trên Web.
 * Giúp mọi hiệu ứng VIP, nút tactile, glassmorphism và hạt nền Map đạt mượt 60fps.
 */
import { useEffect } from 'react';
import { Platform } from 'react-native';

const FONT_CSS_URL =
  'https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@500;600;700;800;900&display=swap';

const CSS = `
:root {
  --xl-ease-spring: cubic-bezier(0.22, 1, 0.36, 1);
  --xl-ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
  --xl-shadow-card: 0 12px 30px -8px rgba(15, 23, 42, 0.22), 0 2px 6px rgba(15, 23, 42, 0.08);
  --xl-shadow-pop: 0 20px 48px -12px rgba(15, 23, 42, 0.36), 0 4px 12px rgba(15, 23, 42, 0.12);
}

* {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.35); border-radius: 99px; }
::-webkit-scrollbar-thumb:hover { background: rgba(148, 163, 184, 0.58); }

[role="button"] {
  transition: transform 140ms var(--xl-ease-spring), filter 140ms ease, box-shadow 140ms ease;
}
[role="button"]:hover:not([aria-disabled="true"]) {
  filter: brightness(1.03);
}
[role="button"]:active:not([aria-disabled="true"]) {
  transform: translateY(2px) scale(0.985);
}

@keyframes xl-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes xl-spin-rev { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
@keyframes xl-pulse { 0%, 100% { opacity: 0.48; transform: scale(0.98); } 50% { opacity: 1; transform: scale(1.04); } }
@keyframes xl-float { 0%, 100% { transform: translateY(0px) rotate(-3deg); } 50% { transform: translateY(-6px) rotate(4deg); } }
@keyframes xl-shimmer { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }
@keyframes xl-sheet-in {
  from { opacity: 0; transform: translate3d(0, 28px, 0) scale(0.98); }
  to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
}
@keyframes xl-fade-up {
  from { opacity: 0; transform: translate3d(0, 10px, 0); }
  to { opacity: 1; transform: translate3d(0, 0, 0); }
}
@keyframes xl-petal-fall {
  0% { transform: translate3d(0, -40px, 0) rotate(0deg); opacity: 0; }
  12% { opacity: 0.92; }
  88% { opacity: 0.85; }
  100% { transform: translate3d(48px, 105vh, 0) rotate(360deg); opacity: 0; }
}
@keyframes xl-bubble-rise {
  0% { transform: translate3d(0, 105vh, 0) scale(0.75); opacity: 0; }
  15% { opacity: 0.7; }
  85% { opacity: 0.65; }
  100% { transform: translate3d(-18px, -40px, 0) scale(1.15); opacity: 0; }
}
@keyframes xl-star-twinkle { 0%, 100% { opacity: 0.25; transform: scale(0.75); } 50% { opacity: 1; transform: scale(1.25); } }
@keyframes xl-glitch {
  0%, 92%, 100% { transform: translate(0, 0); text-shadow: 0 1px 2px rgba(15,23,42,0.92), 0 0 8px #38BDF8, 0 0 14px #E879F9; }
  94% { transform: translate(-2px, 1px); text-shadow: 0 1px 2px rgba(15,23,42,0.92), 2px 0 #FF00E5, -2px 0 #00F0FF; }
  96% { transform: translate(2px, -1px); text-shadow: 0 1px 2px rgba(15,23,42,0.92), -2px 0 #FFD43B, 2px 0 #FF00E5; }
}
@keyframes xl-wing-flap { 0%, 100% { transform: scaleX(1) translateY(0px); } 50% { transform: scaleX(0.82) translateY(-3px); } }
@keyframes xl-meteor-streak {
  0% { transform: translate3d(20vw, -20vh, 0) rotate(-35deg) scaleX(0.5); opacity: 0; }
  15% { opacity: 0.9; }
  50% { transform: translate3d(-75vw, 55vh, 0) rotate(-35deg) scaleX(1.2); opacity: 0; }
  100% { opacity: 0; }
}
.xl-spin { animation: xl-spin 6s linear infinite; will-change: transform; }
.xl-spin-fast { animation: xl-spin 2.8s linear infinite; will-change: transform; }
.xl-spin-rev { animation: xl-spin-rev 5.5s linear infinite; will-change: transform; }
.xl-pulse { animation: xl-pulse 1.5s ease-in-out infinite; will-change: transform, opacity; }
.xl-float { animation: xl-float 2.2s ease-in-out infinite; will-change: transform; }
.xl-shimmer { background-size: 200% auto !important; animation: xl-shimmer 2.8s linear infinite; }
.xl-glitch { animation: xl-glitch 2.6s infinite; }
.xl-wing { animation: xl-wing-flap 1.1s ease-in-out infinite; }
.xl-sheet-in { animation: xl-sheet-in 240ms var(--xl-ease-spring); }
.xl-fade-up { animation: xl-fade-up 220ms var(--xl-ease-spring); }
`;

let injected = false;

export function FxStyles() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined' || injected) return;
    if (!document.getElementById('xomlay-font-link')) {
      const link = document.createElement('link');
      link.id = 'xomlay-font-link';
      link.rel = 'stylesheet';
      link.href = FONT_CSS_URL;
      document.head.appendChild(link);
    }
    if (!document.getElementById('xomlay-fx-css')) {
      const style = document.createElement('style');
      style.id = 'xomlay-fx-css';
      style.textContent = CSS;
      document.head.appendChild(style);
    }
    injected = true;
  }, []);
  return null;
}
