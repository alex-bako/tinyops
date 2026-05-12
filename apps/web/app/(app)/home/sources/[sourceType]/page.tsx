import { redirect } from "next/navigation"

export default async function SourceTypePage({
  params,
}: {
  params: Promise<{ sourceType: string }>
}) {
  const { sourceType } = await params
  redirect(`/home/sources/${sourceType}/new`)
}
