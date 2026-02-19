import { render, screen } from "@testing-library/react"

import { ScrollArea, ScrollBar } from "../scroll-area"

describe("ScrollArea", () => {
  it("wraps children with viewport and custom class", () => {
    const { container } = render(
      <ScrollArea className="custom-scroll">
        <div>Scrollable content</div>
      </ScrollArea>
    )

    const root = container.firstChild
    expect(root).toHaveClass("custom-scroll")
    expect(screen.getByText("Scrollable content")).toBeInTheDocument()
    expect(
      container.querySelector("[data-radix-scroll-area-viewport]")
    ).not.toBeNull()
  })

  it("applies orientation specific styles to the scrollbar", () => {
    const { container } = render(
      <ScrollArea type="always" style={{ height: "50px" }}>
        <div style={{ height: "200px" }}>Scrollable content</div>
      </ScrollArea>
    )

    const bar = container.querySelector("[data-orientation]")
    expect(bar).not.toBeNull()
    expect(bar).toHaveAttribute("data-orientation", "vertical")
    expect(bar.className).toContain("h-full")
  })
})
