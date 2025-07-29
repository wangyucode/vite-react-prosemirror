import type { NodeSpec, NodeType } from "prosemirror-model";
import { nodes as basicNodes } from "prosemirror-schema-basic";
import { v4 as uuidv4 } from "uuid";

export const nodes: { [key: string]: NodeSpec } = {
  doc: {
    content: "page+",
  },
  page: {
    content: "page_header page_content page_footer",
    parseDOM: [
      {
        tag: "div.page",
        getAttrs(dom: HTMLElement) {
          return { num: Number.parseInt(dom.getAttribute("num") || "1") };
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
    toDOM() {
      return [
        "div",
        { class: "page_header", contenteditable: false },
        ["div", "我是页眉"],
      ];
    },
    parseDOM: [{ tag: "div.page_header" }],
    isAtom: true,
    selectable: false,
  },
  page_footer: {
    toDOM() {
      return [
        "div",
        { class: "page_footer", contenteditable: false },
        ["div", "我是页脚"],
      ];
    },
    parseDOM: [{ tag: "div.page_footer" }],
    selectable: false,
    isAtom: true,
  },
  page_content: {
    content: "block* placeholder",
    toDOM() {
      return ["div", { class: "page_content" }, 0];
    },
    parseDOM: [{ tag: "div.page_content" }],
  },
  paragraph: {
    ...basicNodes.paragraph,
    attrs: {
      id: { default: uuidv4() },
    },
    parseDOM: [{ tag: "p", getAttrs: (dom) => ({ id: dom.id || uuidv4() }) }],
    toDOM(node) {
      return ["p", { id: node.attrs.id }, 0];
    },
  },
  heading: basicNodes.heading,
  text: basicNodes.text,
  placeholder: {
    attrs: {
      id: { default: uuidv4() },
    },
    toDOM(node) {
      return ["div", { class: "placeholder", id: node.attrs.id }, 0];
    },
    parseDOM: [
      {
        tag: "div.placeholder",
        getAttrs: (dom) => ({ id: dom.id || uuidv4() }),
      },
    ],
    isAtom: true,
    selectable: false,
  },
};
