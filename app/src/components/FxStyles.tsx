/**
 * Inject bộ @keyframes CSS thuần GPU, Design Tokens từ Open Props / Animate.css,
 * hiệu ứng rung lắc lầy lội từ `csshake` (8.2k+ ⭐), shader Hologram 7 màu kiểu `pokemon-cards-css` (6.2k+ ⭐)
 * & phông chữ Be Vietnam Pro trên Web.
 */
import { useEffect } from 'react';
import { Platform } from 'react-native';

const FONT_CSS_URL =
  'https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@500;600;700;800;900&display=swap';

const CSSHAKES_CDN_FALLBACK = `
@keyframes xl-shake-crazy {
  0% { transform: translate(0, 0) rotate(0deg); }
  10% { transform: translate(-6px, -4px) rotate(-3deg); }
  20% { transform: translate(7px, 3px) rotate(4deg); }
  30% { transform: translate(-8px, 5px) rotate(-4deg); }
  40% { transform: translate(6px, -6px) rotate(3deg); }
  50% { transform: translate(-5px, 4px) rotate(-2deg); }
  60% { transform: translate(8px, 2px) rotate(4deg); }
  70% { transform: translate(-6px, -5px) rotate(-3deg); }
  80% { transform: translate(4px, 6px) rotate(2deg); }
  90% { transform: translate(-3px, -2px) rotate(-1deg); }
  100% { transform: translate(0, 0) rotate(0deg); }
}
@keyframes xl-wiggle-clown {
  0%, 100% { transform: rotate(-2.5deg) scale(1); }
  25% { transform: rotate(3deg) scale(1.04) translateY(-1px); }
  50% { transform: rotate(-3deg) scale(1.02); }
  75% { transform: rotate(2.5deg) scale(1.05) translateY(-1px); }
}
`;

const CSS = `
:root {
  --xl-ease-spring: cubic-bezier(0.22, 1, 0.36, 1);
  --xl-ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
  --xl-shadow-card: 0 14px 34px -8px rgba(15, 23, 42, 0.28), 0 3px 8px rgba(15, 23, 42, 0.12);
  --xl-shadow-pop: 0 24px 54px -10px rgba(15, 23, 42, 0.45), 0 6px 16px rgba(15, 23, 42, 0.18);
  --xl-holo-grad: linear-gradient(
    115deg,
    #ff0080 0%,
    #ff8c00 16%,
    #ffee00 32%,
    #00ff88 48%,
    #00e5ff 64%,
    #7b2cbf 80%,
    #ff0080 100%
  );
}

* {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(232, 121, 249, 0.42); border-radius: 99px; }
::-webkit-scrollbar-thumb:hover { background: rgba(232, 121, 249, 0.72); }

[role="button"] {
  transition: transform 140ms var(--xl-ease-spring), filter 140ms ease, box-shadow 140ms ease;
}
[role="button"]:hover:not([aria-disabled="true"]) {
  filter: brightness(1.05) saturate(1.08);
}
[role="button"]:active:not([aria-disabled="true"]) {
  transform: translateY(2px) scale(0.975);
}

${CSSHAKES_CDN_FALLBACK}

@keyframes xl-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes xl-spin-rev { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
@keyframes xl-pulse { 0%, 100% { opacity: 0.56; transform: scale(0.97); } 50% { opacity: 1; transform: scale(1.06); } }
@keyframes xl-float { 0%, 100% { transform: translateY(0px) rotate(-4deg); } 50% { transform: translateY(-7px) rotate(5deg); } }
@keyframes xl-shimmer { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }
@keyframes xl-holo-sweep {
  0% { background-position: 0% 0%; filter: hue-rotate(0deg) brightness(1.04); }
  50% { background-position: 100% 100%; filter: hue-rotate(45deg) brightness(1.18); }
  100% { background-position: 0% 0%; filter: hue-rotate(0deg) brightness(1.04); }
}
@keyframes xl-disco-hue {
  0% { filter: hue-rotate(0deg) saturate(1.35) brightness(1.1); }
  50% { filter: hue-rotate(180deg) saturate(1.5) brightness(1.22); }
  100% { filter: hue-rotate(360deg) saturate(1.35) brightness(1.1); }
}
@keyframes xl-omega-ring {
  0%, 100% { transform: scale(0.96) rotate(0deg); opacity: 0.85; }
  50% { transform: scale(1.08) rotate(180deg); opacity: 1; }
}
@keyframes xl-sheet-in {
  from { opacity: 0; transform: translate3d(0, 28px, 0) scale(0.97); }
  to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
}
@keyframes xl-fade-up {
  from { opacity: 0; transform: translate3d(0, 10px, 0); }
  to { opacity: 1; transform: translate3d(0, 0, 0); }
}
@keyframes xl-petal-fall {
  0% { transform: translate3d(0, -40px, 0) rotate(0deg); opacity: 0; }
  12% { opacity: 0.94; }
  88% { opacity: 0.88; }
  100% { transform: translate3d(54px, 105vh, 0) rotate(360deg); opacity: 0; }
}
@keyframes xl-bubble-rise {
  0% { transform: translate3d(0, 105vh, 0) scale(0.75); opacity: 0; }
  15% { opacity: 0.78; }
  85% { opacity: 0.7; }
  100% { transform: translate3d(-22px, -40px, 0) scale(1.2); opacity: 0; }
}
@keyframes xl-star-twinkle { 0%, 100% { opacity: 0.28; transform: scale(0.72); } 50% { opacity: 1; transform: scale(1.32); } }
@keyframes xl-glitch {
  0%, 90%, 100% { transform: translate(0, 0); text-shadow: 0 1px 2px rgba(15,23,42,0.92), 0 0 10px #38BDF8, 0 0 18px #E879F9; }
  92% { transform: translate(-2.5px, 1px) skewX(-4deg); text-shadow: 0 1px 2px rgba(15,23,42,0.92), 3px 0 #FF00E5, -3px 0 #00F0FF; }
  95% { transform: translate(2.5px, -1px) skewX(4deg); text-shadow: 0 1px 2px rgba(15,23,42,0.92), -3px 0 #FFD43B, 3px 0 #FF00E5; }
  97% { transform: translate(-1px, 2px); text-shadow: 0 1px 2px rgba(15,23,42,0.92), 2px -2px #00FF88, -2px 2px #FF0080; }
}
@keyframes xl-wing-flap { 0%, 100% { transform: scaleX(1) translateY(0px); } 50% { transform: scaleX(0.8) translateY(-4px); } }
@keyframes xl-meteor-streak {
  0% { transform: translate3d(20vw, -20vh, 0) rotate(-35deg) scaleX(0.5); opacity: 0; }
  15% { opacity: 0.95; }
  50% { transform: translate3d(-75vw, 55vh, 0) rotate(-35deg) scaleX(1.3); opacity: 0; }
  100% { opacity: 0; }
}
@keyframes xl-siren-flash {
  0%, 100% { box-shadow: inset 0 0 90px 28px rgba(239, 68, 68, 0.78); background-color: rgba(239, 68, 68, 0.16); }
  50% { box-shadow: inset 0 0 90px 28px rgba(37, 99, 235, 0.78); background-color: rgba(37, 99, 235, 0.16); }
}

.xl-spin { animation: xl-spin 6s linear infinite; will-change: transform; }
.xl-spin-fast { animation: xl-spin 2.4s linear infinite; will-change: transform; }
.xl-spin-rev { animation: xl-spin-rev 5s linear infinite; will-change: transform; }
.xl-pulse { animation: xl-pulse 1.4s ease-in-out infinite; will-change: transform, opacity; }
.xl-float { animation: xl-float 2s ease-in-out infinite; will-change: transform; }
.xl-shimmer { background-size: 200% auto !important; animation: xl-shimmer 2.4s linear infinite; }
.xl-holo { background-size: 240% 240% !important; animation: xl-holo-sweep 3.2s ease-in-out infinite; }
.xl-disco { animation: xl-disco-hue 1.8s linear infinite; }
.xl-glitch { animation: xl-glitch 2.4s infinite; }
.xl-wiggle { animation: xl-wiggle-clown 1.3s ease-in-out infinite; }
.xl-shake-crazy { animation: xl-shake-crazy 0.45s infinite; }
.xl-wing { animation: xl-wing-flap 1s ease-in-out infinite; }
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
