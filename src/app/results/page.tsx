"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

// Helper function to calculate next Tuesday's date dynamically
function getNextWebinarDate() {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0: Sun, 1: Mon, 2: Tue, etc.
  const currentHour = now.getHours();
  
  const targetDate = new Date();
  
  let daysToAdd = 0;
  if (dayOfWeek === 2 && currentHour < 19) {
    daysToAdd = 0;
  } else {
    daysToAdd = (2 - dayOfWeek + 7) % 7;
    if (daysToAdd === 0) daysToAdd = 7;
  }
  
  targetDate.setDate(now.getDate() + daysToAdd);
  targetDate.setHours(19, 0, 0, 0); // 7:00 PM EST
  
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  };
  const dateStr = targetDate.toLocaleDateString('en-US', options);
  
  const day = targetDate.getDate();
  let suffix = 'th';
  if (day === 1 || day === 21 || day === 31) suffix = 'st';
  else if (day === 2 || day === 22) suffix = 'nd';
  else if (day === 3 || day === 23) suffix = 'rd';
  
  return `${dateStr.replace(/\d+/, day + suffix)} at 7:00 PM EST (4:00 PM PST)`;
}

function LoadingResults() {
  return (
    <div className="min-h-screen bg-[#02060f] text-slate-100 flex flex-col items-center justify-center p-6">
      <div className="animate-pulse flex flex-col items-center space-y-4">
        <div className="w-16 h-16 border-4 border-t-[#A2C2C7] border-slate-800 rounded-full animate-spin"></div>
        <p className="text-[#A2C2C7] font-semibold text-sm tracking-wider">LOADING YOUR RBI REPORT...</p>
      </div>
    </div>
  );
}

function ResultsContent() {
  const searchParams = useSearchParams();
  const name = searchParams.get("name") || "Athlete";
  const goal = searchParams.get("goal") || "Not specified";
  const score = Number(searchParams.get("score")) || 0;
  const grade = searchParams.get("grade") || "B";
  const badge = searchParams.get("badge") || "Functional Breather";
  
  const [webinarDate, setWebinarDate] = useState("Tuesday at 7:00 PM EST");

  useEffect(() => {
    setWebinarDate(getNextWebinarDate());
  }, []);

  // Determine custom text descriptions based on Badge
  let badgeDescription = "";
  let badgeImplication = "";
  let badgeAction = "";
  let badgeColor = "#A2C2C7"; // default light ice-blue

  if (badge.toLowerCase().includes("summit") && !badge.toLowerCase().includes("approaching")) {
    badgeDescription = "Summit-Ready";
    badgeColor = "#4A90A4"; // solid brand blue
    badgeImplication = "Excellent breath control and carbon dioxide tolerance. Your respiratory muscles are well-conditioned, which means you will use oxygen efficiently at altitude and suffer less early-stage exhaustion.";
    badgeAction = "Maintain your physical edge. Introduce advanced hypercapnic-hypoxic training drills (breath-holding under load) to prepare your body for sudden extreme ascents.";
  } else if (badge.toLowerCase().includes("everest") || badge.toLowerCase().includes("elite")) {
    badgeDescription = "Everest-Ready";
    badgeColor = "#F59E0B"; // Gold
    badgeImplication = "Exceptional, elite-level breathing tolerance. You possess superior carbon dioxide buffering capacity, showing minimal ventilation sensitivity, which is vital for extreme high altitude (above 18,000 ft) survival and climbing economy.";
    badgeAction = "Taper your breathing drills closer to your expedition. Focus on high-altitude recovery techniques and breath regulation during severe cold stress.";
  } else if (badge.toLowerCase().includes("approaching")) {
    badgeDescription = "Summit Approaching";
    badgeColor = "#E11D48"; // Rose/Red
    badgeImplication = "Your BOLT score and CO₂ tolerance indicate a highly sensitive respiratory system. At high altitude, this will trigger rapid hyperventilation, a spike in heart rate, and premature fatigue due to oxygen dumping.";
    badgeAction = "Begin core breathing adaptations immediately. Focus on nasal-only breathing during daily routines, and practice 5-10 minutes of diaphragmatic breathing twice a day.";
  } else {
    // Functional Breather / Intermediate
    badgeDescription = "Functional Breather";
    badgeColor = "#10B981"; // Emerald green
    badgeImplication = "Good foundation, but there is significant room to optimize. Your sensitivity to carbon dioxide is moderate, meaning you will feel the urge to breathe heavily relatively early under physical exertion at altitude.";
    badgeAction = "Increase your BOLT threshold. Focus on incorporating light, nasal-only breath-hold pacing during your Zone 2 aerobic base training to lower your ventilator sensitivity.";
  }

  return (
    <div className="min-h-screen bg-[#02060f] text-slate-100 flex flex-col font-sans">
      
      {/* ── HEADER ────────────────── */}
      <header className="w-full border-b border-white/5 bg-[#050c16]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 flex justify-between items-center h-20">
          <Image
            src="/Logo Version A White - Recal_no background_small.png"
            alt="Recal Logo"
            width={130}
            height={60}
            className="h-10 w-auto"
            priority
          />
          <Link 
            href="/"
            className="text-xs uppercase tracking-wider text-slate-400 hover:text-white transition-colors font-bold border border-white/10 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10"
          >
            &larr; Retake Test
          </Link>
        </div>
      </header>

      {/* ── MAIN LAYOUT ────────────────── */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-12 space-y-12">

        {/* 🏆 REPORT HEADER 🏆 */}
        <div className="text-center space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] font-extrabold text-[#A2C2C7]">
            PERSONALIZED REPORT FOR {name.toUpperCase()}
          </p>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight italic text-white" style={{ fontFamily: "Rogue Sans Ext, sans-serif" }}>
            YOUR BREATH INDEX REPORT
          </h1>
          <p className="text-sm font-semibold text-slate-400 max-w-lg mx-auto leading-relaxed">
            Calculated score based on your breathwork diagnostic and mountaineering goals.
          </p>
        </div>

        {/* 🏔️ THE SCORE CARD (GLACIER GLASSMORPHISM) 🏔️ */}
        <div className="relative p-6 md:p-10 rounded-2xl border border-white/10 bg-[#06152B]/40 backdrop-blur-md shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          
          {/* Ambient Glows */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#A2C2C7]/5 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#0A4367]/10 rounded-full blur-3xl pointer-events-none"></div>

          {/* Left Column: Radial score circle (4 cols) */}
          <div className="md:col-span-5 flex flex-col items-center justify-center space-y-3">
            <div className="relative w-44 h-44 flex items-center justify-center rounded-full bg-slate-950/40 border border-white/5 shadow-inner">
              
              {/* Pulsing Outer Glow */}
              <div className="absolute inset-0 rounded-full border-2 border-[#A2C2C7]/15 animate-ping opacity-25" style={{ animationDuration: '3s' }}></div>
              
              {/* Glowing SVG Ring */}
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="88"
                  cy="88"
                  r="74"
                  stroke="rgba(255,255,255,0.02)"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="88"
                  cy="88"
                  r="74"
                  stroke={badgeColor}
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 74}
                  strokeDashoffset={2 * Math.PI * 74 * (1 - score / 100)}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>

              {/* Text Overlay */}
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-5xl font-black text-white tracking-tighter">{score}</span>
                <span className="text-[10px] tracking-[0.2em] uppercase text-slate-400 font-extrabold mt-1">RBI SCORE</span>
              </div>
            </div>
          </div>

          {/* Right Column: Badges & Info (7 cols) */}
          <div className="md:col-span-7 space-y-6 text-center md:text-left">
            <div className="space-y-2">
              <div className="flex flex-col md:flex-row items-center gap-3 justify-center md:justify-start">
                <span 
                  className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider text-slate-950 shadow-md"
                  style={{ backgroundColor: badgeColor }}
                >
                  {badgeDescription}
                </span>
                <span className="px-3 py-1 rounded-lg text-xs font-black bg-white/5 border border-white/15 text-slate-300">
                  Grade: {grade}
                </span>
              </div>
              
              <h2 className="text-2xl font-black text-white tracking-tight">
                Breath Adaptation Level
              </h2>
            </div>

            <div className="space-y-2 text-slate-300 text-sm leading-relaxed">
              <p>
                <strong>Altitude Goal:</strong> {goal}
              </p>
              <p>
                <strong>Breathing Implication:</strong> {badgeImplication}
              </p>
            </div>
          </div>
        </div>

        {/* 📋 TRAINING IMPLICATIONS SECTION 📋 */}
        <div className="p-6 md:p-8 rounded-2xl border border-white/5 bg-[#050c16]/30 space-y-6">
          <h3 className="text-xl font-bold text-white tracking-wide border-b border-white/10 pb-3 flex items-center gap-2">
            🏔️ Coach Anthony's Training Recommendation
          </h3>
          <div className="space-y-4 text-slate-300 text-sm md:text-base leading-relaxed">
            <p className="bg-white/5 border border-white/5 p-4 rounded-xl italic text-slate-300">
              <strong>Recommended Action:</strong> {badgeAction}
            </p>
            <p>
              To climb safely and perform at your peak at high altitudes, your body must be adapted to handle carbon dioxide build-up. Without targeted breath training, your body will over-respond to low oxygen levels, triggering hyperventilation, fatiguing your breathing muscles, and significantly increasing the risk of Acute Mountain Sickness (AMS).
            </p>
          </div>
        </div>

        {/* 🎯 WEBINAR CALL-TO-ACTION (STUNNING DOUBLE CONTAINER) 🎯 */}
        <div className="space-y-6 pt-6">
          <div className="text-center space-y-2">
            <h3 className="text-2xl font-black tracking-tight text-white italic" style={{ fontFamily: "Rogue Sans Ext, sans-serif" }}>
              YOUR NEXT CRITICAL STEPS
            </h3>
            <p className="text-sm text-slate-400 max-w-lg mx-auto">
              Your results show specific bottlenecks. Watch Coach Anthony’s training to learn the exact protocols to address them.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            
            {/* Card 1: Live Masterclass Signup */}
            <div className="relative p-6 md:p-8 rounded-2xl border border-white/10 bg-[#06152B]/40 flex flex-col justify-between hover:border-[#A2C2C7]/30 transition-all duration-300 shadow-xl overflow-hidden">
              <div className="absolute top-0 right-0 bg-[#A2C2C7]/10 text-white text-[10px] tracking-widest font-black uppercase py-1 px-4 rounded-bl-xl border-l border-b border-white/5">
                RECOMMENDED
              </div>
              
              <div className="space-y-4">
                <span className="text-3xl">📡</span>
                <div className="space-y-1">
                  <h4 className="text-lg font-black text-white tracking-tight">
                    Live Breathing Masterclass
                  </h4>
                  <p className="text-xs text-[#A2C2C7] font-black uppercase tracking-wider">
                    {webinarDate}
                  </p>
                </div>
                <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
                  Join Coach Anthony live to walk through the exact high-altitude breathing protocols. Ask questions, analyze real climber cases, and learn how to raise your BOLT score in weeks.
                </p>
              </div>

              <div className="pt-8">
                <a 
                  href="/webinar-registration-page.html" 
                  className="w-full text-center block py-3 rounded-lg font-black text-white bg-[#0A4367] hover:bg-[#105987] transition-all border border-[#A2C2C7]/30 shadow-md tracking-wider text-xs md:text-sm uppercase cursor-pointer hover:shadow-[#A2C2C7]/10"
                >
                  Secure My Live Spot &rarr;
                </a>
              </div>
            </div>

            {/* Card 2: Watch On-Demand */}
            <div className="p-6 md:p-8 rounded-2xl border border-white/5 bg-[#050c16]/30 flex flex-col justify-between hover:border-white/10 transition-all duration-300 shadow-xl">
              <div className="space-y-4">
                <span className="text-3xl">⚡</span>
                <div className="space-y-1">
                  <h4 className="text-lg font-black text-white tracking-tight">
                    On-Demand Instant Replay
                  </h4>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                    AVAILABLE NOW INSTANTLY
                  </p>
                </div>
                <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
                  Can't attend the live session? Get immediate, unrestricted access to the complete recorded masterclass. Learn why fit climbers still fail at altitude and how to adapt your lungs from home.
                </p>
              </div>

              <div className="pt-8">
                <a 
                  href="/evergreen-webinar-SOD.html" 
                  className="w-full text-center block py-3 rounded-lg font-black text-slate-300 bg-white/5 hover:bg-white/10 hover:text-white transition-all border border-white/10 text-xs md:text-sm uppercase cursor-pointer"
                >
                  Watch On-Demand Now &rarr;
                </a>
              </div>
            </div>

          </div>
        </div>

      </main>

      {/* ── FOOTER ────────────────── */}
      <footer className="py-10 border-t border-white/5 bg-[#010307] text-slate-500 text-xs text-center mt-16">
        <p>&copy; 2026 Recal Training. All rights reserved.</p>
      </footer>

    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<LoadingResults />}>
      <ResultsContent />
    </Suspense>
  );
}
