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
</div>
<div class="page_footer">
</div>
</div>
<div class="page" num="2">
<div class="page_header">
</div>
<div class="page_content">
    <h3>我是第二页的h3</h3>
    <p>我是第二页的p</p>

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
</div>
<div class="page_footer">
</div>
</div>
`;

export const initialContentJson = {
  type: "doc",
  content: [
    {
      type: "page",
      attrs: {
        num: 1,
      },
      content: [
        {
          type: "page_content",
          content: [],
        },
      ],
    },
  ],
};
