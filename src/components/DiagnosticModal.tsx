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
  age: string;
  gender: string;
  boltScore: string;
  co2ttScore: string;
  mbtSteps: string;
  lomZone: string;
  balloon: string;
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
  balloonScore: "entry.1115436622",
  age: "entry.1446995001",
  gender: "entry.2121457013",
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
  age: "",
  gender: "",
  boltScore: "",
  co2ttScore: "",
  mbtSteps: "",
  lomZone: "",
  balloon: "",
  goalType: "",
  goalDetail: "",
};

const youtubeParams =
  "?autoplay=0&mute=0&rel=0&modestbranding=1&playsinline=1&color=white";

// --- Helper Functions for Scoring (RBI V2) ---
const getBoltTier = (score: number) => {
  if (score < 15) return 0;
  if (score < 20) return 1;
  if (score < 25) return 2;
  if (score < 30) return 3;
  if (score < 35) return 4;
  return 5;
};

const getCo2ttTier = (score: number) => {
  if (score < 25) return 0;
  if (score < 40) return 1;
  if (score < 55) return 2;
  if (score < 70) return 3;
  if (score < 85) return 4;
  return 5;
};

const getMbtTier = (score: number) => getCo2ttTier(score);

const getLomTier = (zone: string) => {
  const l = zone.toLowerCase().trim();
  if (l.includes("zone 3 only")) return 0;
  if (l.includes("zone 3") && l.includes("zone 2")) return 1;
  if (l.includes("zone 2") && !l.includes("zone 3") && !l.includes("zone 1")) return 2;
  if (l.includes("zone 1") && l.includes("zone 2")) return 3;
  if (l.includes("zone 1") && l.includes("horizontal")) return 4;
  if (l.includes("zone 1") && l.includes("360")) return 5;
  return 0;
};

// 1BT: count of balloons in 1 min. Tiers: <7(0), <11(1), <14(2), <17(3), <19(4), 19+(5)
const get1BTTier = (count: number) => {
  if (count < 7) return 0;
  if (count < 11) return 1;
  if (count < 14) return 2;
  if (count < 17) return 3;
  if (count < 19) return 4;
  return 5;
};

const calculateRBI = (
  bolt: number,
  co2: number,
  mbt: number,
  lom: string,
  balloonCount: number,
  age: number
) => {
  const boltScore = getBoltTier(bolt) * 1;
  const co2Score = getCo2ttTier(co2) * 2;
  const mbtScore = getMbtTier(mbt) * 3;
  const lomScore = getLomTier(lom) * 2;
  let oneBTTier = get1BTTier(balloonCount);
  if (age > 65) oneBTTier = Math.min(5, oneBTTier + 1);
  const oneBTScore = oneBTTier * 2;

  const totalPoints = boltScore + co2Score + mbtScore + lomScore + oneBTScore;
  const maxPoints = 5 * 1 + 5 * 2 + 5 * 3 + 5 * 2 + 5 * 2; // 50
  const finalScore = Math.round((totalPoints / maxPoints) * 100);

  let grade = "N/A";
  let badge = "N/A";
  if (finalScore >= 93) {
    grade = "Ultra";
    badge = "Everest-Ready";
  } else if (finalScore >= 80) {
    grade = "Great";
    badge = "Summit-Ready";
  } else if (finalScore >= 65) {
    grade = "Good";
    badge = "Summit-Approaching";
  } else if (finalScore >= 50) {
    grade = "Fair";
    badge = "Acclimatizing";
  } else if (finalScore >= 31) {
    grade = "Poor";
    badge = "Altitude Apprentice";
  } else {
    grade = "Very Poor";
    badge = "Base Camp Beginner";
  }

  return { score: finalScore, grade, badge };
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
  inputMode,
  pattern,
  shouldAllowOnlyNumbers,
}: {
  type?: string;
  name: keyof FormData;
  value: string;
  placeholder?: string;
  suffix?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  pattern?: string;
  shouldAllowOnlyNumbers?: boolean;
  onChange: (name: keyof FormData, value: string) => void;
}) => (
  <div className="relative">
    <input
      type={type || "text"}
      inputMode={inputMode}
      pattern={pattern}
      value={value}
      onKeyDown={(e) => {
        if (
          shouldAllowOnlyNumbers &&
          !["Backspace", "Tab", "ArrowLeft", "ArrowRight", "Delete"].includes(e.key) &&
          !/[0-9.]/.test(e.key)
        ) {
          e.preventDefault();
        }
      }}
      onChange={(e) => {
        if (shouldAllowOnlyNumbers) {
          const sanitized = e.target.value.replace(/[^0-9.]/g, "");
          onChange(name, sanitized);
        } else {
          onChange(name, e.target.value);
        }
      }}
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
    return {
      ...formData,
      timestamp: new Date().toISOString(),
      source: "recal-landing-rbi-modal",
    };
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
    try {
      const res = await fetch("/api/submit-diagnostic-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim(),
          age: formData.age.trim(),
          gender: formData.gender.trim(),
          boltScore: formData.boltScore,
          co2ttScore: formData.co2ttScore,
          mbtSteps: formData.mbtSteps,
          lomZone: formData.lomZone,
          balloon: formData.balloon.trim() || "0",
          goalType: formData.goalType.trim(),
          goalDetail: formData.goalDetail.trim(),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Form submit failed (${res.status})`);
      }
      console.log("✅ Google Form submitted successfully.");
    } catch (error) {
      console.error("❌ Google form submission error:", error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    setSubmissionState("submitting");
    setErrorMessage(null);
    setStep(modalSteps - 1);
    trackEvent("diagnostic_modal_submit", "submit");

    try {
      await submitToGoogleForm();
      await Promise.all([
        recordLandingSignup(),
        webhookUrl
          ? fetch(webhookUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(buildPayload()),
            })
          : Promise.resolve(),
      ]);

      const emailForLookup = formData.email.trim();
      const firstName = formData.firstName.trim();
      const goal = formData.goalDetail
        ? `${formData.goalType} - ${formData.goalDetail}`.trim()
        : formData.goalType.trim();

      const bolt = Number(formData.boltScore) || 0;
      const co2 = Number(formData.co2ttScore) || 0;
      const mbt = Number(formData.mbtSteps) || 0;
      const lom = formData.lomZone.trim();
      const balloonCount = Number(formData.balloon) || 0;
      const age = Number(formData.age) || 0;

      const result = calculateRBI(bolt, co2, mbt, lom, balloonCount, age);
      setAssessmentResult({
        score: String(result.score),
        grade: result.grade,
        badge: result.badge,
      });

      const baseResultsUrl =
        process.env.NEXT_PUBLIC_GHL_RESULTS_URL ||
        "https://results.recal.training/";
      const url = new URL(baseResultsUrl);
      url.searchParams.set("email", emailForLookup);
      url.searchParams.set("name", firstName);
      url.searchParams.set("goal", goal);
      url.searchParams.set("score", String(result.score));
      url.searchParams.set("grade", result.grade);
      url.searchParams.set("badge", result.badge);
      const resultsUrl = url.toString();

      // Show "Calculating your results…" spinner for 5–7 seconds, then redirect (unconditional)
      const redirectDelayMs = 6000;
      setTimeout(() => {
        window.location.href = resultsUrl;
      }, redirectDelayMs);
    } catch (error) {
      console.error("Diagnostic submission error", error);
      setSubmissionState("error");
      setErrorMessage("We couldn't submit your results. Please try again.");
      setStep(7);
    }
  };

  const isStepValid = () => {
    const requiredByStep: Record<number, (keyof FormData)[]> = {
      1: ["firstName", "email", "age", "gender"],
      2: ["boltScore"],
      3: ["co2ttScore"],
      4: ["mbtSteps"],
      5: ["lomZone"],
      6: ["balloon"],
      7: ["goalType"],
    };
    const requirements = requiredByStep[step];
    if (!requirements) return true;

    if (step === 6) {
      const balloonVal = formData.balloon?.trim();
      if (!balloonVal) return false;
      const num = Number(balloonVal);
      return Number.isFinite(num) && num >= 0 && num <= 999;
    }

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
        Welcome to your RBI assessment.
      </h2>
      <p className="text-base text-slate-700">
        You're about to uncover the exact breathing mechanics shaping your performance.
      </p>
      <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
        <p className="text-sm font-semibold text-slate-900">What you'll need:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>A timer</li>
          <li>Space to walk in a straight line</li>
          <li>A tape measure (or shoelace + ruler)</li>
        </ul>
      </div>
      <p className="text-base text-slate-700">
        After you submit, I'll send a full breakdown of your Breath Index plus breathwork
        protocols tailored to your physiology.
      </p>
      <VideoCard videoId="Cq1DpJsAOAM" caption="" />
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/80 p-4">
        <p className="text-sm font-semibold text-slate-900">
          Please confirm the details below. This is where we will send your personalized feedback on your RBI score.
        </p>
        <Input
          name="firstName"
          value={formData.firstName}
          placeholder="First name"
          onChange={updateForm}
        />
        <Input
          name="email"
          type="email"
          value={formData.email}
          placeholder="Email"
          onChange={updateForm}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <FieldLabel label="Age" />
            <Input
              name="age"
              value={formData.age}
              placeholder="e.g. 35"
              inputMode="numeric"
              pattern="[0-9]*"
              shouldAllowOnlyNumbers
              onChange={updateForm}
            />
          </div>
          <div className="space-y-2">
            <FieldLabel label="Gender" />
            <select
              value={formData.gender}
              onChange={(e) => updateForm("gender", e.target.value)}
              className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-base font-medium text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  const renderBoltStep = () => (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="space-y-4">
        <SectionTitle title="Blood Oxygen Level Test" subtitle="Step 2 • BOLT" />
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
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-semibold">Pro tip:</p>
          <p className="mt-1">
            Your first urge to breathe may show up as a swallow reflex, a tightening in the throat, or a
            noticeable shift in diaphragm tension. Avoid waiting for dizziness—log the score at that very first signal.
          </p>
        </div>
      </div>
      <div className="space-y-6">
        <VideoCard videoId="9iIKhj7oyeI" caption="" />
        <div className="space-y-2">
          <FieldLabel label="BOLT Score" />
          <Input
            name="boltScore"
            value={formData.boltScore}
            placeholder='e.g. "25"'
            suffix="sec"
            inputMode="decimal"
            pattern="[0-9]*"
            shouldAllowOnlyNumbers
            onChange={updateForm}
          />
        </div>
      </div>
    </div>
  );

  const renderCo2Step = () => (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="space-y-4">
        <SectionTitle title="Carbon Dioxide Tolerance Test" subtitle="Step 3 • CO₂TT" />
        <p className="text-base text-slate-700">
          This test is a way to measure how quickly you feel out of breath. Watch the demo, follow the cadence and capture your score.
        </p>
        <div className="rounded-2xl bg-[#E9F2F5] p-4 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">How to measure:</p>
          <ul className="mt-2 space-y-1 list-disc list-inside">
            <li>Sit upright and take a normal breath in through your nose, then a normal breath out.</li>
            <li>Inhale deeply through your nose, filling your lungs as much as is comfortably possible.</li>
            <li>Start your timer as you begin a very slow nasal exhale and keep going until you've emptied your lungs; that time is your CO₂TT score.</li>
          </ul>
        </div>
      </div>
      <div className="space-y-6">
        <VideoCard videoId="XGzAGDv6Q6I" caption="" />
        <div className="space-y-2">
          <FieldLabel label="CO₂TT Score" />
          <Input
            name="co2ttScore"
            value={formData.co2ttScore}
            placeholder='e.g. "68"'
            suffix="sec"
            inputMode="decimal"
            pattern="[0-9]*"
            shouldAllowOnlyNumbers
            onChange={updateForm}
          />
        </div>
      </div>
    </div>
  );

  const renderMbtStep = () => (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="space-y-4">
        <SectionTitle title="Maximum Breathlessness Test" subtitle="Step 4 • MBT" />
        <p className="text-base text-slate-700">
          The MBT is the second way to measure how you handle breathlessness. This time with the added element of walking.
        </p>
        <div className="rounded-2xl bg-[#E9F2F5] p-4 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">How to measure:</p>
          <ul className="mt-2 space-y-1 list-disc list-inside">
            <li>Stand with space to walk and take a normal inhale through your nose, then a normal exhale.</li>
            <li>Pinch your nose, hold your breath, and start walking at a steady "good hiker's" pace while counting your steps.</li>
            <li>Continue until you absolutely need to breathe again, then stop and record your total steps as your MBT score.</li>
          </ul>
        </div>
      </div>
      <div className="space-y-6">
        <VideoCard videoId="-Kb3O8m8eqk" caption="" />
        <div className="space-y-2">
          <FieldLabel label="MBT Score" />
          <Input
            name="mbtSteps"
            value={formData.mbtSteps}
            placeholder='e.g. "61"'
            suffix="steps"
            inputMode="numeric"
            pattern="[0-9]*"
            shouldAllowOnlyNumbers
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
          <SectionTitle title="Location of Movement" subtitle="Step 5 • LOM" />
          <p className="text-base text-slate-700">
            Observe where you feel movement as you breathe. Then match your observations with the zone descriptions in the video and options below.
          </p>
        </div>
        <div className="space-y-6">
        <VideoCard videoId="BD3H3CsU1rs" caption="" />
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

  const renderBalloonStep = () => (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-4">
        <SectionTitle title="One-Minute Balloon Test" subtitle="Step 6 • 1BT" />
        <p className="text-base text-slate-700">
          In 1 minute, blow up as many balloons as you can. Enter the total count below.
        </p>
        <div className="rounded-2xl border border-slate-200 bg-white/60 p-4 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">What you need:</p>
          <ul className="mt-2 space-y-1 list-disc list-inside">
            <li>Balloons (standard size)</li>
            <li>Timer set to 1 minute</li>
            <li>Count each fully inflated balloon</li>
          </ul>
        </div>
      </div>
      <div className="space-y-6">
        <VideoCard
          videoId="OlzOxZJsBN8"
          caption="Watch the one-minute balloon test demo"
        />
        <div className="space-y-2">
          <FieldLabel label="Number of balloons in 1 minute" />
          <Input
            name="balloon"
            value={formData.balloon}
            placeholder="e.g. 12"
            inputMode="numeric"
            pattern="[0-9]*"
            shouldAllowOnlyNumbers
            onChange={updateForm}
          />
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
    <SectionTitle title="What are you training for?" subtitle="Step 7 • Goal" />
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

const renderLoadingStep = (loadingMessageIndex: number, isPostSubmit?: boolean) => (
  <div className="flex flex-col items-center justify-center space-y-6 py-16 text-center">
    <div className="h-20 w-20 rounded-full border-4 border-[#0A4367]/30 border-t-[#0A4367] animate-spin" />
    <div className="space-y-2">
      <p
        className="text-2xl font-semibold"
        style={{ color: brandNavy, fontFamily: "Rogue Sans Ext, sans-serif", fontStyle: "italic" }}
      >
        {isPostSubmit ? "Calculating your results…" : "Calibrating your RBI"}
      </p>
      <p className="text-sm text-slate-600">
        {isPostSubmit ? "Redirecting you to your results shortly." : loadingMessages[loadingMessageIndex]}
      </p>
      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
        {isPostSubmit ? "This takes about 5–7 seconds" : "This takes about 3–5 seconds"}
      </p>
    </div>
  </div>
);

  const renderSummary = () => {
    return (
      <div className="space-y-8">
        <SectionTitle title="Your RBI Snapshot" subtitle="Results" />
        <div className="rounded-xl bg-blue-50 border border-blue-200 p-6">
          <p className="text-base text-blue-900 font-semibold text-center">
            Your results have been sent to your inbox.
          </p>
          <p className="text-sm text-blue-700 mt-2 text-center">
            Check your email for your complete RBI breakdown with personalized insights and targeted breathwork protocols.
          </p>
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
        <div className="rounded-3xl bg-gradient-to-r from-[#0A4367] to-[#144C74] p-8 text-white shadow-xl">
          <div className="text-center space-y-4">
            <p className="text-2xl font-semibold">Your Complete Breakdown is Waiting</p>
            <p className="text-base text-slate-100">
              Want to know which breathing link is your strongest vs. weakest—and the exact drill that fixes it?
            </p>
            <div className="mt-6 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 p-6">
              <p className="text-lg font-semibold mb-2">📧 Check Your Inbox</p>
              <p className="text-sm text-slate-100">
                Your full RBI dossier with personalized insights, weakest links, and targeted breathwork protocols has been sent to your email.
              </p>
              <p className="text-xs text-slate-200 mt-3 italic">
                Don't see it? Check your spam folder—it should arrive within the next minute.
              </p>
            </div>
            <button
              onClick={handleClose}
              className="mt-4 rounded-2xl bg-white/90 px-8 py-3 text-sm font-semibold text-[#0A4367] transition hover:bg-white"
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
        return renderBalloonStep();
      case 7:
        return renderGoalStep(formData, updateForm);
      case 8:
        return renderLoadingStep(loadingMessageIndex, submissionState === "submitting");
      case 9:
        return renderSummary();
      default:
        return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, formData, loadingMessageIndex, assessmentResult, submissionState]);

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

