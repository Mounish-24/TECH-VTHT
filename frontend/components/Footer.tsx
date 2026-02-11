'use client';

import {
  MapPin,
  Mail,
  Phone,
  Smartphone,
  Youtube,
  Linkedin,
  Instagram,
} from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gradient-to-r from-blue-950 via-blue-700 to-blue-950 text-white">
      <div className="max-w-7xl mx-auto px-6 py-4 md:py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-6 md:gap-8 text-sm">
          {/* LEFT – GET IN TOUCH (made more compact / slightly smaller) */}
          <div className="space-y-1 text-xs md:text-xs">
            <h3 className="font-semibold text-xs md:text-sm mb-1 tracking-wide">
              Get in Touch
            </h3>
            <div className="flex items-start gap-2">
              <MapPin size={14} className="mt-0.5" />
              <p className="leading-snug">
                #60, Avadi – Vel Tech Road, Chennai – 600062
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Mail size={14} />
              <p>admission@velhightech.com</p>
            </div>
            <div className="flex items-center gap-2">
              <Phone size={14} />
              <p>1800 212 7669</p>
            </div>
          </div>

          {/* CENTER – COLLEGE NAME (bigger) */}
          <div className="text-center">
            <h2 className="text-xl md:text-2xl lg:text-3xl font-extrabold leading-tight tracking-wide">
              Vel Tech High Tech
            </h2>
            <h2 className="text-lg md:text-xl lg:text-2xl font-bold leading-tight mt-1">
              Dr. Rangarajan Dr. Sakunthala
            </h2>
            <p className="text-xs md:text-sm text-gray-300 mt-1 font-medium">
              Engineering College (Autonomous)
            </p>
          </div>

          {/* RIGHT – FOLLOW US */}
          <div className="text-center md:text-right">
            <h3 className="font-semibold text-xs md:text-sm mb-2 tracking-wide">
              Follow Us
            </h3>
            <div className="flex justify-center md:justify-end gap-4">
              <a href="#" className="hover:text-blue-300 transition-colors">
                <Youtube size={20} />
              </a>
              <a href="#" className="hover:text-blue-300 transition-colors">
                <Linkedin size={20} />
              </a>
              <a href="#" className="hover:text-blue-300 transition-colors">
                <Instagram size={20} />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM BAR */}
      <div className="border-t border-white/20 py-2 text-center text-xs text-gray-300 bg-black/20">
        © {new Date().getFullYear()} Vel Tech High Tech. All Rights Reserved.
      </div>
    </footer>
  );
}