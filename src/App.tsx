import { useEffect, useState } from 'react'
import { EditorState } from "prosemirror-state"
import { EditorView } from "prosemirror-view"
import { Schema, DOMParser } from "prosemirror-model"
import { schema } from "prosemirror-schema-basic"
import { addListNodes } from "prosemirror-schema-list"
import { exampleSetup } from "prosemirror-example-setup"

import { initialContent } from './content.html'
import { pageSchema } from './schema/schema'

import './App.css'
import './editor.css'


function App() {
  const [editorView, setEditorView] = useState<EditorView | null>(null);

  useEffect(() => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = initialContent;
    const view = new EditorView(document.querySelector("#editor"), {
      state: EditorState.create({
        doc: DOMParser.fromSchema(pageSchema).parse(tempDiv),
        plugins: exampleSetup({ schema: pageSchema })
      })
    });
    setEditorView(view);
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
