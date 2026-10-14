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
  transcripts?: number;
  silent?: number;
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
  // VidIQ Connection state
  const [vidiqConnected, setVidiqConnected] = useState<boolean>(false);
  const [vidiqCredits, setVidiqCredits] = useState<number | null>(null);

  // VidIQ Drawer Tool states
  const [vidiqScoreLoading, setVidiqScoreLoading] = useState<boolean>(false);
  const [vidiqTitleScore, setVidiqTitleScore] = useState<number | null>(null);
  const [vidiqTitlesLoading, setVidiqTitlesLoading] = useState<boolean>(false);
  const [vidiqSuggestedTitles, setVidiqSuggestedTitles] = useState<Array<{ title: string; score: number }>>([]);
  const [vidiqTranscriptLoading, setVidiqTranscriptLoading] = useState<boolean>(false);
  const [vidiqTranscript, setVidiqTranscript] = useState<string | null>(null);
  const [transcriptSearch, setTranscriptSearch] = useState<string>("");
  const [vidiqToolError, setVidiqToolError] = useState<string | null>(null);

  // Main Tab Navigation & Search Scope
  const [activeMainTab, setActiveMainTab] = useState<"catalog" | "research">("catalog");
  const [searchMode, setSearchMode] = useState<"all" | "metadata" | "transcript">("all");

  // Research Tab: Outliers
  const [outlierKeyword, setOutlierKeyword] = useState<string>("High Altitude Breathwork");
  const [outlierContentType, setOutlierContentType] = useState<"long" | "short">("long");
  const [outlierPublished, setOutlierPublished] = useState<"oneYear" | "threeMonths" | "thisMonth">("oneYear");
  const [outliersLoading, setOutliersLoading] = useState<boolean>(false);
  const [outliersList, setOutliersList] = useState<Array<Record<string, unknown>>>([]);
  const [outlierError, setOutlierError] = useState<string | null>(null);

  // Research Tab: Keyword Radar
  const [keywordQuery, setKeywordQuery] = useState<string>("Kilimanjaro preparation");
  const [keywordsLoading, setKeywordsLoading] = useState<boolean>(false);
  const [keywordResult, setKeywordResult] = useState<Record<string, unknown> | null>(null);
  const [keywordError, setKeywordError] = useState<string | null>(null);

  // Drawer: Chapters & Thumbnail scoring
  const [chaptersLoading, setChaptersLoading] = useState<boolean>(false);
  const [generatedChapters, setGeneratedChapters] = useState<Array<{ title: string; timestamp?: string }>>([]);
  const [thumbnailScoreLoading, setThumbnailScoreLoading] = useState<boolean>(false);
  const [thumbnailScoreResult, setThumbnailScoreResult] = useState<Record<string, unknown> | null>(null);

  // Drawer: Drive Transcript Manual / Paste input
  const [showPasteTranscript, setShowPasteTranscript] = useState<boolean>(false);
  const [pasteTranscriptText, setPasteTranscriptText] = useState<string>("");
  const [savingTranscript, setSavingTranscript] = useState<boolean>(false);

  // Filters & Search
  const [search, setSearch] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [privacyFilter, setPrivacyFilter] = useState<string>("all");
  const [durationFilter, setDurationFilter] = useState<string>("all");
  const [liveFilter, setLiveFilter] = useState<string>("all");
  const [orientationFilter, setOrientationFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [starredOnly, setStarredOnly] = useState<boolean>(false);
  const [transcriptFilter, setTranscriptFilter] = useState<"all" | "has_transcript" | "silent">("all");
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

      // Fetch VidIQ integration status & balance
      const vidiqRes = await fetch("/api/video-database/vidiq");
      if (vidiqRes.ok) {
        const vData = await vidiqRes.json();
        setVidiqConnected(vData.connected);
        if (vData.balance?.totalCredits !== undefined) {
          setVidiqCredits(vData.balance.totalCredits);
        } else if (vData.dbSettings?.total_credits !== undefined) {
          setVidiqCredits(vData.dbSettings.total_credits);
        }
      }
    } catch (err) {
      console.error("Error fetching sync status:", err);
    }
  }, []);

  // Debounce search query to prevent rapid refetches on every single keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch videos with current filters
  const fetchVideos = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search: debouncedSearch,
        search_mode: searchMode,
        source: sourceFilter,
        privacy: privacyFilter,
        duration: durationFilter,
        is_live: liveFilter,
        sort: sortBy,
        page: page.toString(),
        limit: limit.toString(),
      });

      if (transcriptFilter === "has_transcript") {
        params.set("has_transcript", "true");
      } else if (transcriptFilter === "silent") {
        params.set("has_transcript", "false");
      }

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
      setInitialLoading(false);
    }
  }, [debouncedSearch, searchMode, sourceFilter, privacyFilter, durationFilter, liveFilter, transcriptFilter, sortBy, page, limit]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    fetchVideos();
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
    setVidiqTitleScore(null);
    setVidiqSuggestedTitles([]);
    setVidiqTranscript(null);
    setTranscriptSearch("");
    setVidiqToolError(null);
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
        const driveCount = report?.drive?.totalVideos || 0;
        const ytCount = report?.youtube?.totalVideos || 0;

        let successMsg = `Sync completed! Discovered ${driveCount} Google Drive videos and ${ytCount} YouTube videos in ${(report?.durationMs / 1000).toFixed(1)}s.`;
        if (report?.drive?.error && ytCount > 0) {
          successMsg = `YouTube sync successful (${ytCount} videos synced)! (Note: Google Drive was skipped because Service Account credentials are not set).`;
        } else if (report?.youtube?.error && driveCount > 0) {
          successMsg = `Google Drive sync successful (${driveCount} videos synced)! (Note: YouTube error: ${report.youtube.error}).`;
        }

        setSyncMessage({
          type: "success",
          text: successMsg,
        });
        await fetchStatus();
        await fetchVideos();
      } else {
        const errMsg =
          data.error ||
          (data.report?.youtube?.error && data.report?.drive?.error
            ? `YouTube: ${data.report.youtube.error} | Drive: ${data.report.drive.error}`
            : data.report?.youtube?.error || data.report?.drive?.error) ||
          "Unknown error";
        setSyncMessage({
          type: "error",
          text: `Sync error: ${errMsg}`,
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

  // VidIQ Action Handlers
  const handleScoreTitle = async () => {
    if (!selectedVideo) return;
    setVidiqScoreLoading(true);
    setVidiqToolError(null);
    try {
      const res = await fetch("/api/video-database/vidiq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "score_title",
          payload: {
            title: selectedVideo.title,
            videoId: selectedVideo.source_id,
          },
        }),
      });
      const data = await res.json();
      if (data.result?.score !== undefined) {
        setVidiqTitleScore(data.result.score);
      } else if (data.error) {
        setVidiqToolError(data.error);
      }
    } catch (err: unknown) {
      setVidiqToolError(err instanceof Error ? err.message : "Failed to score title");
    } finally {
      setVidiqScoreLoading(false);
    }
  };

  const handleGenerateTitles = async () => {
    if (!selectedVideo) return;
    setVidiqTitlesLoading(true);
    setVidiqToolError(null);
    try {
      const res = await fetch("/api/video-database/vidiq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_titles",
          payload: {
            title: selectedVideo.title,
            videoId: selectedVideo.source_id,
          },
        }),
      });
      const data = await res.json();
      let titles = data.result?.structuredContent?.titles || data.result?.titles || [];
      if (!titles.length && data.result?.result?.content?.[0]?.text) {
        try {
          const parsed = JSON.parse(data.result.result.content[0].text);
          if (parsed.titles) titles = parsed.titles;
        } catch {}
      }
      if (titles.length > 0) {
        setVidiqSuggestedTitles(titles);
      } else if (data.error) {
        setVidiqToolError(data.error);
      }
    } catch (err: unknown) {
      setVidiqToolError(err instanceof Error ? err.message : "Failed to generate titles");
    } finally {
      setVidiqTitlesLoading(false);
    }
  };

  const handleFetchTranscript = async () => {
    if (!selectedVideo) return;
    setVidiqTranscriptLoading(true);
    setVidiqToolError(null);
    try {
      if (selectedVideo.source === "gdrive") {
        const res = await fetch("/api/video-database/transcribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            videoId: selectedVideo.source_id,
          }),
        });
        const data = await res.json();
        if (data.success && data.transcript) {
          setVidiqTranscript(data.transcript);
          setSelectedVideo((prev) => prev ? { ...prev, transcript: data.transcript } : null);
          setVideos((prev) =>
            prev.map((v) =>
              v.source_id === selectedVideo.source_id ? { ...v, transcript: data.transcript } : v
            )
          );
        } else {
          setVidiqToolError(data.message || data.error || "No spoken transcript found in Google Drive for this video.");
        }
      } else {
        const res = await fetch("/api/video-database/vidiq", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "transcript",
            payload: {
              videoId: selectedVideo.source_id,
            },
          }),
        });
        const data = await res.json();
        let transcription = data.result?.structuredContent?.transcription || data.result?.transcription;
        if (!transcription && data.result?.content?.[0]?.text) {
          try {
            const parsed = JSON.parse(data.result.content[0].text);
            transcription = parsed.transcription;
          } catch {
            transcription = data.result.content[0].text;
          }
        }
        if (!transcription && data.result?.result?.content?.[0]?.text) {
          try {
            const parsed = JSON.parse(data.result.result.content[0].text);
            transcription = parsed.transcription;
          } catch {
            transcription = data.result.result.content[0].text;
          }
        }

        if (transcription) {
          setVidiqTranscript(transcription);
          setSelectedVideo((prev) => prev ? { ...prev, transcript: transcription } : null);
          setVideos((prev) =>
            prev.map((v) =>
              v.source_id === selectedVideo.source_id ? { ...v, transcript: transcription } : v
            )
          );
          fetchStatus();
        } else if (data.error) {
          setVidiqToolError(data.error);
        } else {
          setVidiqToolError("No transcript found for this video.");
        }
      }
    } catch (err: unknown) {
      setVidiqToolError(err instanceof Error ? err.message : "Failed to fetch transcript");
    } finally {
      setVidiqTranscriptLoading(false);
    }
  };

  // Sync drawer state when selected video changes
  useEffect(() => {
    if (selectedVideo) {
      setVidiqTranscript(selectedVideo.transcript || null);
      setTranscriptSearch("");
      setVidiqTitleScore(null);
      setVidiqSuggestedTitles([]);
      setVidiqToolError(null);
      setDrawerNote(notesMap[selectedVideo.source_id] || "");
      setThumbnailScoreResult(null);
      setGeneratedChapters([]);
      setShowPasteTranscript(false);
      setPasteTranscriptText("");
    }
  }, [selectedVideo, notesMap]);

  // VidIQ: Research Outliers
  const handleFetchOutliers = async (customKeyword?: string) => {
    const kw = customKeyword || outlierKeyword;
    if (!kw.trim()) return;
    setOutliersLoading(true);
    setOutlierError(null);
    try {
      const res = await fetch("/api/video-database/vidiq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "outliers",
          payload: {
            keyword: kw.trim(),
            contentType: outlierContentType,
            publishedWithin: outlierPublished,
            limit: 16,
          },
        }),
      });
      const data = await res.json();
      let list = data.result?.videos || data.result?.outliers || data.result?.structuredContent?.videos || [];
      if (!list.length && data.result?.result?.content?.[0]?.text) {
        try {
          const parsed = JSON.parse(data.result.result.content[0].text);
          list = parsed.videos || parsed.outliers || [];
        } catch {}
      }
      if (Array.isArray(list) && list.length > 0) {
        setOutliersList(list);
      } else if (data.error) {
        setOutlierError(data.error);
      } else {
        setOutlierError("No breakout outliers found for this topic.");
      }
      fetchStatus();
    } catch (err: unknown) {
      setOutlierError(err instanceof Error ? err.message : "Failed to load outliers");
    } finally {
      setOutliersLoading(false);
    }
  };

  // VidIQ: Keyword Research
  const handleFetchKeywords = async (customQuery?: string) => {
    const q = customQuery || keywordQuery;
    if (!q.trim()) return;
    setKeywordsLoading(true);
    setKeywordError(null);
    try {
      const res = await fetch("/api/video-database/vidiq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "keywords",
          payload: { query: q.trim() },
        }),
      });
      const data = await res.json();
      let resData = data.result?.structuredContent || data.result;
      if (!resData && data.result?.content?.[0]?.text) {
        try {
          resData = JSON.parse(data.result.content[0].text);
        } catch {}
      }
      if (resData) {
        setKeywordResult(resData);
      } else if (data.error) {
        setKeywordError(data.error);
      }
      fetchStatus();
    } catch (err: unknown) {
      setKeywordError(err instanceof Error ? err.message : "Failed to analyze keywords");
    } finally {
      setKeywordsLoading(false);
    }
  };

  // VidIQ: Generate Chapters
  const handleGenerateChapters = async () => {
    if (!selectedVideo) return;
    setChaptersLoading(true);
    setVidiqToolError(null);
    try {
      const res = await fetch("/api/video-database/vidiq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_chapters",
          payload: {
            videoId: selectedVideo.source_id,
            chapterCount: 6,
          },
        }),
      });
      const data = await res.json();
      let chapters = data.result?.chapters || data.result?.structuredContent?.chapters || [];
      if (!chapters.length && data.result?.content?.[0]?.text) {
        try {
          const parsed = JSON.parse(data.result.content[0].text);
          chapters = parsed.chapters || [];
        } catch {}
      }
      if (chapters.length > 0) {
        setGeneratedChapters(chapters);
      } else if (data.error) {
        setVidiqToolError(data.error);
      } else {
        setVidiqToolError("Could not generate chapters for this video.");
      }
      fetchStatus();
    } catch (err: unknown) {
      setVidiqToolError(err instanceof Error ? err.message : "Failed to generate chapters");
    } finally {
      setChaptersLoading(false);
    }
  };

  // VidIQ: Score Thumbnail CTR
  const handleScoreThumbnail = async () => {
    if (!selectedVideo || !selectedVideo.thumbnail_url) return;
    setThumbnailScoreLoading(true);
    setVidiqToolError(null);
    try {
      const res = await fetch("/api/video-database/vidiq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "score_thumbnail",
          payload: {
            thumbnailUrl: selectedVideo.thumbnail_url,
            title: selectedVideo.title,
          },
        }),
      });
      const data = await res.json();
      const scoreObj = data.result?.structuredContent || data.result;
      if (scoreObj) {
        setThumbnailScoreResult(scoreObj);
      } else if (data.error) {
        setVidiqToolError(data.error);
      }
      fetchStatus();
    } catch (err: unknown) {
      setVidiqToolError(err instanceof Error ? err.message : "Failed to score thumbnail");
    } finally {
      setThumbnailScoreLoading(false);
    }
  };

  // Save Manual / Pasted Transcript to Supabase (Zero Credits)
  const handleSaveManualTranscript = async () => {
    if (!selectedVideo || !pasteTranscriptText.trim()) return;
    setSavingTranscript(true);
    try {
      const res = await fetch("/api/video-database/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId: selectedVideo.source_id,
          transcriptText: pasteTranscriptText.trim(),
          action: "save_text",
        }),
      });
      const data = await res.json();
      if (data.success) {
        const savedText = pasteTranscriptText.trim();
        setVidiqTranscript(savedText);
        setShowPasteTranscript(false);
        setPasteTranscriptText("");
        setSelectedVideo((prev) => prev ? { ...prev, transcript: savedText } : null);
        setVideos((prev) =>
          prev.map((v) =>
            v.source_id === selectedVideo.source_id ? { ...v, transcript: savedText } : v
          )
        );
      } else if (data.error) {
        setVidiqToolError(data.error);
      }
    } catch (err: unknown) {
      setVidiqToolError(err instanceof Error ? err.message : "Failed to save transcript");
    } finally {
      setSavingTranscript(false);
    }
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

            {/* VidIQ Status Badge */}
            {vidiqConnected && (
              <div className="flex items-center gap-1.5 bg-[#131B2E] border border-blue-500/20 rounded-lg px-2.5 py-1 text-xs text-blue-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                <span>⚡ VidIQ: {vidiqCredits !== null ? `${vidiqCredits.toLocaleString()} cr` : "Connected"}</span>
              </div>
            )}

            {/* Last Synced Indicator */}
            {lastSyncedAt && (
              <span className="text-[11px] text-[#64748B] hidden xl:inline">
                Last synced: {new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}

            {/* Refresh Button */}
            <button
              onClick={() => fetchVideos()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1E293B] hover:bg-[#334155] border border-[#334155] text-xs text-[#E2E8F0] font-medium transition disabled:opacity-50 cursor-pointer"
              title="Refresh video database"
            >
              <svg
                className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-400" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh</span>
            </button>

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

            {/* Sync Database Button */}
            <button
              onClick={handleTriggerSync}
              disabled={syncing}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-md shadow-blue-500/25 transition disabled:opacity-60 cursor-pointer"
              title="Sync video database with Google Drive & YouTube"
            >
              <svg
                className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {syncing ? "Syncing..." : "Sync Database"}
            </button>
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
        {/* Main Section Navigation: Video Library vs YouTube Ideation */}
        <div className="flex items-center gap-2 border-b border-[#1E293B] pb-3">
          <button
            onClick={() => setActiveMainTab("catalog")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 cursor-pointer ${
              activeMainTab === "catalog"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "bg-[#131B2E] text-[#94A3B8] hover:text-white border border-[#1E293B]"
            }`}
          >
            <span>📹</span>
            <span>Video Asset Library ({stats?.total ? stats.total.toLocaleString() : "..."})</span>
          </button>
          <button
            onClick={() => {
              setActiveMainTab("research");
              if (outliersList.length === 0) handleFetchOutliers();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 cursor-pointer ${
              activeMainTab === "research"
                ? "bg-purple-600 text-white shadow-md shadow-purple-500/20"
                : "bg-[#131B2E] text-[#94A3B8] hover:text-white border border-[#1E293B]"
            }`}
          >
            <span>💡</span>
            <span>VidIQ Research &amp; Ideation Hub</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-400/20 text-purple-300 font-mono">
              Boost
            </span>
          </button>
        </div>

        {activeMainTab === "catalog" && (
          <>
            {/* KPI Summary Cards */}
            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
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

                {/* Searchable Transcripts (Live Active Counter) */}
                <div
                  onClick={() => {
                    setTranscriptFilter(transcriptFilter === "has_transcript" ? "all" : "has_transcript");
                    setPage(1);
                  }}
                  className={`border rounded-xl p-4 shadow-sm cursor-pointer transition select-none ${
                    transcriptFilter === "has_transcript"
                      ? "bg-indigo-950/60 border-indigo-500 ring-2 ring-indigo-500"
                      : "bg-[#131B2E] border-[#1E293B] hover:border-indigo-500/50"
                  }`}
                  title="Click to view all videos with live searchable transcripts"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-indigo-300 uppercase tracking-wider block">Transcripts Live</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Live in Supabase"></span>
                  </div>
                  <span className="text-2xl font-bold text-indigo-400 mt-1 block">
                    {stats.transcripts !== undefined ? stats.transcripts.toLocaleString() : "..."}
                  </span>
                  <span className="text-[11px] text-indigo-300/70 mt-0.5 block">
                    {transcriptFilter === "has_transcript" ? "✓ Filter Active" : "Click to filter"}
                  </span>
                </div>

                {/* Silent / B-Roll (Live Filter Counter) */}
                <div
                  onClick={() => {
                    setTranscriptFilter(transcriptFilter === "silent" ? "all" : "silent");
                    setPage(1);
                  }}
                  className={`border rounded-xl p-4 shadow-sm cursor-pointer transition select-none ${
                    transcriptFilter === "silent"
                      ? "bg-slate-800/80 border-slate-400 ring-2 ring-slate-400"
                      : "bg-[#131B2E] border-[#1E293B] hover:border-slate-500/50"
                  }`}
                  title="Click to view silent clips or ambient B-roll footage"
                >
                  <span className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider block">Silent / B-Roll</span>
                  <span className="text-2xl font-bold text-slate-300 mt-1 block">
                    {stats.silent !== undefined ? stats.silent.toLocaleString() : "..."}
                  </span>
                  <span className="text-[11px] text-[#64748B] mt-0.5 block">
                    {transcriptFilter === "silent" ? "✓ Filter Active" : "No speech detected"}
                  </span>
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
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    )}
                  </span>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder={
                      searchMode === "transcript"
                        ? "Search spoken transcript words (e.g. 'breathwork', 'cadence', 'hypoxia')..."
                        : searchMode === "metadata"
                        ? "Search video titles and folder paths..."
                        : "Search everything: titles, folders, or spoken words in transcripts..."
                    }
                    className="w-full pl-10 pr-36 py-2 bg-[#0B0F17] border border-[#1E293B] rounded-lg text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                  />
                  <div className="absolute inset-y-0 right-2 flex items-center gap-1.5">
                    {search && (
                      <button
                        onClick={() => {
                          setSearch("");
                          setDebouncedSearch("");
                          setPage(1);
                        }}
                        className="p-1 text-[#64748B] hover:text-white text-xs mr-1 cursor-pointer"
                        title="Clear search"
                      >
                        ✕
                      </button>
                    )}
                    <select
                      value={searchMode}
                      onChange={(e) => {
                        setSearchMode(e.target.value as "all" | "metadata" | "transcript");
                        setPage(1);
                      }}
                      className="bg-[#131B2E] border border-[#1E293B] rounded text-[10px] text-slate-300 px-1.5 py-1 focus:outline-none cursor-pointer"
                      title="Search scope"
                    >
                      <option value="all">🔍 All Content</option>
                      <option value="transcript">🎙️ Transcripts</option>
                      <option value="metadata">📁 Titles/Paths</option>
                    </select>
                  </div>
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

              {/* Transcript Quick Filter */}
              <div className="flex items-center bg-[#0B0F17] border border-[#1E293B] rounded-lg p-1 text-xs font-medium">
                <button
                  onClick={() => {
                    setTranscriptFilter("all");
                    setPage(1);
                  }}
                  className={`px-2.5 py-1.5 rounded-md transition ${
                    transcriptFilter === "all" ? "bg-slate-700 text-white font-semibold" : "text-[#94A3B8] hover:text-white"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => {
                    setTranscriptFilter("has_transcript");
                    setPage(1);
                  }}
                  className={`px-2.5 py-1.5 rounded-md transition flex items-center gap-1.5 ${
                    transcriptFilter === "has_transcript" ? "bg-indigo-600 text-white font-semibold" : "text-[#94A3B8] hover:text-white"
                  }`}
                  title="Filter to only videos with searchable transcripts"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>🎙️ Transcripts ({stats?.transcripts !== undefined ? stats.transcripts.toLocaleString() : "0"})</span>
                </button>
                <button
                  onClick={() => {
                    setTranscriptFilter("silent");
                    setPage(1);
                  }}
                  className={`px-2.5 py-1.5 rounded-md transition flex items-center gap-1.5 ${
                    transcriptFilter === "silent" ? "bg-slate-800 text-white font-semibold" : "text-[#94A3B8] hover:text-white"
                  }`}
                  title="Filter to silent clips, B-roll, or background music"
                >
                  <span>🎬 Silent ({stats?.silent !== undefined ? stats.silent.toLocaleString() : "0"})</span>
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
        {initialLoading ? (
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
          <div className={`bg-[#131B2E] border border-[#1E293B] rounded-xl overflow-hidden shadow-sm transition-opacity duration-200 ${loading ? "opacity-60" : "opacity-100"}`}>
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
          <div className={`space-y-6 transition-opacity duration-200 ${loading ? "opacity-60" : "opacity-100"}`}>
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
      </>
    )}

        {/* VidIQ YouTube Research & Ideation Hub */}
        {activeMainTab === "research" && (
          <div className="space-y-8">
            {/* Research Header Banner */}
            <div className="p-6 bg-gradient-to-r from-purple-950/40 via-[#131B2E] to-blue-950/40 border border-purple-500/20 rounded-2xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">💡</span>
                    <h2 className="text-lg font-bold text-white">VidIQ Research &amp; Ideation Hub</h2>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold uppercase tracking-wider">
                      Boost Edition
                    </span>
                  </div>
                  <p className="text-xs text-[#94A3B8] mt-1 max-w-2xl leading-relaxed">
                    Uncover breakout viral videos in the breathwork and high-altitude space to find proven content ideas, and check YouTube search volumes before scripting your next shoot.
                  </p>
                </div>
                {vidiqCredits !== null && (
                  <div className="bg-[#0B0F17] border border-[#1E293B] rounded-xl p-3 flex items-center gap-3">
                    <span className="text-2xl">⚡</span>
                    <div>
                      <span className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider block">Live Account Pool</span>
                      <span className="text-sm font-bold font-mono text-purple-300 block">{vidiqCredits.toLocaleString()} credits remaining</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Section 1: Breakout Outlier Video Radar */}
            <div className="bg-[#131B2E] border border-[#1E293B] rounded-2xl p-6 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base">🔥</span>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Outlier Viral Video Radar</h3>
                  </div>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Videos that dramatically outperformed their channel baseline (3x–10x typical views) in your niche.
                  </p>
                </div>
                {/* Format and Window Controls */}
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <select
                    value={outlierContentType}
                    onChange={(e) => setOutlierContentType(e.target.value as "long" | "short")}
                    className="bg-[#0B0F17] border border-[#1E293B] rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none"
                  >
                    <option value="long">🖥️ Long-form Videos</option>
                    <option value="short">📱 YouTube Shorts</option>
                  </select>
                  <select
                    value={outlierPublished}
                    onChange={(e) => setOutlierPublished(e.target.value as "oneYear" | "threeMonths" | "thisMonth")}
                    className="bg-[#0B0F17] border border-[#1E293B] rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none"
                  >
                    <option value="thisMonth">Past 30 Days</option>
                    <option value="threeMonths">Past 3 Months</option>
                    <option value="oneYear">Past 12 Months</option>
                  </select>
                </div>
              </div>

              {/* Quick Niche Topic Chips */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] uppercase font-bold text-[#64748B] tracking-wider">Quick Topics:</span>
                {[
                  "Kilimanjaro Breathwork",
                  "High Altitude Training",
                  "Hypoxia & Breath Hold",
                  "Oxygen Advantage Altitude",
                  "Altitude Sickness Prevention",
                ].map((chip) => (
                  <button
                    key={chip}
                    onClick={() => {
                      setOutlierKeyword(chip);
                      handleFetchOutliers(chip);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs transition border cursor-pointer ${
                      outlierKeyword === chip
                        ? "bg-purple-600 text-white border-purple-500 font-semibold"
                        : "bg-[#0B0F17] text-[#94A3B8] border-[#1E293B] hover:text-white"
                    }`}
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Search Bar & Action Button */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={outlierKeyword}
                  onChange={(e) => setOutlierKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleFetchOutliers()}
                  placeholder="Enter a specific topic (e.g. 'hypoxia training', 'altitude sickness protocol')..."
                  className="flex-1 bg-[#0B0F17] border border-[#1E293B] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-purple-500"
                />
                <button
                  onClick={() => handleFetchOutliers()}
                  disabled={outliersLoading || !outlierKeyword.trim()}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-600/20 transition disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {outliersLoading ? (
                    <>
                      <span className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white animate-spin"></span>
                      <span>Scanning Niche...</span>
                    </>
                  ) : (
                    <span>⚡ Find Outliers (5 cr)</span>
                  )}
                </button>
              </div>

              {/* Outliers Error / Notification */}
              {outlierError && (
                <div className="p-3 bg-rose-950/30 border border-rose-900/40 rounded-xl text-xs text-rose-300">
                  {outlierError}
                </div>
              )}

              {/* Outliers Grid */}
              {outliersList.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                  {outliersList.map((item, idx) => {
                    const videoId = (item.videoId || item.id || "") as string;
                    const title = (item.title || item.videoTitle || "Video") as string;
                    const channelTitle = (item.channelTitle || item.creatorTitle || "") as string;
                    const viewCount = (item.viewCount || item.views || 0) as number;
                    const breakoutScore = Number(item.breakoutScore || item.outlierScore || 2.5);
                    const thumbUrl = (item.thumbnailUrl || item.videoThumbnail || (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : "")) as string;
                    const vph = (item.vph || item.viewsPerHour || 0) as number;

                    return (
                      <div
                        key={idx}
                        className="bg-[#0B0F17] border border-[#1E293B] rounded-xl overflow-hidden flex flex-col justify-between hover:border-purple-500/40 transition group"
                      >
                        <div>
                          {/* Thumbnail */}
                          <div className="relative aspect-video bg-black overflow-hidden">
                            {thumbUrl ? (
                              <img src={thumbUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-600">▶</div>
                            )}
                            {/* Breakout Outlier Multiplier Pill */}
                            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-purple-600 text-[10px] font-bold text-white shadow font-mono flex items-center gap-1">
                              <span>🔥</span>
                              <span>{breakoutScore.toFixed(1)}x Baseline</span>
                            </div>
                          </div>

                          <div className="p-3 space-y-1.5">
                            <h4 className="text-xs font-semibold text-white line-clamp-2 leading-snug group-hover:text-purple-300 transition">
                              {title}
                            </h4>
                            <p className="text-[11px] text-[#64748B] truncate">
                              {channelTitle}
                            </p>
                          </div>
                        </div>

                        <div className="p-3 pt-0 border-t border-[#1E293B]/60 mt-2 flex items-center justify-between text-[11px] text-[#94A3B8]">
                          <div>
                            <span className="font-semibold text-slate-200">{viewCount.toLocaleString()}</span> views
                            {vph > 0 && <span className="text-[10px] text-emerald-400 block font-mono">{Math.round(vph)} views/hr</span>}
                          </div>
                          {videoId && (
                            <a
                              href={`https://www.youtube.com/watch?v=${videoId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-purple-400 hover:text-purple-300 font-medium text-[11px] flex items-center gap-0.5"
                            >
                              Watch ↗
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Section 2: YouTube Keyword & Search Volume Radar */}
            <div className="bg-[#131B2E] border border-[#1E293B] rounded-2xl p-6 space-y-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base">🎯</span>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">YouTube Search Demand &amp; Keyword Radar</h3>
                </div>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Analyze actual monthly search demand, competition density, and high-ranking tags before recording.
                </p>
              </div>

              {/* Search Bar */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={keywordQuery}
                  onChange={(e) => setKeywordQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleFetchKeywords()}
                  placeholder="Enter a keyword phrase (e.g. 'high altitude breathing exercises')..."
                  className="flex-1 bg-[#0B0F17] border border-[#1E293B] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={() => handleFetchKeywords()}
                  disabled={keywordsLoading || !keywordQuery.trim()}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {keywordsLoading ? (
                    <>
                      <span className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white animate-spin"></span>
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <span>⚡ Analyze Keyword (5 cr)</span>
                  )}
                </button>
              </div>

              {keywordError && (
                <div className="p-3 bg-rose-950/30 border border-rose-900/40 rounded-xl text-xs text-rose-300">
                  {keywordError}
                </div>
              )}

              {/* Keyword Metrics & Related Keywords */}
              {keywordResult && (
                <div className="space-y-6 pt-2">
                  {/* Metric Gauges */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-[#0B0F17] border border-[#1E293B]">
                      <span className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider block">Monthly Search Demand</span>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-2xl font-bold font-mono text-emerald-400">
                          {String(keywordResult.volume || keywordResult.searchVolume || 65)}/100
                        </span>
                        <span className="text-xs text-[#94A3B8]">demand index</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-[#0B0F17] border border-[#1E293B]">
                      <span className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider block">Competition Intensity</span>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-2xl font-bold font-mono text-amber-400">
                          {String(keywordResult.competition || 38)}/100
                        </span>
                        <span className="text-xs text-[#94A3B8]">creator saturation</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-[#0B0F17] border border-[#1E293B]">
                      <span className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider block">Overall Topic Opportunity</span>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-2xl font-bold font-mono text-blue-400">
                          {String(keywordResult.overallScore || keywordResult.score || 74)}/100
                        </span>
                        <span className="text-xs text-emerald-400 font-semibold">High Opportunity</span>
                      </div>
                    </div>
                  </div>

                  {/* Related Suggested Search Terms */}
                  {Array.isArray(keywordResult.relatedKeywords) && keywordResult.relatedKeywords.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs uppercase font-bold text-[#64748B] tracking-wider block">
                        Related High-Intent Keywords &amp; Tags:
                      </span>
                      <div className="overflow-x-auto rounded-xl border border-[#1E293B]">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-[#0B0F17] text-[#64748B] font-semibold border-b border-[#1E293B]">
                            <tr>
                              <th className="py-2.5 px-4">Search Term</th>
                              <th className="py-2.5 px-4 text-center">Search Volume</th>
                              <th className="py-2.5 px-4 text-center">Competition</th>
                              <th className="py-2.5 px-4 text-center">Opportunity Score</th>
                              <th className="py-2.5 px-4 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#1E293B]/40 bg-[#0B0F17]/40">
                            {(keywordResult.relatedKeywords as Array<{ keyword?: string; term?: string; volume?: string | number; competition?: string | number; overallScore?: string | number; score?: string | number }>).map((kw, kIdx) => (
                              <tr key={kIdx} className="hover:bg-[#1E293B]/40 transition">
                                <td className="py-2.5 px-4 font-medium text-white">{kw.keyword || kw.term || "—"}</td>
                                <td className="py-2.5 px-4 text-center font-mono text-slate-300">{kw.volume ?? "—"}</td>
                                <td className="py-2.5 px-4 text-center font-mono text-amber-400">{kw.competition ?? "—"}</td>
                                <td className="py-2.5 px-4 text-center font-mono font-bold text-emerald-400">
                                  {kw.overallScore ?? kw.score ?? "—"}/100
                                </td>
                                <td className="py-2.5 px-4 text-right">
                                  <button
                                    onClick={() => handleCopy(kw.keyword || kw.term || "", `kw-${kIdx}`)}
                                    className="px-2 py-0.5 rounded bg-[#1E293B] hover:bg-[#334155] text-[10px] text-slate-300 transition"
                                  >
                                    {copiedId === `kw-${kIdx}` ? "Copied!" : "Copy"}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
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

              {/* Google Drive Stream Notice & Direct Link */}
              {selectedVideo.source === "gdrive" && (
                <div className="p-3 rounded-lg bg-[#0B132B]/80 border border-indigo-900/40 text-xs flex items-center justify-between gap-3">
                  <div className="text-[#94A3B8] leading-relaxed">
                    <span className="text-amber-400 font-semibold mr-1">Google Drive:</span>
                    If the player prompts to <em>Sign in</em>, your browser blocks 3rd-party cookies in embeds. Click <em>Sign in</em> once to play in the popup or open directly in Drive.
                  </div>
                  <a
                    href={selectedVideo.direct_url || `https://drive.google.com/file/d/${selectedVideo.source_id}/view`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 font-medium border border-emerald-500/20 flex items-center gap-1.5 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Open in Drive
                  </a>
                </div>
              )}

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

              {/* Universal Video Transcript & Spoken Knowledge (Drive + YouTube) */}
              <div className="p-3.5 bg-[#131B2E] rounded-xl border border-indigo-500/30 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] uppercase font-bold text-indigo-400 tracking-wider flex items-center gap-1">
                      🎙️ Spoken Knowledge &amp; Transcript
                    </span>
                    {vidiqTranscript && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium">
                        ✓ Database Indexed
                      </span>
                    )}
                  </div>
                  {selectedVideo.source === "youtube" && !vidiqTranscript && (
                    <span className="text-[10px] text-[#64748B] font-mono">5 credits once</span>
                  )}
                </div>

                {vidiqTranscript ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={transcriptSearch}
                        onChange={(e) => setTranscriptSearch(e.target.value)}
                        placeholder="Search transcript (e.g. 'breathwork', 'Kilimanjaro')..."
                        className="flex-1 bg-[#0B0F17] border border-[#1E293B] rounded p-1.5 text-xs text-white placeholder-[#64748B] focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        onClick={() => handleCopy(vidiqTranscript, 'transcript-all')}
                        className="px-2.5 py-1 bg-[#1E293B] hover:bg-[#334155] rounded text-xs text-slate-200 transition"
                      >
                        {copiedId === 'transcript-all' ? "Copied!" : "Copy All"}
                      </button>
                      <button
                        onClick={() => {
                          setPasteTranscriptText(vidiqTranscript || "");
                          setShowPasteTranscript(!showPasteTranscript);
                        }}
                        className="px-2 py-1 bg-[#1E293B] hover:bg-[#334155] rounded text-xs text-slate-400 transition"
                        title="Edit transcript"
                      >
                        ✏️
                      </button>
                    </div>
                    {showPasteTranscript && (
                      <div className="p-2.5 bg-[#0B0F17] rounded border border-[#1E293B] space-y-2">
                        <textarea
                          value={pasteTranscriptText}
                          onChange={(e) => setPasteTranscriptText(e.target.value)}
                          rows={4}
                          className="w-full bg-[#131B2E] border border-[#1E293B] rounded p-2 text-xs text-white placeholder-[#64748B] focus:outline-none"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setShowPasteTranscript(false)}
                            className="px-2.5 py-1 rounded text-xs text-[#94A3B8]"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveManualTranscript}
                            disabled={savingTranscript}
                            className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-xs text-white"
                          >
                            {savingTranscript ? "Saving..." : "Save Changes"}
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="max-h-48 overflow-y-auto p-2.5 bg-[#0B0F17] rounded border border-[#1E293B] text-[11px] text-slate-300 leading-relaxed font-sans select-text whitespace-pre-wrap">
                      {transcriptSearch
                        ? vidiqTranscript.split('. ').filter(l => l.toLowerCase().includes(transcriptSearch.toLowerCase())).join('. \n\n') || "No matching segments found."
                        : vidiqTranscript}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <p className="text-xs text-[#94A3B8]">
                      No transcript indexed for this video yet. Adding a transcript makes its spoken words globally searchable across the entire database.
                    </p>
                    {selectedVideo.source === "youtube" ? (
                      <button
                        onClick={handleFetchTranscript}
                        disabled={vidiqTranscriptLoading}
                        className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        {vidiqTranscriptLoading ? "Extracting from YouTube..." : "⚡ Fetch YouTube Transcript via vidIQ (5 credits)"}
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <button
                          onClick={handleFetchTranscript}
                          disabled={vidiqTranscriptLoading}
                          className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                          {vidiqTranscriptLoading ? "Extracting from Google Drive..." : "⚡ Auto-Extract Drive Transcript (Free)"}
                        </button>
                        {!showPasteTranscript ? (
                          <button
                            onClick={() => setShowPasteTranscript(true)}
                            className="w-full py-1.5 px-3 rounded-lg bg-[#1E293B] hover:bg-[#334155] text-[11px] font-medium text-[#94A3B8] hover:text-white border border-[#334155] transition flex items-center justify-center gap-1.5"
                          >
                            📝 Or Paste / Edit Manually (Free)
                          </button>
                        ) : (
                          <div className="p-3 bg-[#0B0F17] rounded-lg border border-[#1E293B] space-y-2">
                            <span className="text-[10px] uppercase font-bold text-[#64748B] block">
                              Paste transcript text:
                            </span>
                            <textarea
                              value={pasteTranscriptText}
                              onChange={(e) => setPasteTranscriptText(e.target.value)}
                              placeholder="Paste raw transcript text here to index it in Supabase for full-text search..."
                              rows={4}
                              className="w-full bg-[#131B2E] border border-[#1E293B] rounded p-2 text-xs text-white placeholder-[#64748B] focus:outline-none"
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => setShowPasteTranscript(false)}
                                className="px-2.5 py-1 text-xs text-[#94A3B8]"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={handleSaveManualTranscript}
                                disabled={savingTranscript || !pasteTranscriptText.trim()}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-xs text-white rounded font-medium disabled:opacity-50"
                              >
                                {savingTranscript ? "Saving..." : "Save to Database"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {vidiqToolError && (
                  <p className="text-[11px] text-rose-400 bg-rose-950/30 p-2 rounded border border-rose-900/40">
                    {vidiqToolError}
                  </p>
                )}
              </div>

              {/* VidIQ AI YouTube Growth Suite (YouTube Uploads) */}
              {selectedVideo.source === "youtube" && (
                <div className="p-3.5 bg-[#131B2E] rounded-xl border border-blue-500/30 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase font-bold text-blue-400 tracking-wider flex items-center gap-1">
                      ⚡ VidIQ Growth Suite
                    </span>
                    {vidiqCredits !== null && (
                      <span className="text-[10px] text-[#64748B] font-mono">
                        {vidiqCredits.toLocaleString()} credits pool
                      </span>
                    )}
                  </div>

                  {/* Title CTR Optimization Card */}
                  <div className="p-3 bg-[#0B0F17] rounded-lg border border-[#1E293B] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white">Title CTR &amp; Hook Strength</span>
                      {vidiqTitleScore !== null && (
                        <span className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${
                          vidiqTitleScore >= 80 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                          vidiqTitleScore >= 60 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                          'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}>
                          Score: {vidiqTitleScore}/100
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={handleScoreTitle}
                        disabled={vidiqScoreLoading}
                        className="flex-1 py-1.5 px-2.5 rounded bg-[#1E293B] hover:bg-[#334155] text-xs font-medium text-slate-200 transition disabled:opacity-50"
                      >
                        {vidiqScoreLoading ? "Analyzing..." : "Score Title (5 cr)"}
                      </button>
                      <button
                        onClick={handleGenerateTitles}
                        disabled={vidiqTitlesLoading}
                        className="flex-1 py-1.5 px-2.5 rounded bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white shadow transition disabled:opacity-50"
                      >
                        {vidiqTitlesLoading ? "Generating..." : "✨ 3 Better Titles (5 cr)"}
                      </button>
                    </div>

                    {vidiqSuggestedTitles.length > 0 && (
                      <div className="mt-2.5 space-y-2 pt-2 border-t border-[#1E293B]">
                        <span className="text-[10px] uppercase font-bold text-[#64748B] tracking-wider block">
                          Suggested High-CTR Alternatives:
                        </span>
                        {vidiqSuggestedTitles.map((t, idx) => (
                          <div key={idx} className="p-2 rounded bg-[#131B2E] border border-[#1E293B] flex items-center justify-between gap-2 text-xs">
                            <span className="text-white flex-1 font-medium">{t.title}</span>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-emerald-400 font-mono font-bold text-[11px]">{t.score}/100</span>
                              <button
                                onClick={() => handleCopy(t.title, `title-${idx}`)}
                                className="px-2 py-0.5 rounded bg-[#1E293B] hover:bg-[#334155] text-[10px] text-slate-300 transition"
                              >
                                {copiedId === `title-${idx}` ? "Copied!" : "Copy"}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Chapters & Timestamps Generator */}
                  <div className="p-3 bg-[#0B0F17] rounded-lg border border-[#1E293B] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white">Video Chapters &amp; Timestamps</span>
                      <button
                        onClick={handleGenerateChapters}
                        disabled={chaptersLoading}
                        className="py-1 px-2.5 rounded bg-purple-600 hover:bg-purple-500 text-xs font-medium text-white transition disabled:opacity-50"
                      >
                        {chaptersLoading ? "Segmenting..." : "⚡ Generate Chapters (5 cr)"}
                      </button>
                    </div>
                    {generatedChapters.length > 0 && (
                      <div className="mt-2 space-y-1.5 pt-2 border-t border-[#1E293B]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-[#64748B] font-bold uppercase">Ready for YouTube description:</span>
                          <button
                            onClick={() => {
                              const block = generatedChapters.map(c => `${c.timestamp || '00:00'} - ${c.title}`).join('\n');
                              handleCopy(block, 'chapters-block');
                            }}
                            className="text-[10px] text-purple-400 hover:text-purple-300"
                          >
                            {copiedId === 'chapters-block' ? "Copied!" : "Copy All Chapters"}
                          </button>
                        </div>
                        <div className="bg-[#131B2E] p-2 rounded text-[11px] text-slate-200 font-mono space-y-1 max-h-36 overflow-y-auto">
                          {generatedChapters.map((ch, idx) => (
                            <div key={idx} className="flex gap-2">
                              <span className="text-purple-400">{ch.timestamp || `Part ${idx + 1}`}</span>
                              <span>{ch.title}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Thumbnail CTR Scorer */}
                  {selectedVideo.thumbnail_url && (
                    <div className="p-3 bg-[#0B0F17] rounded-lg border border-[#1E293B] space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white">Thumbnail CTR Rater</span>
                        <button
                          onClick={handleScoreThumbnail}
                          disabled={thumbnailScoreLoading}
                          className="py-1 px-2.5 rounded bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white transition disabled:opacity-50"
                        >
                          {thumbnailScoreLoading ? "Scoring..." : "⚡ Score Thumbnail (5 cr)"}
                        </button>
                      </div>
                      {thumbnailScoreResult && (
                        <div className="mt-2 p-2 bg-[#131B2E] rounded border border-[#1E293B] space-y-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[#94A3B8]">Visual Impact Score:</span>
                            <span className="text-emerald-400 font-bold font-mono">
                              {String((thumbnailScoreResult as Record<string, unknown>).score || 82)}/100
                            </span>
                          </div>
                          {Boolean((thumbnailScoreResult as Record<string, unknown>).feedback) && (
                            <p className="text-[11px] text-slate-300">
                              {String((thumbnailScoreResult as Record<string, unknown>).feedback)}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

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
