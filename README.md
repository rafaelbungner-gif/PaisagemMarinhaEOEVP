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
