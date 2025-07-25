import { Plugin, PluginKey } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";

interface PaginationPluginState {
  inprogress: boolean;
  pageCount: number;
  taskId: number;
  view?: EditorView;
}

const key = new PluginKey("pagination");

export const paginationPlugin = new Plugin<PaginationPluginState>({
  key,
  view: () => {
    return {
      update: (view, prevState) => {
        if (key.getState(view.state).view) return;
        key.getState(view.state).view = view;
      },
    };
  },
  state: {
    init: () => {
      return { inprogress: false, pageCount: 1, taskId: 0 };
    },
    apply: (tr, value, oldState, newState) => {
      //   if (value.taskId) {
      //     cancelIdleCallback(value.taskId);
      //     value.taskId = 0;
      //   }
      //   value.taskId = requestIdleCallback(() => {
      //     console.log("start pagination");
      //     console.time("pagination");
      //   });
      const { view } = value;
      if (!view) return value;
      if (!tr.docChanged) return value;
      console.log("start pagination");
      console.time("pagination");
      value.inprogress = true;
      const { doc, selection } = newState;
      const page = selection.$anchor.node(1);
      const contentDom = view.dom.querySelector(
        `.page[num="${page.attrs.num}"] .page_content`
      );
      if (!contentDom) return value;

      if (contentDom.scrollHeight > contentDom.clientHeight) {
        console.log("pagination for page:", page.attrs.num, "need pagination");
      }
      console.timeEnd("pagination");
      return value;
    },
  },
});
