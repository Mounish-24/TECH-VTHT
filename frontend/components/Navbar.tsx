'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LogOut, User, Menu, X, LayoutDashboard } from 'lucide-react';
import Image from 'next/image';

export default function Navbar() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn]         = useState(false);
  const [role, setRole]                     = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled]             = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const ur    = localStorage.getItem('role');
    if (token) { setIsLoggedIn(true); setRole(ur || ''); }
  }, []);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    setIsLoggedIn(false);
    setMobileMenuOpen(false);
    router.push('/');
  };

  const dashHref =
    role === 'Student' ? '/student' :
    role === 'Faculty' ? '/faculty' : '/admin';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        /* ── Design tokens ─────────────────────────────────────
           Black : #08090d (base) · #0d0f18 (card) · #12152a (surface)
           Blue  : #1847f5 (primary) · #3b6bff (mid) · #6690ff (light)
           Cyan  : #06b6d4 (accent highlight)
           The palette is 55% black-family / 45% blue-family
           so neither dominates — they meld like a night sky.
        ──────────────────────────────────────────────────────── */
        :root {
          --k:        #08090d;     /* pure base               */
          --k1:       #0d0f18;     /* card                    */
          --k2:       #12152a;     /* surface / elevated      */
          --k3:       #181c35;     /* hover                   */
          --b0:       #1847f5;     /* blue primary            */
          --b1:       #3b6bff;     /* blue mid                */
          --b2:       #6690ff;     /* blue light              */
          --b3:       rgba(56,107,255,.18);  /* blue tint     */
          --b4:       rgba(56,107,255,.08);  /* blue faint    */
          --cyan:     #22d3ee;     /* cyan sparkle            */
          --whi:      #ffffff;
          --whi-m:    rgba(255,255,255,.8);
          --whi-l:    rgba(255,255,255,.5);
          --whi-f:    rgba(255,255,255,.08);
        }

        /* ── Nav root ── */
        .nv {
          position: sticky; top: 0; z-index: 50;
          font-family: 'Plus Jakarta Sans', sans-serif;
          transition: background .4s, box-shadow .4s;
        }
        .nv.top {
          /* Balanced gradient — black left/right, blue glowing centre */
          background: linear-gradient(135deg,
            #08090d 0%, #0d1526 30%, #101d3d 55%, #0d1526 75%, #08090d 100%);
          box-shadow: 0 1px 0 rgba(56,107,255,.25), 0 4px 24px rgba(8,9,13,.6);
        }
        .nv.scrolled {
          background: rgba(8,9,13,.96);
          backdrop-filter: blur(20px) saturate(1.4);
          box-shadow:
            0 1px 0 rgba(56,107,255,.4),
            0 0 40px rgba(24,71,245,.12),
            0 8px 32px rgba(0,0,0,.7);
        }

        /* Animated blue glow line at top */
        .nv-glow-line {
          height: 2px;
          background: linear-gradient(90deg,
            transparent 0%, rgba(24,71,245,.5) 15%,
            #3b6bff 40%, #22d3ee 50%,
            #3b6bff 60%, rgba(24,71,245,.5) 85%, transparent 100%);
          background-size: 200% 100%;
          animation: glowSweep 4s linear infinite;
        }
        @keyframes glowSweep {
          0%  { background-position:  100% 0; }
          100%{ background-position: -100% 0; }
        }

        /* Bottom separator */
        .nv-sep {
          position: absolute; bottom: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg,
            transparent, rgba(56,107,255,.45), rgba(34,211,238,.6),
            rgba(56,107,255,.45), transparent);
          pointer-events: none;
        }

        .nv-inner {
          max-width: 1280px; margin: 0 auto;
          padding: 11px 24px;
          display: flex; justify-content: space-between; align-items: center;
          position: relative;
        }

        /* ── Logo ── */
        .nv-logo {
          display: flex; align-items: center; gap: 13px;
          text-decoration: none; min-width: 0; flex: 1;
        }
        .nv-ring {
          flex-shrink: 0; width: 46px; height: 46px; border-radius: 50%;
          border: 1.5px solid rgba(56,107,255,.55);
          display: flex; align-items: center; justify-content: center;
          background: radial-gradient(circle at 38% 35%,
            rgba(56,107,255,.22), transparent 65%);
          box-shadow:
            0 0 16px rgba(56,107,255,.22),
            inset 0 1px 0 rgba(102,144,255,.3);
          transition: border-color .3s, box-shadow .3s;
        }
        .nv-logo:hover .nv-ring {
          border-color: rgba(34,211,238,.8);
          box-shadow: 0 0 24px rgba(34,211,238,.35), inset 0 1px 0 rgba(34,211,238,.3);
        }
        .nv-texts { display:flex; flex-direction:column; overflow:hidden; line-height:1.2; }
        .nv-name {
          font-size:1.18rem; font-weight:800; color:var(--whi);
          letter-spacing:-.015em; white-space:nowrap;
          overflow:hidden; text-overflow:ellipsis;
        }
        @media(min-width:640px){ .nv-name { font-size:1.32rem; } }
        .nv-sub {
          font-size:.6rem; color:var(--whi-l); letter-spacing:.02em;
          white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
        }
        @media(min-width:640px){ .nv-sub { font-size:.67rem; } }
        .nv-tag {
          font-size:.57rem; font-weight:600; letter-spacing:.14em;
          text-transform:uppercase;
          background: linear-gradient(90deg, var(--b1), var(--cyan));
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* ── Desktop ── */
        .nv-desk {
          display:none; align-items:center; gap:6px; flex-shrink:0;
        }
        @media(min-width:640px){ .nv-desk{ display:flex !important; } }

        .nv-vdiv {
          width:1px; height:18px; margin:0 10px;
          background: linear-gradient(to bottom, transparent, rgba(56,107,255,.5), transparent);
        }

        .nv-link {
          position:relative; font-size:.74rem; font-weight:600;
          color:var(--whi-l); letter-spacing:.08em; text-transform:uppercase;
          text-decoration:none; padding:5px 3px;
          transition:color .25s;
        }
        .nv-link::after {
          content:''; position:absolute; bottom:0; left:0; right:0; height:1.5px;
          background: linear-gradient(90deg, var(--b1), var(--cyan));
          transform:scaleX(0); transform-origin:left;
          transition:transform .32s cubic-bezier(.16,1,.3,1);
        }
        .nv-link:hover { color:var(--whi); }
        .nv-link:hover::after { transform:scaleX(1); }

        .nv-dash {
          position:relative; display:flex; align-items:center; gap:5px;
          font-size:.74rem; font-weight:600; color:var(--whi-l);
          letter-spacing:.08em; text-transform:uppercase;
          text-decoration:none; padding:5px 3px; transition:color .25s;
        }
        .nv-dash::after {
          content:''; position:absolute; bottom:0; left:0; right:0; height:1.5px;
          background:rgba(56,107,255,.5);
          transform:scaleX(0); transform-origin:left;
          transition:transform .32s cubic-bezier(.16,1,.3,1);
        }
        .nv-dash:hover { color:var(--whi); }
        .nv-dash:hover::after { transform:scaleX(1); }

        /* Blue glow login button */
        .nv-login {
          position:relative; overflow:hidden;
          display:flex; align-items:center; gap:7px;
          font-size:.73rem; font-weight:700; letter-spacing:.09em; text-transform:uppercase;
          color:#fff; border:1.5px solid rgba(56,107,255,.65);
          background: linear-gradient(135deg, rgba(24,71,245,.3), rgba(56,107,255,.2));
          padding:8px 22px; cursor:pointer; text-decoration:none;
          border-radius:6px; transition:box-shadow .3s, border-color .3s;
        }
        .nv-login::before {
          content:''; position:absolute; inset:0; border-radius:6px;
          background: linear-gradient(135deg, #1847f5, #3b6bff 60%, #22d3ee);
          opacity:0; transition:opacity .35s;
        }
        .nv-login:hover { border-color:rgba(34,211,238,.8); box-shadow:0 0 24px rgba(56,107,255,.45); }
        .nv-login:hover::before { opacity:1; }
        .nv-login > * { position:relative; z-index:1; }

        .nv-logout {
          display:flex; align-items:center; gap:6px;
          font-size:.73rem; font-weight:600; letter-spacing:.08em; text-transform:uppercase;
          color:var(--whi-l); background:transparent;
          border:1px solid rgba(255,255,255,.12);
          padding:7px 14px; cursor:pointer; border-radius:6px;
          transition:color .25s, border-color .25s, background .25s;
        }
        .nv-logout:hover {
          color:var(--whi); border-color:rgba(255,255,255,.28);
          background:var(--whi-f);
        }

        /* ── Mobile toggle ── */
        .nv-mob-btn {
          display:flex; align-items:center; justify-content:center;
          width:37px; height:37px; border-radius:6px;
          background: linear-gradient(135deg, rgba(24,71,245,.2), rgba(56,107,255,.15));
          border:1.5px solid rgba(56,107,255,.4);
          color:var(--b2); cursor:pointer; margin-left:14px; flex-shrink:0;
          transition:box-shadow .25s, border-color .25s;
        }
        .nv-mob-btn:hover {
          border-color:rgba(34,211,238,.7);
          box-shadow:0 0 16px rgba(56,107,255,.4);
        }
        @media(min-width:640px){ .nv-mob-btn { display:none !important; } }

        /* ── Dropdown ── */
        .nv-drop {
          position:absolute; top:100%; right:0; width:255px;
          background: linear-gradient(160deg, #0d0f18, #12152a);
          border:1px solid rgba(56,107,255,.22); border-top:none;
          box-shadow: 0 24px 60px rgba(0,0,0,.8), 0 0 0 1px rgba(56,107,255,.06);
          z-index:999; overflow:hidden;
        }
        .nv-drop-top {
          height:2px;
          background:linear-gradient(90deg,transparent,var(--b1),var(--cyan),var(--b1),transparent);
        }
        .nv-drop-a {
          display:block; padding:13px 22px;
          font-size:.73rem; font-weight:600; letter-spacing:.09em; text-transform:uppercase;
          color:var(--whi-l); text-decoration:none; text-align:right;
          border-bottom:1px solid rgba(255,255,255,.05);
          transition:background .2s, color .2s;
        }
        .nv-drop-a:hover { background:var(--b4); color:var(--whi); }
        .nv-drop-a.hi { color:var(--b2) !important; }
        .nv-drop-a.hi:hover { background:var(--b3) !important; color:#fff !important; }
        .nv-drop-btn {
          display:block; width:100%; padding:13px 22px;
          font-size:.73rem; font-weight:600; letter-spacing:.09em; text-transform:uppercase;
          color:rgba(102,144,255,.75); background:transparent;
          border:none; text-align:right; cursor:pointer;
          transition:background .2s, color .2s;
        }
        .nv-drop-btn:hover { background:var(--b4); color:var(--b2); }
      `}</style>

      <nav className={`nv ${scrolled ? 'scrolled' : 'top'}`}>
        <div className="nv-glow-line" />
        <div className="nv-inner">

          {/* Logo */}
          <Link href="/" className="nv-logo">
            <div className="nv-ring">
              <Image src="/logo.png" alt="Vel Tech Logo" width={32} height={32}
                style={{ borderRadius:'50%', objectFit:'cover' }} />
            </div>
            <div className="nv-texts">
              <span className="nv-name">Vel Tech High Tech</span>
              <span className="nv-sub">Dr. Rangarajan Dr. Sakunthala Engineering College</span>
              <span className="nv-tag">An Autonomous Institution</span>
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="nv-desk">
            <Link href="/" className="nv-link">Home</Link>
            {isLoggedIn ? (
              <>
                <div className="nv-vdiv" />
                <Link href={dashHref} className="nv-dash">
                  <LayoutDashboard size={12} /> Dashboard
                </Link>
                <div className="nv-vdiv" />
                <button onClick={handleLogout} className="nv-logout">
                  <LogOut size={12} /> Logout
                </button>
              </>
            ) : (
              <>
                <div className="nv-vdiv" />
                <Link href="/login" className="nv-login">
                  <User size={13} /><span>Login</span>
                </Link>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button className="nv-mob-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Menu">
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        <div className="nv-sep" />

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="nv-drop">
            <div className="nv-drop-top" />
            <Link href="/" onClick={() => setMobileMenuOpen(false)} className="nv-drop-a">Home</Link>
            {isLoggedIn && (
              <Link href={dashHref} onClick={() => setMobileMenuOpen(false)} className="nv-drop-a">Dashboard</Link>
            )}
            {isLoggedIn
              ? <button onClick={handleLogout} className="nv-drop-btn">Logout</button>
              : <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="nv-drop-a hi">Login</Link>
            }
          </div>
        )}
      </nav>
    </>
  );
}