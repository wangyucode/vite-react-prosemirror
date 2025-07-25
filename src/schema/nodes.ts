import type { NodeSpec, NodeType } from "prosemirror-model";
import { nodes as basicNodes } from "prosemirror-schema-basic";

export const nodes: { [key: string]: NodeSpec } = {
  doc: {
    content: "page+",
  },
  page: {
    content: "page_part+",
    parseDOM: [
      {
        tag: "div.page",
        getAttrs(dom: HTMLElement) {
          return { num: dom.getAttribute("num") || 1 };
        },
      },
    ],
    attrs: {
      num: { default: 1, validate: "number" },
    },
    toDOM(node) {
      return ["div", { class: "page", num: node.attrs.num }, 0];
    },
  },
  page_header: {
    content: "block+",
    group: "page_part",
    toDOM() {
      return ["div", { class: "page_header", contenteditable: "false" }, 0];
    },
    parseDOM: [{ tag: "div.page_header" }],
    selectable: false,
  },
  page_footer: {
    content: "block+",
    group: "page_part",
    toDOM() {
      return ["div", { class: "page_footer", contenteditable: "false" }, 0];
    },
    parseDOM: [{ tag: "div.page_footer" }],
    selectable: false,
  },
  page_content: {
    content: "block+",
    group: "page_part",
    toDOM() {
      return ["div", { class: "page_content" }, 0];
    },
    parseDOM: [{ tag: "div.page_content" }],
  },
  paragraph: basicNodes.paragraph,
  heading: basicNodes.heading,
  text: basicNodes.text,
};
