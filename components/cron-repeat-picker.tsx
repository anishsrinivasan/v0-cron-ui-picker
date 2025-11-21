"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export interface RepeatConfig {
  frequency: "hourly" | "daily" | "weekly" | "monthly" | "yearly"
  interval: number
  daysOfWeek?: number[] // 0-6, 0 = Sunday
  startDate: string // YYYY-MM-DD
  startTime: string // HH:MM
  endDate: string // now required (not nullable)
  endTime: string // now required
}

export interface CronOutput {
  cron: string
  config: RepeatConfig
  description: string
  nextRuns: string[]
}

interface CronRepeatPickerProps {
  onSubmit?: (output: CronOutput) => void
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

function calculateNextRuns(config: RepeatConfig, count = 5): string[] {
  const runs: string[] = []

  const [startYear, startMonth, startDay] = config.startDate.split("-").map(Number)
  const [startHour, startMinute] = config.startTime.split(":").map(Number)

  const startDateTime = new Date(startYear, startMonth - 1, startDay, startHour, startMinute, 0)

  const endDateTime = new Date(config.endDate)
  const [endHour, endMinute] = config.endTime.split(":").map(Number)
  endDateTime.setHours(endHour, endMinute, 0)

  const currentDate = new Date(startDateTime)

  while (runs.length < count) {
    // Check if within end range
    if (currentDate > endDateTime) {
      break
    }

    let isValid = false

    switch (config.frequency) {
      case "hourly":
        isValid = true
        break
      case "daily":
        isValid = true
        break
      case "weekly": {
        const dayOfWeek = currentDate.getDay()
        isValid = config.daysOfWeek?.includes(dayOfWeek) ?? false
        break
      }
      case "monthly": {
        const dayOfMonth = currentDate.getDate()
        const startDayOfMonth = new Date(startYear, startMonth - 1, startDay).getDate()
        isValid = dayOfMonth === startDayOfMonth
        break
      }
      case "yearly":
        isValid =
          currentDate.getMonth() === startDateTime.getMonth() && currentDate.getDate() === startDateTime.getDate()
        break
    }

    if (isValid) {
      const formatted = currentDate.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
      runs.push(formatted)
    }

    // Increment based on frequency
    switch (config.frequency) {
      case "hourly":
        currentDate.setHours(currentDate.getHours() + config.interval)
        break
      case "daily":
        currentDate.setDate(currentDate.getDate() + config.interval)
        break
      case "weekly":
        currentDate.setDate(currentDate.getDate() + 1)
        break
      case "monthly":
        currentDate.setDate(currentDate.getDate() + 1)
        break
      case "yearly":
        currentDate.setDate(currentDate.getDate() + 1)
        break
    }
  }

  return runs
}

function generateCron(config: RepeatConfig): string {
  const { frequency, interval, daysOfWeek } = config
  const [hour, minute] = config.startTime.split(":").map(Number)

  let cronExpression = ""

  switch (frequency) {
    case "hourly":
      cronExpression = `${minute} */${interval} * * *`
      break
    case "daily":
      cronExpression = `${minute} ${hour} */${interval} * *`
      break
    case "weekly": {
      const days = daysOfWeek && daysOfWeek.length > 0 ? daysOfWeek.map((d) => (d === 0 ? 7 : d)).join(",") : "*"
      cronExpression = `${minute} ${hour} * * ${days}`
      break
    }
    case "monthly":
      // Use the day from startDate for monthly recurrence
      const startDay = Number(config.startDate.split("-")[2])
      cronExpression = `${minute} ${hour} ${startDay} */${interval} *`
      break
    case "yearly":
      const [, month, day] = config.startDate.split("-").map(Number)
      cronExpression = `${minute} ${hour} ${day} ${month} *`
      break
    default:
      cronExpression = `${minute} ${hour} * * *`
  }

  return cronExpression
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

export const CronRepeatPicker: React.FC<CronRepeatPickerProps> = ({ onSubmit, initialConfig }) => {
  const today = new Date().toISOString().split("T")[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0]

  const [config, setConfig] = useState<RepeatConfig>(
    initialConfig || {
      frequency: "weekly",
      interval: 1,
      daysOfWeek: [1, 3, 5], // Mon, Wed, Fri by default
      startDate: today,
      startTime: "09:00",
      endDate: tomorrow, // default to tomorrow instead of null
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

  const cronExpression = generateCron(config)
  const description = generateDescription(config)
  const nextRuns = calculateNextRuns(config)

  const handleDone = () => {
    const output: CronOutput = {
      cron: cronExpression,
      config,
      description,
      nextRuns,
    }
    onSubmit?.(output)
  }

  return (
    <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
      <h2 className="mb-6 text-lg font-semibold text-foreground">Custom recurrence</h2>

      {/* Repeat Every Section */}
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

      {/* Repeat On (for weekly) */}
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

      {/* Summary */}
      <div className="mb-6 rounded-md bg-muted p-3">
        <p className="text-sm text-foreground">{description}</p>
        <p className="mt-2 font-mono text-xs text-muted-foreground">CRON: {cronExpression}</p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <Button variant="outline">Cancel</Button>
        <Button onClick={handleDone} className="bg-primary hover:bg-primary/90">
          Done
        </Button>
      </div>
    </div>
  )
}
