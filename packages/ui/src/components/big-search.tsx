import * as React from "react"

import {
  SearchField,
  SearchFieldIcon,
  SearchFieldInput,
} from "@workspace/ui/components/search-field"

function BigSearch({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <SearchField data-slot="big-search" className={className} {...props} />
}

function BigSearchIcon({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return <SearchFieldIcon data-slot="big-search-icon" className={className} {...props} />
}

function BigSearchInput({
  className,
  ...props
}: React.ComponentProps<"input">) {
  return <SearchFieldInput data-slot="big-search-input" className={className} {...props} />
}

export { BigSearch, BigSearchIcon, BigSearchInput }
