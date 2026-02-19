import { render, screen } from "@testing-library/react"
import { useEffect } from "react"
import { useForm } from "react-hook-form"

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../form"

const TestForm = ({ triggerError = false }) => {
  const form = useForm({ defaultValues: { name: "" } })

  useEffect(() => {
    if (triggerError) {
      form.setError("name", { type: "required", message: "Name is required" })
    }
  }, [form, triggerError])

  return (
    <Form {...form}>
      <form>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full name</FormLabel>
              <FormControl>
                <input data-testid="name-input" {...field} />
              </FormControl>
              <FormDescription>Enter your legal name</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  )
}

describe("Form", () => {
  it("links description and message ids to the control", () => {
    render(<TestForm triggerError />)

    const input = screen.getByTestId("name-input")
    expect(input).toHaveAttribute("aria-invalid", "true")
    expect(input.getAttribute("aria-describedby")).toMatch(/form-item-description/)
    expect(screen.getByText("Name is required")).toBeInTheDocument()
    expect(screen.getByText("Full name")).toHaveClass("text-destructive")
  })
})
