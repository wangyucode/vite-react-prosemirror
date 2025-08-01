import { Plugin, PluginKey, Selection } from "prosemirror-state";
import { Node } from "prosemirror-model";
import type { EditorView } from "prosemirror-view";
import { v4 as uuidv4 } from "uuid";

import { pageSchema } from "../schema/schema";
import { emptyPageJson } from "../content.html";

interface PaginationPluginState {
  pageStatus: Map<number, boolean>;
  view?: EditorView;
  paginationContainer: HTMLElement;
}

const key = new PluginKey("pagination");

export const paginationPlugin = new Plugin<PaginationPluginState>({
  key,
  props: {
    handleDOMEvents: {
      keydown: (view, event) => {
        console.log("keydown", event.key);
        if (event.key === "Backspace") {
          const {
            doc,
            selection: { $anchor },
          } = view.state;
          // 在页面最开头按退格
          if ($anchor.start($anchor.depth) === $anchor.pos) {
            const page = $anchor.node(1);
            if (!page) return;
            const pageNum = page.attrs.num;
            if (pageNum < 2) return;
            const prePage = doc.child(pageNum - 2);
            if (!prePage) return;
            const prePageContent = prePage.child(1);
            if (prePageContent.childCount < 2) return;
            // 除去placeholder的最后一个节点
            const prePageLastChild = prePageContent.child(
              prePageContent.childCount - 2
            );
            if (!prePageLastChild) return;
            const prePageLastChildPos = getNodePos(doc, prePageLastChild);
            const pos = prePageLastChildPos + prePageLastChild.nodeSize - 1;
            const tr = view.state.tr;
            tr.setSelection(Selection.near(doc.resolve(pos), -1));
            view.dispatch(tr);
          }
        } else if (event.key === "Delete") {
          const {
            doc,
            selection: { $anchor },
          } = view.state;
          // 在页面最结尾按删除
          if ($anchor.end($anchor.depth) === $anchor.pos) {
            const page = $anchor.node(1);
            if (!page) return;
            const pageNum = page.attrs.num;
            if (pageNum > doc.childCount - 1) return;
            const nextPage = doc.child(pageNum);
            if (!nextPage) return;
            const nextPageContent = nextPage.child(1);
            const nextPageFirstChild = nextPageContent.firstChild;
            if (
              !nextPageFirstChild ||
              nextPageFirstChild.type.name === "placeholder"
            )
              return;
            const nextPageFirstChildPos = getNodePos(doc, nextPageFirstChild);
            const tr = view.state.tr;
            tr.delete(nextPageFirstChildPos + 1, nextPageFirstChildPos + 2);
            tr.setMeta(key, pageNum);
            view.dispatch(tr);
            event.preventDefault();
          }
        }
      },
    },
  },
  state: {
    init: () => {
      return {
        pageStatus: new Map(),
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
        // 对受影响的页面进行空闲时分页
        tr.steps.forEach((step, index) => {
          const { from, to, slice } = step as any;
          if (from === undefined || to === undefined) return;
          const stepResolvePos = tr.docs[index].resolve(from);
          let changingPage = stepResolvePos.node(1);
          if (!changingPage && from === to)
            changingPage = slice.content.content[0];
          const changingPageNum = changingPage?.attrs?.num;
          if (!changingPageNum) return;
          const isFinished = tr.getMeta("paginate-finish") === changingPageNum;
          updatePageStatus(
            changingPageNum,
            isFinished,
            paginationState.pageStatus,
            newState.doc.childCount
          );
          if (isFinished) return;
          requestIdleCallback(() => {
            paginate(changingPageNum, paginationState);
          });
        });
      } else {
        updatePageStatus(
          editPageNum,
          false,
          paginationState.pageStatus,
          newState.doc.childCount
        );
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
  const { view, paginationContainer } = paginationState;

  if (!view) return;
  const contentDom = view.dom.querySelector(
    `.page[num="${pageNum}"] .page_content`
  );
  if (!contentDom) return;
  const placeholderDom = contentDom.querySelector(".placeholder");
  if (!placeholderDom) return;
  const { selection } = view.state;
  if (placeholderDom.clientHeight === 0) {
    // 内容溢出
    const pageNode = view.state.doc.child(pageNum - 1);
    const pageContentNode = pageNode.child(1);
    // 最后一个是placeholder
    const lastContentNode = pageContentNode.child(
      pageContentNode.childCount - 2
    );

    if (!lastContentNode) return;
    // 可以被分割的节点
    if (lastContentNode.type.name === pageSchema.nodes.paragraph.name) {
      const lastContentNodePos = getNodePos(view.state.doc, lastContentNode);
      let lastContentDom = null;
      try {
        lastContentDom = view.nodeDOM(lastContentNodePos) as HTMLElement;
      } catch (_) {
        // react 严格模式
        console.log("strict mode, cancel this pagination");
        updatePageStatus(
          pageNum,
          true,
          paginationState.pageStatus,
          view.state.doc.childCount
        );
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
            )
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
    // 下一页不存在，pageNum分页完成
    if (view.state.doc.childCount < nextPageNum) {
      // requestIdleCallback(() => {
      console.timeLog("paginate", "effect-finish", pageNum);
      updatePageStatus(
        pageNum,
        true,
        paginationState.pageStatus,
        view.state.doc.childCount
      );
      // });
      return;
    }
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
    tr.setSelection(Selection.near(tr.doc.resolve(selection.$anchor.pos)));
    tr.setMeta("addToHistory", false);
    tr.setMeta(key, pageNum);
    view.dispatch(tr);
  }
}

// TODO 更新时机还有问题，特别是3页及以上
function updatePageStatus(
  pageNum: number,
  isFinished: boolean,
  pageStatus: Map<number, boolean>,
  pageCount: number
) {
  if (pageStatus.size === 0) console.time("paginate");
  console.timeLog(
    "paginate",
    "updatePageStatus",
    pageNum,
    isFinished,
    pageCount
  );
  pageStatus.set(pageNum, isFinished);
  if (
    pageNum === pageCount &&
    isFinished &&
    pageStatus.size === pageCount &&
    Array.from(pageStatus.values()).every(Boolean)
  ) {
    console.timeEnd("paginate");
    pageStatus.clear();
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
      console.error("empty id in page", pageNum);
    } else if (nodes.length > 1) {
      // 处理重复ID的情况
      // 检查后页面是否存在相同ID的节点
      const nextDomWithSameId = view.dom.querySelector(
        `.page[num="${pageNum + 1}"] .page_content [id="${id}"]`
      );

      let nodesToChangeId: Element[] = [];
      if (nextDomWithSameId) {
        // 如果后一页有相同ID的节点，则保留最后一个，修改其余节点
        nodesToChangeId = nodes.slice(0, -1);
      } else {
        nodesToChangeId = nodes.slice(1);
      }

      // 执行修改操作
      nodesToChangeId.forEach((node) => {
        const pos = view.posAtDOM(node, 0) - 1;
        tr.setNodeAttribute(pos, "id", uuidv4());
      });
    }
  });

  // 如果有更改，则dispatch事务
  if (tr.docChanged) {
    console.log("removeDuplicatedId", pageNum, tr);
    view.dispatch(tr);
  }
}
