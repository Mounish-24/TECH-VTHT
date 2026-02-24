// components/ui/CubeLoader.tsx
import React from 'react';

interface CubeLoaderProps {
  size?: number;           // default: 140
  speed?: number;          // animation duration in seconds (default: 9)
  className?: string;      // optional extra classes for the wrapper
}

export default function CubeLoader({
  size = 140,
  speed = 9,
  className = '',
}: CubeLoaderProps) {
  return (
    <>
      <style jsx global>{`
        @keyframes orbit {
          from {
            transform: rotateX(60deg) rotateY(0deg) rotateZ(0deg);
          }
          to {
            transform: rotateX(60deg) rotateY(360deg) rotateZ(0deg);
          }
        }

        @keyframes glitch {
          0%, 100% { transform: translate(0); }
          20%  { transform: translate(-2px, 2px); }
          40%  { transform: translate(2px, -2px); }
          60%  { transform: translate(-1px, 1px); }
        }

        .cube-orbit-inner {
          width: ${size}px;
          height: ${size}px;
          perspective: ${size * 5.7}px; /* roughly proportional */
        }

        .scene {
          width: 100%;
          height: 100%;
          transform-style: preserve-3d;
          animation: orbit ${speed}s linear infinite;
        }

        .cube {
          width: 100%;
          height: 100%;
          position: relative;
          transform-style: preserve-3d;
          animation: glitch ${speed * 0.355}s infinite;
        }

        .face {
          position: absolute;
          width: ${size / 2}px;
          height: ${size / 2}px;
          background: linear-gradient(45deg, #ff00aa, #00ffff);
          border: 2px solid #00ffff;
          box-shadow: 0 0 24px #00ffff88;
          backface-visibility: hidden;
          opacity: 0.92;
        }

        .front  { transform: translateZ(${size / 4}px); }
        .back   { transform: rotateY(180deg) translateZ(${size / 4}px); }
        .right  { transform: rotateY(90deg)  translateZ(${size / 4}px); }
        .left   { transform: rotateY(-90deg) translateZ(${size / 4}px); }
        .top    { transform: rotateX(90deg)  translateZ(${size / 4}px); }
        .bottom { transform: rotateX(-90deg) translateZ(${size / 4}px); }
      `}</style>

      <div className={`flex items-center justify-center ${className}`}>
        <div className="cube-orbit-inner">
          <div className="scene">
            <div className="cube">
              <div className="face front" />
              <div className="face back" />
              <div className="face right" />
              <div className="face left" />
              <div className="face top" />
              <div className="face bottom" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}