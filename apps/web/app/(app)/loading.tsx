import { RouteLoaderOverlay } from "@workspace/ui/components/loaders"

/* Shown while the authenticated shell boots (auth check + nav data load) on
 * first entry / hard reload — the branded full-screen "thread of memory". */
export default function Loading() {
  return <RouteLoaderOverlay />
}
