# Meal Tracker

Aplicação web para pesquisar receitas, consultar calorias e macronutrientes e registar refeições ao longo do dia.

## Stack

- React 19 + TypeScript
- Vite
- React Router
- Tailwind CSS
- Lucide React
- Neon PostgreSQL + Neon Auth

## Desenvolvimento local

Requer Node.js 20 ou superior.

```bash
npm install
npm run dev
```

## Funcionalidades da base inicial

- dashboard com resumo nutricional diário;
- pesquisa e filtragem de receitas;
- diário de refeições por data e tipo de refeição;
- registo de porções com cálculo automático de macros;
- dados de demonstração isolados em `src/data`;
- modelos de domínio preparados para persistência numa API.

## Variáveis de ambiente

Copia `.env.example` para `.env.local` e preenche os valores do Neon. `DATABASE_URL` é usada apenas para migrações e nunca pode ser exposta no browser. `VITE_NEON_AUTH_URL` identifica o endpoint público do Neon Auth.

No Neon Console, adiciona `http://localhost:5173` aos domínios/origens permitidos durante o desenvolvimento.
