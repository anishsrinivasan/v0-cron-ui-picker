"use client"

import { useState } from "react"
import { CronRepeatPicker, type CronOutput } from "@/components/cron-repeat-picker"
import { toSimplifiedConfig, fromSimplifiedConfig, type SimplifiedCronConfig } from "@/lib/cron-config"

export default function Home() {
  const [output, setOutput] = useState<CronOutput | null>(null)
  const [storedConfig, setStoredConfig] = useState<SimplifiedCronConfig | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  const handleRepeatSubmit = (data: CronOutput) => {
    setOutput(data)
    const configToStore = toSimplifiedConfig(
      data.cronInUTC,
      data.config.startDate,
      data.config.endDate,
      data.timezone,
      {
        interval: data.config.interval,
        frequency: data.config.frequency,
        daysOfWeek: data.config.daysOfWeek,
      },
    )
    setStoredConfig(configToStore)
  }

  const handleLoadFromDB = () => {
    const mockDBConfig: SimplifiedCronConfig = {
      utcCron: "0 14 * * 1,3,5",
      startDate: "2025-11-21",
      endDate: "2025-12-21",
      timezone: "America/New_York",
      interval: 1,
      frequency: "weekly",
      daysOfWeek: [1, 3, 5],
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
              initialConfig={isEditing ? fromSimplifiedConfig(storedConfig!) : undefined}
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
                  {JSON.stringify(storedConfig, null, 2)}
                </pre>
              </div>

              <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="font-semibold text-foreground mb-3">CRON Expressions</h3>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">UTC CRON (Server)</p>
                    <code className="block rounded bg-muted p-2 font-mono text-sm text-foreground">
                      {output.cronInUTC}
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
