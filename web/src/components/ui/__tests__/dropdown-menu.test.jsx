import { render, screen } from "@testing-library/react"

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "../dropdown-menu"

describe("DropdownMenu", () => {
  it("applies styling helpers to menu primitives", () => {
    render(
      <DropdownMenu open onOpenChange={() => {}}>
        <DropdownMenuTrigger asChild>
          <button type="button">Open</button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="menu-styles">
          <DropdownMenuItem inset>Profile</DropdownMenuItem>
          <DropdownMenuCheckboxItem checked>
            Email alerts
          </DropdownMenuCheckboxItem>
          <DropdownMenuRadioGroup value="a">
            <DropdownMenuRadioItem value="a">
              Option A
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuShortcut data-testid="shortcut">⌘K</DropdownMenuShortcut>
        </DropdownMenuContent>
      </DropdownMenu>
    )

    const menu = screen.getByRole("menu")
    expect(menu).toHaveClass("menu-styles")
    expect(screen.getByRole("menuitem", { name: "Profile" }).className).toContain(
      "pl-8"
    )
    expect(
      screen.getByRole("menuitemcheckbox", { name: "Email alerts" })
    ).toHaveAttribute("data-state", "checked")
    expect(
      screen.getByRole("menuitemradio", { name: "Option A" })
    ).toHaveAttribute("aria-checked", "true")
    expect(screen.getByTestId("shortcut")).toHaveTextContent("⌘K")
  })
})
