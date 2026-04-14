import { mergeAttributes, Node } from "@tiptap/core";

export type ChartKind = "bar" | "line";

export interface ChartBlockAttrs {
  title: string;
  chartType: ChartKind;
  labelsJson: string;
  valuesJson: string;
  caption: string;
}

function parseSeries(attrs: ChartBlockAttrs): { labels: string[]; values: number[] } {
  try {
    const labels = JSON.parse(attrs.labelsJson || "[]") as unknown;
    const values = JSON.parse(attrs.valuesJson || "[]") as unknown;
    const lb = Array.isArray(labels) ? labels.map(String) : [];
    const vl = Array.isArray(values) ? values.map((v) => Number(v)) : [];
    const n = Math.min(lb.length, vl.length, 24);
    return {
      labels: lb.slice(0, n),
      values: vl.slice(0, n).map((v) => (Number.isFinite(v) ? v : 0)),
    };
  } catch {
    return { labels: [], values: [] };
  }
}

function buildSvg(attrs: ChartBlockAttrs): string {
  const { title, chartType } = attrs;
  const { labels, values } = parseSeries(attrs);
  const w = 520;
  const h = 300;
  const padL = 48;
  const padR = 24;
  const padT = title ? 36 : 24;
  const padB = 56;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const maxV = Math.max(1e-9, ...values.map((v) => Math.abs(v)));
  const minV = chartType === "line" ? Math.min(0, ...values) : 0;
  const maxV2 = chartType === "line" ? Math.max(maxV, ...values) : maxV;
  const range = Math.max(1e-9, maxV2 - minV);

  const n = Math.max(1, values.length);
  const barGap = 0.15;
  const barW = innerW / (n + (n + 1) * barGap);

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" class="editor-chart__svg" role="img" aria-label="${escapeAttr(title || "Chart")}">`,
  );
  parts.push(`<rect x="0" y="0" width="${w}" height="${h}" fill="transparent" />`);

  if (title) {
    parts.push(
      `<text x="${w / 2}" y="22" text-anchor="middle" class="editor-chart__title" font-size="14" font-weight="600" fill="var(--c-ink)">${escapeXml(
        title,
      )}</text>`,
    );
  }

  /* Axes */
  const x0 = padL;
  const y0 = padT + innerH;
  const x1 = padL + innerW;
  const y1 = padT;
  parts.push(
    `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y0}" stroke="var(--c-border)" stroke-width="1" />`,
  );
  parts.push(
    `<line x1="${x0}" y1="${y0}" x2="${x0}" y2="${y1}" stroke="var(--c-border)" stroke-width="1" />`,
  );

  if (chartType === "bar") {
    values.forEach((v, i) => {
      const bh = (v / maxV2) * innerH;
      const x = padL + barGap * barW + i * (barW * (1 + barGap));
      const y = y0 - bh;
      parts.push(
        `<rect x="${x}" y="${y}" width="${barW}" height="${bh}" rx="2" fill="var(--c-accent)" opacity="0.9" />`,
      );
    });
  } else {
    if (values.length >= 2) {
      const lineDenom = Math.max(1, n - 1);
      const pts = values
        .map((v, i) => {
          const x = padL + (i / lineDenom) * innerW;
          const nv = (v - minV) / range;
          const y = y0 - nv * innerH;
          return `${x},${y}`;
        })
        .join(" ");
      parts.push(
        `<polyline fill="none" stroke="var(--c-accent)" stroke-width="2.5" points="${pts}" stroke-linejoin="round" stroke-linecap="round" />`,
      );
      values.forEach((v, i) => {
        const x = padL + (i / lineDenom) * innerW;
        const nv = (v - minV) / range;
        const y = y0 - nv * innerH;
        parts.push(`<circle cx="${x}" cy="${y}" r="4" fill="var(--c-paper)" stroke="var(--c-accent)" stroke-width="2" />`);
      });
    }
  }

  const denomLabels = Math.max(1, n - 1);
  labels.forEach((label, i) => {
    if (chartType === "bar") {
      const x = padL + barGap * barW + i * (barW * (1 + barGap)) + barW / 2;
      parts.push(
        `<text x="${x}" y="${y0 + 18}" text-anchor="middle" font-size="10" fill="var(--c-ink-muted)">${escapeXml(truncate(label, 10))}</text>`,
      );
    } else if (n > 0) {
      const x = padL + (i / denomLabels) * innerW;
      parts.push(
        `<text x="${x}" y="${y0 + 18}" text-anchor="middle" font-size="10" fill="var(--c-ink-muted)">${escapeXml(truncate(label, 10))}</text>`,
      );
    }
  });

  parts.push(`</svg>`);
  return parts.join("");
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s: string): string {
  return escapeXml(s).replace(/\n/g, " ");
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    chartBlock: {
      insertChartBlock: (attrs: {
        title?: string;
        chartType?: ChartKind;
        labels: string[];
        values: number[];
        caption?: string;
      }) => ReturnType;
    };
  }
}

export const ChartBlock = Node.create({
  name: "chartBlock",
  group: "block",
  atom: true,
  draggable: true,
  isolating: true,

  addAttributes() {
    return {
      title: { default: "" },
      chartType: { default: "bar" as ChartKind },
      labelsJson: { default: "[]" },
      valuesJson: { default: "[]" },
      caption: { default: "" },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'figure[data-chart-block="true"]',
        priority: 60,
        getAttrs: (el) => {
          const node = el as HTMLElement;
          return {
            title: node.getAttribute("data-title") ?? "",
            chartType: (node.getAttribute("data-chart-type") as ChartKind) || "bar",
            labelsJson: node.getAttribute("data-labels") ?? "[]",
            valuesJson: node.getAttribute("data-values") ?? "[]",
            caption: node.querySelector("figcaption")?.textContent?.trim() ?? "",
          };
        },
      },
    ];
  },

  renderHTML({ node }) {
    const attrs = node.attrs as ChartBlockAttrs;
    const svg = buildSvg(attrs);
    const inner: [string, Record<string, string>] = ["div", { class: "editor-chart__inner", innerHTML: svg }];
    const cap: [string, Record<string, string>, string] = [
      "figcaption",
      { class: "editor-chart__caption font-[family-name:var(--font-ui)]" },
      attrs.caption || "",
    ];
    return [
      "figure",
      mergeAttributes(
        {
          "data-chart-block": "true",
          "data-title": attrs.title,
          "data-chart-type": attrs.chartType,
          "data-labels": attrs.labelsJson,
          "data-values": attrs.valuesJson,
        },
        { class: "editor-chart" },
      ),
      inner,
      cap,
    ];
  },

  addNodeView() {
    return ({ node }) => {
      const attrs = node.attrs as ChartBlockAttrs;
      const dom = document.createElement("figure");
      dom.className = "editor-chart";
      dom.setAttribute("data-chart-block", "true");
      dom.setAttribute("data-title", attrs.title);
      dom.setAttribute("data-chart-type", attrs.chartType);
      dom.setAttribute("data-labels", attrs.labelsJson);
      dom.setAttribute("data-values", attrs.valuesJson);

      const inner = document.createElement("div");
      inner.className = "editor-chart__inner";
      inner.innerHTML = buildSvg(attrs);
      dom.appendChild(inner);

      const cap = document.createElement("figcaption");
      cap.className = "editor-chart__caption font-[family-name:var(--font-ui)]";
      cap.textContent = attrs.caption || "";
      dom.appendChild(cap);

      return {
        dom,
        update: (updated) => {
          if (updated.type.name !== this.name) return false;
          const a = updated.attrs as ChartBlockAttrs;
          dom.setAttribute("data-title", a.title);
          dom.setAttribute("data-chart-type", a.chartType);
          dom.setAttribute("data-labels", a.labelsJson);
          dom.setAttribute("data-values", a.valuesJson);
          inner.innerHTML = buildSvg(a);
          cap.textContent = a.caption || "";
          return true;
        },
      };
    };
  },

  addCommands() {
    return {
      insertChartBlock:
        (opts) =>
        ({ commands }) => {
          const labels = opts.labels ?? [];
          const values = opts.values ?? [];
          return commands.insertContent({
            type: this.name,
            attrs: {
              title: opts.title ?? "",
              chartType: opts.chartType ?? "bar",
              labelsJson: JSON.stringify(labels),
              valuesJson: JSON.stringify(values),
              caption: opts.caption ?? "",
            },
          });
        },
    };
  },
});
