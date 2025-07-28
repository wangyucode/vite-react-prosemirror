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
    // 可以被分割的节点
    if (lastContentNode.type.name === pageSchema.nodes.paragraph.name) {
      console.log("last content is paragraph", lastContentNode);
      const lastContentNodePos = getNodePos(view.state.doc, lastContentNode);
      const lastContentDom = view.nodeDOM(lastContentNodePos) as HTMLElement;
      if (!lastContentDom) return;

      // 计算溢出高度和限制高度
      const overflowHeight = contentDom.scrollHeight - contentDom.clientHeight;
      const clonedElement = lastContentDom.cloneNode(true) as HTMLElement;

      // 创建隐藏容器测量高度
      const tempContainer = document.createElement("div");
      tempContainer.classList.add("ProseMirror");
      tempContainer.style.visibility = "hidden";
      tempContainer.style.backgroundColor = "#f00";
      tempContainer.style.position = "absolute";
      tempContainer.style.width = `${lastContentDom.offsetWidth}px`;
      tempContainer.appendChild(clonedElement);
      document.body.appendChild(tempContainer);

      const clonedHeight = tempContainer.offsetHeight;
      const limitHeight = clonedHeight - overflowHeight;
      let deleteCount = 0;
      const originalText = lastContentNode.textContent || "";

      // 逐步减少内容直到高度符合要求
      while (
        tempContainer.offsetHeight > limitHeight &&
        deleteCount < originalText.length
      ) {
        deleteCount++;
        clonedElement.textContent = originalText.slice(
          0,
          originalText.length - deleteCount
        );
      }

      document.body.removeChild(tempContainer);

      const tr = view.state.tr;
      const newContentSize = lastContentNode.content.size - deleteCount;

      if (newContentSize <= 0) {
        // 删除整个节点
        tr.delete(
          lastContentNodePos,
          lastContentNodePos + lastContentNode.nodeSize
        );
      } else {
        // 删除溢出的部分
        tr.deleteRange(
          lastContentNodePos + (lastContentNode.nodeSize - 1 - deleteCount),
          lastContentNodePos + lastContentNode.nodeSize - 1
        );
      }

      // 处理下一页内容
      const nodePushToNextPage = lastContentNode.cut(newContentSize);
      if (nodePushToNextPage.content.size > 0) {
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
        if (nextFirstContentNode) {
          const nextFirstContentNodePos = getNodePos(
            tr.doc,
            nextFirstContentNode
          );
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
