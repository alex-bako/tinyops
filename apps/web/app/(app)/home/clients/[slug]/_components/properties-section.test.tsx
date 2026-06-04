import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { ClientProperty } from "@/features/clients/application/client-memory"

import { PropertiesSection } from "./properties-section"

const createPropertyAction = vi.fn()
const updatePropertyAction = vi.fn()
const deletePropertyAction = vi.fn()
const reorderPropertiesAction = vi.fn()
const refresh = vi.fn()
const toastError = vi.fn()

vi.mock("../actions", () => ({
  createPropertyAction: (input: unknown) => createPropertyAction(input),
  updatePropertyAction: (input: unknown) => updatePropertyAction(input),
  deletePropertyAction: (input: unknown) => deletePropertyAction(input),
  reorderPropertiesAction: (input: unknown) => reorderPropertiesAction(input),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}))

vi.mock("sonner", () => ({
  toast: Object.assign(() => {}, { error: (...args: unknown[]) => toastError(...args) }),
}))

function property(overrides: Partial<ClientProperty> = {}): ClientProperty {
  return {
    id: "prop_1",
    name: "Status",
    icon: "circle-dot",
    type: "status",
    value: { kind: "status", statusKind: "active", label: "Active" },
    position: 0,
    ...overrides,
  }
}

/** The editor's submit button (the header toggle shares its accessible name). */
function submitAddButton() {
  return screen.getAllByRole("button", { name: "Add property" }).at(-1)!
}

function renderSection(initialProperties: ClientProperty[] = [], canManage = true) {
  return render(
    <PropertiesSection
      clientId="client_1"
      initialProperties={initialProperties}
      canManage={canManage}
    />
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("PropertiesSection", () => {
  it("optimistically adds a property and persists it", async () => {
    createPropertyAction.mockResolvedValue({ data: { id: "prop_new" } })
    renderSection()

    fireEvent.click(screen.getByRole("button", { name: "Add a property" }))
    fireEvent.change(screen.getByPlaceholderText("Property name"), {
      target: { value: "Goal" },
    })
    // The header toggle and the editor's submit share the "Add property" label
    // while the form is open; the submit is the last one rendered.
    fireEvent.click(submitAddButton())

    expect(screen.getByText("Goal")).toBeInTheDocument()
    expect(createPropertyAction).toHaveBeenCalledWith({
      clientId: "client_1",
      name: "Goal",
      icon: "align-left",
      type: "text",
      value: { kind: "text", text: "" },
    })
    await waitFor(() => expect(refresh).toHaveBeenCalled())
  })

  it("shows the live field count and updates it optimistically", () => {
    renderSection([property()])
    expect(screen.getByText("1 field")).toBeInTheDocument()
  })

  it("deletes a property only after an inline confirmation", async () => {
    deletePropertyAction.mockResolvedValue({ data: undefined })
    renderSection([property({ name: "Cohort" })])

    fireEvent.click(screen.getByLabelText("Delete property"))
    expect(screen.getByText(/Delete “Cohort”\?/)).toBeInTheDocument()
    expect(deletePropertyAction).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole("button", { name: /Delete/ }))
    expect(deletePropertyAction).toHaveBeenCalledWith({ id: "prop_1" })
    await waitFor(() => expect(refresh).toHaveBeenCalled())
  })

  it("reverts and warns when a create fails", async () => {
    createPropertyAction.mockResolvedValue({ error: "property_action_failed" })
    renderSection()

    fireEvent.click(screen.getByRole("button", { name: "Add a property" }))
    fireEvent.change(screen.getByPlaceholderText("Property name"), {
      target: { value: "Doomed" },
    })
    fireEvent.click(submitAddButton())

    await waitFor(() => expect(toastError).toHaveBeenCalled())
    expect(screen.queryByText("Doomed")).not.toBeInTheDocument()
    expect(refresh).not.toHaveBeenCalled()
  })

  it("is read-only for members who cannot manage properties", () => {
    renderSection([property()], false)

    expect(screen.queryByRole("button", { name: "Add a property" })).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Edit property")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Delete property")).not.toBeInTheDocument()
    expect(screen.getByText("Active")).toBeInTheDocument()
  })
})
