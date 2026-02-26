'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { API_URL } from '@/config';
import axios from 'axios';
import peekImage from "@/public/peek.jpg";
import MagicBento from '@/components/MagicBento';

interface Announcement { id:number; title:string; content:string; type:string; }
interface Company      { id:number; name:string; logo_url:string; }
interface PlacedStudent{
  id:number; name:string; dept:string; lpa:number;
  company_name:string; photo_url:string; linkedin_url?:string;
}

const heroImages  = ['/college-bg-1.jpg','/college-bg-2.jpg','/college-bg-3.jpg'];
const aboutImages = [peekImage.src,'/college-bg-1.jpg','/college-bg-2.jpg','/college-bg-3.jpg'];

/* ── Orbital ─────────────────────────────────────────────────────────── */
const ORBIT_RX=160, ORBIT_RY=80, PERIOD=22000, IMG_SIZE=86;

function OrbitalImages({ images }:{ images:string[] }) {
  const refs = useRef<(HTMLDivElement|null)[]>([]);
  const raf  = useRef<number>(0);
  const n    = images.length;

  useEffect(()=>{
    const t0 = performance.now();
    const tick=(now:number)=>{
      const e=now-t0;
      refs.current.forEach((el,i)=>{
        if(!el) return;
        const angle=(e/PERIOD)*2*Math.PI+(i/n)*2*Math.PI;
        const x=Math.cos(angle)*ORBIT_RX, y=Math.sin(angle)*ORBIT_RY;
        const sc=0.82+0.18*((Math.sin(angle)+1)/2);
        el.style.transform=`translate(${x}px,${y}px) scale(${sc})`;
        el.style.zIndex=y>0?'3':'2';
        el.style.opacity=String(0.68+0.32*((Math.sin(angle)+1)/2));
      });
      raf.current=requestAnimationFrame(tick);
    };
    raf.current=requestAnimationFrame(tick);
    return()=>cancelAnimationFrame(raf.current);
  },[n]);

  const sw=(ORBIT_RX+4)*2, sh=(ORBIT_RY+4)*2;
  return (
    <div className="orb-scene">
      <div className="orb-glow"/>
      <svg className="orb-svg" width={sw} height={sh} viewBox={`${-sw/2} ${-sh/2} ${sw} ${sh}`}>
        <ellipse cx={0} cy={0} rx={ORBIT_RX} ry={ORBIT_RY}
          fill="none" stroke="rgba(56,107,255,0.18)" strokeWidth={10}/>
        <ellipse cx={0} cy={0} rx={ORBIT_RX} ry={ORBIT_RY}
          fill="none" stroke="rgba(56,107,255,0.7)" strokeWidth={1.5} strokeDasharray="7 5"/>
        <ellipse cx={0} cy={0} rx={ORBIT_RX} ry={ORBIT_RY}
          fill="none" stroke="rgba(34,211,238,0.25)" strokeWidth={0.5}/>
      </svg>
      {images.map((src,i)=>(
        <div key={i} ref={el=>{refs.current[i]=el;}}
          className="orb-item" style={{top:'50%',left:'50%'}}>
          <img src={src} alt={`Campus ${i+1}`} className="orb-img"/>
        </div>
      ))}
    </div>
  );
}

/* ── News Section Edge Glow Background ──────────────────────────────── */
function NewsGlow() {
  return (
    <>
      <div style={{position:'absolute',left:0,top:0,bottom:0,width:'38%',background:'radial-gradient(ellipse at left center,rgba(24,71,245,0.28) 0%,rgba(56,107,255,0.10) 40%,transparent 70%)',pointerEvents:'none',zIndex:0}}/>
      <div style={{position:'absolute',right:0,top:0,bottom:0,width:'38%',background:'radial-gradient(ellipse at right center,rgba(34,211,238,0.20) 0%,rgba(56,107,255,0.10) 40%,transparent 70%)',pointerEvents:'none',zIndex:0}}/>
      <div style={{position:'absolute',left:0,right:0,top:0,height:'45%',background:'radial-gradient(ellipse at center top,rgba(56,107,255,0.22) 0%,transparent 65%)',pointerEvents:'none',zIndex:0}}/>
      <div style={{position:'absolute',left:0,right:0,bottom:0,height:'45%',background:'radial-gradient(ellipse at center bottom,rgba(24,71,245,0.18) 0%,transparent 65%)',pointerEvents:'none',zIndex:0}}/>
      <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse 55% 55% at 50% 50%,rgba(6,8,16,0.55) 0%,transparent 100%)',pointerEvents:'none',zIndex:0}}/>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════ */
export default function Home() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [companies,     setCompanies]     = useState<Company[]>([]);
  const [placements,    setPlacements]    = useState<PlacedStudent[]>([]);
  const [currentBg,     setCurrentBg]     = useState(0);
  const [selected,      setSelected]      = useState<PlacedStudent|null>(null);

  /* ── Global CSS ── */
  useEffect(()=>{
    const s=document.createElement('style');
    s.textContent=`
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

      :root{
        --k0: #060810;
        --k1: #08090f;
        --k2: #0c0e1a;
        --k3: #101424;
        --k4: #151930;
        --b0: #1847f5;
        --b1: #2d5cfa;
        --b2: #3b6bff;
        --b3: #6690ff;
        --bt: rgba(56,107,255,.16);
        --bf: rgba(56,107,255,.07);
        --cy: #22d3ee;
        --cyt:rgba(34,211,238,.18);
        --whi: #ffffff;
        --wm:  rgba(255,255,255,.78);
        --wl:  rgba(255,255,255,.48);
        --grad-blue: linear-gradient(135deg,#1847f5,#3b6bff 55%,#22d3ee);
        --grad-page: linear-gradient(180deg,#060810 0%,#080c1f 40%,#060810 100%);
      }
      body{ background:var(--k0); font-family:'Plus Jakarta Sans',sans-serif; }

      @keyframes slowPan{
        0%  {transform:scale(1.05) translateX(0%);}
        50% {transform:scale(1.10) translateX(-1%);}
        100%{transform:scale(1.05) translateX(0%);}
      }
      @keyframes fadeUp{
        from{opacity:0;transform:translateY(28px);}
        to  {opacity:1;transform:translateY(0);}
      }
      @keyframes mqLeft{
        0%  {transform:translateX(0);}
        100%{transform:translateX(-50%);}
      }
      @keyframes orbPulse{
        0%,100%{opacity:.2;transform:scale(1);}
        50%    {opacity:.45;transform:scale(1.12);}
      }
      @keyframes scanLine{
        0%  {background-position:100% 0;}
        100%{background-position:-100% 0;}
      }

      .fd { font-family:'Plus Jakarta Sans',sans-serif; }
      .afu  {animation:fadeUp .88s cubic-bezier(.16,1,.3,1) both;}
      .afu1 {animation:fadeUp .88s .2s cubic-bezier(.16,1,.3,1) both;}
      .afu2 {animation:fadeUp .88s .38s cubic-bezier(.16,1,.3,1) both;}
      .afu3 {animation:fadeUp .88s .52s cubic-bezier(.16,1,.3,1) both;}
      .hero-active{animation:slowPan 18s ease-in-out infinite;}

      .sweep-line{
        height:2px;
        background:linear-gradient(90deg,
          transparent 0%, rgba(24,71,245,.5) 15%,
          #3b6bff 40%, #22d3ee 50%,
          #3b6bff 60%, rgba(24,71,245,.5) 85%, transparent 100%);
        background-size:200% 100%;
        animation:scanLine 4s linear infinite;
      }
      .div-blue{
        height:1px;
        background:linear-gradient(90deg,transparent,rgba(56,107,255,.45),
          rgba(34,211,238,.55),rgba(56,107,255,.45),transparent);
      }
      .eyebrow{
        font-size:.68rem; font-weight:700; letter-spacing:.22em;
        text-transform:uppercase;
        background:linear-gradient(90deg,var(--b2),var(--cy));
        -webkit-background-clip:text; -webkit-text-fill-color:transparent;
        background-clip:text;
      }
      .cta-btn{
        position:relative; overflow:hidden;
        display:inline-flex; align-items:center; gap:8px;
        font-size:.8rem; font-weight:700; letter-spacing:.1em; text-transform:uppercase;
        color:#fff;
        border:1.5px solid rgba(56,107,255,.65);
        background:linear-gradient(135deg,rgba(24,71,245,.28),rgba(56,107,255,.18));
        padding:13px 34px; border-radius:8px;
        cursor:pointer; text-decoration:none;
        transition:box-shadow .35s, border-color .35s;
      }
      .cta-btn::before{
        content:''; position:absolute; inset:0; border-radius:8px;
        background:var(--grad-blue); opacity:0; transition:opacity .38s;
      }
      .cta-btn:hover{
        border-color:rgba(34,211,238,.8);
        box-shadow:0 0 32px rgba(56,107,255,.55), 0 0 8px rgba(34,211,238,.4);
      }
      .cta-btn:hover::before{opacity:1;}
      .cta-btn>*{position:relative;z-index:1;}

      .pg-card{
        background:var(--k2);
        border:1px solid rgba(56,107,255,.14);
        transition:border-color .28s, transform .28s, box-shadow .28s;
      }
      .pg-card:hover{
        border-color:rgba(56,107,255,.45);
        transform:translateY(-2px);
        box-shadow:0 12px 40px rgba(0,0,0,.6), 0 0 20px rgba(56,107,255,.12);
      }
      .mq{animation:mqLeft 42s linear infinite;}
      .mq:hover{animation-play-state:paused;}

      .nb{position:relative;}
      .nb::before{
        content:''; position:absolute; left:0; top:0; bottom:0; width:3px;
        background:var(--grad-blue); border-radius:2px;
        transform:scaleY(0); transform-origin:top;
        transition:transform .36s ease;
      }
      .nb:hover::before{transform:scaleY(1);}

      .ns::-webkit-scrollbar     {width:4px;}
      .ns::-webkit-scrollbar-track{background:rgba(255,255,255,.03);}
      .ns::-webkit-scrollbar-thumb{background:rgba(56,107,255,.4);border-radius:2px;}
      .ns::-webkit-scrollbar-thumb:hover{background:rgba(56,107,255,.7);}

      /* FIX 1 — company logos always show real color, no grayscale */
      .co-logo{ transition: opacity .3s; }
      .co-logo:hover{ opacity: 0.85; }

      .dot-b{
        display:inline-block; width:7px; height:7px; border-radius:50%;
        background:var(--grad-blue); flex-shrink:0; margin-top:6px;
      }
      .stat-c{
        background:var(--k3);
        border:1px solid rgba(56,107,255,.2);
        border-radius:12px; padding:22px 10px; text-align:center;
        transition:border-color .28s, background .28s, box-shadow .28s;
      }
      .stat-c:hover{
        border-color:rgba(34,211,238,.5);
        background:var(--k4);
        box-shadow:0 0 24px rgba(56,107,255,.15);
      }
      .stat-num{
        font-size:1.95rem; font-weight:800;
        background:var(--grad-blue);
        -webkit-background-clip:text; -webkit-text-fill-color:transparent;
        background-clip:text;
      }
      .orb-scene{
        position:relative; width:100%; height:100%;
        display:flex; align-items:center; justify-content:center;
      }
      .orb-glow{
        position:absolute; width:180px; height:180px; border-radius:50%;
        background:radial-gradient(circle,rgba(56,107,255,.22) 0%,transparent 70%);
        animation:orbPulse 5s ease-in-out infinite;
        pointer-events:none; z-index:0;
      }
      .orb-svg{
        position:absolute; top:50%; left:50%;
        transform:translate(-50%,-50%);
        pointer-events:none; z-index:1; overflow:visible;
      }
      .orb-item{
        position:absolute;
        width:${IMG_SIZE}px; height:${IMG_SIZE}px;
        margin-left:${-IMG_SIZE/2}px; margin-top:${-IMG_SIZE/2}px;
        z-index:2;
      }
      .orb-img{
        width:100%; height:100%; border-radius:12px; object-fit:cover;
        border:2px solid rgba(56,107,255,.6);
        box-shadow:0 6px 28px rgba(0,0,0,.7), 0 0 12px rgba(56,107,255,.2);
        transition:border-color .3s, box-shadow .3s;
      }
      .orb-img:hover{
        border-color:rgba(34,211,238,.9);
        box-shadow:0 8px 32px rgba(56,107,255,.4), 0 0 16px rgba(34,211,238,.3);
      }
      .modal-bg{backdrop-filter:blur(16px);}
      .sdot{border:none;cursor:pointer;height:6px;border-radius:3px;transition:width .3s,background .3s;}
    `;
    document.head.appendChild(s);
    return()=>{document.head.removeChild(s);};
  },[]);

  useEffect(()=>{
    const id=setInterval(()=>setCurrentBg(p=>(p+1)%heroImages.length),5000);
    return()=>clearInterval(id);
  },[]);

  useEffect(()=>{
    (async()=>{
      try{
        const [a,c,p]=await Promise.all([
          axios.get(`${API_URL}/announcements?audience=Global`),
          axios.get(`${API_URL}/companies`),
          axios.get(`${API_URL}/placed-students`),
        ]);
        setAnnouncements(a.data); setCompanies(c.data); setPlacements(p.data);
      }catch(e){console.error(e);}
    })();
  },[]);

  const celebrate=()=>{
    const cols=['#3b6bff','#6690ff','#22d3ee','#ffffff','#1847f5','#a5b4fc'];
    for(let i=0;i<130;i++){
      const p=document.createElement('div');
      Object.assign(p.style,{
        position:'fixed',pointerEvents:'none',zIndex:'9999',
        width:`${5+Math.random()*13}px`,height:`${5+Math.random()*13}px`,
        background:cols[Math.floor(Math.random()*cols.length)],
        borderRadius:Math.random()>.5?'50%':'3px',
        left:i%2===0?'-5%':'105%',top:`${-10+Math.random()*30}vh`,
      });
      document.body.appendChild(p);
      const ang=Math.random()*Math.PI*2-Math.PI/4;
      const d=500+Math.random()*750,dr=1.6+Math.random()*1.5;
      p.animate([
        {transform:'translate(0,0) scale(1) rotate(0deg)',opacity:'1'},
        {transform:`translate(${Math.cos(ang)*d}px,${Math.sin(ang)*d}px) scale(0.08) rotate(${Math.random()*720}deg)`,opacity:'0'},
      ],{duration:dr*1000,easing:'cubic-bezier(.16,1,.3,1)'});
      setTimeout(()=>p.remove(),dr*1000+200);
    }
  };

  const openModal =(s:PlacedStudent)=>{celebrate();setSelected(s);};
  const closeModal=()=>setSelected(null);

  return (
    <div className="fd min-h-screen flex flex-col" style={{background:'var(--k0)',color:'var(--whi)'}}>
      <Navbar/>
      <main className="flex-grow">

        {/* ══ HERO ════════════════════════════════════════════════ */}
        <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden">
          {heroImages.map((img,i)=>(
            <div key={img}
              className={`absolute inset-0 transition-opacity duration-[1600ms] ${i===currentBg?'opacity-100 hero-active':'opacity-0'}`}
              style={{backgroundImage:`url('${img}')`,backgroundSize:'cover',backgroundPosition:'center'}}/>
          ))}
          <div className="absolute inset-0"
            style={{background:'linear-gradient(160deg,rgba(6,8,16,.72) 0%,rgba(8,12,28,.82) 50%,rgba(6,8,16,.88) 100%)'}}/>
          <div className="absolute inset-0"
            style={{background:'radial-gradient(ellipse 90% 70% at 50% 40%,rgba(24,71,245,.42) 0%,rgba(56,107,255,.18) 35%,transparent 70%)'}}/>
          <div className="absolute inset-0"
            style={{background:'radial-gradient(ellipse 50% 35% at 50% 50%,rgba(34,211,238,.1) 0%,transparent 65%)'}}/>
          <div className="absolute inset-0"
            style={{background:'linear-gradient(to top,var(--k0) 0%,transparent 35%)'}}/>
          <div className="sweep-line absolute top-0 left-0 right-0"/>
          <div className="relative z-10 container mx-auto px-6 text-center max-w-4xl">
            <p className="afu eyebrow mb-6">Dept. of Artificial Intelligence &amp; Data Science</p>
            <h1 className="afu1 mb-4"
              style={{fontSize:'clamp(2.5rem,7.5vw,5.2rem)',fontWeight:800,
                      lineHeight:1.04,letterSpacing:'-.025em',color:'var(--whi)',
                      textShadow:'0 0 60px rgba(56,107,255,.4), 0 2px 20px rgba(0,0,0,.5)'}}>
              Vel Tech High Tech
            </h1>
            <p className="afu2 mb-2"
              style={{fontSize:'clamp(.9rem,2.2vw,1.15rem)',color:'var(--wm)',
                      maxWidth:'520px',margin:'0 auto .5rem',letterSpacing:'.01em'}}>
              Dr. Rangarajan Dr. Sakunthala Engineering College
            </p>
            <p className="afu2 mb-12"
              style={{fontSize:'.75rem',fontWeight:700,letterSpacing:'.2em',
                      textTransform:'uppercase',
                      background:'linear-gradient(90deg,var(--b2),var(--cy))',
                      WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',
                      backgroundClip:'text'}}>
              An Autonomous Institution · Shaping Tomorrow's Technologists
            </p>
            <div className="afu3">
              <Link href="/login" className="cta-btn">
                <span>Enter Portal</span>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5-5 5M6 12h12"/>
                </svg>
              </Link>
            </div>
          </div>
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {heroImages.map((_,i)=>(
              <button key={i} className="sdot" onClick={()=>setCurrentBg(i)}
                style={{width:i===currentBg?'28px':'7px',
                        background:i===currentBg
                          ?'linear-gradient(90deg,var(--b1),var(--cy))'
                          :'rgba(255,255,255,.25)'}}/>
            ))}
          </div>
          <div className="div-blue absolute bottom-0 left-0 right-0"/>
        </section>

        {/* ══ PLACED STUDENTS ═════════════════════════════════════ */}
        <section className="py-20 overflow-hidden" style={{background:'var(--k2)'}}>
          <div className="container mx-auto px-6 mb-12 text-center">
            <p className="eyebrow mb-3">Achievements</p>
            <h2 className="fd text-4xl md:text-5xl font-bold" style={{color:'var(--whi)'}}>Our Placed Students</h2>
            <div className="mt-4 h-0.5 w-16 mx-auto rounded-full"
              style={{background:'linear-gradient(90deg,var(--b1),var(--cy))'}}/>
          </div>
          <div className="relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-28 z-10 pointer-events-none"
              style={{background:'linear-gradient(90deg,var(--k2),transparent)'}}/>
            <div className="absolute right-0 top-0 bottom-0 w-28 z-10 pointer-events-none"
              style={{background:'linear-gradient(270deg,var(--k2),transparent)'}}/>
            <div className="mq flex gap-5 px-6" style={{width:'max-content'}}>
              {/* FIX 3 — restructured card layout to prevent LPA/LinkedIn clash */}
              {[...placements,...placements].map((st,idx)=>(
                <div key={idx} onClick={()=>openModal(st)}
                  className="pg-card relative flex items-center gap-4 px-5 py-4 rounded-xl cursor-pointer min-w-[300px]">

                  {/* LinkedIn icon — top-right corner, absolutely positioned */}
                  {st.linkedin_url&&(
                    <a href={st.linkedin_url.startsWith('http')?st.linkedin_url:`https://${st.linkedin_url}`}
                      target="_blank" rel="noopener noreferrer"
                      onClick={e=>e.stopPropagation()}
                      className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full flex items-center justify-center"
                      style={{background:'var(--bt)',border:'1px solid rgba(56,107,255,.4)'}}
                      onMouseEnter={e=>(e.currentTarget.style.background='rgba(56,107,255,.35)')}
                      onMouseLeave={e=>(e.currentTarget.style.background='var(--bt)')}>
                      <svg className="w-3 h-3" fill="var(--b2)" viewBox="0 0 24 24">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                    </a>
                  )}

                  {/* Photo */}
                  <img src={st.photo_url} alt={st.name}
                    className="w-14 h-14 rounded-full object-cover flex-shrink-0"
                    style={{border:'2px solid rgba(56,107,255,.5)',boxShadow:'0 0 12px rgba(56,107,255,.2)'}}/>

                  {/* Name / dept / company — takes remaining space, padded right so text doesn't go under LPA */}
                  <div style={{flex:1, minWidth:0, paddingRight: st.linkedin_url ? '8px' : '0'}}>
                    <p className="font-bold text-sm truncate" style={{color:'var(--whi)'}}>{st.name}</p>
                    <p className="text-xs truncate mt-0.5" style={{color:'var(--wl)'}}>{st.dept}</p>
                    <p className="text-xs mt-1 truncate" style={{color:'var(--wm)'}}>{st.company_name}</p>
                  </div>

                  {/* LPA block — fixed right side, enough top padding to clear the LinkedIn icon */}
                  <div className="flex-shrink-0 text-right" style={{paddingTop: st.linkedin_url ? '18px' : '0', minWidth:'42px'}}>
                    <span className="stat-num" style={{fontSize:'1.25rem'}}>{st.lpa}</span>
                    <span className="text-xs block" style={{color:'var(--wl)'}}>LPA</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="div-blue"/>

        {/* ══ NEWS — Edge glow panel ═══════════════════════════════ */}
        <section className="py-20 relative overflow-hidden" style={{background:'var(--k0)'}}>

          {/* Edge glow on all four sides of the panel */}
          <NewsGlow />

          <div className="container mx-auto px-6 relative" style={{zIndex:1}}>
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-14">
                <p className="eyebrow mb-3">Updates</p>
                <h2 className="fd text-4xl md:text-5xl font-bold" style={{color:'var(--whi)'}}>College News</h2>
                <div className="mt-4 h-0.5 w-16 mx-auto rounded-full"
                  style={{background:'linear-gradient(90deg,var(--b1),var(--cy))'}}/>
              </div>
              <div className="ns space-y-3 overflow-y-auto pr-1" style={{maxHeight:'570px'}}>
                {announcements.length>0 ? announcements.map(ann=>(
                  <div key={ann.id}
                    className="nb pg-card relative pl-7 py-5 pr-6 rounded-xl cursor-default"
                    style={{background:'var(--k2)'}}
                    onMouseEnter={e=>{
                      e.currentTarget.style.background='var(--k3)';
                      e.currentTarget.style.borderColor='rgba(56,107,255,.38)';
                    }}
                    onMouseLeave={e=>{
                      e.currentTarget.style.background='var(--k2)';
                      e.currentTarget.style.borderColor='rgba(56,107,255,.14)';
                    }}>
                    <div className="flex items-start gap-3">
                      <span className="dot-b flex-shrink-0"/>
                      <div>
                        <h3 className="fd font-bold text-base mb-2" style={{color:'var(--whi)'}}>{ann.title}</h3>
                        <p className="text-sm leading-relaxed" style={{color:'var(--wl)',lineHeight:1.82}}>{ann.content}</p>
                        <span className="inline-block mt-3 text-xs font-semibold tracking-widest uppercase eyebrow">
                          Public Notice
                        </span>
                      </div>
                    </div>
                  </div>
                )):(
                  <div className="text-center py-16" style={{color:'var(--wl)'}}>
                    No public announcements at the moment.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="div-blue"/>

        {/* ══ ABOUT ═══════════════════════════════════════════════ */}
        <section className="py-20" style={{background:'var(--k2)'}}>
          <div className="container mx-auto px-6">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-14">
                <p className="eyebrow mb-3">Who We Are</p>
                <h2 className="fd text-4xl md:text-5xl font-bold" style={{color:'var(--whi)'}}>About Our College</h2>
                <div className="mt-4 h-0.5 w-16 mx-auto rounded-full"
                  style={{background:'linear-gradient(90deg,var(--b1),var(--cy))'}}/>
              </div>
              <div className="grid md:grid-cols-2 gap-14 items-center">
                <div>
                  <p className="text-base mb-6" style={{color:'var(--wl)',lineHeight:1.9}}>
                    Vel Tech High Tech Dr. Rangarajan Dr. Sakunthala Engineering College was established
                    in 2002 with a vision to create world-class engineers and technologists who contribute
                    meaningfully to society and industry.
                  </p>
                  <p className="text-base" style={{color:'var(--wl)',lineHeight:1.9}}>
                    Our Department of Artificial Intelligence &amp; Data Science is at the forefront of
                    cutting-edge research, consistently achieving outstanding placement records with
                    top-tier companies across the globe.
                  </p>
                  <div className="mt-10 grid grid-cols-3 gap-4">
                    {[{num:'2002',label:'Established'},{num:'95%+',label:'Placement Rate'},{num:'200+',label:'Companies'}].map(st=>(
                      <div key={st.label} className="stat-c">
                        <p className="stat-num">{st.num}</p>
                        <p className="text-xs mt-1 tracking-widest uppercase" style={{color:'var(--wl)'}}>{st.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="relative flex items-center justify-center rounded-2xl"
                  style={{height:'340px',
                          background:'radial-gradient(ellipse at center,rgba(24,71,245,.1) 0%,var(--k0) 70%)',
                          border:'1px solid rgba(56,107,255,.18)'}}>
                  <OrbitalImages images={aboutImages}/>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="div-blue"/>

        {/* ══ PARTNERS ════════════════════════════════════════════ */}
        <section className="py-14 overflow-hidden" style={{background:'var(--k0)'}}>
          <div className="container mx-auto px-6 mb-10 text-center">
            <p className="eyebrow">Our Recruiting Partners</p>
          </div>
          <div className="relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-20 z-10 pointer-events-none"
              style={{background:'linear-gradient(90deg,var(--k0),transparent)'}}/>
            <div className="absolute right-0 top-0 bottom-0 w-20 z-10 pointer-events-none"
              style={{background:'linear-gradient(270deg,var(--k0),transparent)'}}/>
            {/* FIX 1 — no grayscale filter, logos always in real color */}
            <div className="mq flex items-center gap-14 px-8" style={{width:'max-content'}}>
              {[...companies,...companies].map((co,i)=>(
                <div key={i} className="co-logo flex items-center gap-3 min-w-max">
                  <img src={co.logo_url} alt={co.name} className="h-9 w-auto object-contain"/>
                  <span className="text-xs font-semibold tracking-widest uppercase"
                    style={{color:'var(--wl)'}}>{co.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>

      {/* ══ MODAL ═══════════════════════════════════════════════ */}
      {selected&&(
        <div className="modal-bg fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{background:'rgba(4,5,12,.9)'}} onClick={closeModal}>
          <div className="relative max-w-sm w-full rounded-2xl overflow-hidden"
            style={{background:'var(--k3)',
                    border:'1px solid rgba(56,107,255,.35)',
                    boxShadow:'0 0 0 1px rgba(56,107,255,.08),0 32px 80px rgba(0,0,0,.85),0 0 60px rgba(24,71,245,.15)'}}
            onClick={e=>e.stopPropagation()}>
            <div className="sweep-line"/>
            <div className="p-8 text-center">
              <div className="relative inline-block mb-5">
                <img src={selected.photo_url} alt={selected.name}
                  className="w-28 h-28 rounded-full object-cover"
                  style={{border:'3px solid rgba(56,107,255,.6)',boxShadow:'0 0 24px rgba(56,107,255,.35)'}}/>
                <div className="absolute inset-0 rounded-full"
                  style={{border:'1px solid rgba(34,211,238,.3)',transform:'scale(1.1)'}}/>
              </div>
              <h3 className="fd text-2xl font-bold mb-1" style={{color:'var(--whi)'}}>{selected.name}</h3>
              <p className="text-sm mb-6" style={{color:'var(--wl)'}}>{selected.dept}</p>
              <div className="rounded-xl p-5 mb-6"
                style={{background:'var(--bf)',border:'1px solid rgba(56,107,255,.22)'}}>
                <p className="text-xs mb-1 uppercase tracking-widest" style={{color:'var(--wl)'}}>Placed at</p>
                <p className="fd font-bold text-lg mb-3" style={{color:'var(--whi)'}}>{selected.company_name}</p>
                <p className="stat-num" style={{fontSize:'2.8rem'}}>{selected.lpa}
                  <span style={{fontSize:'1.4rem',marginLeft:'4px',color:'var(--b3)'}}>LPA</span>
                </p>
              </div>
              <button onClick={closeModal}
                className="w-full py-3 text-sm font-semibold tracking-widest uppercase rounded-xl transition-all"
                style={{background:'rgba(255,255,255,.04)',color:'var(--wl)',border:'1px solid rgba(255,255,255,.1)'}}
                onMouseEnter={e=>{
                  (e.currentTarget as HTMLButtonElement).style.background='var(--bt)';
                  (e.currentTarget as HTMLButtonElement).style.borderColor='rgba(56,107,255,.5)';
                  (e.currentTarget as HTMLButtonElement).style.color='var(--b2)';
                }}
                onMouseLeave={e=>{
                  (e.currentTarget as HTMLButtonElement).style.background='rgba(255,255,255,.04)';
                  (e.currentTarget as HTMLButtonElement).style.borderColor='rgba(255,255,255,.1)';
                  (e.currentTarget as HTMLButtonElement).style.color='var(--wl)';
                }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer/>
    </div>
  );
}