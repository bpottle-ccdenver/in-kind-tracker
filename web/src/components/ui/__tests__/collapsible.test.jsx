import { render, screen } from "@testing-library/react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../collapsible"

describe("Collapsible", () => {
  it("shows content when open", () => {
    render(
      <Collapsible open>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent data-testid="content">
          Hidden details
        </CollapsibleContent>
      </Collapsible>
    )

    expect(screen.getByText("Toggle")).toBeInTheDocument()
    const content = screen.getByTestId("content")
    expect(content).toHaveAttribute("data-state", "open")
    expect(content).toHaveTextContent("Hidden details")
  })
})
