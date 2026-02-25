'use client';

import { MapPin, Mail, Phone, Youtube, Linkedin, Instagram } from 'lucide-react';

export default function Footer() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        .ft-root {
          font-family: 'Plus Jakarta Sans', sans-serif;
          position: relative;
          background: linear-gradient(160deg, #0c0e1a 0%, #080c1f 45%, #0c0e1a 100%);
          color: rgba(255,255,255,0.78);
          overflow: hidden;
        }

        /* Ambient blue radial glow — subtle, balanced */
        .ft-root::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 70% 120% at 50% 110%,
              rgba(24,71,245,0.22) 0%, transparent 65%),
            radial-gradient(ellipse 40% 60% at 20% 50%,
              rgba(34,211,238,0.06) 0%, transparent 60%);
          pointer-events: none;
        }

        /* Animated sweep line — same as navbar/hero */
        .ft-sweep {
          height: 2px;
          background: linear-gradient(90deg,
            transparent 0%, rgba(24,71,245,0.5) 15%,
            #3b6bff 40%, #22d3ee 50%,
            #3b6bff 60%, rgba(24,71,245,0.5) 85%, transparent 100%);
          background-size: 200% 100%;
          animation: ftSweep 4s linear infinite;
        }
        @keyframes ftSweep {
          0%  { background-position:  100% 0; }
          100%{ background-position: -100% 0; }
        }

        .ft-inner {
          position: relative; z-index: 1;
          max-width: 1280px; margin: 0 auto;
          padding: 36px 28px 32px;
          display: grid;
          grid-template-columns: 1fr;
          gap: 28px;
        }
        @media(min-width: 768px) {
          .ft-inner { grid-template-columns: 1fr 1fr 1fr; align-items: center; gap: 20px; }
        }

        /* Section headings */
        .ft-heading {
          font-size: 0.65rem; font-weight: 700;
          letter-spacing: 0.2em; text-transform: uppercase;
          background: linear-gradient(90deg, #3b6bff, #22d3ee);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 12px;
        }

        /* Contact rows */
        .ft-contact-row {
          display: flex; align-items: flex-start; gap: 9px;
          font-size: 0.72rem; color: rgba(255,255,255,0.55);
          line-height: 1.6;
          transition: color 0.2s;
        }
        .ft-contact-row:hover { color: rgba(255,255,255,0.85); }
        .ft-contact-icon {
          flex-shrink: 0; margin-top: 2px;
          color: #3b6bff;
        }

        /* College name centre */
        .ft-college-name {
          font-size: clamp(1.15rem, 2.5vw, 1.55rem);
          font-weight: 800; letter-spacing: -0.02em;
          color: #ffffff; line-height: 1.15;
        }
        .ft-college-sub {
          font-size: clamp(0.85rem, 1.8vw, 1.05rem);
          font-weight: 700; color: rgba(255,255,255,0.85);
          margin-top: 4px; line-height: 1.2;
        }
        .ft-college-tag {
          font-size: 0.65rem; font-weight: 600;
          letter-spacing: 0.14em; text-transform: uppercase;
          background: linear-gradient(90deg, #3b6bff, #22d3ee);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-top: 6px; display: block;
        }

        /* Social icons */
        .ft-social-wrap {
          display: flex; gap: 12px;
        }
        @media(min-width: 768px) { .ft-social-wrap { justify-content: flex-end; } }

        .ft-social-btn {
          width: 38px; height: 38px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          background: rgba(56,107,255,0.1);
          border: 1px solid rgba(56,107,255,0.28);
          color: rgba(255,255,255,0.6);
          text-decoration: none;
          transition: background 0.25s, border-color 0.25s, color 0.25s, box-shadow 0.25s;
        }
        .ft-social-btn:hover {
          background: rgba(56,107,255,0.25);
          border-color: rgba(34,211,238,0.6);
          color: #ffffff;
          box-shadow: 0 0 16px rgba(56,107,255,0.35);
        }

        /* Bottom bar */
        .ft-bottom {
          position: relative; z-index: 1;
          border-top: 1px solid rgba(56,107,255,0.18);
          padding: 10px 28px;
          display: flex; align-items: center; justify-content: center;
          background: rgba(0,0,0,0.25);
        }
        .ft-bottom-text {
          font-size: 0.67rem; font-weight: 500;
          letter-spacing: 0.06em;
          color: rgba(255,255,255,0.32);
        }
        .ft-bottom-text span {
          background: linear-gradient(90deg, #3b6bff, #22d3ee);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
          font-weight: 700;
        }
      `}</style>

      <footer className="ft-root">
        {/* Animated sweep line at top — continuous with navbar + hero */}
        <div className="ft-sweep" />

        <div className="ft-inner">

          {/* ── LEFT — Contact ── */}
          <div>
            <p className="ft-heading">Get in Touch</p>
            <div className="space-y-2.5">
              <div className="ft-contact-row">
                <MapPin size={13} className="ft-contact-icon" />
                <span>#60, Avadi – Vel Tech Road, Chennai – 600062</span>
              </div>
              <div className="ft-contact-row">
                <Mail size={13} className="ft-contact-icon" />
                <span>admission@velhightech.com</span>
              </div>
              <div className="ft-contact-row">
                <Phone size={13} className="ft-contact-icon" />
                <span>1800 212 7669</span>
              </div>
            </div>
          </div>

          {/* ── CENTRE — College name ── */}
          <div className="text-center">
            <p className="ft-college-name">Vel Tech High Tech</p>
            <p className="ft-college-sub">Dr. Rangarajan Dr. Sakunthala</p>
            <p className="ft-college-sub" style={{ fontSize: 'clamp(0.75rem,1.5vw,0.9rem)', color: 'rgba(255,255,255,0.65)', fontWeight: 500 }}>
              Engineering College
            </p>
            <span className="ft-college-tag">An Autonomous Institution</span>
          </div>

          {/* ── RIGHT — Social ── */}
          <div className="md:text-right">
            <p className="ft-heading md:text-right">Follow Us</p>
            <div className="ft-social-wrap">
              <a href="#" className="ft-social-btn" aria-label="YouTube">
                <Youtube size={17} />
              </a>
              <a href="#" className="ft-social-btn" aria-label="LinkedIn">
                <Linkedin size={17} />
              </a>
              <a href="#" className="ft-social-btn" aria-label="Instagram">
                <Instagram size={17} />
              </a>
            </div>
          </div>

        </div>

        {/* ── Bottom bar ── */}
        <div className="ft-bottom">
          <p className="ft-bottom-text">
            © {new Date().getFullYear()} <span>Vel Tech High Tech</span>. All Rights Reserved.
          </p>
        </div>
      </footer>
    </>
  );
}