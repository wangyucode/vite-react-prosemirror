import { useEffect } from 'react'
import { EditorState } from "prosemirror-state"
import { EditorView } from "prosemirror-view"
import { DOMParser, Node } from "prosemirror-model"
import { exampleSetup } from "prosemirror-example-setup"

import { initialContent, emptyPageJson } from './content.html'
import { pageSchema } from './schema/schema'

import './editor.css'
import './App.scss'
import { paginationPlugin } from './plugin/pagination'


function App() {

  useEffect(() => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = initialContent;
    const view = new EditorView(document.querySelector("#editor"), {
      state: EditorState.create({
        doc: Node.fromJSON(pageSchema, emptyPageJson(1)),
        plugins: exampleSetup({ schema: pageSchema }).concat([paginationPlugin])
      })
    });
    const tr = view.state.tr.setMeta("init", view);
    view.dispatch(tr.replaceWith(0, view.state.doc.content.size, DOMParser.fromSchema(pageSchema).parse(tempDiv)).setMeta("addToHistory", false));
    return () => view.destroy(); // 清理函数
  }, []);

  return (
    <>
      <div className='container'>
        <h1>Vite + React + ProseMirror 单编辑器 动态分页</h1>
        <div id="editor"></div>
      </div>
      <div id="pagination">
        <div id="pagination-container" className='ProseMirror'></div>
      </div>
    </>
  )
}

export default App
