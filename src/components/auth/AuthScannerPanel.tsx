import { CheckCircle2, ScanLine, Sparkles, Zap } from "lucide-react";

import { cn } from "@/lib/utils";

const stats = [
  { label: "Name", value: "98%" },
  { label: "Email", value: "94%" },
  { label: "Phone", value: "96%" },
];

export function AuthScannerPanel() {
  return (
    <div className="w-full max-w-lg min-w-0 px-2 py-6 sm:px-4 sm:py-8 lg:px-6 lg:py-10">

      <div className="mb-8 text-center sm:text-left">
        <h2 className="font-display text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl">
          Turn business cards
          <span className="block bg-gradient-to-r from-cyan-300 via-violet-300 to-violet-400 bg-clip-text text-transparent">
            into CRM leads
          </span>
        </h2>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/60">
          Scan at events, review on-device, and sync to Zoho — built for networking teams.
        </p>
      </div>

      <div className="">
        <div className="mb-3 flex items-center gap-2 text-xs text-white/70">
          <ScanLine className="h-3.5 w-3.5 text-cyan-300" />
          <span>Live scanning preview</span>
        </div>

        <div className="relative aspect-[1.6/1] overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-slate-900 to-[#0f172a]">
          <div className="absolute inset-5 flex flex-col justify-between text-white/55">
            <div>
              <div className="font-display text-sm font-semibold text-white/80">Sample Contact</div>
              <div className="text-[10px]">Job Title · Company</div>
            </div>
          </div>

          {[
            "top-2 left-2 border-l-2 border-t-2",
            "top-2 right-2 border-r-2 border-t-2",
            "bottom-2 left-2 border-l-2 border-b-2",
            "bottom-2 right-2 border-r-2 border-b-2",
          ].map((position) => (
            <div key={position} className={cn("absolute h-4 w-4 border-cyan-400/80", position)} />
          ))}

          <div className="pointer-events-none absolute inset-x-0 top-0 h-full overflow-hidden">
            <div className="animate-scan-line absolute inset-x-0 h-10 bg-gradient-to-b from-transparent via-cyan-400/35 to-transparent" />
          </div>

        
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border border-white/10 bg-black/30 px-2 py-2 text-center"
            >
              <div className="text-sm font-semibold text-white">{stat.value}</div>
              <div className="text-[10px] text-white/50">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-2 sm:justify-start">
        {["On-device OCR", "Zoho sync", "Offline queue"].map((feature) => (
          <span
            key={feature}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] text-white/65"
          >
            <Zap className="h-3 w-3 text-violet-300" />
            {feature}
          </span>
        ))}
      </div>
    </div>
  );
}
