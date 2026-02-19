import { render, screen } from "@testing-library/react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "../alert-dialog"

describe("AlertDialog", () => {
  it("renders content and overlay when open", () => {
    render(
      <AlertDialog open onOpenChange={() => {}}>
        <AlertDialogContent data-testid="content" className="custom-class">
          <AlertDialogTitle>Delete item</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone.
          </AlertDialogDescription>
          <div>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>Confirm</AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    )

    const content = screen.getByRole("alertdialog")
    expect(content).toHaveClass("custom-class")
    expect(screen.getByText("Confirm")).toBeInTheDocument()
    expect(document.querySelector("[data-state='open']")).not.toBeNull()
  })
})
