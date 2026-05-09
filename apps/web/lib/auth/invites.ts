type InviteLookupResult = {
  data: { email: string } | null
  error: { message: string } | null
}

export type InviteLookupClient = {
  from(table: "auth_invites"): {
    select(columns: "email"): {
      eq(column: "email", value: string): {
        maybeSingle(): Promise<InviteLookupResult>
      }
    }
  }
}

export async function isInvitedEmail(
  email: string,
  client: InviteLookupClient
) {
  const { data, error } = await client
    .from("auth_invites")
    .select("email")
    .eq("email", email)
    .maybeSingle()

  if (error) {
    throw new Error("Could not check invite", { cause: error })
  }

  return data != null
}
