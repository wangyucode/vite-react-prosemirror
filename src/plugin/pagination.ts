import { Plugin } from "prosemirror-state";

export const paginationPlugin = new Plugin({
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
      if (!tr.docChanged) return value;
      console.log("start pagination");
      console.time("pagination");
      value.inprogress = true;
      const { doc, selection } = newState;
      console.log("apply", doc, selection);
      return value;
    },
  },
});
