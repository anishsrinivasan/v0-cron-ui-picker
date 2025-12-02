"use client"

import type React from "react"
import { useState } from "react"
import { RRule, datetime } from "rrule"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { SimplifiedRRuleConfig } from "@/lib/rrule-config"

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
  nextRuns: NextRun[]
  simplifiedConfig: SimplifiedRRuleConfig
}

export interface NextRun {
  iso: string
  local: string
}

interface RepeatPickerProps {
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

  const ruleString = rule.toString()

  return ruleString
}

function calculateNextRuns(config: RepeatConfig, timezone: string, count = 5): NextRun[] {
  const rruleString = generateRRuleString(config, timezone)
  console.log("[v0] RRULE String:", rruleString)

  const rule = RRule.fromString(rruleString)
  console.log("[v0] Rule options:", rule.options)

  const occurrences = rule.all((date, i) => i < count)
  console.log("[v0] Occurrences:", occurrences)

  const formatter = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: timezone,
  })

  const arr = occurrences.map((date) => ({
    iso: date.toISOString(),
    local: formatter.format(date),
  }))
  console.log("Arr", arr)
  return arr
}

export const RepeatPicker: React.FC<RepeatPickerProps> = ({ onSubmit, initialConfig }) => {
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

  const handleDone = () => {
    const simplifiedConfig: SimplifiedRRuleConfig = {
      rrule: rruleString,
      timezone: userTimezone,
    }

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
        <p className="mt-1 text-xs text-muted-foreground">Timezone: {userTimezone}</p>
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
