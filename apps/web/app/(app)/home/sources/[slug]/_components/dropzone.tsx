import { UploadCloudIcon } from "lucide-react"

function Dropzone() {
  return (
    <div className="flex flex-col items-center gap-1 rounded-md border border-dashed border-[color:var(--rule-strong)] bg-[var(--tint-hover)] px-6 py-6 text-center text-[13px] text-muted-foreground">
      <UploadCloudIcon className="size-4 text-muted-foreground" />
      <span>
        Drop a CSV here, or{" "}
        <button
          type="button"
          className="underline-offset-2 hover:text-foreground hover:underline"
        >
          browse files
        </button>
      </span>
      <span className="font-mono text-[11px] text-muted-foreground/70">
        First row should be column headers · max 10MB
      </span>
    </div>
  )
}

export { Dropzone }
