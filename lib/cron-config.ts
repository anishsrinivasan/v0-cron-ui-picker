import type { RepeatConfig } from "@/components/cron-repeat-picker"

export interface SimplifiedCronConfig {
  utcCron: string
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
  timezone: string
  // Standard CRON cannot express "every 2 weeks" - these fields are essential
  interval: number
  frequency: "hourly" | "daily" | "weekly" | "monthly" | "yearly"
  daysOfWeek?: number[] // For weekly recurrence
}

/**
 * Parse CRON expression to extract frequency details
 * Returns a RepeatConfig based on the CRON pattern
 */
export function parseCronExpression(cron: string): Partial<RepeatConfig> {
  const parts = cron.split(" ")
  if (parts.length < 5) return {}

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts

  const extractedTime = `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`

  // Detect frequency and interval
  if (hour.startsWith("*/")) {
    const interval = Number.parseInt(hour.slice(2))
    return { frequency: "hourly", interval, startTime: extractedTime }
  }

  if (dayOfMonth.startsWith("*/")) {
    const interval = Number.parseInt(dayOfMonth.slice(2))
    return { frequency: "daily", interval, startTime: extractedTime }
  }

  if (month.startsWith("*/")) {
    const interval = Number.parseInt(month.slice(2))
    const dayNum = Number.parseInt(dayOfMonth)
    return { frequency: "monthly", interval, startTime: extractedTime }
  }

  if (dayOfWeek !== "*") {
    const days = dayOfWeek.split(",").map((d) => {
      const num = Number.parseInt(d)
      return num === 7 ? 0 : num // Convert 7 (Sunday) to 0
    })
    return { frequency: "weekly", interval: 1, daysOfWeek: days, startTime: extractedTime }
  }

  if (month !== "*" && dayOfMonth !== "*") {
    return { frequency: "yearly", interval: 1, startTime: extractedTime }
  }

  // Default to daily
  return { frequency: "daily", interval: 1, startTime: extractedTime }
}

/**
 * Convert a RepeatConfig + dates to the simplified storage format
 * Use this when user clicks "Done" to save
 */
export function toSimplifiedConfig(
  utcCron: string,
  startDate: string,
  endDate: string,
  timezone: string,
  config: {
    interval: number
    frequency: "hourly" | "daily" | "weekly" | "monthly" | "yearly"
    daysOfWeek?: number[]
  },
): SimplifiedCronConfig {
  return {
    utcCron,
    startDate,
    endDate,
    timezone,
    interval: config.interval,
    frequency: config.frequency,
    daysOfWeek: config.daysOfWeek,
  }
}

/**
 * Load a simplified config from DB and convert to RepeatConfig for editing
 * This reconstructs the full config from the minimal stored data
 */
export function fromSimplifiedConfig(stored: SimplifiedCronConfig): RepeatConfig {
  const parsed = parseCronExpression(stored.utcCron)

  return {
    frequency: stored.frequency,
    interval: stored.interval,
    daysOfWeek: stored.daysOfWeek || parsed.daysOfWeek,
    startDate: stored.startDate,
    startTime: parsed.startTime || "09:00",
    endDate: stored.endDate,
    endTime: "23:59",
  }
}

/**
 * Example DB schema:
 *
 * CREATE TABLE quiz_schedules (
 *   id UUID PRIMARY KEY,
 *   quiz_id UUID NOT NULL,
 *   utc_cron VARCHAR(50) NOT NULL,
 *   start_date DATE NOT NULL,
 *   end_date DATE NOT NULL,
 *   timezone VARCHAR(100) NOT NULL,
 *   interval INT NOT NULL,
 *   frequency VARCHAR(20) NOT NULL,
 *   days_of_week INT[] (for weekly recurrence),
 *   created_at TIMESTAMP DEFAULT NOW(),
 *   updated_at TIMESTAMP DEFAULT NOW()
 * );
 *
 * Example stored data:
 * {
 *   "utcCron": "0 4 * * 1",
 *   "startDate": "2025-11-21",
 *   "endDate": "2025-12-21",
 *   "timezone": "Asia/Calcutta",
 *   "interval": 2,
 *   "frequency": "weekly",
 *   "daysOfWeek": [1]
 * }
 */
