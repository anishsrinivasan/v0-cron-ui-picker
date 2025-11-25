import type { RepeatConfig } from "@/components/cron-repeat-picker"
import { RRule } from "rrule"

export interface SimplifiedRRuleConfig {
  rrule: string // Full RRULE string with DTSTART and UNTIL
  timezone: string // User's timezone for display
}

/**
 * Parse RRULE string to extract all scheduling details
 */
export function parseRRuleString(rruleStr: string) {
  try {
    const rule = RRule.fromString(rruleStr)
    const options = rule.options

    const frequencyMap: Record<number, "hourly" | "daily" | "weekly" | "monthly" | "yearly"> = {
      [RRule.HOURLY]: "hourly",
      [RRule.DAILY]: "daily",
      [RRule.WEEKLY]: "weekly",
      [RRule.MONTHLY]: "monthly",
      [RRule.YEARLY]: "yearly",
    }

    const frequency = frequencyMap[options.freq] || "daily"
    const interval = options.interval || 1

    const dtstart = options.dtstart
    const startDate = dtstart.toISOString().split("T")[0]
    const startTime = `${String(dtstart.getHours()).padStart(2, "0")}:${String(dtstart.getMinutes()).padStart(2, "0")}`

    const until = options.until
    const endDate = until.toISOString().split("T")[0]
    const endTime = `${String(until.getHours()).padStart(2, "0")}:${String(until.getMinutes()).padStart(2, "0")}`

    const daysOfWeek = options.byweekday
      ? options.byweekday.map((wd: any) => {
          // RRule weekdays: 0=MO, 1=TU, ... 6=SU, so we need to map to 0=SU
          return wd === 6 ? 0 : wd + 1
        })
      : undefined

    return {
      frequency,
      interval,
      daysOfWeek,
      startDate,
      startTime,
      endDate,
      endTime,
    }
  } catch (error) {
    console.error("[v0] Error parsing RRULE:", error)
    return null
  }
}

/**
 * Convert RepeatConfig to simplified storage format
 */
export function toSimplifiedRRuleConfig(rruleString: string, timezone: string): SimplifiedRRuleConfig {
  return {
    rrule: rruleString,
    timezone,
  }
}

/**
 * Load from DB and convert to RepeatConfig for editing
 */
export function fromSimplifiedRRuleConfig(stored: SimplifiedRRuleConfig): RepeatConfig {
  const parsed = parseRRuleString(stored.rrule)

  if (!parsed) {
    throw new Error("Failed to parse RRULE string")
  }

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

/**
 * Example DB schema (minimal):
 *
 * CREATE TABLE quiz_schedules (
 *   id UUID PRIMARY KEY,
 *   quiz_id UUID NOT NULL,
 *   rrule TEXT NOT NULL,  -- Full RRULE with DTSTART and UNTIL
 *   timezone VARCHAR(100) NOT NULL,
 *   created_at TIMESTAMP DEFAULT NOW(),
 *   updated_at TIMESTAMP DEFAULT NOW()
 * );
 *
 * Example stored data:
 * {
 *   "rrule": "DTSTART:20251121T040000Z\nRRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=MO;UNTIL=20260222T235900Z",
 *   "timezone": "Asia/Calcutta"
 * }
 */
