import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Form, FormGrid, FormRow } from "@workspace/ui/components/form-row"

describe("FormRow", () => {
  it("renders form layout slots for label, help, and field", () => {
    render(
      <Form>
        <FormRow label="API key" help="Stored encrypted at rest.">
          <input aria-label="API key value" />
        </FormRow>
      </Form>
    )

    expect(screen.getByText("API key")).toHaveAttribute(
      "data-slot",
      "form-row-label-text"
    )
    expect(screen.getByText("Stored encrypted at rest.")).toHaveAttribute(
      "data-slot",
      "form-row-help"
    )
    expect(screen.getByRole("textbox", { name: "API key value" })).toBeVisible()
  })

  it("renders a stable grid slot for grouped fields", () => {
    render(<FormGrid data-testid="grid" />)

    expect(screen.getByTestId("grid")).toHaveAttribute(
      "data-slot",
      "form-grid"
    )
  })
})
