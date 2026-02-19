import Pages from "@/pages/index.jsx"
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from "@/contexts/ThemeContext.jsx"

function App() {
  return (
    <ThemeProvider>
      <Pages />
      <Toaster />
    </ThemeProvider>
  )
}

export default App 
