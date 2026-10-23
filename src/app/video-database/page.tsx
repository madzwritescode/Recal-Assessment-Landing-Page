/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { RecalVideoRecord } from "@/lib/supabase";
import { classifyVideo } from "@/lib/video-sync/classifier";
import {
  VideoAnnotation,
  AnnotationUsageStatus,
  PRESET_ANNOTATION_TOPICS,
  formatSecondsToTimestamp,
  parseTimestampInput,
  getStatusBadgeStyle,
} from "@/lib/video-sync/annotations";

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
  const [activeMainTab, setActiveMainTab] = useState<"catalog" | "annotations" | "research">("catalog");
  const [searchMode, setSearchMode] = useState<"all" | "metadata" | "transcript">("all");

  // Video Annotations & Clip Repurposing State (Supabase-persisted)
  const [annotations, setAnnotations] = useState<VideoAnnotation[]>([]);
  const [annotationsLoading, setAnnotationsLoading] = useState<boolean>(false);
  const [annotatedOnlyFilter, setAnnotatedOnlyFilter] = useState<boolean>(false);

  // Annotations Tab Filters
  const [annStatusFilter, setAnnStatusFilter] = useState<"all" | AnnotationUsageStatus>("all");
  const [annTopicFilter, setAnnTopicFilter] = useState<string>("all");
  const [annSourceFilter, setAnnSourceFilter] = useState<"all" | "youtube" | "gdrive">("all");
  const [annSearchQuery, setAnnSearchQuery] = useState<string>("");

  // Drawer Player & Timestamp Capture State
  const driveVideoRef = useRef<HTMLVideoElement | null>(null);
  const youtubeIframeRef = useRef<HTMLIFrameElement | null>(null);
  const [playerCurrentTime, setPlayerCurrentTime] = useState<number>(0);
  const [drivePlayerMode, setDrivePlayerMode] = useState<"native" | "embed">("native");
  const [youtubeStartSeconds, setYoutubeStartSeconds] = useState<number>(0);
  const [youtubeEndSeconds, setYoutubeEndSeconds] = useState<number | null>(null);
  const [activeClipRange, setActiveClipRange] = useState<{
    id?: string;
    start: number;
    end: number | null;
  } | null>(null);

  // New Annotation Form State (inside Drawer)
  const [annStartInput, setAnnStartInput] = useState<string>("00:00");
  const [annEndInput, setAnnEndInput] = useState<string>("");
  const [annTopic, setAnnTopic] = useState<string>("Kilimanjaro");
  const [annCustomTopic, setAnnCustomTopic] = useState<string>("");
  const [annComment, setAnnComment] = useState<string>("");
  const [annAuthor, setAnnAuthor] = useState<string>("Anthony");
  const [annSaving, setAnnSaving] = useState<boolean>(false);
  const [annError, setAnnError] = useState<string | null>(null);

  // Editing Existing Annotation State
  const [editingAnnId, setEditingAnnId] = useState<string | null>(null);
  const [editingStartInput, setEditingStartInput] = useState<string>("");
  const [editingEndInput, setEditingEndInput] = useState<string>("");
  const [editingTopic, setEditingTopic] = useState<string>("");
  const [editingComment, setEditingComment] = useState<string>("");
  const [editingUsedFor, setEditingUsedFor] = useState<string>("");
  const [downloadingClipId, setDownloadingClipId] = useState<string | null>(null);

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
  const searchRef = useRef<string>("");
  searchRef.current = search;
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

  // Fetch all persisted video annotations from Supabase
  const fetchAnnotations = useCallback(async () => {
    setAnnotationsLoading(true);
    try {
      const res = await fetch("/api/video-database/annotations");
      if (res.ok) {
        const data = await res.json();
        setAnnotations(Array.isArray(data.annotations) ? data.annotations : []);
      }
    } catch (err) {
      console.error("Error fetching annotations:", err);
    } finally {
      setAnnotationsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchAnnotations();
  }, [fetchStatus, fetchAnnotations]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  // Listen to YouTube IFrame Player postMessage events for live timestamp tracking & clip end auto-pause
  useEffect(() => {
    if (!selectedVideo || selectedVideo.source !== "youtube") return;

    const handleMessage = (event: MessageEvent) => {
      if (!event.origin.includes("youtube")) return;
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data?.event === "infoDelivery" && typeof data?.info?.currentTime === "number") {
          const curSec = Math.floor(data.info.currentTime);
          setPlayerCurrentTime(curSec);

          if (
            activeClipRange?.end !== null &&
            activeClipRange?.end !== undefined &&
            data.info.currentTime >= activeClipRange.end
          ) {
            youtubeIframeRef.current?.contentWindow?.postMessage(
              JSON.stringify({ event: "command", func: "pauseVideo", args: [] }),
              "*"
            );
          }
        }
      } catch {
        // Ignore non-JSON postMessages
      }
    };

    window.addEventListener("message", handleMessage);

    // Poll / subscribe to YouTube iframe listening event once loaded
    const timer = setInterval(() => {
      if (youtubeIframeRef.current?.contentWindow) {
        youtubeIframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: "listening", id: 1, channel: "widget" }),
          "*"
        );
      }
    }, 1500);

    return () => {
      window.removeEventListener("message", handleMessage);
      clearInterval(timer);
    };
  }, [selectedVideo, activeClipRange]);

  // Group annotations by video_source_id for fast badge lookup in catalog
  const annotationsByVideo = useMemo(() => {
    const map: Record<string, VideoAnnotation[]> = {};
    for (const ann of annotations) {
      if (!map[ann.video_source_id]) {
        map[ann.video_source_id] = [];
      }
      map[ann.video_source_id].push(ann);
    }
    for (const vidId of Object.keys(map)) {
      map[vidId].sort((a, b) => a.start_seconds - b.start_seconds);
    }
    return map;
  }, [annotations]);

  // Annotations for the currently open video in Drawer
  const selectedVideoAnnotations = useMemo(() => {
    if (!selectedVideo) return [];
    return annotationsByVideo[selectedVideo.source_id] || [];
  }, [selectedVideo, annotationsByVideo]);

  // Global Annotation KPI Counts & Unique Topics
  const annotationStats = useMemo(() => {
    const total = annotations.length;
    const unused = annotations.filter((a) => a.status === "unused").length;
    const inProgress = annotations.filter((a) => a.status === "in_progress").length;
    const used = annotations.filter((a) => a.status === "used").length;
    const uniqueVideos = new Set(annotations.map((a) => a.video_source_id)).size;
    return { total, unused, inProgress, used, uniqueVideos };
  }, [annotations]);

  const allAvailableTopics = useMemo(() => {
    const set = new Set<string>(PRESET_ANNOTATION_TOPICS);
    for (const a of annotations) {
      if (a.topic) set.add(a.topic);
    }
    return Array.from(set);
  }, [annotations]);

  // Filtered annotations for the global "Annotated Clips Queue" tab
  const filteredGlobalAnnotations = useMemo(() => {
    const q = annSearchQuery.trim().toLowerCase();
    return annotations.filter((a) => {
      if (annStatusFilter !== "all" && a.status !== annStatusFilter) return false;
      if (annTopicFilter !== "all" && a.topic.toLowerCase() !== annTopicFilter.toLowerCase()) return false;
      if (annSourceFilter !== "all" && a.video_source !== annSourceFilter) return false;
      if (q) {
        const hay = `${a.comment} ${a.topic} ${a.video_title} ${a.author || ""} ${a.used_for || ""} ${a.video_folder_path || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [annotations, annStatusFilter, annTopicFilter, annSourceFilter, annSearchQuery]);

  // Smart capture helpers for Start Time and End Time so End Time is never stuck <= Start Time
  const handleCaptureStartTime = useCallback(
    (sec: number) => {
      const targetStart = Math.max(0, Math.floor(sec));
      const prevStart = parseTimestampInput(annStartInput) ?? 0;
      const prevEnd = annEndInput.trim() ? parseTimestampInput(annEndInput) : null;

      setAnnStartInput(formatSecondsToTimestamp(targetStart));
      setAnnError(null);

      // If the user already set an End Time (e.g. via +15s/+30s/+60s) before capturing Start Time,
      // preserve that clip duration relative to the new Start Time so End Time doesn't stay behind Start Time!
      if (prevEnd !== null) {
        const prevDuration = prevEnd > prevStart ? prevEnd - prevStart : 30;
        if (prevEnd <= targetStart || prevStart === 0) {
          setAnnEndInput(formatSecondsToTimestamp(targetStart + prevDuration));
        }
      }
    },
    [annStartInput, annEndInput]
  );

  const handleCaptureEndTime = useCallback(
    (sec: number) => {
      const currentStart = parseTimestampInput(annStartInput) ?? 0;
      const rawEnd = Math.max(0, Math.floor(sec));
      setAnnError(null);

      // If the video is paused at or before Start Time when clicking Capture End, advance by 30s instead of setting End == Start
      if (rawEnd <= currentStart) {
        setAnnEndInput(formatSecondsToTimestamp(currentStart + 30));
      } else {
        setAnnEndInput(formatSecondsToTimestamp(rawEnd));
      }
    },
    [annStartInput]
  );

  // Seek current Drawer video player to specific [startSeconds, endSeconds] clip range
  const seekPlayerTo = useCallback(
    (startSeconds: number, endSeconds?: number | null, clipId?: string) => {
      const targetSec = Math.max(0, Math.floor(startSeconds));
      const validEnd =
        endSeconds !== null && endSeconds !== undefined && endSeconds > targetSec
          ? Math.floor(endSeconds)
          : null;

      setPlayerCurrentTime(targetSec);
      setActiveClipRange({ id: clipId, start: targetSec, end: validEnd });

      if (!selectedVideo) return;

      if (selectedVideo.source === "youtube") {
        setYoutubeStartSeconds(targetSec);
        setYoutubeEndSeconds(validEnd);
        if (youtubeIframeRef.current?.contentWindow) {
          youtubeIframeRef.current.contentWindow.postMessage(
            JSON.stringify({ event: "command", func: "seekTo", args: [targetSec, true] }),
            "*"
          );
          youtubeIframeRef.current.contentWindow.postMessage(
            JSON.stringify({ event: "command", func: "playVideo", args: [] }),
            "*"
          );
        }
      } else {
        if (drivePlayerMode === "native" && driveVideoRef.current) {
          driveVideoRef.current.currentTime = targetSec;
          driveVideoRef.current.play().catch(() => {});
        } else {
          // Switch to native mode and seek once loaded
          setDrivePlayerMode("native");
          setTimeout(() => {
            if (driveVideoRef.current) {
              driveVideoRef.current.currentTime = targetSec;
              driveVideoRef.current.play().catch(() => {});
            }
          }, 300);
        }
      }
    },
    [selectedVideo, drivePlayerMode]
  );

  // Open any video from the Global Annotations Queue and jump straight to its clip [start, end] range
  const handleOpenAnnotationClip = useCallback(
    (ann: VideoAnnotation) => {
      const found = videos.find((v) => v.source_id === ann.video_source_id);
      const record: RecalVideoRecord = found || {
        source: ann.video_source,
        source_id: ann.video_source_id,
        title: ann.video_title,
        folder_path: ann.video_folder_path || "Recal Marketing",
        direct_url: ann.video_direct_url,
        thumbnail_url: ann.video_thumbnail_url || null,
        privacy_status: "unlisted",
        is_live: false,
        duration_seconds: 0,
        status: "active",
      };

      const validEnd =
        ann.end_seconds !== null && ann.end_seconds !== undefined && ann.end_seconds > ann.start_seconds
          ? ann.end_seconds
          : null;

      setSelectedVideo(record);
      setYoutubeStartSeconds(ann.start_seconds);
      setYoutubeEndSeconds(validEnd);
      setPlayerCurrentTime(ann.start_seconds);
      setActiveClipRange({ id: ann.id, start: ann.start_seconds, end: validEnd });

      setTimeout(() => {
        if (record.source === "gdrive" && driveVideoRef.current) {
          driveVideoRef.current.currentTime = ann.start_seconds;
        } else if (record.source === "youtube" && youtubeIframeRef.current?.contentWindow) {
          youtubeIframeRef.current.contentWindow.postMessage(
            JSON.stringify({ event: "command", func: "seekTo", args: [ann.start_seconds, true] }),
            "*"
          );
          youtubeIframeRef.current.contentWindow.postMessage(
            JSON.stringify({ event: "command", func: "pauseVideo", args: [] }),
            "*"
          );
        }
      }, 450);
    },
    [videos]
  );

  // Open a video from search results and jump to the exact moment a spoken phrase was said
  const handleOpenVideoAtTime = useCallback((video: RecalVideoRecord, seconds: number) => {
    const targetSec = Math.max(0, Math.floor(seconds));
    setSelectedVideo(video);
    setYoutubeStartSeconds(targetSec);
    setYoutubeEndSeconds(null);
    setPlayerCurrentTime(targetSec);
    setActiveClipRange({ start: targetSec, end: null });

    setTimeout(() => {
      if (video.source === "gdrive" && driveVideoRef.current) {
        driveVideoRef.current.currentTime = targetSec;
      } else if (video.source === "youtube" && youtubeIframeRef.current?.contentWindow) {
        youtubeIframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: "command", func: "seekTo", args: [targetSec, true] }),
          "*"
        );
        youtubeIframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: "command", func: "pauseVideo", args: [] }),
          "*"
        );
      }
    }, 450);
  }, []);

  // Create a new timestamped clip annotation
  const handleAddAnnotation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedVideo) return;

    const parsedStart = parseTimestampInput(annStartInput);
    if (parsedStart === null) {
      setAnnError("Please enter a valid start timestamp (e.g. 01:30 or 90).");
      return;
    }

    const parsedEnd = annEndInput.trim() ? parseTimestampInput(annEndInput) : null;
    if (annEndInput.trim() && parsedEnd === null) {
      setAnnError("Please enter a valid end timestamp (e.g. 02:15) or leave blank.");
      return;
    }

    // If the user typed a short number/offset (e.g. "30" or "00:30") into End Time that is <= Start Time,
    // or if End Time is accidentally <= Start Time, alert them clearly so it never saves Start == End!
    if (parsedEnd !== null && parsedEnd <= parsedStart) {
      setAnnError(
        `End Time (${formatSecondsToTimestamp(parsedEnd)}) must be after Start Time (${formatSecondsToTimestamp(
          parsedStart
        )}). Click +15s / +30s / +60s or scrub the player forward before capturing End Time.`
      );
      return;
    }

    if (!annComment.trim()) {
      setAnnError("Please add a comment or instruction for this clip (e.g. 'Use this portion for Kilimanjaro topic').");
      return;
    }

    const resolvedTopic =
      annTopic === "__custom__"
        ? annCustomTopic.trim() || "General"
        : annTopic || "General";

    setAnnSaving(true);
    setAnnError(null);

    try {
      const res = await fetch("/api/video-database/annotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video_source_id: selectedVideo.source_id,
          video_source: selectedVideo.source,
          video_title: selectedVideo.title,
          video_folder_path: selectedVideo.folder_path,
          video_direct_url: selectedVideo.direct_url,
          video_thumbnail_url: selectedVideo.thumbnail_url,
          start_seconds: parsedStart,
          end_seconds: parsedEnd,
          topic: resolvedTopic,
          comment: annComment.trim(),
          author: annAuthor.trim() || "Anthony",
          status: "unused",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAnnError(data.error || "Failed to save annotation.");
      } else {
        if (Array.isArray(data.annotations)) {
          setAnnotations(data.annotations);
        } else if (data.annotation) {
          setAnnotations((prev) => [data.annotation, ...prev]);
        }
        setAnnComment("");
        setAnnEndInput("");
        setAnnStartInput(formatSecondsToTimestamp(playerCurrentTime));
      }
    } catch (err) {
      setAnnError(err instanceof Error ? err.message : "Network error saving annotation.");
    } finally {
      setAnnSaving(false);
    }
  };

  // Update annotation status or fields
  const handleUpdateAnnotation = async (
    id: string,
    updates: Partial<{
      status: AnnotationUsageStatus;
      comment: string;
      topic: string;
      start_seconds: number;
      end_seconds: number | null;
      used_for: string | null;
    }>
  ) => {
    // Optimistic update
    setAnnotations((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              ...updates,
              start_formatted:
                updates.start_seconds !== undefined
                  ? formatSecondsToTimestamp(updates.start_seconds)
                  : a.start_formatted,
              end_formatted:
                updates.end_seconds !== undefined
                  ? updates.end_seconds !== null
                    ? formatSecondsToTimestamp(updates.end_seconds)
                    : null
                  : a.end_formatted,
              updated_at: new Date().toISOString(),
            }
          : a
      )
    );

    try {
      const res = await fetch("/api/video-database/annotations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.annotations)) {
          setAnnotations(data.annotations);
        }
      }
    } catch (err) {
      console.error("Failed to update annotation:", err);
    }
  };

  // Save inline edit of an existing annotation
  const handleSaveEditedAnnotation = async (id: string) => {
    const parsedStart = parseTimestampInput(editingStartInput);
    const parsedEnd = editingEndInput.trim() ? parseTimestampInput(editingEndInput) : null;

    await handleUpdateAnnotation(id, {
      start_seconds: parsedStart !== null ? parsedStart : 0,
      end_seconds: parsedEnd,
      topic: editingTopic.trim() || "General",
      comment: editingComment.trim(),
      used_for: editingUsedFor.trim() || null,
    });
    setEditingAnnId(null);
  };

  // Delete an annotation permanently
  const handleDeleteAnnotation = async (id: string) => {
    if (!confirm("Delete this timestamp annotation permanently?")) return;

    setAnnotations((prev) => prev.filter((a) => a.id !== id));
    try {
      await fetch(`/api/video-database/annotations?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.error("Failed to delete annotation:", err);
    }
  };

  // Trim and download the exact annotated video clip locally as an .mp4 file
  const handleDownloadAnnotationClip = async (ann: VideoAnnotation) => {
    if (ann.video_source !== "gdrive") {
      window.open(
        `https://www.youtube.com/watch?v=${ann.video_source_id}&t=${ann.start_seconds}s`,
        "_blank",
        "noopener,noreferrer"
      );
      return;
    }

    setDownloadingClipId(ann.id);
    try {
      const endSec =
        ann.end_seconds !== null && ann.end_seconds !== undefined && ann.end_seconds > ann.start_seconds
          ? ann.end_seconds
          : ann.start_seconds + 30;

      const params = new URLSearchParams({
        fileId: ann.video_source_id,
        start: String(ann.start_seconds),
        end: String(endSec),
        title: ann.video_title,
        topic: ann.topic,
      });

      const res = await fetch(`/api/video-database/clip?${params.toString()}`);
      if (!res.ok) {
        let errText = "Failed to extract clip";
        try {
          const errJson = await res.json();
          if (errJson.error) errText = errJson.error;
        } catch {}
        alert(`Could not download clip: ${errText}`);
        return;
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename =
        match?.[1] ||
        `${ann.video_title.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 40)}_${ann.start_formatted.replace(/:/g, "m")}s.mp4`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (err) {
      console.error("Clip download failed:", err);
      alert("Error downloading video clip. Please try again.");
    } finally {
      setDownloadingClipId(null);
    }
  };

  // Export Annotated Clips to CSV
  const handleExportAnnotationsCsv = () => {
    if (filteredGlobalAnnotations.length === 0) return;

    const headers = [
      "Status",
      "Topic / Use-Case",
      "Start Timestamp",
      "End Timestamp",
      "Comment / Instruction",
      "Used In / Published Where",
      "Author",
      "Video Title",
      "Platform",
      "Folder Path",
      "Direct URL",
      "Created At",
    ];

    const escapeCsv = (val: string | number | null | undefined) => {
      const str = String(val ?? "");
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = filteredGlobalAnnotations.map((a) => [
      getStatusBadgeStyle(a.status).label,
      a.topic,
      a.start_formatted,
      a.end_formatted || "",
      a.comment,
      a.used_for || "",
      a.author,
      a.video_title,
      a.video_source,
      a.video_folder_path || "",
      a.video_direct_url,
      new Date(a.created_at).toLocaleDateString(),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.map(escapeCsv).join(","), ...rows.map((r) => r.map(escapeCsv).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `recal-annotated-clips-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

  // Update Drawer Note & Annotation Form when selected video changes
  useEffect(() => {
    if (selectedVideo) {
      setDrawerNote(notesMap[selectedVideo.source_id] || "");
      // Also pre-load existing database transcript into drawer if present
      setVidiqTranscript(selectedVideo.transcript || null);
    } else {
      setVidiqTranscript(null);
      setActiveClipRange(null);
      setYoutubeStartSeconds(0);
      setYoutubeEndSeconds(null);
      setPlayerCurrentTime(0);
    }
    setVidiqTitleScore(null);
    setVidiqSuggestedTitles([]);
    setTranscriptSearch(selectedVideo ? searchRef.current : "");
    setVidiqToolError(null);
    setAnnStartInput("00:00");
    setAnnEndInput("");
    setAnnComment("");
    setAnnError(null);
    setEditingAnnId(null);
  }, [selectedVideo, notesMap]);

  // Wrap every case-insensitive occurrence of `term` in a highlighted <mark>
  const highlightText = (text: string, term: string) => {
    const t = term.trim();
    if (!t) return text;
    const re = new RegExp(`(${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    return text.split(re).map((part, i) =>
      part.toLowerCase() === t.toLowerCase() ? (
        <mark key={i} className="bg-amber-400/30 text-amber-200 rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const renderTranscriptHits = (video: RecalVideoRecord) => {
    const hits = video.transcript_matches || [];
    if (!hits.length) return null;
    return (
      <div className="mt-1.5 space-y-1" onClick={(e) => e.stopPropagation()}>
        {hits.map((hit, idx) => (
          <button
            key={`${video.source_id}-hit-${idx}`}
            onClick={(e) => {
              e.stopPropagation();
              handleOpenVideoAtTime(video, hit.timestamp_seconds);
            }}
            className="w-full flex items-start gap-1.5 text-left text-[11px] text-slate-300 hover:text-white bg-[#0B0F17] hover:bg-[#1E293B] border border-[#1E293B] rounded px-1.5 py-1 transition"
            title={hit.is_exact ? "Jump to this moment" : "Approximate position — estimated from transcript length"}
          >
            <span className="shrink-0 font-mono text-[10px] px-1 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {hit.is_exact ? "" : "~"}
              {hit.timestamp_formatted}
            </span>
            <span className="line-clamp-2">{highlightText(hit.snippet, search)}</span>
          </button>
        ))}
      </div>
    );
  };

  // Filter videos locally by Orientation, Category, Starred & Annotated
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
      if (annotatedOnlyFilter && (!annotationsByVideo[video.source_id] || annotationsByVideo[video.source_id].length === 0)) {
        return false;
      }
      return true;
    });
  }, [videos, orientationFilter, categoryFilter, starredOnly, starredMap, annotatedOnlyFilter, annotationsByVideo]);

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
        {/* Main Section Navigation: Video Library vs Annotated Clips Queue vs YouTube Ideation */}
        <div className="flex items-center gap-2 border-b border-[#1E293B] pb-3 flex-wrap">
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
            onClick={() => setActiveMainTab("annotations")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 cursor-pointer ${
              activeMainTab === "annotations"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
                : "bg-[#131B2E] text-[#94A3B8] hover:text-white border border-[#1E293B]"
            }`}
          >
            <span>✂️</span>
            <span>Annotated Clips Queue ({annotationStats.total})</span>
            {annotationStats.unused > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 font-mono">
                {annotationStats.unused} ready
              </span>
            )}
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

            {/* Source Tab Toggle & Starred / Annotated Filter */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setStarredOnly(!starredOnly)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                  starredOnly
                    ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                    : "bg-[#0B0F17] text-[#94A3B8] border-[#1E293B] hover:text-white"
                }`}
                title="Filter by starred/favorite assets"
              >
                <span>⭐</span>
                <span>Favorites</span>
              </button>

              <button
                onClick={() => setAnnotatedOnlyFilter(!annotatedOnlyFilter)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                  annotatedOnlyFilter
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    : "bg-[#0B0F17] text-[#94A3B8] border-[#1E293B] hover:text-white"
                }`}
                title="Show only videos on the current page that have timestamp annotations"
              >
                <span>✂️</span>
                <span>Annotated ({annotationStats.uniqueVideos})</span>
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
                    const videoClips = annotationsByVideo[video.source_id] || [];
                    const unusedClipsCount = videoClips.filter((c) => c.status === "unused").length;

                    return (
                      <tr
                        key={video.source_id}
                        onClick={() =>
                          video.transcript_matches && video.transcript_matches.length > 0
                            ? handleOpenVideoAtTime(video, video.transcript_matches[0].timestamp_seconds)
                            : setSelectedVideo(video)
                        }
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
                              <span className="font-semibold text-white group-hover:text-blue-400 transition truncate block flex items-center gap-1.5 flex-wrap">
                                <span className="truncate">{video.title}</span>
                                {videoClips.length > 0 && (
                                  <span
                                    className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold shrink-0 ${
                                      unusedClipsCount > 0
                                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                        : "bg-blue-500/20 text-blue-300 border-blue-500/30"
                                    }`}
                                    title={`${videoClips.length} annotated clip(s) (${unusedClipsCount} unused/ready)`}
                                  >
                                    ✂️ {videoClips.length} {videoClips.length === 1 ? "clip" : "clips"}
                                  </span>
                                )}
                                {hasNote && (
                                  <span className="text-[9px] px-1 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 font-normal shrink-0">
                                    📝 Note
                                  </span>
                                )}
                              </span>
                              <span className="text-[11px] text-[#64748B] truncate block flex items-center gap-1 mt-0.5">
                                <span className="opacity-75">📍</span>
                                {video.folder_path || "Recal Media"}
                              </span>
                              {renderTranscriptHits(video)}
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
                const videoClips = annotationsByVideo[video.source_id] || [];
                const unusedClipsCount = videoClips.filter((c) => c.status === "unused").length;

                return (
                  <div
                    key={video.source_id}
                    onClick={() =>
                          video.transcript_matches && video.transcript_matches.length > 0
                            ? handleOpenVideoAtTime(video, video.transcript_matches[0].timestamp_seconds)
                            : setSelectedVideo(video)
                        }
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

                      {/* Annotated Clips Badge on Thumbnail */}
                      {videoClips.length > 0 && (
                        <div
                          className={`absolute bottom-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold border shadow ${
                            unusedClipsCount > 0
                              ? "bg-emerald-950/90 text-emerald-300 border-emerald-500/50"
                              : "bg-blue-950/90 text-blue-300 border-blue-500/50"
                          }`}
                        >
                          ✂️ {videoClips.length} {videoClips.length === 1 ? "clip" : "clips"}
                        </div>
                      )}

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
                        {renderTranscriptHits(video)}
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

        {/* Annotated Clips & Repurposing Queue Tab */}
        {activeMainTab === "annotations" && (
          <div className="space-y-6">
            {/* Header & KPI Overview */}
            <div className="p-6 bg-gradient-to-r from-emerald-950/40 via-[#131B2E] to-blue-950/40 border border-emerald-500/20 rounded-2xl space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">✂️</span>
                    <h2 className="text-lg font-bold text-white">Timestamped Clip Annotations &amp; Repurposing Tracker</h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold uppercase tracking-wider">
                      Shared Team Queue
                    </span>
                  </div>
                  <p className="text-xs text-[#94A3B8] mt-1 max-w-3xl leading-relaxed">
                    All timestamped footage segments and notes saved by Anthony and the team across Google Drive &amp; YouTube. Click any clip&apos;s timestamp to launch the video player directly at that exact moment, or update its usage status as clips get edited and published.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={fetchAnnotations}
                    disabled={annotationsLoading}
                    className="px-3 py-2 rounded-xl bg-[#0B0F17] hover:bg-[#1E293B] border border-[#1E293B] text-xs font-medium text-slate-300 transition cursor-pointer"
                  >
                    {annotationsLoading ? "Refreshing..." : "↻ Refresh Queue"}
                  </button>
                  <button
                    onClick={handleExportAnnotationsCsv}
                    disabled={filteredGlobalAnnotations.length === 0}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-xs font-semibold text-white shadow-md shadow-emerald-500/20 transition cursor-pointer"
                  >
                    ⬇ Export Clips CSV ({filteredGlobalAnnotations.length})
                  </button>
                </div>
              </div>

              {/* Interactive KPI Status Filter Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div
                  onClick={() => setAnnStatusFilter("all")}
                  className={`p-3.5 rounded-xl border cursor-pointer transition ${
                    annStatusFilter === "all"
                      ? "bg-[#0B0F17] border-white/40 ring-1 ring-white/30"
                      : "bg-[#0B0F17]/70 border-[#1E293B] hover:border-slate-600"
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] block">Total Annotated Clips</span>
                  <span className="text-2xl font-bold text-white mt-1 block">{annotationStats.total}</span>
                  <span className="text-[11px] text-[#64748B] block">Across {annotationStats.uniqueVideos} videos</span>
                </div>

                <div
                  onClick={() => setAnnStatusFilter(annStatusFilter === "unused" ? "all" : "unused")}
                  className={`p-3.5 rounded-xl border cursor-pointer transition ${
                    annStatusFilter === "unused"
                      ? "bg-emerald-950/60 border-emerald-400 ring-1 ring-emerald-400"
                      : "bg-[#0B0F17]/70 border-[#1E293B] hover:border-emerald-500/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 block">Unused / Ready</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  </div>
                  <span className="text-2xl font-bold text-emerald-400 mt-1 block">{annotationStats.unused}</span>
                  <span className="text-[11px] text-emerald-300/70 block">
                    {annStatusFilter === "unused" ? "✓ Filter Active" : "Ready to cut/use"}
                  </span>
                </div>

                <div
                  onClick={() => setAnnStatusFilter(annStatusFilter === "in_progress" ? "all" : "in_progress")}
                  className={`p-3.5 rounded-xl border cursor-pointer transition ${
                    annStatusFilter === "in_progress"
                      ? "bg-amber-950/60 border-amber-400 ring-1 ring-amber-400"
                      : "bg-[#0B0F17]/70 border-[#1E293B] hover:border-amber-500/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 block">In Editing</span>
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  </div>
                  <span className="text-2xl font-bold text-amber-400 mt-1 block">{annotationStats.inProgress}</span>
                  <span className="text-[11px] text-amber-300/70 block">
                    {annStatusFilter === "in_progress" ? "✓ Filter Active" : "Being edited now"}
                  </span>
                </div>

                <div
                  onClick={() => setAnnStatusFilter(annStatusFilter === "used" ? "all" : "used")}
                  className={`p-3.5 rounded-xl border cursor-pointer transition ${
                    annStatusFilter === "used"
                      ? "bg-blue-950/60 border-blue-400 ring-1 ring-blue-400"
                      : "bg-[#0B0F17]/70 border-[#1E293B] hover:border-blue-500/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300 block">Used / Published</span>
                    <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                  </div>
                  <span className="text-2xl font-bold text-blue-400 mt-1 block">{annotationStats.used}</span>
                  <span className="text-[11px] text-blue-300/70 block">
                    {annStatusFilter === "used" ? "✓ Filter Active" : "Completed & deployed"}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border bg-[#0B0F17]/70 border-[#1E293B]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] block">Annotated Videos</span>
                  <span className="text-2xl font-bold text-indigo-400 mt-1 block">{annotationStats.uniqueVideos}</span>
                  <span className="text-[11px] text-[#64748B] block">Source videos with clips</span>
                </div>
              </div>
            </div>

            {/* Filter & Search Toolbar for Annotations */}
            <div className="bg-[#131B2E] border border-[#1E293B] rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={annSearchQuery}
                  onChange={(e) => setAnnSearchQuery(e.target.value)}
                  placeholder="Search clip comments, topics (e.g. 'Kilimanjaro', 'CO2'), video titles, or where used..."
                  className="w-full pl-3.5 pr-9 py-2 bg-[#0B0F17] border border-[#1E293B] rounded-lg text-xs text-white placeholder-[#64748B] focus:outline-none focus:border-emerald-500"
                />
                {annSearchQuery && (
                  <button
                    onClick={() => setAnnSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#64748B] hover:text-white"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap text-xs">
                <select
                  value={annStatusFilter}
                  onChange={(e) => setAnnStatusFilter(e.target.value as "all" | AnnotationUsageStatus)}
                  className="bg-[#0B0F17] border border-[#1E293B] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="all">All Usage Statuses</option>
                  <option value="unused">🟢 Unused / Ready</option>
                  <option value="in_progress">🟡 In Editing</option>
                  <option value="used">🔵 Used / Published</option>
                </select>

                <select
                  value={annTopicFilter}
                  onChange={(e) => setAnnTopicFilter(e.target.value)}
                  className="bg-[#0B0F17] border border-[#1E293B] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="all">All Topics / Pillars</option>
                  {allAvailableTopics.map((t) => (
                    <option key={t} value={t}>
                      🏷️ {t}
                    </option>
                  ))}
                </select>

                <select
                  value={annSourceFilter}
                  onChange={(e) => setAnnSourceFilter(e.target.value as "all" | "youtube" | "gdrive")}
                  className="bg-[#0B0F17] border border-[#1E293B] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="all">All Platforms</option>
                  <option value="gdrive">📁 Google Drive</option>
                  <option value="youtube">▶ YouTube</option>
                </select>
              </div>
            </div>

            {/* Annotations Table / Cards */}
            {filteredGlobalAnnotations.length === 0 ? (
              <div className="bg-[#131B2E] border border-[#1E293B] rounded-xl p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center text-xl">
                  ✂️
                </div>
                <h3 className="text-base font-semibold text-white">
                  {annotations.length === 0 ? "No timestamped clip annotations yet" : "No clips match your current filters"}
                </h3>
                <p className="text-xs text-[#94A3B8] max-w-md mx-auto">
                  {annotations.length === 0
                    ? "Click any video in the Video Asset Library to open the player, capture a timestamp, and leave a note like 'Use this portion for X topic'."
                    : "Try clearing the search or switching the status/topic filters above."}
                </p>
                {annotations.length === 0 && (
                  <button
                    onClick={() => setActiveMainTab("catalog")}
                    className="mt-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition cursor-pointer"
                  >
                    Browse Video Library to Add Annotations →
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-[#131B2E] border border-[#1E293B] rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0E1526] text-[#94A3B8] uppercase text-[10px] tracking-wider border-b border-[#1E293B]">
                      <tr>
                        <th className="py-3 px-4">Clip Timestamp</th>
                        <th className="py-3 px-4">Topic &amp; Annotation Comment</th>
                        <th className="py-3 px-4">Source Video Asset</th>
                        <th className="py-3 px-4">Usage Status &amp; Where Used</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1E293B]/70">
                      {filteredGlobalAnnotations.map((ann) => {
                        const badge = getStatusBadgeStyle(ann.status);
                        return (
                          <tr key={ann.id} className="hover:bg-[#1E293B]/40 transition align-top">
                            {/* Timestamp Play Button */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <button
                                onClick={() => handleOpenAnnotationClip(ann)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 font-mono text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                                title="Open video player and jump directly to this timestamp"
                              >
                                <span>▶</span>
                                <span>
                                  {ann.start_formatted}
                                  {ann.end_formatted ? ` – ${ann.end_formatted}` : ""}
                                </span>
                              </button>
                              <span className="text-[10px] text-[#64748B] block mt-1">
                                By {ann.author || "Anthony"} • {new Date(ann.created_at).toLocaleDateString()}
                              </span>
                            </td>

                            {/* Topic & Comment */}
                            <td className="py-3.5 px-4 max-w-md space-y-1.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-[10px] font-semibold">
                                  🏷️ {ann.topic}
                                </span>
                              </div>
                              <p className="text-white text-xs leading-relaxed whitespace-pre-wrap font-medium">
                                {ann.comment}
                              </p>
                            </td>

                            {/* Source Video */}
                            <td className="py-3.5 px-4 max-w-xs">
                              <button
                                onClick={() => handleOpenAnnotationClip(ann)}
                                className="text-left group cursor-pointer"
                              >
                                <span className="text-white font-semibold group-hover:text-blue-400 transition line-clamp-1 block">
                                  {ann.video_title}
                                </span>
                                <span className="text-[11px] text-[#64748B] line-clamp-1 block mt-0.5">
                                  {ann.video_source === "youtube" ? "▶ YouTube" : "📁 Drive"} • {ann.video_folder_path || "Recal Media"}
                                </span>
                              </button>
                            </td>

                            {/* Usage Status & Used For */}
                            <td className="py-3.5 px-4 min-w-[220px] space-y-2">
                              <div className="flex items-center gap-2">
                                <select
                                  value={ann.status}
                                  onChange={(e) =>
                                    handleUpdateAnnotation(ann.id, {
                                      status: e.target.value as AnnotationUsageStatus,
                                    })
                                  }
                                  className={`px-2.5 py-1 rounded-lg border text-xs font-semibold focus:outline-none cursor-pointer ${badge.classes} bg-[#0B0F17]`}
                                >
                                  <option value="unused">🟢 Unused / Ready</option>
                                  <option value="in_progress">🟡 In Editing</option>
                                  <option value="used">🔵 Used / Published</option>
                                </select>
                              </div>
                              <input
                                type="text"
                                defaultValue={ann.used_for || ""}
                                onBlur={(e) => {
                                  const nextVal = e.target.value.trim() || null;
                                  if (nextVal !== (ann.used_for || null)) {
                                    handleUpdateAnnotation(ann.id, { used_for: nextVal });
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    (e.target as HTMLInputElement).blur();
                                  }
                                }}
                                placeholder="Where used? (e.g. 'IG Reel Oct 20', 'Kili Ad')..."
                                className="w-full px-2.5 py-1 bg-[#0B0F17] border border-[#1E293B] rounded text-[11px] text-slate-200 placeholder-[#64748B] focus:outline-none focus:border-blue-500"
                              />
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                {ann.video_source === "gdrive" ? (
                                  <button
                                    onClick={() => handleDownloadAnnotationClip(ann)}
                                    disabled={downloadingClipId === ann.id}
                                    className="px-2.5 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/35 disabled:opacity-50 text-emerald-300 border border-emerald-500/40 text-[11px] font-semibold transition cursor-pointer flex items-center gap-1"
                                    title={
                                      ann.end_formatted
                                        ? `Download trimmed MP4 clip (${ann.start_formatted} – ${ann.end_formatted})`
                                        : `Download 30s MP4 clip starting at ${ann.start_formatted}`
                                    }
                                  >
                                    {downloadingClipId === ann.id ? (
                                      <>
                                        <span className="w-3 h-3 border-2 border-emerald-300 border-t-transparent rounded-full animate-spin inline-block"></span>
                                        <span>Cutting MP4...</span>
                                      </>
                                    ) : (
                                      <>
                                        <span>⬇</span>
                                        <span>{ann.end_formatted ? "Download Clip" : "Download 30s Clip"}</span>
                                      </>
                                    )}
                                  </button>
                                ) : (
                                  <a
                                    href={`https://www.youtube.com/watch?v=${ann.video_source_id}&t=${ann.start_seconds}s`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2.5 py-1 rounded bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 text-[11px] font-medium transition"
                                    title="Open YouTube at this exact timestamp"
                                  >
                                    ↗ YouTube @ {ann.start_formatted}
                                  </a>
                                )}
                                <button
                                  onClick={() => handleOpenAnnotationClip(ann)}
                                  className="px-2.5 py-1 rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-[11px] font-medium transition cursor-pointer"
                                >
                                  Inspect Video
                                </button>
                                <button
                                  onClick={() => handleDeleteAnnotation(ann.id)}
                                  className="p-1.5 rounded hover:bg-rose-950/50 text-[#64748B] hover:text-rose-400 transition cursor-pointer"
                                  title="Delete annotation"
                                >
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
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
              {/* In-App Streamable Video Player + Live Playhead Bar */}
              <div className="space-y-2.5">
                {selectedVideo.source === "gdrive" && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#94A3B8] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      <span>
                        {drivePlayerMode === "native"
                          ? "Direct Stream Player (Live timestamp sync enabled)"
                          : "Google Drive IFrame Embed"}
                      </span>
                    </span>
                    <div className="flex items-center bg-[#0B0F17] border border-[#1E293B] rounded-lg p-0.5">
                      <button
                        onClick={() => setDrivePlayerMode("native")}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium transition cursor-pointer ${
                          drivePlayerMode === "native"
                            ? "bg-emerald-600 text-white"
                            : "text-[#94A3B8] hover:text-white"
                        }`}
                      >
                        ⚡ Native Stream
                      </button>
                      <button
                        onClick={() => setDrivePlayerMode("embed")}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium transition cursor-pointer ${
                          drivePlayerMode === "embed"
                            ? "bg-amber-600 text-white"
                            : "text-[#94A3B8] hover:text-white"
                        }`}
                      >
                        📁 Drive Embed
                      </button>
                    </div>
                  </div>
                )}

                <div className="w-full rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center relative border border-[#1E293B] shadow-lg">
                  {selectedVideo.source === "youtube" ? (
                    <iframe
                      ref={youtubeIframeRef}
                      src={`https://www.youtube.com/embed/${selectedVideo.source_id}?enablejsapi=1&rel=0${
                        youtubeStartSeconds > 0 ? `&start=${youtubeStartSeconds}` : ""
                      }${youtubeEndSeconds && youtubeEndSeconds > youtubeStartSeconds ? `&end=${youtubeEndSeconds}` : ""}`}
                      title={selectedVideo.title}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : drivePlayerMode === "native" ? (
                    <video
                      ref={driveVideoRef}
                      key={selectedVideo.source_id}
                      src={`/api/video-database/stream?fileId=${encodeURIComponent(selectedVideo.source_id)}`}
                      poster={selectedVideo.thumbnail_url || undefined}
                      controls
                      preload="metadata"
                      playsInline
                      onLoadedMetadata={(e) => {
                        // Cue to the requested moment (clip / transcript hit) without playing
                        if (youtubeStartSeconds > 0) {
                          e.currentTarget.currentTime = youtubeStartSeconds;
                        }
                      }}
                      onTimeUpdate={(e) => {
                        const cur = e.currentTarget.currentTime;
                        setPlayerCurrentTime(Math.floor(cur));

                        // If playing a saved clip with an End Time, automatically stop at End Time
                        if (
                          activeClipRange?.end !== null &&
                          activeClipRange?.end !== undefined &&
                          cur >= activeClipRange.end
                        ) {
                          e.currentTarget.pause();
                          e.currentTarget.currentTime = activeClipRange.end;
                        }
                      }}
                      onError={() => {
                        // Automatically fallback to Google Drive embed if codec/stream unsupported
                        setDrivePlayerMode("embed");
                      }}
                      className="w-full h-full object-contain bg-black"
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

                {/* Live Playhead Capture Bar & Visual Clip Markers */}
                <div className="p-2.5 rounded-xl bg-[#131B2E] border border-[#1E293B] space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-2 py-0.5 rounded bg-[#0B0F17] border border-[#1E293B] font-mono text-emerald-400 font-bold">
                        ⏱ {formatSecondsToTimestamp(playerCurrentTime)}
                      </span>
                      <span className="text-[11px] text-[#94A3B8]">
                        {selectedVideo.duration_seconds > 0
                          ? `/ ${formatSecondsToTimestamp(selectedVideo.duration_seconds)}`
                          : "Playhead"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleCaptureStartTime(playerCurrentTime)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold transition cursor-pointer"
                        title="Capture current player time as Clip Start"
                      >
                        📍 Capture Start ({formatSecondsToTimestamp(playerCurrentTime)})
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCaptureEndTime(playerCurrentTime)}
                        className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-[11px] font-semibold transition cursor-pointer"
                        title="Capture current player time as Clip End"
                      >
                        🏁 Capture End ({formatSecondsToTimestamp(playerCurrentTime)})
                      </button>
                    </div>
                  </div>

                  {/* Active Clip Range Playback Banner */}
                  {activeClipRange && (
                    <div className="px-2.5 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-between gap-2 text-[11px]">
                      <span className="text-emerald-300 font-medium flex items-center gap-1.5">
                        <span>🎬</span>
                        <span>
                          Playing Clip:{" "}
                          <strong className="font-mono">
                            {formatSecondsToTimestamp(activeClipRange.start)}
                            {activeClipRange.end !== null
                              ? ` → ${formatSecondsToTimestamp(activeClipRange.end)} (${
                                  activeClipRange.end - activeClipRange.start
                                }s)`
                              : ""}
                          </strong>
                          {activeClipRange.end !== null && (
                            <span className="text-emerald-400/80 ml-1">
                              • Auto-stops at {formatSecondsToTimestamp(activeClipRange.end)}
                            </span>
                          )}
                        </span>
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => seekPlayerTo(activeClipRange.start, activeClipRange.end, activeClipRange.id)}
                          className="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 font-semibold cursor-pointer"
                        >
                          🔁 Replay Clip
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveClipRange(null);
                            setYoutubeEndSeconds(null);
                          }}
                          className="px-1.5 py-0.5 rounded hover:bg-[#1E293B] text-slate-300 cursor-pointer"
                          title="Clear clip boundary and play full video"
                        >
                          ✕ Full Video
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Visual Annotated Clip Timeline Markers */}
                  {selectedVideoAnnotations.length > 0 && selectedVideo.duration_seconds > 0 && (
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between text-[10px] text-[#64748B]">
                        <span>Annotated Segments on Timeline ({selectedVideoAnnotations.length})</span>
                        <span>Click any marker to play segment</span>
                      </div>
                      <div className="relative h-2.5 w-full rounded-full bg-[#0B0F17] border border-[#1E293B] overflow-hidden">
                        {selectedVideoAnnotations.map((ann) => {
                          const totalDur = Math.max(1, selectedVideo.duration_seconds);
                          const leftPct = Math.min(98, Math.max(0, (ann.start_seconds / totalDur) * 100));
                          const clipEnd =
                            ann.end_seconds && ann.end_seconds > ann.start_seconds
                              ? ann.end_seconds
                              : ann.start_seconds + Math.max(15, totalDur * 0.03);
                          const widthPct = Math.min(100 - leftPct, Math.max(2, ((clipEnd - ann.start_seconds) / totalDur) * 100));
                          const barColor =
                            ann.status === "used"
                              ? "bg-blue-400 hover:bg-blue-300"
                              : ann.status === "in_progress"
                              ? "bg-amber-400 hover:bg-amber-300"
                              : "bg-emerald-400 hover:bg-emerald-300";

                          return (
                            <button
                              key={ann.id}
                              type="button"
                              onClick={() => seekPlayerTo(ann.start_seconds, ann.end_seconds, ann.id)}
                              style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                              className={`absolute top-0 bottom-0 ${barColor} opacity-85 hover:opacity-100 transition cursor-pointer rounded-sm`}
                              title={`${ann.start_formatted}${ann.end_formatted ? ` – ${ann.end_formatted}` : ""} [${ann.topic}]: ${ann.comment}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Google Drive Stream Notice & Direct Link (only when in embed mode) */}
              {selectedVideo.source === "gdrive" && drivePlayerMode === "embed" && (
                <div className="p-3 rounded-lg bg-[#0B132B]/80 border border-indigo-900/40 text-xs flex items-center justify-between gap-3">
                  <div className="text-[#94A3B8] leading-relaxed">
                    <span className="text-amber-400 font-semibold mr-1">Google Drive Embed:</span>
                    Switch to <strong>⚡ Native Stream</strong> above for 1-click timestamp capture and no cookie popups.
                  </div>
                  <a
                    href={selectedVideo.direct_url || `https://drive.google.com/file/d/${selectedVideo.source_id}/view`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 font-medium border border-emerald-500/20 flex items-center gap-1.5 transition-colors"
                  >
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
                  {selectedVideoAnnotations.length > 0 && (
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      ✂️ {selectedVideoAnnotations.length} Annotated {selectedVideoAnnotations.length === 1 ? "Clip" : "Clips"}
                    </span>
                  )}
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

              {/* ==================================================================== */}
              {/* TIMESTAMPED CLIP ANNOTATOR & REPURPOSING TRACKER (Supabase Cloud)    */}
              {/* ==================================================================== */}
              <div className="p-4 bg-[#131B2E] rounded-xl border border-emerald-500/30 space-y-4 shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs uppercase font-bold text-emerald-400 tracking-wider flex items-center gap-1.5">
                      <span>✂️</span>
                      <span>Timestamp Clip Annotator &amp; Usage Tracker</span>
                    </span>
                    <p className="text-[11px] text-[#94A3B8] mt-0.5">
                      Tag specific sections of this footage with timestamps, topics, and instructions. Saved permanently for the whole team.
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    {selectedVideoAnnotations.length} saved
                  </span>
                </div>

                {/* Add New Clip Annotation Form */}
                <form onSubmit={handleAddAnnotation} className="p-3.5 bg-[#0B0F17] rounded-xl border border-[#1E293B] space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Start Timestamp */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] uppercase font-bold text-[#94A3B8]">Start Time (MM:SS) *</label>
                        <button
                          type="button"
                          onClick={() => handleCaptureStartTime(playerCurrentTime)}
                          className="text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
                        >
                          📍 Use {formatSecondsToTimestamp(playerCurrentTime)}
                        </button>
                      </div>
                      <input
                        type="text"
                        value={annStartInput}
                        onChange={(e) => setAnnStartInput(e.target.value)}
                        placeholder="00:00"
                        className="w-full px-2.5 py-1.5 bg-[#131B2E] border border-[#1E293B] rounded-lg text-xs font-mono text-white placeholder-[#64748B] focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* End Timestamp (Optional) + Quick Offset Buttons */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] uppercase font-bold text-[#94A3B8]">End Time (MM:SS)</label>
                        <div className="flex items-center gap-1">
                          {[15, 30, 60].map((secOffset) => (
                            <button
                              key={secOffset}
                              type="button"
                              onClick={() => {
                                const base = parseTimestampInput(annStartInput) ?? playerCurrentTime;
                                setAnnEndInput(formatSecondsToTimestamp(base + secOffset));
                                setAnnError(null);
                              }}
                              className="px-1.5 py-0.2 rounded bg-[#1E293B] hover:bg-[#334155] text-[9px] font-mono text-slate-300 cursor-pointer"
                            >
                              +{secOffset}s
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => handleCaptureEndTime(playerCurrentTime)}
                            className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold ml-1 cursor-pointer"
                          >
                            🏁 Now ({formatSecondsToTimestamp(playerCurrentTime)})
                          </button>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={annEndInput}
                        onChange={(e) => setAnnEndInput(e.target.value)}
                        placeholder="e.g. 02:45"
                        className="w-full px-2.5 py-1.5 bg-[#131B2E] border border-[#1E293B] rounded-lg text-xs font-mono text-white placeholder-[#64748B] focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Topic / Pillar & Author */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="sm:col-span-2">
                      <label className="text-[10px] uppercase font-bold text-[#94A3B8] mb-1 block">
                        Topic / Content Use-Case
                      </label>
                      <select
                        value={annTopic}
                        onChange={(e) => setAnnTopic(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#131B2E] border border-[#1E293B] rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                      >
                        {allAvailableTopics.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                        <option value="__custom__">+ Custom Topic...</option>
                      </select>
                      {annTopic === "__custom__" && (
                        <input
                          type="text"
                          value={annCustomTopic}
                          onChange={(e) => setAnnCustomTopic(e.target.value)}
                          placeholder="Enter custom topic (e.g. 'Aconcagua Webinar Hook')..."
                          className="mt-1.5 w-full px-2.5 py-1.5 bg-[#131B2E] border border-emerald-500/40 rounded-lg text-xs text-white placeholder-[#64748B] focus:outline-none"
                        />
                      )}
                    </div>

                    <div>
                      <label className="text-[10px] uppercase font-bold text-[#94A3B8] mb-1 block">Annotated By</label>
                      <input
                        type="text"
                        value={annAuthor}
                        onChange={(e) => setAnnAuthor(e.target.value)}
                        placeholder="Anthony"
                        className="w-full px-2.5 py-1.5 bg-[#131B2E] border border-[#1E293B] rounded-lg text-xs text-white placeholder-[#64748B] focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Comment / Repurposing Instruction */}
                  <div>
                    <label className="text-[10px] uppercase font-bold text-[#94A3B8] mb-1 block">
                      Comment / Instruction *
                    </label>
                    <textarea
                      value={annComment}
                      onChange={(e) => setAnnComment(e.target.value)}
                      placeholder="e.g. 'Use this portion for Kilimanjaro acclimatization reel — Anthony explains how nasal breathing prevents altitude headaches.'"
                      rows={2}
                      className="w-full p-2.5 bg-[#131B2E] border border-[#1E293B] rounded-lg text-xs text-white placeholder-[#64748B] focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {annError && (
                    <p className="text-[11px] text-rose-400 bg-rose-950/40 border border-rose-800/40 rounded-lg px-2.5 py-1.5">
                      {annError}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-[#64748B]">
                      Persists globally until deleted
                    </span>
                    <button
                      type="submit"
                      disabled={annSaving}
                      className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-semibold text-white shadow-md shadow-emerald-500/20 transition cursor-pointer"
                    >
                      {annSaving ? "Saving Clip..." : "➕ Add Timestamp Annotation"}
                    </button>
                  </div>
                </form>

                {/* List of Saved Annotations for This Video */}
                {selectedVideoAnnotations.length > 0 ? (
                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-[#94A3B8] tracking-wider">
                        Saved Clips on This Video ({selectedVideoAnnotations.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedVideo(null);
                          setActiveMainTab("annotations");
                        }}
                        className="text-[10px] text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer"
                      >
                        View All {annotationStats.total} Clips in Global Queue →
                      </button>
                    </div>

                    <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                      {selectedVideoAnnotations.map((ann) => {
                        const badge = getStatusBadgeStyle(ann.status);
                        const isEditing = editingAnnId === ann.id;

                        return (
                          <div
                            key={ann.id}
                            className="p-3 rounded-xl bg-[#0B0F17] border border-[#1E293B] hover:border-[#334155] transition space-y-2"
                          >
                            {isEditing ? (
                              <div className="space-y-2 text-xs">
                                <div className="grid grid-cols-3 gap-2">
                                  <div>
                                    <label className="text-[9px] uppercase text-[#64748B] block">Start</label>
                                    <input
                                      type="text"
                                      value={editingStartInput}
                                      onChange={(e) => setEditingStartInput(e.target.value)}
                                      className="w-full px-2 py-1 bg-[#131B2E] border border-[#1E293B] rounded font-mono text-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[9px] uppercase text-[#64748B] block">End</label>
                                    <input
                                      type="text"
                                      value={editingEndInput}
                                      onChange={(e) => setEditingEndInput(e.target.value)}
                                      placeholder="Optional"
                                      className="w-full px-2 py-1 bg-[#131B2E] border border-[#1E293B] rounded font-mono text-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[9px] uppercase text-[#64748B] block">Topic</label>
                                    <input
                                      type="text"
                                      value={editingTopic}
                                      onChange={(e) => setEditingTopic(e.target.value)}
                                      className="w-full px-2 py-1 bg-[#131B2E] border border-[#1E293B] rounded text-white"
                                    />
                                  </div>
                                </div>
                                <textarea
                                  value={editingComment}
                                  onChange={(e) => setEditingComment(e.target.value)}
                                  rows={2}
                                  className="w-full p-2 bg-[#131B2E] border border-[#1E293B] rounded text-white"
                                />
                                <input
                                  type="text"
                                  value={editingUsedFor}
                                  onChange={(e) => setEditingUsedFor(e.target.value)}
                                  placeholder="Where was this clip used? (optional)"
                                  className="w-full px-2 py-1 bg-[#131B2E] border border-[#1E293B] rounded text-white"
                                />
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setEditingAnnId(null)}
                                    className="px-2.5 py-1 rounded text-[#94A3B8] hover:text-white"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEditedAnnotation(ann.id)}
                                    className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                                  >
                                    Save
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <button
                                      type="button"
                                      onClick={() => seekPlayerTo(ann.start_seconds, ann.end_seconds, ann.id)}
                                      className={`px-2.5 py-1 rounded-lg border font-mono text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                                        activeClipRange?.id === ann.id
                                          ? "bg-emerald-500/30 text-white border-emerald-400 ring-1 ring-emerald-400/50"
                                          : "bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/30"
                                      }`}
                                      title={
                                        ann.end_seconds && ann.end_seconds > ann.start_seconds
                                          ? `Click to play clip from ${ann.start_formatted} to ${ann.end_formatted} (auto-stops at ${ann.end_formatted})`
                                          : `Click to jump video player to ${ann.start_formatted}`
                                      }
                                    >
                                      <span>▶</span>
                                      <span>
                                        {ann.start_formatted}
                                        {ann.end_formatted && ann.end_seconds && ann.end_seconds > ann.start_seconds
                                          ? ` – ${ann.end_formatted} (${ann.end_seconds - ann.start_seconds}s)`
                                          : ""}
                                      </span>
                                    </button>

                                    <span className="px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-[10px] font-semibold">
                                      🏷️ {ann.topic}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    {ann.video_source === "gdrive" && (
                                      <button
                                        type="button"
                                        onClick={() => handleDownloadAnnotationClip(ann)}
                                        disabled={downloadingClipId === ann.id}
                                        className="px-2 py-0.5 rounded bg-emerald-600/20 hover:bg-emerald-600/35 disabled:opacity-50 text-emerald-300 border border-emerald-500/40 text-[10px] font-semibold flex items-center gap-1 transition cursor-pointer"
                                        title={
                                          ann.end_formatted
                                            ? `Download trimmed MP4 clip (${ann.start_formatted} – ${ann.end_formatted})`
                                            : `Download 30s MP4 clip starting at ${ann.start_formatted}`
                                        }
                                      >
                                        {downloadingClipId === ann.id ? (
                                          <>
                                            <span className="w-2.5 h-2.5 border-2 border-emerald-300 border-t-transparent rounded-full animate-spin inline-block"></span>
                                            <span>Cutting...</span>
                                          </>
                                        ) : (
                                          <>
                                            <span>⬇</span>
                                            <span>{ann.end_formatted ? "Download MP4" : "Download 30s"}</span>
                                          </>
                                        )}
                                      </button>
                                    )}

                                    <select
                                      value={ann.status}
                                      onChange={(e) =>
                                        handleUpdateAnnotation(ann.id, {
                                          status: e.target.value as AnnotationUsageStatus,
                                        })
                                      }
                                      className={`px-2 py-0.5 rounded border text-[10px] font-semibold focus:outline-none cursor-pointer ${badge.classes} bg-[#131B2E]`}
                                    >
                                      <option value="unused">🟢 Unused / Ready</option>
                                      <option value="in_progress">🟡 In Editing</option>
                                      <option value="used">🔵 Used / Published</option>
                                    </select>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingAnnId(ann.id);
                                        setEditingStartInput(ann.start_formatted);
                                        setEditingEndInput(ann.end_formatted || "");
                                        setEditingTopic(ann.topic);
                                        setEditingComment(ann.comment);
                                        setEditingUsedFor(ann.used_for || "");
                                      }}
                                      className="p-1 rounded hover:bg-[#1E293B] text-[#64748B] hover:text-white text-xs cursor-pointer"
                                      title="Edit annotation"
                                    >
                                      ✏️
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteAnnotation(ann.id)}
                                      className="p-1 rounded hover:bg-rose-950/50 text-[#64748B] hover:text-rose-400 text-xs cursor-pointer"
                                      title="Delete annotation"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                </div>

                                <p className="text-xs text-white leading-relaxed whitespace-pre-wrap">
                                  {ann.comment}
                                </p>

                                <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#1E293B]/60 text-[10px] text-[#64748B]">
                                  <span>
                                    Added by <strong className="text-slate-300">{ann.author || "Anthony"}</strong> •{" "}
                                    {new Date(ann.created_at).toLocaleDateString()}
                                  </span>
                                  <input
                                    type="text"
                                    defaultValue={ann.used_for || ""}
                                    onBlur={(e) => {
                                      const nextVal = e.target.value.trim() || null;
                                      if (nextVal !== (ann.used_for || null)) {
                                        handleUpdateAnnotation(ann.id, { used_for: nextVal });
                                      }
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        (e.target as HTMLInputElement).blur();
                                      }
                                    }}
                                    placeholder="+ Note where used (e.g. 'IG Reel')"
                                    className="w-44 px-2 py-0.5 bg-[#131B2E] border border-[#1E293B] rounded text-[10px] text-slate-200 placeholder-[#64748B] focus:outline-none focus:border-blue-500"
                                  />
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-[#64748B] italic text-center py-1">
                    No timestamped clips annotated on this video yet. Use the form above to mark your first clip!
                  </p>
                )}
              </div>

              {/* Content Creation & Repurposing Notes (Quick Scratchpad) */}
              <div className="p-3 bg-[#131B2E] rounded-xl border border-[#1E293B] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase font-bold text-amber-400 tracking-wider">
                    📝 General Video Scratchpad (Local Browser Note)
                  </span>
                  {drawerNote && <span className="text-[10px] text-emerald-400">Saved locally</span>}
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
                      {/^\[\d{1,2}:\d{2}(?::\d{2})?\]/.test(vidiqTranscript) ? (
                        (() => {
                          const lines = vidiqTranscript
                            .split("\n")
                            .filter((l) => !transcriptSearch || l.toLowerCase().includes(transcriptSearch.toLowerCase()));
                          if (!lines.length) return "No matching segments found.";
                          return lines.map((line, i) => {
                            const m = line.match(/^\[(\d{1,2}:\d{2}(?::\d{2})?)\]\s*(.*)$/);
                            if (!m) return <div key={i}>{highlightText(line, transcriptSearch)}</div>;
                            const parts = m[1].split(":").map((n) => parseInt(n, 10));
                            const sec = parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : parts[0] * 60 + parts[1];
                            return (
                              <button
                                key={i}
                                onClick={() => seekPlayerTo(sec)}
                                className="w-full flex items-start gap-2 text-left py-0.5 hover:bg-[#1E293B] rounded px-1 transition"
                              >
                                <span className="shrink-0 font-mono text-[10px] text-indigo-300">{m[1]}</span>
                                <span>{highlightText(m[2], transcriptSearch)}</span>
                              </button>
                            );
                          });
                        })()
                      ) : transcriptSearch
                        ? highlightText(vidiqTranscript.split('. ').filter(l => l.toLowerCase().includes(transcriptSearch.toLowerCase())).join('. \n\n') || "No matching segments found.", transcriptSearch)
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
