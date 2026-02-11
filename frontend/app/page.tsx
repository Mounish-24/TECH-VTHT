'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import DotGrid from '@/components/DotGrid';
import { API_URL } from '@/config';
import axios from 'axios';
import peekImage from "@/public/peek.jpg";
import MagicBento from '@/components/MagicBento';

interface Announcement {
  id: number;
  title: string;
  content: string;
  type: string;
}

interface Company {
  id: number;
  name: string;
  logo_url: string;
}

interface PlacedStudent {
  id: number;
  name: string;
  dept: string;
  lpa: number;
  company_name: string;
  photo_url: string;
  linkedin_url?: string;
}

const heroImages = [
  '/college-bg-1.jpg',
  '/college-bg-2.jpg',
  '/college-bg-3.jpg',
];

const aboutImages = [
  peekImage.src,
  '/college-bg-1.jpg',
  '/college-bg-2.jpg',
  '/college-bg-3.jpg',
];

export default function Home() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [placements, setPlacements] = useState<PlacedStudent[]>([]);
  const [currentBg, setCurrentBg] = useState(0);
  const [currentAboutImage, setCurrentAboutImage] = useState(0);
  const [selectedStudent, setSelectedStudent] = useState<PlacedStudent | null>(null);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      @keyframes gradientRotate {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBg((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentAboutImage((prev) => (prev + 1) % aboutImages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const move = (e: MouseEvent) => {
      const heroGlass = document.getElementById("hero-glass");
      const heroLight = document.getElementById("hero-light");
      const aboutCard = document.getElementById('about-card');
      const aboutLight = document.getElementById('about-light');

      if (heroGlass && heroLight) {
        const rect = heroGlass.getBoundingClientRect();
        heroLight.style.setProperty("--x", `${e.clientX - rect.left}px`);
        heroLight.style.setProperty("--y", `${e.clientY - rect.top}px`);
      }
      if (aboutCard && aboutLight) {
        const rect = aboutCard.getBoundingClientRect();
        aboutLight.style.setProperty('--x', `${e.clientX - rect.left}px`);
        aboutLight.style.setProperty('--y', `${e.clientY - rect.top}px`);
      }
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);

  // Updated Fetch Data for Targeted System
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [annRes, compRes, placeRes] = await Promise.all([
          // Strictly fetch ONLY Global notices for the public home page
          axios.get(`${API_URL}/announcements?audience=Global`),
          axios.get(`${API_URL}/companies`),
          axios.get(`${API_URL}/placed-students`)
        ]);
        setAnnouncements(annRes.data);
        setCompanies(compRes.data);
        setPlacements(placeRes.data);
      } catch (error) {
        console.error("Failed to fetch home page data", error);
      }
    };
    fetchData();
  }, []);

  const triggerCelebration = () => {
    const colors = ['#f97316', '#fb923c', '#fed7aa', '#0ea5e9', '#60a5fa', '#a78bfa', '#f472b6'];
    for (let i = 0; i < 130; i++) {
      const particle = document.createElement('div');
      particle.className = 'celebration-particle';
      particle.style.position = 'fixed';
      particle.style.width = `${6 + Math.random() * 14}px`;
      particle.style.height = particle.style.width;
      particle.style.background = colors[Math.floor(Math.random() * colors.length)];
      particle.style.borderRadius = Math.random() > 0.6 ? '50%' : '4px';
      particle.style.pointerEvents = 'none';
      particle.style.zIndex = '9999';
      particle.style.opacity = '0.95';
      particle.style.left = i % 2 === 0 ? '-5%' : '105%';
      particle.style.top = `${-10 + Math.random() * 30}vh`;

      document.body.appendChild(particle);

      const angle = (Math.random() * Math.PI * 2) - Math.PI / 4;
      const distance = 600 + Math.random() * 800;
      const duration = 1.8 + Math.random() * 1.6;

      particle.animate(
        [
          { transform: 'translate(0, 0) scale(1) rotate(0deg)', opacity: 1 },
          {
            transform: `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px) scale(0.2) rotate(${Math.random() * 720 - 360}deg)`,
            opacity: 0
          }
        ],
        {
          duration: duration * 1000,
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)'
        }
      );

      setTimeout(() => {
        if (particle.parentNode) particle.remove();
      }, duration * 1000 + 200);
    }
  };

  const openStudentModal = (student: PlacedStudent) => {
    triggerCelebration();
    setSelectedStudent(student);
  };

  const closeModal = () => {
    setSelectedStudent(null);
  };

  const nextAboutImage = () => {
    setCurrentAboutImage((prev) => (prev + 1) % aboutImages.length);
  };

  const prevAboutImage = () => {
    setCurrentAboutImage((prev) => (prev - 1 + aboutImages.length) % aboutImages.length);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-grow">
        {/* HERO SECTION */}
        <section className="relative text-white py-24 overflow-hidden z-20">
          {heroImages.map((img, index) => (
            <div
              key={img}
              className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${
                index === currentBg ? 'opacity-100' : 'opacity-0'
              }`}
              style={{ backgroundImage: `url('${img}')` }}
            />
          ))}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-transparent via-orange-500 to-transparent z-10"></div>
          <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-orange-400/60 via-orange-400/40 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-blue-900/30 to-blue-700/30" />
          <div className="absolute inset-0 bg-gradient-to-r from-blue-900/30 to-blue-700/30 overflow-hidden">
            <div className="absolute top-0 left-[-50%] w-[250%] h-full bg-white/40 blur-2xl transform rotate-[25deg] animate-shine"></div>
          </div>
          <div id="hero-glass" className="absolute inset-0 pointer-events-none">
            <div id="hero-light" />
          </div>
          <div className="relative container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 drop-shadow-lg">Vel Tech High Tech</h1>
            <p className="text-xl md:text-2xl mb-8 font-light drop-shadow-md">
              Dr. Rangarajan Dr. Sakunthala Engineering College
            </p>
            <Link href="/login">
              <button className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-full transition duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1">
                Department of Artificial Intelligence & Data Science
              </button>
            </Link>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent"></div>
        </section>

        {/* PLACED STUDENTS MARQUEE */}
        <section className="py-16 overflow-hidden border-b relative bg-white">
          <div className="container mx-auto px-4 mb-10 text-center relative z-10">
            <h2 className="text-3xl font-bold text-blue-900">Our Placed Students</h2>
            <div className="w-20 h-1 bg-orange-500 mx-auto mt-2 rounded-full"></div>
          </div>

          <div className="marquee-wrapper py-6 relative z-10 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-300 via-white to-orange-300 z-0"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-orange-200/50 via-transparent to-orange-200/50 z-0"></div>
            
            <div className="animate-marquee flex gap-8 px-6 relative z-10">
              {[...placements, ...placements].map((student, index) => (
                <MagicBento
                  key={index}
                  textAutoHide={true}
                  enableStars={false}
                  enableSpotlight={true}
                  enableBorderGlow={true}
                  enableTilt={false}
                  enableMagnetism={false}
                  clickEffect={true}
                  spotlightRadius={220}
                  particleCount={8}
                  glowColor="0, 102, 255"
                  disableAnimations={false}
                >
                  <div
                    onClick={() => openStudentModal(student)}
                    className="relative min-w-[320px] bg-white backdrop-blur-lg rounded-xl shadow-xl flex items-center gap-5 p-5 cursor-pointer transition-all duration-500 group overflow-hidden"
                    style={{
                      border: '3px solid transparent',
                      backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #bfdbfe, #93c5fd, #60a5fa, #93c5fd, #bfdbfe)',
                      backgroundOrigin: 'border-box',
                      backgroundClip: 'padding-box, border-box',
                    }}
                  >
                    <div 
                      className="absolute -inset-1 rounded-xl opacity-0 group-hover:opacity-75 blur-sm transition-opacity duration-500 pointer-events-none"
                      style={{
                        background: 'linear-gradient(45deg, #bfdbfe, #93c5fd, #60a5fa, #93c5fd, #bfdbfe)',
                        backgroundSize: '400% 400%',
                        animation: 'gradientRotate 3s ease infinite',
                      }}
                    />
                    
                    <div 
                      className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" 
                      style={{
                        background: 'linear-gradient(110deg, transparent 0%, transparent 40%, rgba(255, 255, 255, 0.8) 50%, transparent 60%, transparent 100%)',
                        backgroundSize: '200% 100%',
                        animation: 'shimmer 2s infinite linear',
                      }}
                    />
                    
                    <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                         style={{
                           boxShadow: '0 0 20px rgba(96, 165, 250, 0.4), 0 0 40px rgba(96, 165, 250, 0.2), inset 0 0 20px rgba(147, 197, 253, 0.1)',
                         }}
                    />
                    
                    <img
                      src={student.photo_url}
                      alt={student.name}
                      className="w-20 h-20 rounded-full object-cover border-4 border-blue-200 shadow-lg flex-shrink-0 relative z-10 transition-all duration-500 group-hover:border-blue-400 group-hover:shadow-2xl group-hover:scale-110"
                    />
                    <div className="flex flex-col relative z-10 flex-1">
                      <h4 className="font-bold text-gray-900 text-lg leading-tight transition-colors duration-300 group-hover:text-blue-500">{student.name}</h4>
                      <p className="text-sm text-blue-600 font-medium transition-colors duration-300 group-hover:text-blue-700">{student.dept}</p>
                      <p className="text-sm text-gray-600 mt-1 transition-colors duration-300 group-hover:text-gray-800">
                        Placed at <span className="font-semibold text-gray-800 group-hover:text-blue-500">{student.company_name}</span>
                      </p>
                      <div className="mt-2 inline-block bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-200 transition-all duration-300 group-hover:bg-blue-100 group-hover:text-blue-800 group-hover:border-blue-300 group-hover:shadow-md">
                        {student.lpa} LPA
                      </div>
                    </div>
                    
                    {student.linkedin_url && (
                      <a
                        href={student.linkedin_url.startsWith('http') ? student.linkedin_url : `https://${student.linkedin_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="absolute bottom-3 right-3 z-20 w-8 h-8 bg-blue-100 hover:bg-blue-600 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 group/linkedin"
                        title="View LinkedIn Profile"
                      >
                        <svg className="w-4 h-4 text-blue-600 group-hover/linkedin:text-white transition-colors duration-300" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                        </svg>
                      </a>
                    )}
                  </div>
                </MagicBento>
              ))}
            </div>
          </div>
        </section>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent"></div>

        {/* NEWS SECTION (Targeted Visibility) */}
        <section className="py-16 md:py-20 relative overflow-hidden bg-gradient-to-br from-gray-50 via-white to-blue-50/20">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute w-64 h-64 md:w-96 md:h-96 bg-gradient-to-br from-orange-400/10 to-transparent rounded-full blur-3xl left-[10%] top-[15%]" />
            <div className="absolute w-80 h-80 md:w-112 md:h-112 bg-gradient-to-br from-blue-400/10 to-transparent rounded-full blur-3xl right-[15%] bottom-[20%]" />
          </div>

          <div className="container mx-auto px-4 md:px-6 relative z-10" >
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12 md:mb-16">
                <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 via-orange-500 to-blue-600">
                    College News
                  </span>
                </h2>
                <div className="mt-5 h-1.5 w-48 mx-auto rounded-full bg-gradient-to-r from-orange-400 via-orange-500 to-blue-500 shadow-md" />
              </div>

              <div className="relative bg-white/80 backdrop-blur-lg rounded-2xl border border-gray-200/60 shadow-xl overflow-hidden group/news">
                <div className="absolute -top-6 left-0 right-0 h-20 pointer-events-none z-0 transition-all duration-500 group-hover/news:scale-[1.015]">
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500 via-orange-400 to-blue-600 opacity-80" style={{ clipPath: 'polygon(0% 0%, 100% 0%, 94% 100%, 6% 100%)' }} />
                </div>

                <div className="max-h-[600px] md:max-h-[720px] overflow-y-auto px-5 md:px-10 pt-12 pb-14 space-y-6 relative z-10">
                  {announcements.length > 0 ? (
                    announcements.map((ann) => (
                      <div
                        key={ann.id}
                        className="group relative bg-white/95 p-6 md:p-8 rounded-xl border border-transparent hover:border-orange-400/60 transition-all duration-400 hover:shadow-xl hover:-translate-y-1"
                      >
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-500 to-blue-600 transform scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-600" />
                        <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 group-hover:text-orange-600 transition-colors duration-300">
                          {ann.title}
                        </h3>
                        <p className="text-gray-700 leading-relaxed">{ann.content}</p>
                        <div className="mt-5 flex items-center justify-between text-sm text-gray-500">
                          <span className="font-medium text-orange-600/80">Public Broadcast</span>
                          <span className="flex items-center font-medium text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                            View Details
                            <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-16 text-gray-600 text-xl font-medium">
                      No public announcements at the moment.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent"></div>
        </section>
        
        {/* ABOUT SECTION */}
        <section className="py-16 bg-white/60 backdrop-blur-sm relative">
          <div className="absolute inset-0 pointer-events-none z-0">
            <DotGrid dotSize={5} gap={15} baseColor="#ff6600" activeColor="#1803dc" proximity={120} speedTrigger={100} shockRadius={250} shockStrength={5} maxSpeed={5000} resistance={750} returnDuration={1.5} style={{ width: '100%', height: '100%' }} />
          </div>
          <div className="container mx-auto px-4 relative z-10">
            <div id="about-card" className="relative bg-gray-200/70 backdrop-blur-xl p-10 rounded-2xl shadow-xl">
              <h2 className="text-3xl font-bold text-center mb-8 text-blue-900">About Our College</h2>
              <p className="text-gray-700 max-w-4xl mx-auto text-center leading-relaxed mb-8">
                Vel Tech High Tech Dr. Rangarajan Dr. Sakunthala Engineering College was established in 2002...
              </p>
              
              <div className="relative z-10 max-w-4xl mx-auto">
                <div className="relative overflow-hidden rounded-xl shadow-2xl group h-[400px]">
                  {aboutImages.map((img, index) => (
                    <img key={index} src={img} alt="College View" className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ${index === currentAboutImage ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`} />
                  ))}
                  <button onClick={prevAboutImage} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 p-3 rounded-full text-white opacity-0 group-hover:opacity-100 transition-all">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <button onClick={nextAboutImage} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 p-3 rounded-full text-white opacity-0 group-hover:opacity-100 transition-all">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* COMPANY MARQUEE */}
        <section className="relative py-6 overflow-hidden bg-white border-b">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-300 via-white to-orange-300 pointer-events-none" />
          <div className="marquee-wrapper py-4 relative z-10">
            <div className="animate-marquee flex items-center gap-16 px-6">
              {[...companies, ...companies].map((company, index) => (
                <div key={index} className="flex items-center gap-4 min-w-max group">
                  <img src={company.logo_url} alt={company.name} className="h-10 w-auto object-contain" />
                  <span className="text-xs font-bold text-orange-900 uppercase tracking-widest">{company.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Student Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-8 text-white text-center">
              <img src={selectedStudent.photo_url} alt={selectedStudent.name} className="w-32 h-32 mx-auto rounded-full object-cover border-4 border-white/40 mb-4" />
              <h3 className="text-2xl font-bold">{selectedStudent.name}</h3>
              <p className="text-blue-100">{selectedStudent.dept}</p>
            </div>
            <div className="p-6 text-center">
              <p className="text-lg text-gray-700">Placed at <strong className="text-blue-700">{selectedStudent.company_name}</strong></p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{selectedStudent.lpa} LPA</p>
              <button onClick={closeModal} className="mt-6 w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-bold transition-all">Close</button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}