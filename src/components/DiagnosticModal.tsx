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
};

const brandNavy = "#0A4367";
const modalSteps = 7;
const totalTests = 5;
const webhookUrl = process.env.NEXT_PUBLIC_DIAGNOSTIC_WEBHOOK_URL;
const bookingUrl =
  process.env.NEXT_PUBLIC_RBI_CTA_URL || "mailto:anthony@recalibrate.world";

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
};

const youtubeParams =
  "?autoplay=0&mute=0&rel=0&modestbranding=1&playsinline=1&color=white";

const formatSeconds = (value: string) =>
  value ? `${value.replace(/[^0-9.]/g, "")}s` : "–";

const formatSteps = (value: string) =>
  value ? `${value.replace(/[^0-9.]/g, "")} steps` : "–";

const computeRomPercent = (inhale: string, exhale: string) => {
  const inhaleNum = parseFloat(inhale);
  const exhaleNum = parseFloat(exhale);
  if (!inhaleNum || !exhaleNum || exhaleNum === 0) return null;
  return (((inhaleNum - exhaleNum) / exhaleNum) * 100).toFixed(1);
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
    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{subtitle}</p>
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

  const resetState = useCallback(() => {
    setFormData(initialForm);
    setSubmissionState("idle");
    setErrorMessage(null);
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

  const handleSubmit = async () => {
    setSubmissionState("submitting");
    setErrorMessage(null);
    trackEvent("diagnostic_modal_submit", "submit");

    try {
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

      setSubmissionState("success");
      setStep(modalSteps);
    } catch (error) {
      console.error("Diagnostic submission error", error);
      setSubmissionState("error");
      setErrorMessage("We couldn’t submit your results. Please try again.");
    }
  };

  const isStepValid = () => {
    const requiredByStep: Record<number, (keyof FormData)[]> = {
      2: ["firstName", "lastName", "email", "boltScore"],
      3: ["co2ttScore"],
      4: ["mbtSteps"],
      5: ["lomZone"],
      6: ["romInhale", "romExhale"],
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
    if (step === 6) {
      handleSubmit();
      return;
    }
    setStep((prev) => Math.min(modalSteps, prev + 1));
  };

  const renderHeroCopy = () => (
    <div className="space-y-4">
      <p className="text-sm uppercase tracking-[0.4em] text-slate-500">
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
        Grab a timer, space for a straight-line walk, and a tape measure or shoelace + ruler.
      </p>
      <p className="text-base text-slate-700">
        After you submit, I’ll send a full breakdown of your Breath Index plus breathwork
        protocols tailored to your physiology.
      </p>
      <p className="text-base font-medium text-slate-900">See you on the other side,</p>
      <p className="text-lg font-semibold text-slate-900">– Coach Anthony</p>
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

  const renderSummary = () => {
    const rom = romPercent ? parseFloat(romPercent) : NaN;
    const boltValue = parseFloat(formData.boltScore);
    const co2Value = parseFloat(formData.co2ttScore);
    const mbtValue = parseFloat(formData.mbtSteps);

    const scorecards = [
      {
        label: "BOLT",
        value: formatSeconds(formData.boltScore),
        tag: getScoreTag(boltValue, [20, 30]),
        insight:
          boltValue >= 30
            ? "Elite CO₂ tolerance."
            : boltValue >= 20
            ? "Solid, but more precision unlocks focus."
            : "Let’s build your tolerance rhythm.",
      },
      {
        label: "CO₂TT",
        value: formatSeconds(formData.co2ttScore),
        tag: getScoreTag(co2Value, [50, 70]),
        insight:
          co2Value >= 70
            ? "Calm nervous system under stress."
            : co2Value >= 50
            ? "Developing adaptability."
            : "Start stacking exhale holds + cadence work.",
      },
      {
        label: "MBT",
        value: formatSteps(formData.mbtSteps),
        tag: getScoreTag(mbtValue, [55, 75]),
        insight:
          mbtValue >= 75
            ? "High-end endurance under breathlessness."
            : mbtValue >= 55
            ? "Capacity is building — refine pacing."
            : "We’ll expand your ceiling with progressive walks.",
      },
      {
        label: "LOM",
        value: formData.lomZone || "—",
        tag: formData.lomZone.includes("Zone 1") ? "Dialed In" : "Needs Attention",
        insight:
          formData.lomZone.includes("Zone 1")
            ? "Great diaphragmatic sequencing."
            : "We’ll train you toward Zone 1 dominance.",
      },
      {
        label: "ROM",
        value: romPercent ? `${romPercent}%` : "—",
        tag: getScoreTag(rom, [8, 12]),
        insight:
          rom && rom >= 12
            ? "Strong rib cage expansion."
            : rom && rom >= 8
            ? "Good mobility — polish breathing angles."
            : "We’ll create more space through targeted drills.",
      },
    ];

    return (
      <div className="space-y-8">
        <SectionTitle title="Your RBI Snapshot" subtitle="Summary" />
        <p className="text-base text-slate-700">
          I’m building your full breakdown now. Here’s the high-level view of what you just
          uncovered. Watch your inbox for your detailed protocol.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {scorecards.map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-slate-200 bg-white/60 p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">{card.label}</p>
                <span
                  className={`text-xs font-semibold uppercase tracking-wide ${
                    card.tag === "Dialed In"
                      ? "text-emerald-600"
                      : card.tag === "Developing"
                      ? "text-amber-600"
                      : "text-rose-600"
                  }`}
                >
                  {card.tag}
                </span>
              </div>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{card.value}</p>
              <p className="mt-2 text-sm text-slate-600">{card.insight}</p>
            </div>
          ))}
        </div>
        <div className="rounded-3xl bg-gradient-to-r from-[#0A4367] to-[#144C74] p-6 text-white shadow-xl">
          <p className="text-lg font-semibold">What happens next?</p>
          <p className="mt-2 text-sm text-slate-100">
            I’ll review your data personally and send over your Recal Breath Index report +
            custom breathwork assignments. If you want to fast-track the plan, hop on a
            Calibration Call.
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
        return renderSummary();
      default:
        return null;
    }
  }, [step, formData, romPercent]);

  const nextLabel =
    step === 6
      ? submissionState === "submitting"
        ? "Submitting..."
        : "Submit Assessment"
      : step === 7
      ? "Done"
      : "Next";

  const disableNext =
    (step <= 6 && !isStepValid()) ||
    (step === 6 && submissionState === "submitting");

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
                  <p className="text-xs uppercase tracking-[0.6em] text-slate-400">
                    Recal Breath Index
                  </p>
                  <h1
                    className="mt-2 text-3xl font-semibold"
                    style={{ color: brandNavy, fontFamily: "Rogue Sans Ext, sans-serif", fontStyle: "italic" }}
                  >
                    RBI Assessment
                  </h1>
                  <p className="mt-1 text-sm text-slate-500">
                    {step <= 6
                      ? `Step ${step} of 6`
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
                  id={step > 1 ? "diagnostic-modal-back" : "diagnostic-modal-cancel"}
                  data-gtm={step > 1 ? "diagnostic-modal-back" : "diagnostic-modal-cancel"}
                  className="text-sm font-semibold text-slate-500 transition hover:text-slate-700"
                >
                  {step === 1 ? "Cancel" : "Back"}
                </button>
                <button
                  onClick={handleNext}
                  disabled={disableNext}
                  id={step === 6 ? "diagnostic-modal-submit" : "diagnostic-modal-next"}
                  data-gtm={step === 6 ? "diagnostic-modal-submit" : "diagnostic-modal-next"}
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

