"use client"

import { useState } from "react"
import { CronRepeatPicker, type RRuleOutput } from "@/components/cron-repeat-picker"
import { parseRRuleString, type SimplifiedRRuleConfig } from "@/lib/rrule-config"

export default function Home() {
  const [output, setOutput] = useState<RRuleOutput | null>(null)
  const [storedConfig, setStoredConfig] = useState<SimplifiedRRuleConfig | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  const handleRepeatSubmit = (data: RRuleOutput) => {
    setOutput(data)
    setStoredConfig(data.simplifiedConfig)
  }

  const handleLoadFromDB = () => {
    const mockDBConfig: SimplifiedRRuleConfig = {
      rrule: "DTSTART:20251121T040000Z\nRRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE,FR;UNTIL=20251221T235900Z",
      timezone: "America/New_York",
    }

    console.log("[v0] Loading config from DB:", mockDBConfig)
    setStoredConfig(mockDBConfig)
    setOutput(null)
    setIsEditing(true)
  }

  const handleNewConfig = () => {
    setIsEditing(false)
    setStoredConfig(null)
    setOutput(null)
  }

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">AI Quiz Scheduler</h1>
          <p className="text-muted-foreground">Create a custom recurrence schedule for your quiz</p>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleNewConfig}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              New Config
            </button>
            <button
              onClick={handleLoadFromDB}
              className="px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded hover:bg-secondary/90"
            >
              Load Demo Config
            </button>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Picker */}
          <div className="flex justify-center">
            <CronRepeatPicker
              onSubmit={handleRepeatSubmit}
              initialConfig={
                isEditing && storedConfig
                  ? (() => {
                      const parsed = parseRRuleString(storedConfig.rrule)
                      return parsed
                        ? {
                            frequency: parsed.frequency,
                            interval: parsed.interval,
                            daysOfWeek: parsed.daysOfWeek,
                            startDate: parsed.startDate,
                            startTime: parsed.startTime,
                            endDate: parsed.endDate,
                            endTime: parsed.endTime,
                          }
                        : undefined
                    })()
                  : undefined
              }
            />
          </div>

          {/* Output */}
          {output && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">Output</h2>

              <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="font-semibold text-foreground mb-3">Next 5 Occurrences</h3>
                <div className="space-y-2">
                  {output.nextRuns.map((run, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm text-foreground">
                      <span className="font-mono text-xs bg-muted px-2 py-1 rounded w-16 text-center">
                        #{index + 1}
                      </span>
                      <span>{run}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="font-semibold text-foreground mb-3">Database Config (Simplified)</h3>
                <pre className="rounded bg-muted p-3 font-mono text-xs text-foreground overflow-auto">
                  {JSON.stringify(output.simplifiedConfig, null, 2)}
                </pre>
              </div>

              <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="font-semibold text-foreground mb-3">RRULE Expression</h3>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">RRULE (Server)</p>
                    <code className="block rounded bg-muted p-2 font-mono text-sm text-foreground break-words">
                      {output.rrule}
                    </code>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Timezone</p>
                    <code className="block rounded bg-muted p-2 font-mono text-sm text-foreground">
                      {output.timezone}
                    </code>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="font-semibold text-foreground mb-2">Description</h3>
                <p className="text-foreground">{output.description}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
