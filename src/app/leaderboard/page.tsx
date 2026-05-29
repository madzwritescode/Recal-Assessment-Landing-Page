"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import DiagnosticModal from "@/components/DiagnosticModal";

interface LeaderboardRecord {
  rank: number;
  name: string;
  score: number;
  badge: string;
  goal: string;
  date: string;
}

interface LeaderboardData {
  allTime: LeaderboardRecord[];
  thisMonth: LeaderboardRecord[];
  currentMonthName: string;
}

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<"thisMonth" | "allTime">("thisMonth");
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEmbedded, setIsEmbedded] = useState(false);

  useEffect(() => {
    // Check if loaded inside an iframe (like Mighty Networks) or has embed param
    try {
      const isIframe = typeof window !== "undefined" && window.self !== window.top;
      const urlParams = new URLSearchParams(window.location.search);
      if (isIframe || urlParams.get("embed") === "true") {
        setIsEmbedded(true);
      }
    } catch {
      // Security restrictions might trigger errors, fallback to true if inside iframe
      setIsEmbedded(true);
    }

    async function fetchLeaderboard() {
      try {
        const response = await fetch("/api/leaderboard");
        if (!response.ok) {
          throw new Error("Failed to fetch scores");
        }
        const json = await response.json();
        setData(json);
      } catch (err) {
        console.error("Error loading leaderboard:", err);
        setError("Unable to load leaderboard. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    fetchLeaderboard();
  }, []);

  // Determine active records
  const activeRecords = data ? (activeTab === "thisMonth" ? data.thisMonth : data.allTime) : [];
  const currentMonthName = data ? data.currentMonthName : new Date().toLocaleString("en-US", { month: "long" });

  // Separate top 3 and runner-ups (ranks 4 to 10)
  const podiumRecords = activeRecords.slice(0, 3);
  const tableRecords = activeRecords.slice(3);

  // Pad podium for structural mapping (2nd, 1st, 3rd)
  // We want to map: Left Column = 2nd Place, Middle Column = 1st Place, Right Column = 3rd Place
  const firstPlace = podiumRecords.find(r => r.rank === 1);
  const secondPlace = podiumRecords.find(r => r.rank === 2);
  const thirdPlace = podiumRecords.find(r => r.rank === 3);

  return (
    <>
      <div className="min-h-screen bg-[#040D1A] text-slate-100 flex flex-col font-sans transition-colors duration-300">
        
        {/* GLOBAL EMBEDDING STYLES OVERRIDE */}
        <style jsx global>{`
          body {
            background-color: #040D1A !important;
            overflow-x: hidden;
          }
        `}</style>

        {/* ── HEADER (Hidden in Embedded/Mighty Networks Mode) ────────────────── */}
        {!isEmbedded && (
          <header className="w-full shadow-md" style={{ backgroundColor: "#0A4367" }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-center items-center h-24">
              <Image
                src="/Logo Version A White - Recal_no background_small.png"
                alt="Recal Logo"
                width={160}
                height={80}
                className="h-16 w-auto"
                priority
              />
            </div>
          </header>
        )}

        {/* ── MAIN DASHBOARD CONTAINER ────────────────────────────────────────── */}
        <main className={`flex-1 flex flex-col items-center justify-start ${isEmbedded ? "p-3 md:p-6" : "py-12 px-4 sm:px-6 lg:px-8"}`}>
          
          <div className="w-full max-w-4xl flex flex-col items-center space-y-8">
            
            {/* ── HEADER BANNER ── */}
            <div className="text-center space-y-3">
              <p className="text-xs uppercase tracking-[0.3em] font-extrabold text-[#4A90A4]">
                Recal Breath Index
              </p>
              <h1 
                className="text-4xl md:text-5xl font-extrabold tracking-tight italic text-white"
                style={{ 
                  fontFamily: "Rogue Sans Ext, sans-serif" 
                }}
              >
                🏆 ATHLETE LEADERBOARD
              </h1>
              <p className="text-sm font-semibold text-slate-300 max-w-lg mx-auto leading-relaxed">
                Celebrating the top oxygen-efficient climbers. Your Breath Index (RBI) determines your score.
              </p>
            </div>

            {/* ── DUAL TAB TOGGLE CONTROL ── */}
            <div className="relative z-10 p-1.5 rounded-full flex bg-[#06152B] border border-[#A2C2C7]/30 shadow-inner max-w-sm w-full mx-auto">
              <button
                onClick={() => setActiveTab("thisMonth")}
                className={`flex-1 py-2.5 text-xs md:text-sm font-extrabold rounded-full tracking-wide transition-all duration-300 cursor-pointer ${
                  activeTab === "thisMonth"
                    ? "bg-[#0A4367] text-white shadow-[0_0_12px_rgba(162,194,199,0.3)] border border-[#A2C2C7]/50"
                    : "text-[#A2C2C7]/80 hover:text-white hover:bg-white/5"
                }`}
              >
                📅 {currentMonthName}
              </button>
              <button
                onClick={() => setActiveTab("allTime")}
                className={`flex-1 py-2.5 text-xs md:text-sm font-extrabold rounded-full tracking-wide transition-all duration-300 cursor-pointer ${
                  activeTab === "allTime"
                    ? "bg-[#0A4367] text-white shadow-[0_0_12px_rgba(162,194,199,0.3)] border border-[#A2C2C7]/50"
                    : "text-[#A2C2C7]/80 hover:text-white hover:bg-white/5"
                }`}
              >
                🌎 All-Time Legends
              </button>
            </div>

            {/* ── LOADER SKELETON ── */}
            {loading && (
              <div className="w-full space-y-8 animate-pulse">
                {/* Podiums Skeleton */}
                <div className="grid grid-cols-3 gap-3 md:gap-6 items-end max-w-xl mx-auto pt-10 h-72">
                  <div className="bg-white/5 rounded-2xl h-36 border border-white/5"></div>
                  <div className="bg-white/5 rounded-2xl h-48 border border-white/5"></div>
                  <div className="bg-white/5 rounded-2xl h-28 border border-white/5"></div>
                </div>
                {/* List Skeleton */}
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-16 bg-white/5 rounded-xl border border-white/5"></div>
                  ))}
                </div>
              </div>
            )}

            {/* ── ERROR VIEW ── */}
            {error && (
              <div className="w-full text-center py-12 rounded-2xl border border-red-500/20 bg-red-950/20 p-6">
                <p className="text-red-400 font-semibold">{error}</p>
              </div>
            )}

            {/* ── MAIN CONTENT RENDER (Loaded & No Errors) ── */}
            {!loading && !error && (
              <div className="w-full space-y-10">
                
                {/* EMPTY STATE */}
                {activeRecords.length === 0 ? (
                  <div className="w-full text-center py-16 rounded-2xl border border-[#A2C2C7]/10 bg-white/5 backdrop-blur-md p-8">
                    <p className="text-lg text-slate-400 font-medium">
                      No climbers recorded in this category yet.
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                      Be the first to secure a spot by completing your assessment below!
                    </p>
                  </div>
                ) : (
                  <>
                    {/* 🏆 PODIUMS GRID (TOP 3) 🏆 */}
                    <div className="grid grid-cols-3 gap-3 md:gap-6 items-end max-w-2xl mx-auto pt-8 select-none">
                      
                      {/* 🥈 2ND PLACE PODIUM (Left) */}
                      <div className="flex flex-col items-center space-y-3">
                        {secondPlace ? (
                          <>
                            <span className="text-xs md:text-sm font-bold text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-700/50">
                              {secondPlace.score} RBI
                            </span>
                            <div className="w-full bg-white/5 backdrop-blur-md border border-slate-300/20 rounded-t-2xl shadow-[0_0_15px_rgba(203,213,225,0.06)] p-3 md:p-4 text-center h-32 md:h-40 flex flex-col justify-between items-center transition-all duration-300 hover:border-slate-300/40">
                              <div className="text-2xl md:text-3xl">🥈</div>
                              <div className="space-y-1">
                                <p className="text-xs md:text-sm font-bold text-slate-200 truncate max-w-[80px] md:max-w-[120px]">
                                  {secondPlace.name}
                                </p>
                                <p className="text-[9px] md:text-[10px] text-slate-400 uppercase tracking-widest truncate max-w-[80px] md:max-w-[120px]">
                                  {secondPlace.badge.replace("-Ready", "")}
                                </p>
                              </div>
                              <div className="text-[10px] font-extrabold text-[#4A90A4] tracking-widest">
                                2ND
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="w-full bg-white/2 backdrop-blur-sm border border-white/5 rounded-t-2xl h-24 flex items-center justify-center">
                            <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider text-center">Open Slot</span>
                          </div>
                        )}
                      </div>

                      {/* 👑 🥇 1ST PLACE PODIUM (Middle - Tallest & Glowing) */}
                      <div className="flex flex-col items-center space-y-3 relative z-10">
                        {firstPlace ? (
                          <>
                            <div className="absolute -top-6 text-xl animate-bounce">👑</div>
                            <span className="text-xs md:text-sm font-black text-yellow-400 bg-yellow-950/80 px-3 py-0.5 rounded-full border border-yellow-500/50 shadow-[0_0_8px_rgba(234,179,8,0.3)]">
                              {firstPlace.score} RBI
                            </span>
                            <div className="w-full bg-white/10 backdrop-blur-xl border border-yellow-400/40 rounded-t-2xl shadow-[0_0_20px_rgba(234,179,8,0.12)] p-4 text-center h-40 md:h-48 flex flex-col justify-between items-center transition-all duration-300 hover:border-yellow-400/60">
                              <div className="text-3xl md:text-4xl">🥇</div>
                              <div className="space-y-1">
                                <p className="text-sm md:text-base font-black text-yellow-100 truncate max-w-[90px] md:max-w-[140px]">
                                  {firstPlace.name}
                                </p>
                                <p className="text-[9px] md:text-[10px] text-yellow-400/80 uppercase font-bold tracking-widest truncate max-w-[90px] md:max-w-[140px]">
                                  {firstPlace.badge.replace("-Ready", "")}
                                </p>
                              </div>
                              <div className="text-[10px] font-black text-yellow-400 tracking-widest">
                                CHAMPION
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="w-full bg-white/2 backdrop-blur-sm border border-white/5 rounded-t-2xl h-32 flex items-center justify-center">
                            <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider text-center">Open Slot</span>
                          </div>
                        )}
                      </div>

                      {/* 🥉 3RD PLACE PODIUM (Right) */}
                      <div className="flex flex-col items-center space-y-3">
                        {thirdPlace ? (
                          <>
                            <span className="text-xs md:text-sm font-bold text-amber-500 bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-600/50">
                              {thirdPlace.score} RBI
                            </span>
                            <div className="w-full bg-white/5 backdrop-blur-md border border-amber-600/20 rounded-t-2xl shadow-[0_0_15px_rgba(180,83,9,0.06)] p-3 md:p-4 text-center h-28 md:h-34 flex flex-col justify-between items-center transition-all duration-300 hover:border-amber-600/40">
                              <div className="text-2xl md:text-3xl">🥉</div>
                              <div className="space-y-1">
                                <p className="text-xs md:text-sm font-bold text-slate-200 truncate max-w-[80px] md:max-w-[120px]">
                                  {thirdPlace.name}
                                </p>
                                <p className="text-[9px] md:text-[10px] text-slate-400 uppercase tracking-widest truncate max-w-[80px] md:max-w-[120px]">
                                  {thirdPlace.badge.replace("-Ready", "")}
                                </p>
                              </div>
                              <div className="text-[10px] font-extrabold text-amber-500 tracking-widest">
                                3RD
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="w-full bg-white/2 backdrop-blur-sm border border-white/5 rounded-t-2xl h-20 flex items-center justify-center">
                            <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider text-center">Open Slot</span>
                          </div>
                        )}
                      </div>

                    </div>

                    {/* 📋 TABLE GRID PANEL (RANKS 4 TO 10) 📋 */}
                    {tableRecords.length > 0 && (
                      <div className="space-y-3.5">
                        {tableRecords.map((record) => (
                          <div 
                            key={record.rank}
                            className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/5 backdrop-blur-md transition-all duration-200 hover:bg-white/10 hover:border-white/10"
                          >
                            {/* Left Info: Rank, Name, Goal */}
                            <div className="flex items-center space-x-4 min-w-0">
                              <span className="w-6 text-center text-sm md:text-base font-extrabold text-slate-400">
                                {record.rank}
                              </span>
                              <div className="min-w-0">
                                <p className="text-sm md:text-base font-bold text-slate-200 truncate">
                                  {record.name}
                                </p>
                                <p className="text-[10px] md:text-xs text-slate-400 truncate max-w-[180px] sm:max-w-[320px]">
                                  🎯 {record.goal}
                                </p>
                              </div>
                            </div>

                            {/* Right Info: Score & Badge */}
                            <div className="text-right flex-shrink-0 flex items-center space-x-4">
                              <div className="hidden sm:block">
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-slate-800 text-slate-300 border border-slate-700">
                                  {record.badge}
                                </span>
                              </div>
                              <div>
                                <span className="text-base md:text-lg font-black text-[#A2C2C7]">
                                  {record.score}
                                </span>
                                <span className="text-[10px] md:text-xs font-bold text-slate-400 ml-1">
                                  RBI
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* ── CALL TO ACTION PROMPT PANEL ── */}
                <div className="rounded-2xl border border-[#A2C2C7]/20 bg-[#0A4367]/20 backdrop-blur-xl p-6 md:p-8 text-center space-y-5 shadow-lg">
                  <div className="space-y-2">
                    <h3 
                      className="text-xl md:text-2xl font-bold italic text-white"
                      style={{ fontFamily: "Rogue Sans Ext, sans-serif" }}
                    >
                      📈 TEST YOUR OXYGEN LIMITS
                    </h3>
                    <p className="text-xs md:text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
                      Can you out-breathe the top mountaineers? Take the 5-Minute Breath Index (RBI) Assessment to benchmark your endurance and log your spot on the Leaderboard.
                    </p>
                  </div>
                  
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="inline-flex items-center justify-center px-8 py-3.5 rounded-xl font-extrabold text-white bg-[#0A4367] hover:bg-[#0A4367]/80 hover:scale-[1.02] transform transition-all duration-300 shadow-md border border-[#A2C2C7]/30 tracking-wider text-sm cursor-pointer"
                    style={{ fontFamily: "Rogue Sans Ext, sans-serif", fontStyle: "italic" }}
                  >
                    Start My Assessment &rarr;
                  </button>
                </div>

              </div>
            )}

          </div>
        </main>

        {/* ── FOOTER (Hidden in Embedded/Mighty Networks Mode) ────────────────── */}
        {!isEmbedded && (
          <footer className="bg-white py-8 border-t border-slate-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <p className="text-xs text-slate-400">
                © 2026 Recal Training. All Rights Reserved.
              </p>
            </div>
          </footer>
        )}

      </div>

      {/* ── DIAGNOSTIC ASSESSMENT MODAL ── */}
      <DiagnosticModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialLead={null}
      />
    </>
  );
}
