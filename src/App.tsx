import { useEffect } from 'react'
import { EditorState } from "prosemirror-state"
import { EditorView } from "prosemirror-view"
import { DOMParser } from "prosemirror-model"
import { exampleSetup } from "prosemirror-example-setup"

import { initialContent } from './content.html'
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
        doc: DOMParser.fromSchema(pageSchema).parse(tempDiv),
        plugins: exampleSetup({ schema: pageSchema }).concat([paginationPlugin])
      })
    });
    return () => view.destroy(); // 清理函数
  }, []);

  return (
    <div className='container'>
      <h1>Vite + React + ProseMirror 单编辑器 动态分页</h1>
      <div id="editor"></div>
    </div>
  )
}

export default App
