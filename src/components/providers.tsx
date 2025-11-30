import type { ThemeProviderProps } from "next-themes"
import { ThemeProvider as NextThemesProvider } from "next-themes"

export const Providers = ({ children, ...props }: ThemeProviderProps) => {
	return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
