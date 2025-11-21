"use client"

import { useState } from "react"
import { CronRepeatPicker, type CronOutput } from "@/components/cron-repeat-picker"

export default function Home() {
  const [output, setOutput] = useState<CronOutput | null>(null)

  const handleRepeatSubmit = (data: CronOutput) => {
    setOutput(data)
  }

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">AI Quiz Scheduler</h1>
          <p className="text-muted-foreground">Create a custom recurrence schedule for your quiz</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Picker */}
          <div className="flex justify-center">
            <CronRepeatPicker onSubmit={handleRepeatSubmit} />
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
                <h3 className="font-semibold text-foreground mb-2">CRON Expression</h3>
                <code className="block rounded bg-muted p-3 font-mono text-sm text-foreground">{output.cron}</code>
              </div>

              <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="font-semibold text-foreground mb-2">Description</h3>
                <p className="text-foreground">{output.description}</p>
              </div>

              <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="font-semibold text-foreground mb-2">Configuration Type</h3>
                <pre className="rounded bg-muted p-3 font-mono text-xs text-foreground overflow-auto">
                  {JSON.stringify(output.config, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
