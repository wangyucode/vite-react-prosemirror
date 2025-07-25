import { Plugin } from "prosemirror-state";

export const paginationPlugin = new Plugin({
  state: {
    init: () => {
      return { inprogress: false, pageCount: 1 };
    },
    apply: (tr, value, oldState, newState) => {
      console.log("apply", tr, value, oldState, newState);
      return value;
    },
  },
});
