# 🚀 Next.js 16 Template

Available on GitHub: [https://github.com/eyenalxai/nextjs-template](https://github.com/eyenalxai/nextjs-template)

## App Router & coss UI

This template employs the App Router and coss UI, leveraging the power of React's latest features combined with re-usable components built with Base UI and Tailwind CSS.

## Dynamic Theming

Ensure user-friendly appearance adjustments with seamless toggling 🌓 between dark and light modes based on the system preferences.

## Pre-Configured Biome and ESLint

Benefit from clean and error-free coding courtesy of pre-configured setups for Biome and ESLint.

## Database with Drizzle ORM

Built with [Drizzle ORM](https://orm.drizzle.team) for type-safe database operations and schema management. Experience the power of SQL with the safety of TypeScript.

## Enhanced Authentication

Secure your application with a robust authentication system that supports multiple providers and session management.

### Better Auth Models Generation

This project uses [Better Auth](https://www.better-auth.com/) - a comprehensive authentication library that supports multiple frameworks and providers. One of its key features is the ability to generate type-safe Drizzle ORM models for authentication. To generate the authentication schema:

```bash
pnpm auth:generate
```

This command:

- Generates type-safe authentication models
- Outputs the schema to `src/server/database/auth-schema.ts`

Run this command whenever you make changes to your authentication configuration.

## Type-Safe API with tRPC

Leverage [tRPC](https://trpc.io) for end-to-end type-safe APIs without the need for code generation or runtime type checking.

## License

This project is licensed under the MIT License.
