// MagicBento.jsx
'use client';
import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import './MagicBento.css'; // keep your existing CSS file

const DEFAULT_GLOW_COLOR = '249, 115, 22'; // orange-500 to match your theme
const DEFAULT_SPOTLIGHT_RADIUS = 400;
const DEFAULT_PARTICLE_COUNT = 12;

const createParticle = (x, y, color) => {
  const el = document.createElement('div');
  el.className = 'particle';
  el.style.position = 'fixed';
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.width = '6px';
  el.style.height = '6px';
  el.style.borderRadius = '50%';
  el.style.background = `rgba(${color}, 0.9)`;
  el.style.boxShadow = `0 0 10px rgba(${color}, 0.8)`;
  el.style.pointerEvents = 'none';
  el.style.zIndex = '9999';
  document.body.appendChild(el);
  return el;
};

export default function MagicBento({
  children,
  textAutoHide = true,
  enableStars = true,
  enableSpotlight = true,
  enableBorderGlow = true,
  enableTilt = false,
  enableMagnetism = false,
  clickEffect = true,
  spotlightRadius = DEFAULT_SPOTLIGHT_RADIUS,
  particleCount = DEFAULT_PARTICLE_COUNT,
  glowColor = DEFAULT_GLOW_COLOR,
  disableAnimations = false,
}) {
  const containerRef = useRef(null);
  const spotlightRef = useRef(null);

  useEffect(() => {
    if (disableAnimations) return;

    const container = containerRef.current;
    if (!container) return;

    // Spotlight effect
    if (enableSpotlight) {
      const spotlight = document.createElement('div');
      spotlight.className = 'global-spotlight';
      spotlight.style.cssText = `
        position: fixed;
        width: ${spotlightRadius * 2}px;
        height: ${spotlightRadius * 2}px;
        border-radius: 50%;
        pointer-events: none;
        background: radial-gradient(circle, rgba(${glowColor}, 0.22) 0%, rgba(${glowColor}, 0.10) 35%, transparent 70%);
        z-index: 5;
        mix-blend-mode: screen;
        opacity: 0;
        transform: translate(-50%, -50%);
        will-change: transform, opacity;
      `;
      document.body.appendChild(spotlight);
      spotlightRef.current = spotlight;

      const moveSpotlight = (e) => {
        gsap.to(spotlight, {
          left: e.clientX,
          top: e.clientY,
          duration: 0.14,
          ease: 'power2.out',
        });
      };

      window.addEventListener('mousemove', moveSpotlight);

      return () => {
        window.removeEventListener('mousemove', moveSpotlight);
        if (spotlight.parentNode) spotlight.remove();
      };
    }
  }, [disableAnimations, enableSpotlight, glowColor, spotlightRadius]);

  // Click particle burst
  const handleClick = (e) => {
    if (!clickEffect || disableAnimations) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const originX = e.clientX;
    const originY = e.clientY;

    for (let i = 0; i < particleCount; i++) {
      const p = createParticle(originX, originY, glowColor);
      const angle = Math.random() * Math.PI * 2;
      const distance = 60 + Math.random() * 160;

      gsap.to(p, {
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        scale: 0,
        opacity: 0,
        duration: 0.8 + Math.random() * 0.7,
        ease: 'power2.out',
        onComplete: () => {
          if (p.parentNode) p.remove();
        },
      });
    }
  };

  return (
    <div
      ref={containerRef}
      className={`magic-bento-wrapper relative overflow-hidden ${enableBorderGlow ? 'border-glow' : ''}`}
      onClick={handleClick}
      style={{ position: 'relative', isolation: 'isolate' }}
    >
      {/* Effect background layer */}
      <div className="absolute inset-0 pointer-events-none z-0" />

      {/* Real content */}
      <div className="relative z-10 h-full w-full">{children}</div>
    </div>
  );
}