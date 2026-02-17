import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes'

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="watermelon:theme"
    >
      {children}
    </NextThemesProvider>
  )
}

export { useTheme }