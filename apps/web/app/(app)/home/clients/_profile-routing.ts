function clientProfileHref(slug: string): string {
  return `/home/clients/${slug}`
}

function clientProfileViewTransitionName(slug: string): string {
  return `client-${slug}`
}

export { clientProfileHref, clientProfileViewTransitionName }
