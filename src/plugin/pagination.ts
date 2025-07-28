import { EditorState, Plugin, PluginKey, Selection } from "prosemirror-state";
import { Node } from "prosemirror-model";
import type { EditorView } from "prosemirror-view";
import { pageSchema } from "../schema/schema";
import { emptyPageJson } from "../content.html";

interface PaginationPluginState {
  pageCount: number;
  inprogress: boolean;
  view?: EditorView;
}

const key = new PluginKey("pagination");

export const paginationPlugin = new Plugin<PaginationPluginState>({
  key,
  state: {
    init: () => {
      return { pageCount: 1, inprogress: false };
    },
    apply: (tr, value, oldState, newState) => {
      if (!value.view) {
        value.view = tr.getMeta("init");
        // return value;
      }
      if (!tr.docChanged) return value;
      value.inprogress = true;
      requestIdleCallback(() => {
        paginate(value, oldState);
      });

      return value;
    },
  },
});

function paginate(
  paginationState: PaginationPluginState,
  oldState: EditorState
) {
  console.log("paginate");
  const { view } = paginationState;
  const { selection } = oldState;

  if (!view) return;
  const page = selection.$anchor.node(1);
  const pageNum = page?.attrs?.num || 1;
  const contentDom = view.dom.querySelector(
    `.page[num="${pageNum}"] .page_content`
  );
  if (!contentDom) return;

  if (contentDom.scrollHeight > contentDom.clientHeight) {
    console.log("start pagination for page", pageNum);
    const pageNode = view.state.doc.child(pageNum - 1);
    const pageContentNode = pageNode.child(1);
    const lastContentNode = pageContentNode.lastChild;

    if (!lastContentNode) return;
    if (lastContentNode.type.name === pageSchema.nodes.paragraph.name) {
      console.log("last content is paragraph", lastContentNode);
      const lastContentNodePos = getNodePos(view.state.doc, lastContentNode);

      const tr = view.state.tr;
      const nodePushToNextPage = lastContentNode.cut(
        lastContentNode.content.size - 1
      );
      const nodeRemain = lastContentNode.cut(
        0,
        lastContentNode.content.size - 1
      );

      // 删除当前页内容
      if (nodeRemain.content.size === 0) {
        tr.delete(
          lastContentNodePos,
          lastContentNodePos + lastContentNode.nodeSize
        );
      } else {
        tr.delete(
          lastContentNodePos + lastContentNode.nodeSize - 2,
          lastContentNodePos + lastContentNode.nodeSize - 1
        );
      }

      const nextPageNum = pageNum + 1;
      if (tr.doc.childCount < nextPageNum) {
        tr.insert(
          tr.doc.content.size,
          Node.fromJSON(pageSchema, emptyPageJson(nextPageNum))
        );
      }
      const nextPageNode = tr.doc.child(nextPageNum - 1);
      const nextPageContentNode = nextPageNode.child(1);
      const nextFirstContentNode = nextPageContentNode.firstChild;
      if (!nextFirstContentNode) return;
      const nextFirstContentNodePos = getNodePos(tr.doc, nextFirstContentNode);
      // 插入下一页内容
      if (nodePushToNextPage.content.size > 0) {
        if (nextFirstContentNode.attrs.id === nodePushToNextPage.attrs.id) {
          tr.insert(nextFirstContentNodePos + 1, nodePushToNextPage.content);
        } else {
          tr.insert(nextFirstContentNodePos, nodePushToNextPage);
        }
      }

      tr.setMeta(key, page.attrs.num);
      view.dispatch(tr);
    }
  }
}

function getNodePos(doc: Node, node: Node): number {
  let pos = 0;
  doc.descendants((desc, p) => {
    if (pos > 0) return false;
    if (desc.eq(node)) {
      pos = p;
      return false;
    }
  });
  return pos;
}
