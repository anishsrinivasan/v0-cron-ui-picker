"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { RRule, datetime } from "rrule"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { parseRRuleString, type SimplifiedRRuleConfig } from "@/lib/rrule-config"

export interface RepeatConfig {
  frequency: "hourly" | "daily" | "weekly" | "monthly" | "yearly"
  interval: number
  daysOfWeek?: number[] // 0-6, 0 = Sunday
  startDate: string // YYYY-MM-DD
  startTime: string // HH:MM
  endDate: string // YYYY-MM-DD
  endTime: string // HH:MM
}

export interface RRuleOutput {
  rrule: string // RRULE string for storage
  timezone: string
  config: RepeatConfig
  description: string
  nextRuns: string[]
  simplifiedConfig: SimplifiedRRuleConfig
}

interface CronRepeatPickerProps {
  onSubmit?: (output: RRuleOutput) => void
  initialConfig?: RepeatConfig
}

const DAYS_SHORT = ["S", "M", "T", "W", "T", "F", "S"]
const DAYS_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const FREQUENCY_OPTIONS = [
  { value: "hourly", label: "Hour" },
  { value: "daily", label: "Day" },
  { value: "weekly", label: "Week" },
  { value: "monthly", label: "Month" },
  { value: "yearly", label: "Year" },
]

const frequencyMap = {
  hourly: RRule.HOURLY,
  daily: RRule.DAILY,
  weekly: RRule.WEEKLY,
  monthly: RRule.MONTHLY,
  yearly: RRule.YEARLY,
}

const dayToRRuleWeekday = [RRule.SU, RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR, RRule.SA]

function generateRRuleString(config: RepeatConfig, timezone: string): string {
  const [year, month, day] = config.startDate.split("-").map(Number)
  const [hour, minute] = config.startTime.split(":").map(Number)

  const [endYear, endMonth, endDay] = config.endDate.split("-").map(Number)
  const [endHour, endMinute] = config.endTime.split(":").map(Number)

  const dtstart = datetime(year, month, day, hour, minute, 0)
  const until = datetime(endYear, endMonth, endDay, endHour, endMinute, 0)

  const freq = frequencyMap[config.frequency]
  const byweekday =
    config.frequency === "weekly" && config.daysOfWeek ? config.daysOfWeek.map((d) => dayToRRuleWeekday[d]) : undefined

  const rule = new RRule({
    freq,
    interval: config.interval,
    dtstart,
    until,
    byweekday,
    tzid: timezone,
  })

  return rule.toString()
}

function calculateNextRuns(config: RepeatConfig, timezone: string, count = 5): string[] {
  const rruleString = generateRRuleString(config, timezone)
  const rule = RRule.fromString(rruleString)

  const runs: string[] = []
  const occurrences = rule.all((date, i) => i < count)

  for (const date of occurrences) {
    const formatted = date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
    runs.push(formatted)
  }

  return runs
}

function generateDescription(config: RepeatConfig): string {
  const { frequency, interval, daysOfWeek, startDate, startTime, endDate, endTime } = config

  let desc = `Repeats every `

  if (interval > 1) {
    desc += `${interval} `
  }

  switch (frequency) {
    case "hourly":
      desc += interval === 1 ? "hour" : "hours"
      break
    case "daily":
      desc += interval === 1 ? "day" : "days"
      break
    case "weekly": {
      desc += interval === 1 ? "week" : "weeks"
      if (daysOfWeek && daysOfWeek.length > 0) {
        const selectedDays = daysOfWeek.map((d) => DAYS_FULL[d]).join(", ")
        desc += ` on ${selectedDays}`
      }
      break
    }
    case "monthly":
      desc += interval === 1 ? "month" : "months"
      break
    case "yearly":
      desc += "year"
      break
  }

  desc += ` starting ${startDate} at ${startTime}`
  desc += ` until ${endDate} at ${endTime}`

  return desc
}

function getStartTimeMismatch(config: RepeatConfig, timezone: string): string | null {
  const nextRuns = calculateNextRuns(config, timezone, 1)
  if (nextRuns.length === 0) return null

  const [configYear, configMonth, configDay] = config.startDate.split("-").map(Number)
  const [configHour, configMinute] = config.startTime.split(":").map(Number)
  const configDateTime = new Date(configYear, configMonth - 1, configDay, configHour, configMinute, 0)

  const firstRunStr = nextRuns[0]
  const firstRunDate = new Date(firstRunStr)

  const timeDifference =
    configDateTime.getFullYear() !== firstRunDate.getFullYear() ||
    configDateTime.getMonth() !== firstRunDate.getMonth() ||
    configDateTime.getDate() !== firstRunDate.getDate() ||
    configDateTime.getHours() !== firstRunDate.getHours() ||
    configDateTime.getMinutes() !== firstRunDate.getMinutes()

  if (timeDifference) {
    return firstRunStr
  }

  return null
}

function toSimplifiedConfig(rruleString: string, timezone: string): SimplifiedRRuleConfig {
  return {
    rrule: rruleString,
    timezone,
  }
}

function fromSimplifiedConfig(stored: SimplifiedRRuleConfig): RepeatConfig | null {
  const parsed = parseRRuleString(stored.rrule)
  if (!parsed) return null

  return {
    frequency: parsed.frequency,
    interval: parsed.interval,
    daysOfWeek: parsed.daysOfWeek,
    startDate: parsed.startDate,
    startTime: parsed.startTime,
    endDate: parsed.endDate,
    endTime: parsed.endTime,
  }
}

export const CronRepeatPicker: React.FC<CronRepeatPickerProps> = ({ onSubmit, initialConfig }) => {
  const today = new Date().toISOString().split("T")[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0]

  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone

  const [config, setConfig] = useState<RepeatConfig>(
    initialConfig || {
      frequency: "weekly",
      interval: 1,
      daysOfWeek: [1, 3, 5],
      startDate: today,
      startTime: "09:00",
      endDate: tomorrow,
      endTime: "23:59",
    },
  )

  useEffect(() => {
    if (initialConfig) {
      setConfig(initialConfig)
    }
  }, [initialConfig])

  const handleFrequencyChange = (frequency: "hourly" | "daily" | "weekly" | "monthly" | "yearly") => {
    setConfig((prev) => ({
      ...prev,
      frequency,
      daysOfWeek: frequency === "weekly" ? prev.daysOfWeek || [1, 3, 5] : undefined,
    }))
  }

  const handleIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(1, Number.parseInt(e.target.value) || 1)
    setConfig((prev) => ({ ...prev, interval: value }))
  }

  const toggleDayOfWeek = (day: number) => {
    setConfig((prev) => {
      const current = prev.daysOfWeek || []
      const updated = current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort()
      return { ...prev, daysOfWeek: updated }
    })
  }

  const rruleString = generateRRuleString(config, userTimezone)
  const description = generateDescription(config)
  const nextRuns = calculateNextRuns(config, userTimezone)
  const firstRunMismatch = getStartTimeMismatch(config, userTimezone)

  const handleDone = () => {
    const simplifiedConfig = toSimplifiedConfig(rruleString, userTimezone)

    const output: RRuleOutput = {
      rrule: rruleString,
      timezone: userTimezone,
      config,
      description,
      nextRuns,
      simplifiedConfig,
    }
    onSubmit?.(output)
  }

  return (
    <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
      <h2 className="mb-6 text-lg font-semibold text-foreground">Custom recurrence</h2>

      <div className="mb-6 space-y-3">
        <label className="text-sm font-medium text-foreground">Repeat every</label>
        <div className="flex gap-2">
          <Input type="number" min="1" value={config.interval} onChange={handleIntervalChange} className="w-20" />
          <select
            value={config.frequency}
            onChange={(e) => handleFrequencyChange(e.target.value as any)}
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
          >
            {FREQUENCY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {config.frequency === "weekly" && (
        <div className="mb-6 space-y-3">
          <label className="text-sm font-medium text-foreground">Repeat on</label>
          <div className="flex gap-2">
            {DAYS_SHORT.map((day, index) => (
              <button
                key={index}
                onClick={() => toggleDayOfWeek(index)}
                className={`h-9 w-9 rounded-full text-sm font-medium transition-colors ${
                  config.daysOfWeek?.includes(index)
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-background text-foreground hover:bg-muted"
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6 space-y-3">
        <label className="text-sm font-medium text-foreground">Start Date/Time</label>
        <div className="flex gap-2">
          <Input
            type="date"
            value={config.startDate}
            onChange={(e) => setConfig((prev) => ({ ...prev, startDate: e.target.value }))}
            className="flex-1"
          />
          <Input
            type="time"
            value={config.startTime}
            onChange={(e) => setConfig((prev) => ({ ...prev, startTime: e.target.value }))}
            className="flex-1"
          />
        </div>
      </div>

      <div className="mb-6 space-y-3">
        <label className="text-sm font-medium text-foreground">End Date/Time</label>
        <div className="flex gap-2">
          <Input
            type="date"
            value={config.endDate}
            onChange={(e) => setConfig((prev) => ({ ...prev, endDate: e.target.value }))}
            className="flex-1"
          />
          <Input
            type="time"
            value={config.endTime}
            onChange={(e) => setConfig((prev) => ({ ...prev, endTime: e.target.value }))}
            className="flex-1"
          />
        </div>
      </div>

      <div className="mb-6 rounded-md bg-muted p-3">
        <p className="text-sm text-foreground">{description}</p>
        <p className="mt-2 font-mono text-xs text-muted-foreground">RRULE: {rruleString}</p>
        <p className="mt-1 text-xs text-muted-foreground">Timezone: {userTimezone}</p>

        {firstRunMismatch && (
          <div className="mt-3 rounded-md bg-yellow-500/10 p-2 border border-yellow-500/30">
            <p className="text-xs text-yellow-700 dark:text-yellow-400">
              ⚠️ Note: Due to RRULE limitations, the schedule will actually start at <strong>{firstRunMismatch}</strong>{" "}
              instead of {config.startDate} at {config.startTime}.
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline">Cancel</Button>
        <Button onClick={handleDone} className="bg-primary hover:bg-primary/90">
          Done
        </Button>
      </div>
    </div>
  )
}
