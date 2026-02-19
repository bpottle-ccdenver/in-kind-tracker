import { render, screen } from "@testing-library/react"

import { ToggleGroup, ToggleGroupItem } from "../toggle-group"

describe("ToggleGroup", () => {
  it("passes variant and size styles to items via context", () => {
    render(
      <ToggleGroup
        type="single"
        value="a"
        onValueChange={() => {}}
        variant="outline"
        size="lg"
      >
        <ToggleGroupItem value="a">Item A</ToggleGroupItem>
      </ToggleGroup>
    )

    const item = screen.getByRole("radio", { name: "Item A" })
    expect(item.className).toContain("border")
    expect(item.className).toContain("h-10")
  })
})
