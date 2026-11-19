# Guia de Anotação — Job Radar AI (Dataset Ouro)

Este guia estabelece os critérios rigorosos e objetivos para rotulagem manual de vagas de emprego. O objetivo é criar o **dataset ouro** que calibra e avalia os modelos de extração e garante reprodutibilidade com concordância inter-anotadores (Cohen's $\kappa \ge 0{,}80$).

---

## 1. Regras Gerais

1. **Apenas dados explícitos no texto:** Nunca deduza ou presuma informações baseadas no renome da empresa, localização presumida ou tecnologias comuns que não foram citadas.
2. **Idioma:** Anote termos de stack no formato canônico da taxonomia (ex.: `node.js`, `react`, `postgresql`, `aws`, `typescript`, `python`). Se for um termo novo, registre em minúsculas e sem acentos.
3. **Passes:** O Pass 1 é a anotação principal. O Pass 2 é a re-anotação cega (48h após ou por segundo anotador) em uma amostra de controle para medir $\kappa$.

---

## 2. Critérios por Campo

### 2.1 `seniority` (Classe Única)
- **Valores permitidos:** `intern`, `junior`, `mid`, `senior`, `lead`, `unknown`.
- **Regras:**
  1. Se o título explicitar o nível (ex.: "Dev Full Stack Sênior", "Estágio em QA"), adote o nível correspondente (`senior`, `intern`).
  2. Se o título for agnóstico (ex.: "Software Engineer") e o texto exigir anos de experiência:
     - 0 a 1 ano ou estudante $\rightarrow$ `intern` ou `junior`.
     - 2 a 4 anos ou "Pleno" $\rightarrow$ `mid`.
     - 5+ anos ou "Sênior" $\rightarrow$ `senior`.
     - Liderança de equipe formal / Tech Lead $\rightarrow$ `lead`.
  3. Se não houver menção a nível nem a faixa de experiência no texto $\rightarrow$ `unknown`.

### 2.2 `work_model` (Classe Única)
- **Valores permitidos:** `remote`, `hybrid`, `onsite`, `unknown`.
- **Regras:**
  - `remote`: 100% remoto, teletrabalho total, anywhere office.
  - `hybrid`: menção explícita a dias presenciais e dias remotos.
  - `onsite`: presencial no escritório/fábrica ou sem qualquer menção a flexibilidade quando o endereço físico for obrigatório.
  - `unknown`: quando não houver informação sobre modelo de trabalho.

### 2.3 `salary_published` e Valores de Salário (Gate Duro)
- **`salary_published`:** Booleano (`true` ou `false`).
  - **`true`:** SOMENTE se houver valor numérico explícito (fixo ou faixa) e moeda correspondente à remuneração (ex.: "R$ 8.000 a R$ 10.000", "$5,000/month", "R$ 7.500 PJ").
  - **`false`:** Menções genéricas ("a combinar", "compatível com o mercado", "salário competitivo"), pacote de benefícios isolado (VR, VA, plano de saúde, stock options) ou ausência de remuneração.
  - **Atenção:** Um falso positivo em salário reprova o dataset e o modelo.
- **Valores:** Se `salary_published = true`:
  - `currency`: código ISO de 3 letras (`BRL`, `USD`, `EUR`, `GBP`).
  - `period`: `month`, `year` ou `hour`.
  - `min`: número decimal (ex.: 8000).
  - `max`: número decimal (ex.: 10000). Se for valor fixo, `min = max`.

### 2.4 `years` (Numérico / Null)
- Mínimo de anos de experiência global ou na stack principal exigido como requisito obrigatório.
- Se a vaga disser "mínimo de 3 anos com Node.js e 5 anos no geral", anote o requisito geral ou principal (ex.: 3 ou 5). Se não exigir anos específicos, anote `null`.

### 2.5 `stack_must` (Multi-rótulo)
- Tecnologias, linguagens, frameworks, bibliotecas ou conceitos técnicos indispensáveis descritos na seção de requisitos obrigatórios/essenciais.
- Cada item deve ser registrado pelo nome canônico (ex.: `typescript`, `postgresql`, `docker`).
- Benefícios, modelo de trabalho e soft skills genéricas NÃO entram em `stack_must`.

### 2.6 `stack_nice` (Multi-rótulo)
- Tecnologias e conhecimentos listados explicitamente como "diferenciais", "desejáveis", "será um plus" ou "nice-to-have".

---

## 3. Matriz de Decisão Rápida

| Evidência textual | Campo | Rótulo Ouro |
|---|---|---|
| "Desenvolvedor Backend Pleno/Sênior" | `seniority` | `senior` (teto da exigência) |
| "Atuação 2x por semana em Pinheiros" | `work_model` | `hybrid` |
| "Salário compatível + VR R$ 40/dia" | `salary_published` | `false` (VR é benefício, não salário) |
| "Faixa salarial: R$ 12.000 a R$ 15.000 CLT" | `salary_published` | `true` (`BRL`, `month`, 12000, 15000) |
| "Desejável conhecimento em Kubernetes" | `stack_nice` | `['kubernetes']` |
| "Domínio em React, TypeScript e Node.js" | `stack_must` | `['react', 'typescript', 'node.js']` |
