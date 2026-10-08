# Design direction

## Design Read

Design Read: ENERGY 2, RHYTHM 3, MOTION 2. This is an Indonesian VPN account portal used mainly on phones and sometimes on slow connections; the main task is to choose a service, choose a duration, create an account, and save its connection details.

## Visual system

- Use the fixed light palette: page `#F2F2F2`, surfaces `#FFFFFF`, primary text `#183345`, muted text `#526573`, primary action and focus `#035AA6`, graphic accent `#049DD9`, limited tint `#04B2D9`, and optional support or light-warning area `#F2C438`.
- Keep the theme light because the specified palette is designed for light backgrounds and the portal is used on phones during the day.
- Use one path line in deep blue to connect a device to a server, touching service points. Repeat it only in loading, 404, and maintenance views because it describes the product's connection tunnel.
- Use Lucide icons only when they identify a service or communicate a real action; avoid decorative icons beside generic headings.
- Use the system sans-serif stack to keep Indonesian text readable on small screens without downloading a font. Use monospace only for connection values that users need to copy.

## Page rhythm and behavior

- Give the service selection and account creation one clear first-screen focus.
- Show status as compact data rows, services as a ranked list, and quotas as a narrow summary strip so sections do not repeat the same card grid.
- Keep touch targets at least 44px, show keyboard focus, and maintain WCAG AA contrast for text.
- Keep account details temporary in the current browser tab only; never send them to logs or persistent storage.
- Use motion only to show real loading progress. Reduced-motion preferences receive a static path and status text.
- Use no fabricated counts, testimonials, logos, FAQ, or security claims. Show empty and error states when live data is unavailable.

## Reasons for major choices

- Light-only display follows the fixed light palette and the portal's phone-first daytime use.
- The path motif tells the real product story of a connection tunnel without adding background decoration.
- The system font avoids a network font request and keeps Indonesian glyph support available on user devices.
- Service rows and quota strips make the main task easier to scan on a narrow screen than repeated equal cards.
- The SSH terminal icon identifies shell access, while network route icons identify the other protocol choices; none of these icons claim that a service is faster or more secure.
