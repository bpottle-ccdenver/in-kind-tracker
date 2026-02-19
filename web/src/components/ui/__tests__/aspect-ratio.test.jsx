import { render } from "@testing-library/react"

import { AspectRatio } from "../aspect-ratio"

describe("AspectRatio", () => {
  it("forwards className and renders children", () => {
    const { container } = render(
      <AspectRatio className="ratio" ratio={16 / 9}>
        <img alt="example" />
      </AspectRatio>
    )

    const wrapper = container.querySelector(
      "[data-radix-aspect-ratio-wrapper]"
    )
    expect(wrapper).not.toBeNull()
    expect(wrapper.firstElementChild).toHaveClass("ratio")
    expect(container.querySelector("img")).toBeInTheDocument()
  })
})
