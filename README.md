# Meal Tracker

Meal Tracker is a web application for discovering recipes, reviewing nutritional information, and keeping a daily meal log. It provides a simple way to track calories and macronutrients while organizing meals around personal nutrition goals.

## Features

- Secure account creation and sign-in with Neon Auth
- Daily calorie and macronutrient overview
- Recipe search and category filters
- Portion-based nutritional calculations
- Meal diary organized by date and meal type
- User-specific nutrition goals and meal history
- Responsive dark interface

## Tech stack

- React 19 and TypeScript
- Vite
- React Router
- Tailwind CSS
- Neon PostgreSQL, Neon Auth, and Neon Data API
- Lucide React

## Getting started

### Requirements

- Node.js 20 or later
- A Neon project with Neon Auth and the Data API enabled

### Installation

```bash
git clone https://github.com/taniia-a/meal-tracker.git
cd meal-tracker
npm install
```

Create a `.env.local` file in the project root:

```bash
touch .env.local
```

Add the three values provided by your Neon project:

```env
DATABASE_URL=
VITE_NEON_AUTH_URL=
VITE_NEON_DATA_API_URL=
```

`DATABASE_URL` is used only by local migration scripts and must never be exposed in client-side code. Files containing local environment values are excluded from Git.

Add `http://localhost:5173` to the allowed origins in the Neon Auth configuration, then initialize the database:

```bash
npm run db:migrate
npm run db:verify
```

Start the development server:

```bash
npm run dev
```

## Available scripts

```bash
npm run dev        # Start the development server
npm run build      # Create a production build
npm run lint       # Run static code checks
npm run db:migrate # Apply the database schema
npm run db:verify  # Verify tables and RLS policies
```

## Security

Authentication is managed by Neon Auth. User-owned data is protected with PostgreSQL Row-Level Security policies. Recipes are readable by authenticated users, while profiles and meal entries are restricted to their owners.

Never commit `.env`, `.env.local`, database connection strings, or authentication secrets.

## Roadmap

- Store recipes and meal entries through the Neon Data API
- Recipe creation and bulk import tools
- English and Portuguese interface
- Editable nutrition goals
- Nutrition history and charts
- Recipe images and ingredient-level nutritional data

## License

No license has been selected yet.
