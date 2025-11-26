"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import * as gtag from "@/lib/gtag";

type DiagnosticModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialLead?: {
    firstName: string;
    lastName: string;
    email: string;
  } | null;
};

type FormData = {
  firstName: string;
  lastName: string;
  email: string;
  boltScore: string;
  co2ttScore: string;
  mbtSteps: string;
  lomZone: string;
  romInhale: string;
  romExhale: string;
  goalType: string;
  goalDetail: string;
};

type AssessmentResult = {
  score: string | null;
  grade: string | null;
  badge: string | null;
};

const brandNavy = "#0A4367";
const modalSteps = 9;
const totalTests = 6;
const webhookUrl = process.env.NEXT_PUBLIC_DIAGNOSTIC_WEBHOOK_URL;
const bookingUrl =
  process.env.NEXT_PUBLIC_RBI_CTA_URL || "mailto:anthony@recalibrate.world";
const googleFormUrl =
  process.env.NEXT_PUBLIC_GOOGLE_FORM_URL ||
  "https://docs.google.com/forms/d/e/1FAIpQLSfdvHwTAuYDUZrqKntNaIcZbNM_RPothRiZgcMbwFPeb8Mx0A/formResponse";

const googleEntryIds = {
  firstName: "entry.1328606392",
  lastName: "entry.343152274",
  email: "entry.1362361142",
  goalType: "entry.1174770986",
  boltScore: "entry.1002851429",
  co2Score: "entry.197086545",
  mbtScore: "entry.1392028128",
  lomZone: "entry.1358412920",
  romScore: "entry.1128018511",
  goalDetail: "entry.887435060",
};

const loadingMessages = [
  "Calibrating your RBI score...",
  "Identifying your strongest and weakest links...",
  "Mapping the next breathwork protocol...",
  "Finalizing your report...",
];

const initialForm: FormData = {
  firstName: "",
  lastName: "",
  email: "",
  boltScore: "",
  co2ttScore: "",
  mbtSteps: "",
  lomZone: "",
  romInhale: "",
  romExhale: "",
  goalType: "",
  goalDetail: "",
};

const youtubeParams =
  "?autoplay=0&mute=0&rel=0&modestbranding=1&playsinline=1&color=white";

const formatSeconds = (value: string) =>
  value ? `${value.replace(/[^0-9.]/g, "")}s` : "–";

const formatSteps = (value: string) =>
  value ? `${value.replace(/[^0-9.]/g, "")} steps` : "–";

const computeRomPercent = (inhale: string, exhale: string) => {
  const inhaleNum = Number(inhale);
  const exhaleNum = Number(exhale);
  if (!Number.isFinite(inhaleNum) || !Number.isFinite(exhaleNum) || exhaleNum <= 0) {
    return null;
  }
  const rom = ((inhaleNum - exhaleNum) / exhaleNum) * 1000;
  if (!Number.isFinite(rom)) return null;
  return rom.toFixed(1);
};

const getScoreTag = (value: number, thresholds: number[]) => {
  if (Number.isNaN(value)) return "Needs Attention";
  if (value >= thresholds[1]) return "Dialed In";
  if (value >= thresholds[0]) return "Developing";
  return "Needs Attention";
};

const motionVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -15 },
};

const SectionTitle = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div className="space-y-2">
    <p className="text-xs uppercase tracking-[0.15em] text-slate-500">{subtitle}</p>
    <h3
      className="text-2xl font-semibold"
      style={{ color: brandNavy, fontFamily: "Rogue Sans Ext, sans-serif", fontStyle: "italic" }}
    >
      {title}
    </h3>
  </div>
);

const VideoCard = ({
  videoId,
  caption,
}: {
  videoId: string;
  caption: string;
}) => (
  <div className="space-y-3">
    <div className="aspect-video rounded-2xl overflow-hidden border border-slate-200 shadow-inner bg-slate-50">
      <iframe
        className="w-full h-full"
        src={`https://www.youtube.com/embed/${videoId}${youtubeParams}`}
        title="Recal Diagnostic Video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
    <p className="text-sm text-slate-600">{caption}</p>
  </div>
);

const FieldLabel = ({ label }: { label: string }) => (
  <p className="text-sm font-medium text-slate-700">{label}</p>
);

const Input = ({
  type,
  name,
  value,
  onChange,
  placeholder,
  suffix,
}: {
  type?: string;
  name: keyof FormData;
  value: string;
  placeholder?: string;
  suffix?: string;
  onChange: (name: keyof FormData, value: string) => void;
}) => (
  <div className="relative">
    <input
      type={type || "text"}
      value={value}
      onChange={(e) => onChange(name, e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 pr-14 text-base font-medium text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
    />
    {suffix && (
      <span className="absolute inset-y-0 right-4 flex items-center text-sm font-semibold text-slate-400">
        {suffix}
      </span>
    )}
  </div>
);

const RadioOption = ({
  label,
  value,
  selected,
  onSelect,
}: {
  label: string;
  value: string;
  selected: boolean;
  onSelect: () => void;
}) => (
  <button
    type="button"
    onClick={onSelect}
    className={`w-full rounded-2xl border-2 px-4 py-4 text-left transition-all ${
      selected ? "border-[#4A90A4] bg-[#E9F2F5] text-slate-900 shadow" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
    }`}
  >
    {label}
  </button>
);

export const DiagnosticModal = ({ isOpen, onClose, initialLead }: DiagnosticModalProps) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(initialForm);
  const [submissionState, setSubmissionState] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  const progressPercent = useMemo(() => {
    const raw = ((Math.max(step - 1, 0) / totalTests) * 100);
    return Math.max(0, Math.min(100, raw));
  }, [step]);

  const romPercent = useMemo(
    () => computeRomPercent(formData.romInhale, formData.romExhale),
    [formData.romInhale, formData.romExhale]
  );

  const updateForm = (name: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    if (initialLead) {
      setFormData((prev) => ({
        ...prev,
        firstName: initialLead.firstName || prev.firstName,
        lastName: initialLead.lastName || prev.lastName,
        email: initialLead.email || prev.email,
      }));
    }
  }, [initialLead]);

  useEffect(() => {
    if (step === modalSteps - 1) {
      setLoadingMessageIndex(0);
      const interval = setInterval(() => {
        setLoadingMessageIndex((prev) => (prev + 1) % loadingMessages.length);
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [step]);

  const resetState = useCallback(() => {
    setFormData(initialForm);
    setSubmissionState("idle");
    setErrorMessage(null);
    setAssessmentResult(null);
    setLoadingMessageIndex(0);
    setStep(1);
  }, []);

  const handleClose = () => {
    resetState();
    onClose();
  };

  const trackEvent = (action: string, label: string) => {
    gtag.event({
      action,
      category: "Recal RBI Modal",
      label,
      value: step,
    });
  };

  const handleBack = () => {
    if (step === 1) {
      handleClose();
      return;
    }
    if (step === modalSteps - 1) {
      return;
    }
    setStep((prev) => Math.max(1, prev - 1));
  };

  const buildPayload = () => {
    const rom = romPercent ? `${romPercent}%` : "";
    return {
      ...formData,
      romPercentage: rom,
      timestamp: new Date().toISOString(),
      source: "recal-landing-rbi-modal",
    };
  };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchAssessmentResultWithRetries = async (email: string) => {
  if (!email) return null;
  const maxAttempts = 4;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await sleep(attempt === 0 ? 2000 : 2500);
    try {
      const response = await fetch("/api/rbi-result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data?.score || data?.grade || data?.badge) {
          return {
            score: data.score ?? null,
            grade: data.grade ?? null,
            badge: data.badge ?? null,
          } as AssessmentResult;
        }
      }
    } catch (error) {
      console.error("fetch assessment result error", error);
    }
  }
  return null;
};

  const recordLandingSignup = async () => {
    try {
      await fetch("/api/record-landing-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
        }),
      });
    } catch (error) {
      console.error("recordLandingSignup error", error);
    }
  };

  const submitToGoogleForm = async () => {
    if (!googleFormUrl) return;
    const rom = romPercent ? romPercent.replace(/[^0-9.]/g, "") : "";
    const body = new URLSearchParams();
    body.set("fvv", "1");
    body.set("draftResponse", "[]");
    body.set("pageHistory", "0,1,2,3,4,5,6");
    body.set("fbzx", Date.now().toString());
    body.set(googleEntryIds.firstName, formData.firstName);
    body.set(googleEntryIds.lastName, formData.lastName);
    body.set(googleEntryIds.email, formData.email);
    body.set(googleEntryIds.goalType, formData.goalType);
    body.set(googleEntryIds.boltScore, formData.boltScore);
    body.set(googleEntryIds.co2Score, formData.co2ttScore);
    body.set(googleEntryIds.mbtScore, formData.mbtSteps);
    body.set(googleEntryIds.lomZone, formData.lomZone);
    body.set(googleEntryIds.goalDetail, formData.goalDetail);
    if (rom) body.set(googleEntryIds.romScore, rom);
    try {
      await fetch(googleFormUrl, {
        method: "POST",
        mode: "no-cors",
        body,
      });
    } catch (error) {
      console.error("google form submission error", error);
    }
  };

  const handleSubmit = async () => {
    setSubmissionState("submitting");
    setErrorMessage(null);
    setStep(modalSteps - 1);
    trackEvent("diagnostic_modal_submit", "submit");

    try {
      await Promise.all([
        recordLandingSignup(),
        submitToGoogleForm(),
        webhookUrl
          ? fetch(webhookUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(buildPayload()),
            })
          : Promise.resolve(),
      ]);
      const result = await fetchAssessmentResultWithRetries(formData.email.trim());
      if (result) {
        setAssessmentResult(result);
      }
      setSubmissionState("success");
      setStep(modalSteps);
    } catch (error) {
      console.error("Diagnostic submission error", error);
      setSubmissionState("error");
      setErrorMessage("We couldn’t submit your results. Please try again.");
      setStep(7);
    }
  };

  const isStepValid = () => {
    const requiredByStep: Record<number, (keyof FormData)[]> = {
      2: ["firstName", "lastName", "email", "boltScore"],
      3: ["co2ttScore"],
      4: ["mbtSteps"],
      5: ["lomZone"],
      6: ["romInhale", "romExhale"],
      7: ["goalType"],
    };
    const requirements = requiredByStep[step];
    if (!requirements) return true;
    return requirements.every((key) => formData[key]?.trim().length);
  };

  const handleNext = () => {
    if (step === modalSteps) {
      handleClose();
      return;
    }
    if (step === 7) {
      handleSubmit();
      return;
    }
    setStep((prev) => Math.min(modalSteps, prev + 1));
  };

  const renderHeroCopy = () => (
    <div className="space-y-4">
      <p className="text-sm uppercase tracking-[0.25em] text-slate-500">
        The Recal Breath Index
      </p>
      <h2
        className="text-3xl font-semibold leading-tight"
        style={{ color: brandNavy, fontFamily: "Rogue Sans Ext, sans-serif", fontStyle: "italic" }}
      >
        Welcome to your RBI assessment, handcrafted by Coach Anthony.
      </h2>
      <p className="text-base text-slate-700">
        You’re about to uncover the exact breathing mechanics shaping your performance.
      </p>
      <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
        <p className="text-sm font-semibold text-slate-900">What you’ll need:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>A timer</li>
          <li>Space to walk in a straight line</li>
          <li>A tape measure (or shoelace + ruler)</li>
        </ul>
      </div>
      <p className="text-base text-slate-700">
        After you submit, I’ll send a full breakdown of your Breath Index plus breathwork
        protocols tailored to your physiology.
      </p>
      <VideoCard
        videoId="Cq1DpJsAOAM"
        caption="Watch the short welcome before you start."
      />
    </div>
  );

  const renderBoltStep = () => (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="space-y-4">
        <SectionTitle title="Blood Oxygen Level Test" subtitle="Step 1 • BOLT" />
        <p className="text-base text-slate-700">
          Watch and follow along to capture your BOLT score. This reveals how efficiently
          you tolerate drops in blood CO₂.
        </p>
        <div className="rounded-2xl bg-[#E9F2F5] p-4 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">How to measure:</p>
          <ul className="mt-2 space-y-1 list-disc list-inside">
            <li>Take a normal breath in and out.</li>
            <li>Pinch your nose, start the timer, walk forward, and count until your first urge to breathe.</li>
            <li>Release gently and note the seconds.</li>
          </ul>
        </div>
      </div>
      <div className="space-y-6">
        <VideoCard
          videoId="9iIKhj7oyeI"
          caption="Coach Anthony walks you through the Blood Oxygen Level Test."
        />
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/80 p-4">
          <p className="text-sm font-semibold text-slate-900">Who am I sending the results to?</p>
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              name="firstName"
              value={formData.firstName}
              placeholder="First Name"
              onChange={updateForm}
            />
            <Input
              name="lastName"
              value={formData.lastName}
              placeholder="Last Name"
              onChange={updateForm}
            />
          </div>
          <Input
            name="email"
            type="email"
            value={formData.email}
            placeholder="Email"
            onChange={updateForm}
          />
        </div>
        <div className="space-y-2">
          <FieldLabel label="BOLT Score" />
          <Input
            name="boltScore"
            value={formData.boltScore}
            placeholder='e.g. "25"'
            suffix="sec"
            onChange={updateForm}
          />
        </div>
      </div>
    </div>
  );

  const renderCo2Step = () => (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="space-y-4">
        <SectionTitle title="Carbon Dioxide Tolerance Test" subtitle="Step 2 • CO₂TT" />
        <p className="text-base text-slate-700">
          This test shows how calm your nervous system stays as CO₂ rises. Watch the demo,
          follow the cadence, and capture your score.
        </p>
      </div>
      <div className="space-y-6">
        <VideoCard
          videoId="XGzAGDv6Q6I"
          caption="Follow along to secure your CO₂TT score."
        />
        <div className="space-y-2">
          <FieldLabel label="CO₂TT Score" />
          <Input
            name="co2ttScore"
            value={formData.co2ttScore}
            placeholder='e.g. "68"'
            suffix="sec"
            onChange={updateForm}
          />
        </div>
      </div>
    </div>
  );

  const renderMbtStep = () => (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="space-y-4">
        <SectionTitle title="Maximum Breathlessness Test" subtitle="Step 3 • MBT" />
        <p className="text-base text-slate-700">
          The MBT stress-tests your ability to stay composed as breathlessness ramps up.
          Count your steps until you can’t continue.
        </p>
      </div>
      <div className="space-y-6">
        <VideoCard
          videoId="-Kb3O8m8eqk"
          caption="Use this guided pacing for your MBT."
        />
        <div className="space-y-2">
          <FieldLabel label="MBT Score" />
          <Input
            name="mbtSteps"
            value={formData.mbtSteps}
            placeholder='e.g. "61"'
            suffix="steps"
            onChange={updateForm}
          />
        </div>
      </div>
    </div>
  );

  const renderLomStep = () => {
    const options = [
      "Zone 3 only, vertical movement",
      "Zone 3, some Zone 2, shoulder movement apparent",
      "Zone 2",
      "Zone 1 and a bit of Zone 2, belly movement apparent",
      "Zone 1, horizontal movement, shoulders = no movement",
      "Zone 1 and 360° circumferential movement",
    ];
    return (
      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-4">
          <SectionTitle title="Location of Movement" subtitle="Step 4 • LOM" />
          <p className="text-base text-slate-700">
            Observe where you feel motion as you breathe. Matching your zone tells us how
            your rib cage coordinate responds under load.
          </p>
        </div>
        <div className="space-y-6">
          <VideoCard
            videoId="BD3H3CsU1rs"
            caption="Coach Anthony demos each LOM zone."
          />
          <div className="space-y-3 max-h-[280px] overflow-y-auto pr-2">
            {options.map((label) => (
              <RadioOption
                key={label}
                label={label}
                value={label}
                selected={formData.lomZone === label}
                onSelect={() => updateForm("lomZone", label)}
              />
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderRomStep = () => (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-4">
        <SectionTitle title="Range of Motion" subtitle="Step 5 • ROM" />
        <p className="text-base text-slate-700">
          Measure your rib cage circumference at full inhale and exhale. We’ll translate
          that into a ROM percentage that reflects how much space you create for oxygen.
        </p>
        <p className="text-sm text-slate-600">
          Formula: <span className="font-semibold text-slate-900">(Inhale - Exhale) / Exhale * 1000</span>
        </p>
        <div className="rounded-2xl border border-slate-200 bg-white/60 p-4 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">What you need:</p>
          <ul className="mt-2 space-y-1 list-disc list-inside">
            <li>Tape measure or shoelace + ruler</li>
            <li>Measure at the low ribs</li>
            <li>Stand tall, stay consistent between measurements</li>
          </ul>
        </div>
      </div>
      <div className="space-y-6">
        <VideoCard videoId="BTAMfHcT1Zo" caption="Follow along for the ROM setup." />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <FieldLabel label="Inhale Circumference" />
            <Input
              name="romInhale"
              value={formData.romInhale}
              placeholder='e.g. "34.5"'
              suffix="in"
              onChange={updateForm}
            />
          </div>
          <div className="space-y-2">
            <FieldLabel label="Exhale Circumference" />
            <Input
              name="romExhale"
              value={formData.romExhale}
              placeholder='e.g. "31.2"'
              suffix="in"
              onChange={updateForm}
            />
          </div>
        </div>
        <div className="rounded-2xl bg-[#E9F2F5] p-4 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">Your ROM %</p>
          <p className="text-2xl font-bold text-slate-900">{romPercent ? `${romPercent}%` : "—"}</p>
        </div>
      </div>
    </div>
  );

const goalOptions = [
  "Climb a high altitude mountain",
  "Run an ultra race at altitude",
  "Run a marathon (or other distance) at or near sea level",
  "Hiking/trekking in general",
];

const renderGoalStep = (
  formData: FormData,
  updateForm: (name: keyof FormData, value: string) => void
) => (
  <div className="space-y-6">
    <SectionTitle title="What are you training for?" subtitle="Step 6 • Goal" />
    <p className="text-base text-slate-700">
      This helps us benchmark your RBI against the mission ahead.
    </p>
    <div className="space-y-2">
      <FieldLabel label="My current goal is" />
      <select
        value={formData.goalType}
        onChange={(e) => updateForm("goalType", e.target.value)}
        className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-base font-medium text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
      >
        <option value="">Select a goal</option>
        {goalOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
    <div className="space-y-2">
      <FieldLabel label="Tell us more about your goal" />
      <textarea
        value={formData.goalDetail}
        onChange={(e) => updateForm("goalDetail", e.target.value)}
        placeholder={`"Mt. Rainier in July"\n"Leadville 100 in August"\n"Everest Base Camp trek this fall"\n"To hike without feeling out-of-breath"`}
        className="w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-base text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
        rows={4}
      />
    </div>
  </div>
);

const renderLoadingStep = (loadingMessageIndex: number) => (
  <div className="flex flex-col items-center justify-center space-y-6 py-16 text-center">
    <div className="h-20 w-20 rounded-full border-4 border-[#0A4367]/30 border-t-[#0A4367] animate-spin" />
    <div className="space-y-2">
      <p
        className="text-2xl font-semibold"
        style={{ color: brandNavy, fontFamily: "Rogue Sans Ext, sans-serif", fontStyle: "italic" }}
      >
        Calibrating your RBI
      </p>
      <p className="text-sm text-slate-600">{loadingMessages[loadingMessageIndex]}</p>
      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
        This takes about 3–5 seconds
      </p>
    </div>
  </div>
);

  const renderSummary = () => {
    const summaryMetrics = [
      { label: "RBI Score", value: assessmentResult?.score ?? "In progress" },
      { label: "Level Badge", value: assessmentResult?.badge ?? "Check inbox soon" },
      { label: "RBI Grade", value: assessmentResult?.grade ?? "Calibrating" },
    ];

    return (
      <div className="space-y-8">
        <SectionTitle title="Your RBI Snapshot" subtitle="Results" />
        <p className="text-base text-slate-700">
          We’ve emailed you the full breakdown of your strongest and weakest breathing links.
          Here’s the top line from your RBI dashboard.
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          {summaryMetrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-2xl border border-slate-200 bg-white/70 p-5 text-center shadow-sm"
            >
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{metric.label}</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{metric.value}</p>
            </div>
          ))}
        </div>
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white/70 p-5">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Your Goal</p>
          <p className="text-xl font-semibold text-slate-900">
            {formData.goalType || "We’ll benchmark your goal once you share it."}
          </p>
          {formData.goalDetail && (
            <p className="text-sm italic text-slate-600">“{formData.goalDetail}”</p>
          )}
        </div>
        <div className="rounded-3xl bg-gradient-to-r from-[#0A4367] to-[#144C74] p-6 text-white shadow-xl">
          <p className="text-lg font-semibold">Want the deep dive?</p>
          <p className="mt-2 text-sm text-slate-100">
            We just sent the complete report to your inbox with your strongest + weakest link,
            plus the drills to fix it. Ready to accelerate the plan with me?
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href={bookingUrl}
              target="_blank"
              rel="noreferrer"
              id="diagnostic-modal-book-call"
              data-gtm="diagnostic-modal-book-call"
              onClick={() => trackEvent("diagnostic_modal_cta", "book_call")}
              className="inline-flex items-center justify-center rounded-2xl bg-white/90 px-6 py-3 text-sm font-semibold text-[#0A4367] transition hover:bg-white"
            >
              Book a Calibration Call
            </a>
            <button
              onClick={handleClose}
              className="rounded-2xl border border-white/70 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  const currentStepContent = useMemo(() => {
    switch (step) {
      case 1:
        return renderHeroCopy();
      case 2:
        return renderBoltStep();
      case 3:
        return renderCo2Step();
      case 4:
        return renderMbtStep();
      case 5:
        return renderLomStep();
      case 6:
        return renderRomStep();
      case 7:
        return renderGoalStep(formData, updateForm);
      case 8:
        return renderLoadingStep(loadingMessageIndex);
      case 9:
        return renderSummary();
      default:
        return null;
    }
  }, [step, formData, romPercent, loadingMessageIndex]);

  const isLoadingStep = step === modalSteps - 1;
  const isFinalStep = step === modalSteps;

  const nextLabel =
    isLoadingStep
      ? "Calibrating..."
      : step === 7
      ? submissionState === "submitting"
        ? "Submitting..."
        : "Submit Assessment"
      : isFinalStep
      ? "Done"
      : "Next";

  const disableNext =
    isLoadingStep ||
    (step <= 7 && !isStepValid()) ||
    (step === 7 && submissionState === "submitting");

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-sm"
        >
          <motion.div
            layout
            className="flex h-full max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-[32px] bg-white shadow-2xl"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", stiffness: 230, damping: 22 }}
          >
            <div className="border-b border-slate-100 bg-white px-8 py-6">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    Recal Breath Index
                  </p>
                  <h1
                    className="mt-2 text-3xl font-semibold"
                    style={{ color: brandNavy, fontFamily: "Rogue Sans Ext, sans-serif", fontStyle: "italic" }}
                  >
                    RBI Assessment
                  </h1>
                  <p className="mt-1 text-sm text-slate-500">
                    {step <= 7
                      ? `Step ${step} of 7`
                      : step === modalSteps - 1
                      ? "Calibrating RBI score"
                      : "Personalized breakdown"}
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  className="text-sm font-semibold text-slate-400 transition hover:text-slate-600"
                >
                  Close
                </button>
              </div>
              <div className="mt-6 h-2 w-full rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#0A4367] to-[#4A90A4]"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  variants={motionVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.25 }}
                  className="space-y-4"
                >
                  {currentStepContent}
                  {errorMessage && (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                      {errorMessage}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="border-t border-slate-100 bg-white px-8 py-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <button
                  onClick={handleBack}
                  disabled={isLoadingStep}
                  id={step > 1 ? "diagnostic-modal-back" : "diagnostic-modal-cancel"}
                  data-gtm={step > 1 ? "diagnostic-modal-back" : "diagnostic-modal-cancel"}
                  className={`text-sm font-semibold transition ${
                    isLoadingStep
                      ? "cursor-not-allowed text-slate-300"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {step === 1 ? "Cancel" : "Back"}
                </button>
                <button
                  onClick={handleNext}
                  disabled={disableNext}
                  id={step === 7 ? "diagnostic-modal-submit" : "diagnostic-modal-next"}
                  data-gtm={step === 7 ? "diagnostic-modal-submit" : "diagnostic-modal-next"}
                  className={`inline-flex items-center justify-center rounded-2xl px-8 py-3 text-sm font-semibold text-white transition ${
                    disableNext
                      ? "cursor-not-allowed bg-slate-300"
                      : "bg-gradient-to-r from-[#0A4367] to-[#4A90A4] hover:shadow-lg"
                  }`}
                >
                  {nextLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DiagnosticModal;

