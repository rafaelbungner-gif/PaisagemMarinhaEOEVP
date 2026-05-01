import { useEffect, useMemo, useRef, useState } from "react";
import { Download, FileText, Waves, Wind } from "lucide-react";
import { calculate, type CalcInputs, type CalcOutputs, type VisibilityReason } from "./lib/calculations";

const presets: Array<{ name: string; description: string; inputs: CalcInputs }> = [
  { name: "Praia", description: "Observador quase ao nível do mar.", inputs: { dist_km: 15, h_turbina: 260, h_obs: 2, largura_km: 10, area: 1500, ci: 35, k: 1.13, beta: 0.00008 } },
  { name: "Mirante", description: "Ponto costeiro elevado.", inputs: { dist_km: 45, h_turbina: 260, h_obs: 80, largura_km: 14, area: 1500, ci: 35, k: 1.13, beta: 0.00004 } },
  { name: "Prédio alto", description: "Observação urbana elevada.", inputs: { dist_km: 60, h_turbina: 300, h_obs: 120, largura_km: 18, area: 1700, ci: 32, k: 1.17, beta: 0.00004 } },
  { name: "Ar limpo", description: "Menor extinção atmosférica.", inputs: { dist_km: 35, h_turbina: 260, h_obs: 10, largura_km: 12, area: 1500, ci: 35, k: 1.13, beta: 0.00004 } },
  { name: "Névoa leve", description: "Perda de contraste no percurso óptico.", inputs: { dist_km: 35, h_turbina: 260, h_obs: 10, largura_km: 12, area: 1500, ci: 35, k: 1.13, beta: 0.00008 } },
];

const reasonCopy: Record<VisibilityReason, string> = {
  visible: "Detectável: há altura acima do horizonte e contraste suficiente.",
  no_structure: "Sem estrutura: a altura da turbina está zerada.",
  hidden_by_horizon: "Oculta pelo horizonte: a curvatura bloqueia toda a turbina.",
  blocked_by_atmosphere: "Bloqueada pela atmosfera: há geometria visível, mas contraste abaixo de 2%.",
  hidden_and_blocked: "Horizonte e atmosfera bloqueiam a detecção.",
};

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>;
}

function Field({ label, value, min, max, step, unit, onChange }: { label: string; value: number; min: number; max: number; step: number; unit: string; onChange: (value: number) => void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type="range" value={value} min={min} max={max} step={step} onChange={(event) => onChange(event.currentTarget.valueAsNumber)} />
      <input type="number" value={value} min={min} max={max} step={step} onChange={(event) => Number.isFinite(event.currentTarget.valueAsNumber) && onChange(event.currentTarget.valueAsNumber)} />
      <small>{unit}</small>
    </label>
  );
}

function SceneCanvas({ inputs, out, animate }: { inputs: CalcInputs; out: CalcOutputs; animate: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;
    let raf: number | null = null;
    let stopped = false;

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const w = rect.width;
      const h = rect.height;
      const horizon = h * 0.56;
      ctx.clearRect(0, 0, w, h);
      const sky = ctx.createLinearGradient(0, 0, 0, horizon);
      sky.addColorStop(0, "#0f2d45");
      sky.addColorStop(1, "#77b8d9");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, horizon);
      ctx.fillStyle = "#12384f";
      ctx.fillRect(0, horizon, w, h - horizon);
      ctx.strokeStyle = "rgba(255,255,255,.55)";
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(0, horizon);
      ctx.lineTo(w, horizon);
      ctx.stroke();
      ctx.setLineDash([]);

      const count = Math.max(2, Math.min(14, Math.round(inputs.largura_km / 1.2)));
      const spread = Math.min(w * 0.78, Math.max(90, out.alpha * 14));
      const towerHeight = Math.max(0, Math.min(130, out.theta * 80));
      const hiddenHeight = Math.min(85, (out.h_oculta / Math.max(inputs.h_turbina, 1)) * 100);
      const phase = animate ? frame * 0.08 : -Math.PI / 2;

      if (out.h_visivel <= 0 || !out.isVisible) {
        ctx.fillStyle = "rgba(15,23,42,.45)";
        ctx.fillRect(0, 0, w, h);
      }

      for (let i = 0; i < count; i += 1) {
        const x = w / 2 - spread / 2 + (spread * i) / Math.max(count - 1, 1);
        const base = horizon + hiddenHeight;
        const top = horizon - towerHeight;
        ctx.strokeStyle = out.isVisible ? "#dff7ef" : "rgba(255,255,255,.38)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x, base);
        ctx.lineTo(x, top);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, top, 5, 0, Math.PI * 2);
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fill();
        for (let b = 0; b < 3; b += 1) {
          const a = phase + (b * Math.PI * 2) / 3 + i * 0.2;
          ctx.beginPath();
          ctx.moveTo(x, top);
          ctx.lineTo(x + Math.cos(a) * 22, top + Math.sin(a) * 22);
          ctx.stroke();
        }
      }

      ctx.fillStyle = out.isVisible ? "#dcfce7" : "#fecaca";
      ctx.font = "700 16px system-ui";
      ctx.fillText(reasonCopy[out.visibilityReason], 24, 34);

      frame += 1;
      if (animate && !stopped) raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => {
      stopped = true;
      if (raf !== null) cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [inputs, out, animate]);

  return <canvas className="scene" ref={ref} />;
}

function exportPng(inputs: CalcInputs, out: CalcOutputs) {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 720;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = "#07111f";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#eff6ff";
  ctx.font = "bold 38px Arial";
  ctx.fillText("Paisagem Marinha Eólica EVP", 60, 90);
  ctx.font = "24px Arial";
  const lines = [
    reasonCopy[out.visibilityReason],
    `Distância: ${inputs.dist_km.toFixed(1)} km | Observador: ${inputs.h_obs.toFixed(1)} m | Turbina: ${inputs.h_turbina.toFixed(1)} m`,
    `Visível: ${out.h_visivel.toFixed(1)} m | Oculto: ${out.h_oculta.toFixed(1)} m`,
    `Contraste remanescente: ${out.cd.toFixed(2)}% | Probabilidade: ${out.prob_pct.toFixed(1)}%`,
    `Limite geométrico: ${out.distancia_geometrica_max_km.toFixed(1)} km | Limite atmosférico: ${Number.isFinite(out.distancia_atmosferica_max_km) ? out.distancia_atmosferica_max_km.toFixed(1) + " km" : "sem limite"}`,
  ];
  lines.forEach((line, index) => ctx.fillText(line, 60, 170 + index * 58));
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = "resumo-paisagem-marinha-eoevp.png";
  link.click();
}

export default function App() {
  const [inputs, setInputs] = useState<CalcInputs>(presets[0].inputs);
  const [compare, setCompare] = useState<CalcInputs>(presets[1].inputs);
  const [animate, setAnimate] = useState(false);
  const out = useMemo(() => calculate(inputs), [inputs]);
  const compareOut = useMemo(() => calculate(compare), [compare]);
  const set = (key: keyof CalcInputs) => (value: number) => setInputs((current) => ({ ...current, [key]: value }));

  return (
    <main className="shell">
      <section className="hero">
        <div>
          <p className="eyebrow"><Waves size={16} /> Simulação EVP offshore</p>
          <h1>Paisagem Marinha Eólica</h1>
          <p>Uma leitura rápida de horizonte, contraste atmosférico e ocupação angular para turbinas eólicas offshore.</p>
        </div>
        <div className="hero-actions">
          <button onClick={() => exportPng(inputs, out)}><Download size={16} /> Exportar PNG</button>
          <button onClick={() => window.print()}><FileText size={16} /> Salvar PDF</button>
        </div>
      </section>

      <section className="metrics">
        <Metric label="Diagnóstico" value={out.isVisible ? "Detectável" : "Não detectável"} />
        <Metric label="Visível" value={`${out.h_visivel.toFixed(1)} m`} />
        <Metric label="Contraste" value={`${out.cd.toFixed(2)}%`} />
        <Metric label="Probabilidade" value={`${out.prob_pct.toFixed(1)}%`} />
        <Metric label="α horizontal" value={`${out.alpha.toFixed(2)}°`} />
        <Metric label="θ vertical" value={`${out.theta.toFixed(3)}°`} />
      </section>

      <section className="grid two">
        <article className="card">
          <h2>Presets</h2>
          <div className="chips">
            {presets.map((preset) => <button key={preset.name} title={preset.description} onClick={() => setInputs(preset.inputs)}>{preset.name}</button>)}
          </div>
          <p className="notice">{reasonCopy[out.visibilityReason]}</p>
          <dl className="limits">
            <div><dt>Limite geométrico</dt><dd>{out.distancia_geometrica_max_km.toFixed(1)} km</dd></div>
            <div><dt>Limite atmosférico</dt><dd>{Number.isFinite(out.distancia_atmosferica_max_km) ? `${out.distancia_atmosferica_max_km.toFixed(1)} km` : "sem limite"}</dd></div>
            <div><dt>Limitante</dt><dd>{out.limitingFactor}</dd></div>
          </dl>
        </article>

        <article className="card">
          <h2>Comparação A/B</h2>
          <button className="ghost" onClick={() => setCompare(inputs)}>Copiar cenário atual para B</button>
          <p>A: {out.visibilityReason} | B: {compareOut.visibilityReason}</p>
          <p>Diferença de altura visível: {(out.h_visivel - compareOut.h_visivel).toFixed(1)} m</p>
        </article>
      </section>

      <section className="card canvas-card">
        <div className="canvas-title"><h2>Render sob demanda</h2><label><input type="checkbox" checked={animate} onChange={(event) => setAnimate(event.currentTarget.checked)} /> Animar rotores</label></div>
        <SceneCanvas inputs={inputs} out={out} animate={animate} />
      </section>

      <section className="card controls">
        <h2>Parâmetros</h2>
        <Field label="Distância" value={inputs.dist_km} min={1} max={200} step={0.5} unit="km" onChange={set("dist_km")} />
        <Field label="Largura do parque" value={inputs.largura_km} min={0} max={100} step={0.5} unit="km" onChange={set("largura_km")} />
        <Field label="Altura da turbina" value={inputs.h_turbina} min={0} max={600} step={1} unit="m" onChange={set("h_turbina")} />
        <Field label="Elevação do observador" value={inputs.h_obs} min={0} max={500} step={0.1} unit="m" onChange={set("h_obs")} />
        <Field label="Área transversal" value={inputs.area} min={0} max={5000} step={10} unit="m²" onChange={set("area")} />
        <Field label="Contraste inicial" value={inputs.ci} min={0} max={100} step={1} unit="%" onChange={set("ci")} />
        <Field label="Refração k" value={inputs.k} min={1} max={1.3} step={0.01} unit="" onChange={set("k")} />
        <Field label="Extinção beta" value={inputs.beta} min={0} max={0.0003} step={0.00001} unit="m⁻¹" onChange={set("beta")} />
      </section>
    </main>
  );
}
