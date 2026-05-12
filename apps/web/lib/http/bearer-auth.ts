export function isAuthorizedBearerRequest({
  authorization,
  expectedSecret,
}: {
  authorization: string | null
  expectedSecret: string
}) {
  const secret = expectedSecret.trim()
  return secret.length > 0 && authorization === `Bearer ${secret}`
}
