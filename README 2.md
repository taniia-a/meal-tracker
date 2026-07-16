# Meal Tracker

Aplicação web para pesquisar receitas, consultar calorias e macronutrientes e registar refeições ao longo do dia.

## Stack

- React 19 + TypeScript
- Vite
- React Router
- Tailwind CSS
- Lucide React
- Neon PostgreSQL (integração preparada para uma fase seguinte)

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

Quando a API e o Neon forem adicionados, copia `.env.example` para `.env.local` e preenche os valores. Nunca publiques o ficheiro `.env.local`.
