const floatingContentMotionClasses =
  "duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-[0.98] data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-[0.98]"

const dialogOverlayMotionClasses =
  "ease-(--ease-out) data-open:animate-in data-open:fade-in-0 data-open:duration-(--dur-base) data-closed:animate-out data-closed:fade-out-0 data-closed:duration-(--dur-fast)"

const dialogContentMotionClasses =
  "origin-center ease-(--ease-out) data-open:animate-in data-open:fade-in-0 data-open:zoom-in-[0.98] data-open:duration-(--dur-base) data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-[0.98] data-closed:duration-(--dur-fast)"

export {
  dialogContentMotionClasses,
  dialogOverlayMotionClasses,
  floatingContentMotionClasses,
}
