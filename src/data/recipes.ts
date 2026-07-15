import { Recipe } from '../types';

export const demoRecipes: Recipe[] = [
  {
    id: 'rec-1', name: 'Bowl de frango e quinoa', category: 'Almoço',
    description: 'Uma refeição completa com legumes assados e molho de iogurte.',
    calories: 520, protein: 43, carbs: 55, fat: 14, prepMinutes: 30, servings: 1,
    imageColor: 'from-amber-100 to-orange-200',
    ingredients: ['Peito de frango', 'Quinoa', 'Curgete', 'Pimento', 'Iogurte natural']
  },
  {
    id: 'rec-2', name: 'Papas de aveia e frutos vermelhos', category: 'Pequeno-almoço',
    description: 'Aveia cremosa, rica em fibra, com fruta e manteiga de amendoim.',
    calories: 385, protein: 18, carbs: 53, fat: 11, prepMinutes: 10, servings: 1,
    imageColor: 'from-rose-100 to-pink-200',
    ingredients: ['Flocos de aveia', 'Leite', 'Frutos vermelhos', 'Manteiga de amendoim']
  },
  {
    id: 'rec-3', name: 'Salmão com batata-doce', category: 'Jantar',
    description: 'Salmão no forno com batata-doce e brócolos temperados.',
    calories: 610, protein: 42, carbs: 49, fat: 27, prepMinutes: 35, servings: 1,
    imageColor: 'from-orange-100 to-amber-200',
    ingredients: ['Salmão', 'Batata-doce', 'Brócolos', 'Azeite', 'Limão']
  },
  {
    id: 'rec-4', name: 'Wrap de húmus e legumes', category: 'Lanche',
    description: 'Wrap rápido e fresco, ideal para levar.',
    calories: 330, protein: 12, carbs: 48, fat: 10, prepMinutes: 8, servings: 1,
    imageColor: 'from-emerald-100 to-lime-200',
    ingredients: ['Wrap integral', 'Húmus', 'Cenoura', 'Espinafres', 'Pepino']
  }
];
