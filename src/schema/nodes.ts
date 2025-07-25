import type { NodeSpec, NodeType } from "prosemirror-model";
import { nodes as basicNodes } from "prosemirror-schema-basic";

export const nodes: { [key: string]: NodeSpec } = {
  doc: {
    content: "page+",
  },
  page: {
    content: "page_part+",
    parseDOM: [{ tag: "div.page" }],
    toDOM() {
      return ["div", { class: "page" }, 0];
    },
  },
  page_header: {
    content: "block+",
    group: "page_part",
    toDOM() {
      return ["div", { class: "page_header" }, 0];
    },
    parseDOM: [{ tag: "div.page_header" }],
  },
  page_footer: {
    content: "block+",
    group: "page_part",
    toDOM() {
      return ["div", { class: "page_footer" }, 0];
    },
    parseDOM: [{ tag: "div.page_footer" }],
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
