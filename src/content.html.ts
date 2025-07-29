import { v4 as uuidv4 } from "uuid";

const LENGTH = 10000;
const CHINESE_LENGTH = 200;

export const initialContent = `
<div class="page" num="1">
<div class="page_header">
</div>
<div class="page_content">
    <h3>page_content中的h3</h3>
    <p>page_content中的p</p>

    <p>To apply styling, you can select a piece of text and manipulate
        its styling from the menu. The basic schema
        supports <em>emphasis</em>, <strong>strong
            text</strong>, <a href="http://marijnhaverbeke.nl/blog">links</a>, <code>code
          font</code>, and <img src="/vite.svg"> images.</p>

    <p>Block-level structure can be manipulated with key bindings (try
        ctrl-shift-2 to create a level 2 heading, or enter in an empty
        textblock to exit the parent block), or through the menu.</p>

    <p>Try using the “list” item in the menu to wrap this paragraph in
        a numbered list.</p>
    
    <p>${CHINESE_LENGTH}个中文：${getChineseString(CHINESE_LENGTH)}</p>
    <p>${LENGTH}个大写字母：${getString(LENGTH)}</p>

<div class="page_footer">
</div>
</div>
`;

export function emptyPageJson(pageNum = 1) {
  return {
    type: "doc",
    content: [
      {
        type: "page",
        attrs: {
          num: pageNum,
        },
        content: [
          {
            type: "page_header",
          },
          {
            type: "page_content",
            content: [
              {
                type: "paragraph",
                attrs: {
                  id: uuidv4(),
                },
                content: [],
              },
            ],
          },
          {
            type: "page_footer",
          },
        ],
      },
    ],
  };
}

function getString(length: number) {
  // 生成按字母顺序排列的26个大写字母
  const result = Array.from({ length }, (_, i) =>
    String.fromCharCode(65 + (i % 26))
  ).join("");
  return result;
}

function getChineseString(length: number) {
  const result = Array.from({ length }, (_, i) =>
    String.fromCharCode(0x4e00 + i)
  ).join("");
  return result;
}
