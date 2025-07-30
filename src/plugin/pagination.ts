import { Plugin, PluginKey, Selection } from "prosemirror-state";
import { Node } from "prosemirror-model";
import type { EditorView } from "prosemirror-view";
import { v4 as uuidv4 } from "uuid";

import { pageSchema } from "../schema/schema";
import { emptyPageJson } from "../content.html";

interface PaginationPluginState {
  inprogress: boolean;
  view?: EditorView;
  paginationContainer: HTMLElement;
}

const key = new PluginKey("pagination");

export const paginationPlugin = new Plugin<PaginationPluginState>({
  key,
  state: {
    init: () => {
      return {
        inprogress: false,
        paginationContainer: document.getElementById("pagination-container")!,
      };
    },
    apply: (tr, paginationState, oldState, newState) => {
      if (!paginationState.view) {
        paginationState.view = tr.getMeta("init");
      }
      if (!tr.docChanged) return paginationState;

      if (tr.getMeta("composition")) {
        const { from, to } = tr.steps[0] as any;
        if (from === to) {
          return paginationState; // 中文输入法问题
        }
      }
      if (tr.getMeta("pagination-ignore")) return paginationState;

      const { selection } = oldState;
      const editPage = selection.$anchor.node(1);
      const editPageNum = editPage?.attrs?.num || 1;
      const paginationPageNum = tr.getMeta(key);
      if (paginationPageNum) {
        const trToTrack = oldState.tr;
        // 对受影响的页面进行空闲时分页
        tr.steps.forEach((step) => {
          const { from, to, slice } = step as any;
          if (from === undefined || to === undefined) return;
          const stepResolvePos = trToTrack.doc.resolve(from);
          trToTrack.step(step);
          let changingPage = stepResolvePos.node(1);
          if (!changingPage && from === to)
            changingPage = slice.content.content[0];
          const changingPageNum = changingPage?.attrs?.num;
          if (!changingPageNum) return;
          if (tr.getMeta("paginate-finish") === changingPageNum) return;
          requestIdleCallback(() => {
            paginate(changingPageNum, paginationState);
          });
        });
      } else {
        paginationState.inprogress = true;
        requestIdleCallback(() => {
          removeDuplicatedId(editPageNum, paginationState.view!);
          paginate(editPageNum, paginationState);
        });
      }

      return paginationState;
    },
  },
});

function paginate(pageNum: number, paginationState: PaginationPluginState) {
  console.log("paginate", pageNum);
  const { view, paginationContainer } = paginationState;

  if (!view) return;
  const contentDom = view.dom.querySelector(
    `.page[num="${pageNum}"] .page_content`
  );
  if (!contentDom) return;
  const placeholderDom = contentDom.querySelector(".placeholder");
  if (!placeholderDom) return;
  if (placeholderDom.clientHeight === 0) {
    // 内容溢出
    const pageNode = view.state.doc.child(pageNum - 1);
    const pageContentNode = pageNode.child(1);
    // 最后一个是placeholder
    const lastContentNode = pageContentNode.child(
      pageContentNode.childCount - 2
    );

    if (!lastContentNode) return;
    const { selection } = view.state;
    // 可以被分割的节点
    if (lastContentNode.type.name === pageSchema.nodes.paragraph.name) {
      const lastContentNodePos = getNodePos(view.state.doc, lastContentNode);
      let lastContentDom = null;
      try {
        lastContentDom = view.nodeDOM(lastContentNodePos) as HTMLElement;
      } catch (_) {
        // react 严格模式
        console.log("strict mode, cancel this pagination");
        return;
      }
      if (!lastContentDom) return;

      // 计算溢出高度和限制高度
      const overflowHeight = contentDom.scrollHeight - contentDom.clientHeight;
      const clonedElement = lastContentDom.cloneNode(true) as HTMLElement;

      // 隐藏容器测量高度
      paginationContainer.appendChild(clonedElement);

      const clonedHeight = paginationContainer.offsetHeight;
      const limitHeight = clonedHeight - overflowHeight;
      let deleteCount = 0;
      const originalText = lastContentNode.textContent || "";

      // 逐步减少内容直到高度符合要求
      while (
        paginationContainer.offsetHeight > limitHeight &&
        deleteCount < originalText.length
      ) {
        deleteCount++;
        clonedElement.textContent = originalText.slice(
          0,
          originalText.length - deleteCount
        );
      }
      paginationContainer.removeChild(clonedElement);

      const tr = view.state.tr;
      // 操作元素的高度大于溢出高度，则操作完这个元素后可以标记分页完成
      if (clonedHeight > overflowHeight) tr.setMeta("paginate-finish", pageNum);
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

      let isSelectionPosGoNextPage = false;
      if (
        selection.$anchor.pos >
        lastContentNodePos + (lastContentNode.nodeSize - 1 - deleteCount)
      ) {
        isSelectionPosGoNextPage = true;
      }
      // 处理下一页内容
      const nodePushToNextPage = lastContentNode.cut(newContentSize);
      const nextPageNum = pageNum + 1;
      if (tr.doc.childCount < nextPageNum) {
        // 下一页不存在，创建新页
        tr.insert(
          tr.doc.content.size,
          Node.fromJSON(
            pageSchema,
            emptyPageJson(nextPageNum, [nodePushToNextPage.toJSON()])
          )
        );
      } else {
        const nextPageNode = tr.doc.child(nextPageNum - 1);
        const nextPageContentNode = nextPageNode.child(1);
        const nextFirstContentNode = nextPageContentNode.firstChild;
        if (!nextFirstContentNode) return;
        const nextFirstContentNodePos = getNodePos(
          tr.doc,
          nextFirstContentNode
        );
        if (nextFirstContentNode.attrs.id === nodePushToNextPage.attrs.id) {
          tr.insert(nextFirstContentNodePos + 1, nodePushToNextPage.content);
        } else {
          tr.insert(nextFirstContentNodePos, nodePushToNextPage);
        }
        tr.setSelection(
          Selection.near(
            tr.doc.resolve(
              isSelectionPosGoNextPage
                ? nextFirstContentNodePos + nodePushToNextPage.content.size + 1
                : selection.$anchor.pos
            ),
            1
          )
        );
      }
      tr.setMeta("addToHistory", false);
      tr.setMeta(key, pageNum);

      view.dispatch(tr);
    }
  } else {
    // 内容高度小于容器高度，尝试从下一页获取内容
    const nextPageNum = pageNum + 1;
    const currentPageNode = view.state.doc.child(pageNum - 1);
    const currentPageContentNode = currentPageNode.child(1);
    let currentLastContentNodeIndex = currentPageContentNode.childCount - 2;
    if (currentLastContentNodeIndex < 0) currentLastContentNodeIndex = 0;
    const currentLastContentNode = currentPageContentNode.child(
      currentLastContentNodeIndex
    );
    if (view.state.doc.childCount < nextPageNum) return;
    const nextPageNode = view.state.doc.child(nextPageNum - 1);
    const nextPageContentNode = nextPageNode.child(1);
    const nextFirstContentNode = nextPageContentNode.firstChild;
    if (!nextFirstContentNode) return;
    // 如果下一页内容为空，删除下一页
    const tr = view.state.tr;
    if (nextFirstContentNode.type.name === "placeholder") {
      const nextPagePos = getNodePos(view.state.doc, nextPageNode);
      tr.delete(nextPagePos, nextPagePos + nextPageNode.nodeSize);
      tr.setMeta("paginate-finish", nextPageNum);
    } else {
      const nextFirstContentNodePos = getNodePos(
        view.state.doc,
        nextFirstContentNode
      );
      const currentLastContentNodePos = getNodePos(
        view.state.doc,
        currentLastContentNode
      );
      // 相同节点需要合并
      tr.deleteRange(
        nextFirstContentNodePos,
        nextFirstContentNodePos + nextFirstContentNode.nodeSize
      );
      if (currentLastContentNode.attrs.id === nextFirstContentNode.attrs.id) {
        tr.insert(
          currentLastContentNodePos + currentLastContentNode.nodeSize - 1,
          nextFirstContentNode.content
        );
      } else {
        tr.insert(
          currentLastContentNodePos + currentLastContentNode.nodeSize,
          nextFirstContentNode
        );
      }
    }

    tr.setMeta("addToHistory", false);
    tr.setMeta(key, pageNum);
    view.dispatch(tr);
  }
}

function getNodePos(doc: Node, node: Node): number {
  let pos = -1;
  doc.descendants((desc, p) => {
    if (pos > 0) return false;
    if (desc.eq(node)) {
      pos = p;
      return false;
    }
  });
  return pos;
}

function removeDuplicatedId(pageNum: number, view: EditorView) {
  console.log("removeDuplicatedId", pageNum);
  // 选择.page_content的所有子元素
  const allElements = view.dom.querySelectorAll(
    `.page[num="${pageNum}"] .page_content p`
  );

  // 创建一个Map来存储每个ID出现的节点
  const idToNodesMap = new Map<string, Element[]>();

  // 首先收集所有节点
  allElements.forEach((node) => {
    const id = node.id;

    // 将节点添加到Map中
    if (!idToNodesMap.has(id)) {
      idToNodesMap.set(id, []);
    }
    idToNodesMap.get(id)?.push(node);
  });

  // 创建一个事务来应用所有更改
  let tr = view.state.tr;
  tr.setMeta("pagination-ignore", true);

  // 遍历所有ID，处理空ID和重复ID的情况
  idToNodesMap.forEach((nodes, id) => {
    if (!id) {
      // 处理空ID的情况
      // nodes.forEach((node) => {
      //   const pos = view.posAtDOM(node, 0) - 1;
      //   tr.setNodeAttribute(pos, "id", uuidv4());
      // });
    } else if (nodes.length > 1) {
      // 处理重复ID的情况
      // 检查后页面是否存在相同ID的节点
      const nextDomWithSameId = view.dom.querySelector(
        `.page[num="${pageNum + 1}"] .page_content [id="${id}"]`
      );

      let nodesToBeChangeId: Element[] = [];
      if (nextDomWithSameId) {
        // 如果后一页有相同ID的节点，则保留最后一个，修改其余节点
        nodesToBeChangeId = nodes.slice(0, -1);
      } else {
        nodesToBeChangeId = nodes.slice(1);
      }

      // 执行修改操作
      nodesToBeChangeId.forEach((node) => {
        const pos = view.posAtDOM(node, 0) - 1;
        tr.setNodeAttribute(pos, "id", uuidv4());
      });
    }
  });

  // 如果有更改，则dispatch事务
  if (tr.docChanged) {
    view.dispatch(tr);
  }
}
