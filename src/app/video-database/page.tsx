/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { RecalVideoRecord } from "@/lib/supabase";
import { classifyVideo } from "@/lib/video-sync/classifier";

interface VideoStats {
  total: number;
  youtube: number;
  drive: number;
  unlisted: number;
  public: number;
  private: number;
  live: number;
  totalDurationSeconds: number;
  totalFileSizeBytes: number;
  totalViews: number;
}

interface ApiResponse {
  videos: RecalVideoRecord[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
  stats: VideoStats;
}

export default function VideoDatabasePage() {
  const [videos, setVideos] = useState<RecalVideoRecord[]>([]);
  const [stats, setStats] = useState<VideoStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncProgress, setSyncProgress] = useState<string>("");
  const [syncMessage, setSyncMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Auth / Connection state
  const [youtubeConnected, setYoutubeConnected] = useState<boolean>(false);
  const [channelTitle, setChannelTitle] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState<string>("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [privacyFilter, setPrivacyFilter] = useState<string>("all");
  const [durationFilter, setDurationFilter] = useState<string>("all");
  const [liveFilter, setLiveFilter] = useState<string>("all");
  const [orientationFilter, setOrientationFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [starredOnly, setStarredOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>("newest");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(50);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);

  // Editorial Favorites & Notes (persisted locally)
  const [starredMap, setStarredMap] = useState<Record<string, boolean>>({});
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});
  const [drawerNote, setDrawerNote] = useState<string>("");

  // Inspector Drawer
  const [selectedVideo, setSelectedVideo] = useState<RecalVideoRecord | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load Starred and Notes from localStorage
  useEffect(() => {
    try {
      const savedStars = localStorage.getItem("recal_starred_videos");
      if (savedStars) setStarredMap(JSON.parse(savedStars));
      const savedNotes = localStorage.getItem("recal_video_notes");
      if (savedNotes) setNotesMap(JSON.parse(savedNotes));
    } catch {
      // Ignore localStorage issues
    }
  }, []);

  // Check sync & auth status
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/video-database/sync");
      if (res.ok) {
        const data = await res.json();
        setYoutubeConnected(data.youtubeConnected);
        setChannelTitle(data.channelTitle);
        setLastSyncedAt(data.lastSyncedAt);
      }
    } catch (err) {
      console.error("Error fetching sync status:", err);
    }
  }, []);

  // Fetch videos with current filters
  const fetchVideos = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search,
        source: sourceFilter,
        privacy: privacyFilter,
        duration: durationFilter,
        is_live: liveFilter,
        sort: sortBy,
        page: page.toString(),
        limit: limit.toString(),
      });

      const res = await fetch(`/api/video-database?${params.toString()}`);
      if (res.ok) {
        const data: ApiResponse = await res.json();
        setVideos(data.videos || []);
        setStats(data.stats);
        setTotalPages(data.pagination.totalPages);
        setTotalItems(data.pagination.totalItems);
      }
    } catch (err) {
      console.error("Error loading videos:", err);
    } finally {
      setLoading(false);
    }
  }, [search, sourceFilter, privacyFilter, durationFilter, liveFilter, sortBy, page, limit]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchVideos();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchVideos]);

  // Handle URL auth params
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("auth") === "success") {
        setSyncMessage({
          type: "success",
          text: `YouTube Studio connected successfully! ${urlParams.get("channel") ? `(${urlParams.get("channel")})` : ""}`,
        });
        fetchStatus();
        fetchVideos();
      } else if (urlParams.get("error")) {
        setSyncMessage({
          type: "error",
          text: `YouTube Authorization error: ${urlParams.get("error")}`,
        });
      }
    }
  }, [fetchStatus, fetchVideos]);

  // Disconnect YouTube Handler
  const handleDisconnectYouTube = async () => {
    if (!confirm("Are you sure you want to disconnect this YouTube account? You can then reconnect with Anthony's owner account.")) {
      return;
    }
    try {
      const res = await fetch("/api/video-database/auth/disconnect", { method: "POST" });
      if (res.ok) {
        setYoutubeConnected(false);
        setChannelTitle(null);
        setSyncMessage({
          type: "success",
          text: "YouTube account disconnected. You can now connect Anthony's channel owner account.",
        });
        await fetchStatus();
      }
    } catch (err) {
      console.error("Failed to disconnect YouTube:", err);
    }
  };

  // Toggle Star / Favorite
  const toggleStar = (sourceId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setStarredMap((prev) => {
      const updated = { ...prev, [sourceId]: !prev[sourceId] };
      try {
        localStorage.setItem("recal_starred_videos", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Save Editorial Note
  const saveNote = (sourceId: string, text: string) => {
    setNotesMap((prev) => {
      const updated = { ...prev, [sourceId]: text };
      try {
        localStorage.setItem("recal_video_notes", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Update Drawer Note when selected video changes
  useEffect(() => {
    if (selectedVideo) {
      setDrawerNote(notesMap[selectedVideo.source_id] || "");
    }
  }, [selectedVideo, notesMap]);

  // Filter videos locally by Orientation & Category & Starred
  const displayedVideos = useMemo(() => {
    return videos.filter((video) => {
      const classification = classifyVideo(video.title, video.folder_path || "", video.duration_seconds);

      if (orientationFilter !== "all" && classification.orientation !== orientationFilter) {
        return false;
      }
      if (categoryFilter !== "all" && classification.category !== categoryFilter) {
        return false;
      }
      if (starredOnly && !starredMap[video.source_id]) {
        return false;
      }
      return true;
    });
  }, [videos, orientationFilter, categoryFilter, starredOnly, starredMap]);

  // Trigger Live Full Sync
  const handleTriggerSync = async () => {
    setSyncing(true);
    setSyncProgress("Initializing deep scan of Google Drive & YouTube...");
    setSyncMessage(null);

    try {
      const res = await fetch("/api/video-database/sync", { method: "POST" });
      const data = await res.json();

      if (res.ok && data.success) {
        const report = data.report;
        const driveCount = report.drive.totalVideos;
        const ytCount = report.youtube.totalVideos;
        setSyncMessage({
          type: "success",
          text: `Sync completed! Discovered ${driveCount} Google Drive videos and ${ytCount} YouTube videos in ${(report.durationMs / 1000).toFixed(1)}s.`,
        });
        await fetchStatus();
        await fetchVideos();
      } else {
        setSyncMessage({
          type: "error",
          text: `Sync error: ${data.error || data.report?.drive?.error || "Unknown error"}`,
        });
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Sync failed";
      setSyncMessage({
        type: "error",
        text: `Sync request failed: ${errorMsg}`,
      });
    } finally {
      setSyncing(false);
      setSyncProgress("");
    }
  };

  // Copy to clipboard helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Export filtered dataset to CSV
  const handleExportCsv = () => {
    if (displayedVideos.length === 0) return;
    const headers = [
      "Title",
      "Source",
      "Orientation",
      "Content Category",
      "Is Starred",
      "Editorial Notes",
      "Privacy Status",
      "Runtime",
      "Runtime (Seconds)",
      "File Size",
      "Views",
      "Folder Path",
      "Direct URL",
      "Date",
    ];

    const rows = displayedVideos.map((v) => {
      const cls = classifyVideo(v.title, v.folder_path || "", v.duration_seconds);
      const isStarred = Boolean(starredMap[v.source_id]);
      const note = (notesMap[v.source_id] || "").replace(/"/g, '""');

      return [
        `"${(v.title || "").replace(/"/g, '""')}"`,
        v.source,
        cls.orientation,
        cls.category,
        isStarred ? "Yes" : "No",
        `"${note}"`,
        v.privacy_status,
        v.duration_formatted || "",
        v.duration_seconds || 0,
        v.file_size_formatted || "",
        v.view_count || 0,
        `"${(v.folder_path || "").replace(/"/g, '""')}"`,
        v.direct_url,
        v.published_at || v.created_at || "",
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `recal_content_calendar_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Formatted hours helper
  const totalHoursString = useMemo(() => {
    if (!stats || !stats.totalDurationSeconds) return "0 hrs";
    const hrs = (stats.totalDurationSeconds / 3600).toFixed(1);
    return `${hrs} hrs`;
  }, [stats]);

  const totalStorageString = useMemo(() => {
    if (!stats || !stats.totalFileSizeBytes) return "0 GB";
    const gb = (stats.totalFileSizeBytes / (1024 * 1024 * 1024)).toFixed(1);
    return `${gb} GB`;
  }, [stats]);

  return (
    <div className="min-h-screen bg-[#0B0F17] text-[#E2E8F0] font-sans antialiased">
      {/* Top Bar / Navigation Header */}
      <header className="border-b border-[#1E293B] bg-[#0E1526]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <Link href="/" className="flex items-center hover:opacity-90 transition">
              <img
                src="/recal-logo-white.png"
                alt="Recal"
                className="h-8 sm:h-9 w-auto object-contain"
              />
            </Link>
            <div className="h-7 w-px bg-[#1E293B] hidden sm:block"></div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white">Video Database</h1>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Content Creator Studio
                </span>
              </div>
              <p className="text-xs text-[#94A3B8]">
                Unified lookup catalog for content calendar planning, repurposing, and asset management
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* YouTube Auth Badge / Button & Disconnect */}
            {youtubeConnected ? (
              <div className="flex items-center gap-1.5 bg-[#131B2E] border border-[#1E293B] rounded-lg p-1">
                <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-emerald-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  YouTube: {channelTitle || "Connected"}
                </div>
                <button
                  onClick={handleDisconnectYouTube}
                  className="px-2 py-1 rounded hover:bg-rose-950/40 text-[11px] text-rose-400 hover:text-rose-300 transition"
                  title="Disconnect and switch account"
                >
                  ✕ Disconnect
                </button>
              </div>
            ) : (
              <a
                href="/api/video-database/auth/login"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-xs text-red-400 font-medium transition"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
                Connect YouTube Studio
              </a>
            )}

            {/* Export CSV */}
            <button
              onClick={handleExportCsv}
              disabled={displayedVideos.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1E293B] hover:bg-[#334155] border border-[#334155] text-xs text-[#E2E8F0] font-medium transition disabled:opacity-50"
              title="Export filtered content calendar to CSV"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export CSV
            </button>

            {/* Sync Now Button & Last Synced */}
            <div className="flex items-center gap-2">
              {lastSyncedAt && (
                <span className="text-[11px] text-[#64748B] hidden xl:inline">
                  Last synced: {new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              <button
                onClick={handleTriggerSync}
                disabled={syncing}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-md shadow-blue-500/25 transition disabled:opacity-60 cursor-pointer"
              >
                <svg
                  className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {syncing ? "Syncing..." : "Sync Database Now"}
              </button>
            </div>
          </div>
        </div>

        {/* Sync Progress / Feedback Banner */}
        {syncMessage && (
          <div
            className={`border-t px-4 py-2 text-xs flex items-center justify-between ${
              syncMessage.type === "success"
                ? "bg-emerald-950/40 border-emerald-800/40 text-emerald-300"
                : "bg-rose-950/40 border-rose-800/40 text-rose-300"
            }`}
          >
            <span>{syncMessage.text}</span>
            <button onClick={() => setSyncMessage(null)} className="text-xs opacity-75 hover:opacity-100">
              ✕
            </button>
          </div>
        )}
        {syncing && syncProgress && (
          <div className="border-t border-blue-900/40 bg-blue-950/30 px-4 py-2 text-xs text-blue-300 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
            {syncProgress}
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* KPI Summary Cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Total Videos */}
            <div className="bg-[#131B2E] border border-[#1E293B] rounded-xl p-4 shadow-sm">
              <span className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider block">Total Videos</span>
              <span className="text-2xl font-bold text-white mt-1 block">{stats.total.toLocaleString()}</span>
              <span className="text-[11px] text-[#64748B] mt-0.5 block">Exact verified assets</span>
            </div>

            {/* Google Drive Raw */}
            <div className="bg-[#131B2E] border border-[#1E293B] rounded-xl p-4 shadow-sm">
              <span className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider block">Google Drive</span>
              <span className="text-2xl font-bold text-amber-400 mt-1 block">{stats.drive.toLocaleString()}</span>
              <span className="text-[11px] text-[#64748B] mt-0.5 block">In Recal Marketing</span>
            </div>

            {/* YouTube Videos */}
            <div className="bg-[#131B2E] border border-[#1E293B] rounded-xl p-4 shadow-sm">
              <span className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider block">YouTube Studio</span>
              <span className="text-2xl font-bold text-red-400 mt-1 block">{stats.youtube.toLocaleString()}</span>
              <span className="text-[11px] text-[#64748B] mt-0.5 block">All channel uploads</span>
            </div>

            {/* Unlisted Videos */}
            <div className="bg-[#131B2E] border border-[#1E293B] rounded-xl p-4 shadow-sm">
              <span className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider block">Unlisted Assets</span>
              <span className="text-2xl font-bold text-sky-400 mt-1 block">{stats.unlisted.toLocaleString()}</span>
              <span className="text-[11px] text-[#64748B] mt-0.5 block">
                {stats.total > 0 ? `${Math.round((stats.unlisted / stats.total) * 100)}% of library` : "0%"}
              </span>
            </div>

            {/* Total Duration Footage */}
            <div className="bg-[#131B2E] border border-[#1E293B] rounded-xl p-4 shadow-sm">
              <span className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider block">Total Runtime</span>
              <span className="text-2xl font-bold text-indigo-400 mt-1 block">{totalHoursString}</span>
              <span className="text-[11px] text-[#64748B] mt-0.5 block">Recorded footage</span>
            </div>

            {/* Drive Storage */}
            <div className="bg-[#131B2E] border border-[#1E293B] rounded-xl p-4 shadow-sm">
              <span className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider block">Drive Storage</span>
              <span className="text-2xl font-bold text-emerald-400 mt-1 block">{totalStorageString}</span>
              <span className="text-[11px] text-[#64748B] mt-0.5 block">Video footprint</span>
            </div>
          </div>
        )}

        {/* Filter and Search Bar */}
        <div className="bg-[#131B2E] border border-[#1E293B] rounded-xl p-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#64748B]">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by title, folder path (e.g. 'Kilimanjaro', 'Webinars'), or keywords..."
                className="w-full pl-10 pr-10 py-2 bg-[#0B0F17] border border-[#1E293B] rounded-lg text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              />
              {search && (
                <button
                  onClick={() => {
                    setSearch("");
                    setPage(1);
                  }}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#64748B] hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Source Tab Toggle & Starred Filter */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setStarredOnly(!starredOnly)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition ${
                  starredOnly
                    ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                    : "bg-[#0B0F17] text-[#94A3B8] border-[#1E293B] hover:text-white"
                }`}
                title="Filter by starred/favorite assets"
              >
                <span>⭐</span>
                <span>Favorites</span>
              </button>

              <div className="flex items-center bg-[#0B0F17] border border-[#1E293B] rounded-lg p-1 text-xs font-medium">
                <button
                  onClick={() => {
                    setSourceFilter("all");
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-md transition ${
                    sourceFilter === "all" ? "bg-blue-600 text-white font-semibold" : "text-[#94A3B8] hover:text-white"
                  }`}
                >
                  All Sources
                </button>
                <button
                  onClick={() => {
                    setSourceFilter("gdrive");
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${
                    sourceFilter === "gdrive" ? "bg-amber-600 text-white font-semibold" : "text-[#94A3B8] hover:text-white"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  Drive
                </button>
                <button
                  onClick={() => {
                    setSourceFilter("youtube");
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${
                    sourceFilter === "youtube" ? "bg-red-600 text-white font-semibold" : "text-[#94A3B8] hover:text-white"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-red-400"></span>
                  YouTube
                </button>
              </div>

              {/* View Mode Switcher */}
              <div className="flex items-center bg-[#0B0F17] border border-[#1E293B] rounded-lg p-1 text-xs">
                <button
                  onClick={() => setViewMode("table")}
                  className={`p-1.5 rounded-md ${viewMode === "table" ? "bg-[#1E293B] text-white" : "text-[#64748B] hover:text-white"}`}
                  title="Table View (Content Calendar Lookup)"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M3 6h18M3 18h18" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-md ${viewMode === "grid" ? "bg-[#1E293B] text-white" : "text-[#64748B] hover:text-white"}`}
                  title="Grid / Card View"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Superpower Content Creator Filters */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2 border-t border-[#1E293B]/60 text-xs">
            {/* Orientation Filter */}
            <div>
              <label className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider mb-1 block">Format / Ratio</label>
              <select
                value={orientationFilter}
                onChange={(e) => setOrientationFilter(e.target.value)}
                className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Formats</option>
                <option value="vertical">📱 9:16 Vertical (Shorts/Reels)</option>
                <option value="horizontal">🖥️ 16:9 Landscape (YouTube)</option>
              </select>
            </div>

            {/* Content Category Filter */}
            <div>
              <label className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider mb-1 block">Content Pillar</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Pillars</option>
                <option value="webinar">🟣 Webinars &amp; Q&amp;As</option>
                <option value="ad">🟠 Paid Social Ads</option>
                <option value="final_cut">🟢 Finished Master Cuts</option>
                <option value="raw_footage">🟡 Raw Camera Footage</option>
                <option value="campaign">🏔️ Expedition Campaigns</option>
              </select>
            </div>

            {/* Privacy Filter */}
            <div>
              <label className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider mb-1 block">Visibility</label>
              <select
                value={privacyFilter}
                onChange={(e) => {
                  setPrivacyFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Visibility</option>
                <option value="unlisted">Unlisted Only</option>
                <option value="public">Public Only</option>
                <option value="private">Private Only</option>
              </select>
            </div>

            {/* Duration Filter */}
            <div>
              <label className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider mb-1 block">Runtime</label>
              <select
                value={durationFilter}
                onChange={(e) => {
                  setDurationFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">Any Duration</option>
                <option value="short">&lt; 1 min (Shorts/Reels)</option>
                <option value="medium">1 - 20 mins (Standard)</option>
                <option value="long">20 - 60 mins (Episodes)</option>
                <option value="extended">60+ mins (Webinars/Q&amp;A)</option>
              </select>
            </div>

            {/* Live Status Filter */}
            <div>
              <label className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider mb-1 block">Broadcast Type</label>
              <select
                value={liveFilter}
                onChange={(e) => {
                  setLiveFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Types</option>
                <option value="true">Live Streams Only</option>
                <option value="false">Standard Uploads</option>
              </select>
            </div>

            {/* Sort Filter */}
            <div>
              <label className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider mb-1 block">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="duration_desc">Longest Runtime</option>
                <option value="duration_asc">Shortest Runtime</option>
                <option value="size_desc">Largest File Size</option>
                <option value="views_desc">Most Views</option>
                <option value="title_asc">Title (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Video Catalog View */}
        {loading ? (
          <div className="bg-[#131B2E] border border-[#1E293B] rounded-xl p-12 text-center space-y-3">
            <div className="inline-block w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-[#94A3B8]">Loading video assets from database...</p>
          </div>
        ) : displayedVideos.length === 0 ? (
          <div className="bg-[#131B2E] border border-[#1E293B] rounded-xl p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-400 mx-auto flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">No matching video records</h3>
              <p className="text-xs text-[#94A3B8] max-w-md mx-auto mt-1">
                No videos match your active filter criteria. Try adjusting the search or filters.
              </p>
            </div>
          </div>
        ) : viewMode === "table" ? (
          /* Table View */
          <div className="bg-[#131B2E] border border-[#1E293B] rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0E1526] text-[#94A3B8] uppercase text-[10px] tracking-wider border-b border-[#1E293B]">
                  <tr>
                    <th className="py-3 px-3 w-8">Fav</th>
                    <th className="py-3 px-4">Video Asset &amp; Location</th>
                    <th className="py-3 px-3">Format / Pillar</th>
                    <th className="py-3 px-3">Visibility</th>
                    <th className="py-3 px-3">Runtime</th>
                    <th className="py-3 px-3">Size / Views</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E293B]/70">
                  {displayedVideos.map((video) => {
                    const cls = classifyVideo(video.title, video.folder_path || "", video.duration_seconds);
                    const isStarred = Boolean(starredMap[video.source_id]);
                    const hasNote = Boolean(notesMap[video.source_id]);

                    return (
                      <tr
                        key={video.source_id}
                        onClick={() => setSelectedVideo(video)}
                        className="hover:bg-[#1E293B]/50 transition cursor-pointer group"
                      >
                        {/* Star Favorite Button */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <button
                            onClick={(e) => toggleStar(video.source_id, e)}
                            className="text-sm opacity-60 hover:opacity-100 hover:scale-125 transition"
                            title={isStarred ? "Remove from Favorites" : "Add to Favorites"}
                          >
                            {isStarred ? "⭐" : "☆"}
                          </button>
                        </td>

                        {/* Title & Folder Path */}
                        <td className="py-3 px-4 max-w-md">
                          <div className="flex items-start gap-3">
                            {/* Thumbnail / Platform Icon */}
                            <div className="w-12 h-8 rounded bg-[#0B0F17] border border-[#1E293B] flex-shrink-0 overflow-hidden flex items-center justify-center relative">
                              {video.thumbnail_url ? (
                                <img
                                  src={video.thumbnail_url}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-[10px] text-[#64748B]">
                                  {video.source === "youtube" ? "▶" : "📁"}
                                </span>
                              )}
                              {video.is_live && (
                                <span className="absolute bottom-0 right-0 px-1 bg-red-600 text-[8px] font-bold text-white uppercase rounded-tl">
                                  LIVE
                                </span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <span className="font-semibold text-white group-hover:text-blue-400 transition truncate block flex items-center gap-1.5">
                                {video.title}
                                {hasNote && (
                                  <span className="text-[9px] px-1 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 font-normal">
                                    📝 Note
                                  </span>
                                )}
                              </span>
                              <span className="text-[11px] text-[#64748B] truncate block flex items-center gap-1 mt-0.5">
                                <span className="opacity-75">📍</span>
                                {video.folder_path || "Recal Media"}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Format & Pillar Badges */}
                        <td className="py-3 px-3 whitespace-nowrap space-y-1">
                          <div className="flex items-center gap-1 flex-wrap">
                            {/* Orientation */}
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                              cls.orientation === 'vertical'
                                ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                : 'bg-slate-500/10 text-slate-300 border-slate-500/20'
                            }`}>
                              {cls.orientation === 'vertical' ? '📱 9:16' : '🖥️ 16:9'}
                            </span>

                            {/* Content Category */}
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${cls.categoryColor}`}>
                              {cls.categoryLabel}
                            </span>
                          </div>
                        </td>

                        {/* Visibility / Privacy */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          {video.privacy_status === "unlisted" && (
                            <span className="px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[11px] font-medium">
                              Unlisted
                            </span>
                          )}
                          {video.privacy_status === "public" && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-medium">
                              Public
                            </span>
                          )}
                          {video.privacy_status === "private" && (
                            <span className="px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20 text-[11px] font-medium">
                              Private
                            </span>
                          )}
                        </td>

                        {/* Runtime */}
                        <td className="py-3 px-3 whitespace-nowrap font-mono text-xs text-[#CBD5E1]">
                          {video.duration_formatted || `${video.duration_seconds}s`}
                        </td>

                        {/* Size / Views */}
                        <td className="py-3 px-3 whitespace-nowrap text-[#CBD5E1]">
                          {video.source === "youtube" ? (
                            <span>{(video.view_count || 0).toLocaleString()} views</span>
                          ) : (
                            <span>{video.file_size_formatted || "—"}</span>
                          )}
                        </td>

                        {/* Date */}
                        <td className="py-3 px-3 whitespace-nowrap text-[#64748B] text-[11px]">
                          {video.published_at ? new Date(video.published_at).toLocaleDateString() : "—"}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <a
                              href={video.direct_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-md hover:bg-[#334155] text-[#94A3B8] hover:text-white transition"
                              title="Open video in new tab"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                            <button
                              onClick={() => handleCopy(video.direct_url, video.source_id)}
                              className="p-1.5 rounded-md hover:bg-[#334155] text-[#94A3B8] hover:text-white transition"
                              title="Copy Direct URL"
                            >
                              {copiedId === video.source_id ? (
                                <span className="text-emerald-400 text-[10px] font-bold">✓</span>
                              ) : (
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Toolbar */}
            <div className="border-t border-[#1E293B] px-4 py-3 bg-[#0E1526] flex items-center justify-between text-xs text-[#94A3B8]">
              <div className="flex items-center gap-3">
                <div>
                  Showing <span className="text-white font-medium">{(page - 1) * limit + 1}</span> to{" "}
                  <span className="text-white font-medium">{Math.min(page * limit, totalItems)}</span> of{" "}
                  <span className="text-white font-medium">{totalItems.toLocaleString()}</span> videos
                </div>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="bg-[#0B0F17] border border-[#1E293B] rounded px-2 py-0.5 text-[11px] text-[#CBD5E1]"
                >
                  <option value={25}>25 / page</option>
                  <option value={50}>50 / page</option>
                  <option value={100}>100 / page</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-2.5 py-1 rounded bg-[#1E293B] hover:bg-[#334155] text-white disabled:opacity-40 transition"
                >
                  Previous
                </button>
                <span>
                  Page <span className="text-white font-semibold">{page}</span> of{" "}
                  <span className="text-white font-semibold">{totalPages}</span>
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-2.5 py-1 rounded bg-[#1E293B] hover:bg-[#334155] text-white disabled:opacity-40 transition"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Grid / Card View */
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {displayedVideos.map((video) => {
                const cls = classifyVideo(video.title, video.folder_path || "", video.duration_seconds);
                const isStarred = Boolean(starredMap[video.source_id]);

                return (
                  <div
                    key={video.source_id}
                    onClick={() => setSelectedVideo(video)}
                    className="bg-[#131B2E] border border-[#1E293B] rounded-xl overflow-hidden shadow-sm hover:border-blue-500/50 hover:shadow-blue-500/10 transition cursor-pointer flex flex-col"
                  >
                    {/* Thumbnail Banner */}
                    <div className="h-40 bg-[#0B0F17] relative flex items-center justify-center overflow-hidden">
                      {video.thumbnail_url ? (
                        <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-3xl text-[#334155]">
                          {video.source === "youtube" ? "▶" : "📁"}
                        </span>
                      )}
                      {/* Star Button */}
                      <button
                        onClick={(e) => toggleStar(video.source_id, e)}
                        className="absolute top-2 right-2 text-lg hover:scale-125 transition drop-shadow"
                      >
                        {isStarred ? "⭐" : "☆"}
                      </button>

                      {/* Duration Badge */}
                      <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 font-mono text-[10px] text-white font-medium">
                        {video.duration_formatted || `${video.duration_seconds}s`}
                      </div>

                      {/* Platform & Orientation Badges */}
                      <div className="absolute top-2 left-2 flex items-center gap-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase tracking-wider ${
                          video.source === 'youtube' ? 'bg-red-600/90' : 'bg-amber-600/90'
                        }`}>
                          {video.source === 'youtube' ? 'YT' : 'Drive'}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-black/75 text-[10px] text-white font-mono">
                          {cls.orientation === 'vertical' ? '📱 9:16' : '🖥️ 16:9'}
                        </span>
                      </div>
                    </div>

                    {/* Body Content */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="mb-1">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border ${cls.categoryColor}`}>
                            {cls.categoryLabel}
                          </span>
                        </div>
                        <h4 className="text-sm font-semibold text-white line-clamp-2">{video.title}</h4>
                        <p className="text-xs text-[#64748B] line-clamp-1 mt-1">
                          📍 {video.folder_path || "Recal Marketing"}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-[#1E293B] flex items-center justify-between text-xs text-[#94A3B8]">
                        <span>
                          {video.source === "youtube"
                            ? `${(video.view_count || 0).toLocaleString()} views`
                            : video.file_size_formatted || "—"}
                        </span>
                        <span className="capitalize px-1.5 py-0.5 rounded bg-[#1E293B] text-[10px] text-slate-300">
                          {video.privacy_status}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Toolbar */}
            <div className="bg-[#131B2E] border border-[#1E293B] rounded-xl px-4 py-3 flex items-center justify-between text-xs text-[#94A3B8]">
              <div>
                Page {page} of {totalPages} ({totalItems.toLocaleString()} videos total)
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1 rounded bg-[#1E293B] hover:bg-[#334155] text-white disabled:opacity-40 transition"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1 rounded bg-[#1E293B] hover:bg-[#334155] text-white disabled:opacity-40 transition"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Video Inspector Slide-Over Drawer with In-App Preview Player */}
      {selectedVideo && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedVideo(null)}
          ></div>

          {/* Drawer Content */}
          <div className="relative w-full max-w-xl bg-[#0E1526] border-l border-[#1E293B] h-full shadow-2xl flex flex-col z-10 overflow-y-auto">
            {/* Drawer Header */}
            <div className="p-4 border-b border-[#1E293B] flex items-center justify-between sticky top-0 bg-[#0E1526]/95 backdrop-blur z-20">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleStar(selectedVideo.source_id)}
                  className="text-lg hover:scale-125 transition"
                  title="Toggle Favorite"
                >
                  {starredMap[selectedVideo.source_id] ? "⭐" : "☆"}
                </button>
                <span className="text-xs uppercase font-bold text-blue-400 tracking-wider">Video Inspector &amp; Player</span>
              </div>
              <button
                onClick={() => setSelectedVideo(null)}
                className="p-1 rounded-md text-[#94A3B8] hover:text-white hover:bg-[#1E293B]"
              >
                ✕
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-6 space-y-6">
              {/* In-App Streamable Video Player */}
              <div className="w-full rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center relative border border-[#1E293B] shadow-lg">
                {selectedVideo.source === "youtube" ? (
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${selectedVideo.source_id}?autoplay=1`}
                    title={selectedVideo.title}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <iframe
                    src={`https://drive.google.com/file/d/${selectedVideo.source_id}/preview`}
                    title={selectedVideo.title}
                    className="w-full h-full border-0"
                    allow="autoplay"
                    allowFullScreen
                  />
                )}
              </div>

              {/* Title & Classification Badges */}
              <div>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {/* Format */}
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {classifyVideo(selectedVideo.title, selectedVideo.folder_path || "", selectedVideo.duration_seconds).orientationLabel}
                  </span>
                  {/* Category */}
                  <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                    classifyVideo(selectedVideo.title, selectedVideo.folder_path || "", selectedVideo.duration_seconds).categoryColor
                  }`}>
                    {classifyVideo(selectedVideo.title, selectedVideo.folder_path || "", selectedVideo.duration_seconds).categoryLabel}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white">{selectedVideo.title}</h3>

                {/* Location Breadcrumb */}
                <div className="mt-2 p-2.5 rounded-lg bg-[#131B2E] border border-[#1E293B] text-xs space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[#64748B] tracking-wider block">
                    Current Location / Folder Breadcrumb
                  </span>
                  <span className="text-[#CBD5E1] font-mono break-all block">
                    {selectedVideo.folder_path || "Root"}
                  </span>
                </div>
              </div>

              {/* Quick Links */}
              <div className="flex gap-2">
                <a
                  href={selectedVideo.direct_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold text-center flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  {selectedVideo.source === "youtube" ? "Open on YouTube" : "Open in Google Drive"}
                </a>
                <button
                  onClick={() => handleCopy(selectedVideo.direct_url, "drawer-btn")}
                  className="px-3 py-2 rounded-lg bg-[#1E293B] hover:bg-[#334155] text-xs text-white font-medium"
                >
                  {copiedId === "drawer-btn" ? "Copied!" : "Copy Link"}
                </button>
              </div>

              {/* Content Creation & Repurposing Notes */}
              <div className="p-3 bg-[#131B2E] rounded-xl border border-[#1E293B] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase font-bold text-amber-400 tracking-wider">
                    📝 Editorial Notes &amp; Hook Timestamps
                  </span>
                  {drawerNote && <span className="text-[10px] text-emerald-400">Saved</span>}
                </div>
                <textarea
                  value={drawerNote}
                  onChange={(e) => {
                    setDrawerNote(e.target.value);
                    saveNote(selectedVideo.source_id, e.target.value);
                  }}
                  placeholder="Jot down content ideas, soundbites, timestamps (e.g. 'At 12:40 Anthony explains breath holding technique for Kilimanjaro')..."
                  rows={3}
                  className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-lg p-2.5 text-xs text-white placeholder-[#64748B] focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              {/* Detailed Metadata Grid */}
              <div className="space-y-3">
                <h4 className="text-xs uppercase font-bold text-[#94A3B8] tracking-wider">Asset Specifications</h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-[#131B2E] p-3 rounded-lg border border-[#1E293B]">
                    <span className="text-[10px] text-[#64748B] uppercase font-semibold block">Platform</span>
                    <span className="text-white font-medium mt-0.5 capitalize block">{selectedVideo.source}</span>
                  </div>

                  <div className="bg-[#131B2E] p-3 rounded-lg border border-[#1E293B]">
                    <span className="text-[10px] text-[#64748B] uppercase font-semibold block">Privacy Visibility</span>
                    <span className="text-white font-medium mt-0.5 capitalize block">{selectedVideo.privacy_status}</span>
                  </div>

                  <div className="bg-[#131B2E] p-3 rounded-lg border border-[#1E293B]">
                    <span className="text-[10px] text-[#64748B] uppercase font-semibold block">Runtime</span>
                    <span className="text-white font-medium mt-0.5 block">
                      {selectedVideo.duration_formatted} ({selectedVideo.duration_seconds}s)
                    </span>
                  </div>

                  <div className="bg-[#131B2E] p-3 rounded-lg border border-[#1E293B]">
                    <span className="text-[10px] text-[#64748B] uppercase font-semibold block">
                      {selectedVideo.source === "youtube" ? "Views" : "File Size"}
                    </span>
                    <span className="text-white font-medium mt-0.5 block">
                      {selectedVideo.source === "youtube"
                        ? (selectedVideo.view_count || 0).toLocaleString()
                        : selectedVideo.file_size_formatted || "—"}
                    </span>
                  </div>

                  <div className="bg-[#131B2E] p-3 rounded-lg border border-[#1E293B]">
                    <span className="text-[10px] text-[#64748B] uppercase font-semibold block">Broadcast Type</span>
                    <span className="text-white font-medium mt-0.5 capitalize block">
                      {selectedVideo.is_live ? "Live Broadcast" : "Standard Video"}
                    </span>
                  </div>

                  <div className="bg-[#131B2E] p-3 rounded-lg border border-[#1E293B]">
                    <span className="text-[10px] text-[#64748B] uppercase font-semibold block">System Status</span>
                    <span className="text-emerald-400 font-medium mt-0.5 capitalize block">{selectedVideo.status}</span>
                  </div>
                </div>
              </div>

              {/* Source ID & Technical Details */}
              <div className="p-3 bg-[#131B2E] rounded-lg border border-[#1E293B] space-y-2 text-xs">
                <span className="text-[10px] uppercase font-bold text-[#64748B] tracking-wider block">Asset Identifiers</span>
                <div className="flex justify-between py-1 border-b border-[#1E293B]/60">
                  <span className="text-[#64748B]">Source ID:</span>
                  <span className="font-mono text-white select-all">{selectedVideo.source_id}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#1E293B]/60">
                  <span className="text-[#64748B]">MIME Type:</span>
                  <span className="font-mono text-white">{selectedVideo.mime_type || "video"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#1E293B]/60">
                  <span className="text-[#64748B]">Recorded / Uploaded:</span>
                  <span className="text-white">
                    {selectedVideo.published_at ? new Date(selectedVideo.published_at).toLocaleString() : "—"}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#64748B]">Last Synced:</span>
                  <span className="text-white">
                    {selectedVideo.last_synced_at ? new Date(selectedVideo.last_synced_at).toLocaleString() : "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
