# Paisagem Marinha Eólica EVP

Simulador em React + Vite para estimar a visibilidade geométrica e atmosférica de turbinas eólicas offshore a partir de um observador em terra.

## Recursos

- Presets para praia, mirante, prédio alto, ar limpo e névoa leve.
- Diagnóstico do motivo de invisibilidade: horizonte, atmosfera, ambos ou ausência de estrutura.
- Distância máxima por geometria, distância máxima por contraste e limitante dominante.
- Comparação A/B entre cenário atual e cenário de referência.
- Canvases com renderização sob demanda; animação dos rotores é opcional.
- Exportação de resumo técnico em PNG e impressão/salvamento em PDF pelo navegador.

## Instalação

```bash
npm install
```

## Execução

```bash
npm run dev
```

O servidor Vite usa a porta `8080`.

## Checagens

```bash
npm run test
npm run typecheck
npm run build
```

## Estrutura de Pastas

```text
PaisagemMarinhaEOEVP/
├── .gitignore
├── README.md
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
└── src/
    ├── App.tsx
    ├── main.tsx
    ├── styles.css
    └── lib/
        ├── calculations.ts
        └── calculations.test.ts
```

### Raiz do Projeto

- `.gitignore`: lista arquivos e pastas que não devem ser versionados, como `node_modules`, `dist` e logs locais.
- `README.md`: documentação principal do projeto, com instalação, execução, modelo matemático, premissas, limitações e estrutura de pastas.
- `index.html`: página HTML base usada pelo Vite; contém o elemento `#root` onde o React monta a aplicação.
- `package.json`: declara scripts, dependências de produção e dependências de desenvolvimento.
- `tsconfig.json`: configuração TypeScript raiz, incluindo a ativação progressiva de `strictNullChecks`.
- `tsconfig.app.json`: configuração TypeScript da aplicação React e dos testes.
- `tsconfig.node.json`: configuração TypeScript para arquivos executados em contexto Node, como `vite.config.ts`.
- `vite.config.ts`: configuração do Vite, incluindo plugin React e porta padrão `8080`.

### Pasta `src/`

- `src/main.tsx`: ponto de entrada da aplicação; localiza o elemento `#root`, valida sua existência e renderiza o React.
- `src/App.tsx`: componente principal da simulação; concentra interface, presets, comparação A/B, exportação, controles e canvas.
- `src/styles.css`: estilos globais da aplicação, incluindo layout responsivo, cards, métricas, controles, canvas e regras de impressão.

### Pasta `src/lib/`

- `src/lib/calculations.ts`: núcleo matemático da simulação. Contém tipos, constantes, validação de entradas e a função `calculate()`.
- `src/lib/calculations.test.ts`: testes unitários da função `calculate()`, cobrindo horizonte, refração, atenuação, limiar de contraste e casos-limite.

## Modelo Matemático

O modelo usa raio efetivo da Terra para representar refração atmosférica:

```text
R_efetivo = R_terra * k
```

A distância ao horizonte do observador é:

```text
d_obs = sqrt(2 * R_efetivo * h_obs)
```

A altura oculta além do horizonte é aproximada por:

```text
h_oculta = (d - d_obs)^2 / (2 * R_efetivo)
h_visivel = max(0, h_turbina - h_oculta)
```

A distância geométrica máxima para que a ponta da turbina ainda possa aparecer é:

```text
d_geom_max = sqrt(2 * R_efetivo * h_obs) + sqrt(2 * R_efetivo * h_turbina)
```

A ocupação angular é calculada por:

```text
alpha = 2 * atan(W / (2d))
theta = atan(h_visivel / d)
```

A atenuação atmosférica usa decaimento exponencial:

```text
C_d = C_i * exp(-beta * d)
d_limiar = ln(C_i / 2) / beta
```

A aplicação usa `2%` como limiar operacional de contraste.

## Premissas

- Observador e turbina estão no mesmo datum vertical.
- Distância é tratada como linha reta horizontal simplificada.
- Refração é constante e resumida por um único `k`.
- `beta` é uniforme ao longo de todo o percurso óptico.
- A turbina é representada por altura máxima e área transversal agregada.

## Limitações

- Não substitui estudo visual, campanha fotográfica, ZTV/GIS ou validação regulatória.
- Não considera relevo intermediário, ilhas, ondas, vegetação ou edificações.
- Não modela brilho solar, cor da turbina, fundo visual, horário ou variação temporal do clima.
- A probabilidade de detecção é um indicador comparativo, não uma verdade absoluta.
