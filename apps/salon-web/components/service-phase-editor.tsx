"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { PlusIcon, MinusIcon } from "lucide-react";
import { RiDeleteBinLine } from "@remixicon/react";
import {
  defaultVariantPhases,
  PHASE_MINUTE_MAX,
  PHASE_MINUTE_MIN,
  PHASE_MINUTE_STEP,
  phaseTotals,
  resequencePhases,
  snapPhaseMinutes,
  type PhaseType,
} from "@/lib/api/calendar/layout-segments";
import { COLOR_MAP, isValidServiceColor } from "@/lib/service-colors";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type PhaseDraft = {
  phase_type: PhaseType;
  duration_minutes: number;
};

const PHASE_TYPES: PhaseType[] = ["busy", "free", "buffer"];
const BUFFER_RGB = { r: 212, g: 212, b: 216 };

function hexRgb(hex: string): { r: number; g: number; b: number } {
  const value = hex.replace("#", "");
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

function stripeFill(
  rgb: { r: number; g: number; b: number },
  alpha: number,
  band: number,
): string {
  return `repeating-linear-gradient(45deg, transparent, transparent ${band}px, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha}) ${band}px, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha}) ${band * 2}px)`;
}

function formatMinutes(
  total: number,
  hourUnit: string,
  minuteUnit: string,
): string {
  if (!total || total < 1) return `0${minuteUnit}`;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours === 0) return `${minutes}${minuteUnit}`;
  if (minutes === 0) return `${hours}${hourUnit}`;
  return `${hours}${hourUnit}${minutes}${minuteUnit}`;
}

function formatSentenceDuration(
  total: number,
  hourUnit: string,
  minuteUnit: string,
  wholeHours: string,
): string {
  if (!total || total < 1) return `0${minuteUnit}`;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours === 0) return `${minutes}${minuteUnit}`;
  if (minutes === 0) return wholeHours;
  return `${hours}${hourUnit} ${minutes}`;
}

function toDrafts(phases: PhaseDraft[]): PhaseDraft[] {
  return resequencePhases(phases).map((phase) => ({
    phase_type: phase.phase_type,
    duration_minutes: phase.duration_minutes,
  }));
}

/**
 * Catalog phase editor: read-only bar, one row per block, three add buttons.
 * busy + free = client duration. busy + buffer = staff duration.
 */
export function ServicePhaseEditor({
  phases,
  color,
  onChange,
}: {
  phases: PhaseDraft[];
  color: string;
  onChange: (phases: PhaseDraft[]) => void;
}) {
  const t = useTranslations();
  const [minuteDrafts, setMinuteDrafts] = useState<Record<number, string>>({});

  const normalized =
    phases.length > 0 ? phases : toDrafts(defaultVariantPhases());
  const totals = phaseTotals(normalized);
  const clock = Math.max(totals.clockMinutes, 1);
  const busyCount = normalized.filter((phase) => phase.phase_type === "busy")
    .length;
  const barColor = isValidServiceColor(color)
    ? COLOR_MAP[color]
    : COLOR_MAP.emerald;
  const rgb = hexRgb(barColor);
  const hourUnit = t("treatments.form.phaseHourUnit");
  const minuteUnit = t("treatments.form.phaseMinuteAbbrev");
  const format = (minutes: number) =>
    formatMinutes(minutes, hourUnit, minuteUnit);
  const formatSummary = (minutes: number) =>
    formatSentenceDuration(
      minutes,
      hourUnit,
      minuteUnit,
      t("treatments.form.phaseHourWord", { count: Math.floor(minutes / 60) }),
    );

  const typeLabel = (type: PhaseType) => {
    if (type === "free") return t("treatments.form.phaseFree");
    if (type === "buffer") return t("treatments.form.phaseBuffer");
    return t("treatments.form.phaseBusy");
  };

  const barLabel = (phase: PhaseDraft) =>
    `${format(phase.duration_minutes)} ${typeLabel(phase.phase_type).toLowerCase()}`;

  const commit = (next: PhaseDraft[]) => {
    onChange(toDrafts(next));
  };

  const addPhase = (type: PhaseType) => {
    commit([
      ...normalized,
      { phase_type: type, duration_minutes: 30 },
    ]);
  };

  const updatePhase = (index: number, patch: Partial<PhaseDraft>) => {
    const current = normalized[index];
    if (!current) return;
    if (
      patch.phase_type &&
      patch.phase_type !== "busy" &&
      current.phase_type === "busy" &&
      busyCount <= 1
    ) {
      toast.error(t("treatments.form.phaseNeedBusy"));
      return;
    }
    commit(
      normalized.map((phase, i) =>
        i === index ? { ...phase, ...patch } : phase,
      ),
    );
  };

  const bumpMinutes = (index: number, delta: number) => {
    const current = normalized[index];
    if (!current) return;
    const next = Math.min(
      PHASE_MINUTE_MAX,
      Math.max(PHASE_MINUTE_MIN, current.duration_minutes + delta),
    );
    setMinuteDrafts((prev) => {
      const copy = { ...prev };
      delete copy[index];
      return copy;
    });
    updatePhase(index, { duration_minutes: next });
  };

  const deletePhase = (index: number) => {
    const current = normalized[index];
    if (!current) return;
    if (current.phase_type === "busy" && busyCount <= 1) {
      toast.error(t("treatments.form.phaseNeedBusy"));
      return;
    }
    commit(normalized.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div
        className="flex h-10 w-full overflow-hidden rounded-md"
        aria-hidden="true"
      >
        {normalized.map((phase, index) => {
          const widthPct = (phase.duration_minutes / clock) * 100;
          const label = barLabel(phase);
          const showLabel = widthPct > 12;

          return (
            <div
              key={`${index}-${phase.phase_type}-${phase.duration_minutes}`}
              title={label}
              className={cn(
                "relative flex min-w-[16px] items-center justify-center px-1 text-[10px] font-medium leading-tight",
                phase.phase_type === "busy" && "text-white",
                (phase.phase_type === "free" ||
                  phase.phase_type === "buffer") &&
                  "text-foreground/80",
              )}
              style={{
                width: `${widthPct}%`,
                backgroundColor:
                  phase.phase_type === "busy"
                    ? barColor
                    : phase.phase_type === "free"
                      ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.28)`
                      : `rgba(${BUFFER_RGB.r}, ${BUFFER_RGB.g}, ${BUFFER_RGB.b}, 0.28)`,
                backgroundImage:
                  phase.phase_type === "free"
                    ? stripeFill(rgb, 0.22, 4)
                    : phase.phase_type === "buffer"
                      ? stripeFill(BUFFER_RGB, 0.34, 4)
                      : undefined,
              }}
            >
              <span className="truncate">{showLabel ? label : format(phase.duration_minutes)}</span>
            </div>
          );
        })}
      </div>

      <div className="space-y-2">
        {normalized.map((phase, index) => {
          const isLastBusy = phase.phase_type === "busy" && busyCount <= 1;
          return (
            <div
              key={`row-${index}`}
              className="flex flex-wrap items-center gap-2 rounded-md border bg-background px-2.5 py-2"
            >
              <span
                className="h-6 w-1.5 shrink-0 rounded-full"
                style={{
                  backgroundColor:
                    phase.phase_type === "busy"
                      ? barColor
                      : phase.phase_type === "free"
                        ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`
                        : `rgba(${BUFFER_RGB.r}, ${BUFFER_RGB.g}, ${BUFFER_RGB.b}, 0.4)`,
                  backgroundImage:
                    phase.phase_type === "free"
                      ? stripeFill(rgb, 0.35, 3)
                      : phase.phase_type === "buffer"
                        ? stripeFill(BUFFER_RGB, 0.54, 3)
                        : undefined,
                }}
                aria-hidden="true"
              />

              <div className="flex items-center">
                {PHASE_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={cn(
                      "px-2.5 py-1 text-xs font-medium rounded-md",
                      phase.phase_type === type
                        ? "bg-foreground text-background"
                        : "bg-transparent text-muted-foreground hover:text-foreground",
                    )}
                    onClick={() => updatePhase(index, { phase_type: type })}
                  >
                    {typeLabel(type)}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={phase.duration_minutes <= PHASE_MINUTE_MIN}
                  aria-label={t("treatments.form.phaseMinus")}
                  onClick={() => bumpMinutes(index, -PHASE_MINUTE_STEP)}
                >
                  <MinusIcon size={14} />
                </Button>
                <Input
                  type="number"
                  min={PHASE_MINUTE_MIN}
                  step={PHASE_MINUTE_STEP}
                  className="h-8 w-[4.25rem] text-center text-sm"
                  value={minuteDrafts[index] ?? String(phase.duration_minutes)}
                  onFocus={() => {
                    setMinuteDrafts((prev) => ({
                      ...prev,
                      [index]: String(phase.duration_minutes),
                    }));
                  }}
                  onChange={(event) =>
                    setMinuteDrafts((prev) => ({
                      ...prev,
                      [index]: event.target.value,
                    }))
                  }
                  onBlur={() => {
                    const parsed = Number(minuteDrafts[index]);
                    setMinuteDrafts((prev) => {
                      const copy = { ...prev };
                      delete copy[index];
                      return copy;
                    });
                    if (!Number.isFinite(parsed)) return;
                    updatePhase(index, {
                      duration_minutes: snapPhaseMinutes(parsed),
                    });
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.currentTarget.blur();
                    }
                  }}
                  aria-label={t("treatments.form.phaseMinutes")}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={phase.duration_minutes >= PHASE_MINUTE_MAX}
                  aria-label={t("treatments.form.phasePlus")}
                  onClick={() => bumpMinutes(index, PHASE_MINUTE_STEP)}
                >
                  <PlusIcon size={14} />
                </Button>
                <span className="text-xs text-muted-foreground">
                  {t("treatments.form.phaseMinutesUnit")}
                </span>
              </div>

              {!isLastBusy && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="ml-auto h-8 w-8 text-muted-foreground hover:text-destructive"
                  aria-label={t("treatments.form.phaseDelete")}
                  onClick={() => deletePhase(index)}
                >
                  <RiDeleteBinLine size={16} />
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8"
          onClick={() => addPhase("busy")}
        >
          <PlusIcon size={14} />
          {t("treatments.form.phaseAddBusy")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8"
          onClick={() => addPhase("free")}
        >
          <PlusIcon size={14} />
          {t("treatments.form.phaseAddFree")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8"
          onClick={() => addPhase("buffer")}
        >
          <PlusIcon size={14} />
          {t("treatments.form.phaseAddBuffer")}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        {t("treatments.form.phaseSummary", {
          client: formatSummary(totals.clientMinutes),
          staff: formatSummary(totals.staffMinutes),
        })}
      </p>
    </div>
  );
}
