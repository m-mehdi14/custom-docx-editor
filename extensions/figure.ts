import { mergeAttributes, Node } from "@tiptap/core";

export interface FigureAttrs {
  src: string | null;
  alt: string;
  caption: string;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    figure: {
      insertFigure: (attrs: { src: string; alt?: string; caption?: string }) => ReturnType;
    };
  }
}

export const Figure = Node.create({
  name: "figure",
  group: "block",
  atom: true,
  draggable: true,
  isolating: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: "" },
      caption: { default: "" },
    };
  },

  parseHTML() {
    return [
      {
        tag: "figure",
        priority: 45,
        getAttrs: (el) => {
          const node = el as HTMLElement;
          if (node.getAttribute("data-chart-block") === "true") return false;
          const img = node.querySelector("img");
          if (!img?.getAttribute("src")) return false;
          return {
            src: img.getAttribute("src"),
            alt: img.getAttribute("alt") ?? "",
            caption: node.querySelector("figcaption")?.textContent?.trim() ?? "",
          };
        },
      },
    ];
  },

  renderHTML({ node }) {
    const { src, alt, caption } = node.attrs as FigureAttrs;
    if (!src) {
      return ["figure", { class: "editor-figure" }];
    }
    const img = ["img", mergeAttributes({ src, alt: alt || "", loading: "lazy", decoding: "async" }, { class: "editor-figure__img" })];
    const figcap = ["figcaption", { class: "editor-figure__caption font-[family-name:var(--font-ui)]" }, caption || ""];
    return ["figure", { class: "editor-figure" }, img, figcap];
  },

  addCommands() {
    return {
      insertFigure:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              src: attrs.src,
              alt: attrs.alt ?? "",
              caption: attrs.caption ?? "",
            },
          });
        },
    };
  },
});
