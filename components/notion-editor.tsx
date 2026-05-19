'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import '@blocknote/mantine/style.css'

interface NotionEditorProps {
  initialContent: string
  placeholder?: string
  onSave: (markdown: string) => void
  saveStatus?: 'idle' | 'saving' | 'saved'
}

export function NotionEditor({ initialContent, placeholder, onSave, saveStatus = 'idle' }: NotionEditorProps) {
  const lastSavedRef = useRef(initialContent)
  const initializedRef = useRef(false)

  const editor = useCreateBlockNote({
    domAttributes: {
      editor: {
        style: 'font-size: 14px; line-height: 1.7; padding: 0;',
      },
    },
  })

  // Load initial markdown content
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true
    if (!initialContent) return

    const load = async () => {
      const blocks = await editor.tryParseMarkdownToBlocks(initialContent)
      editor.replaceBlocks(editor.document, blocks)
    }
    load()
  }, [editor, initialContent])

  const handleBlur = useCallback(async () => {
    const markdown = await editor.blocksToMarkdownLossy(editor.document)
    const trimmed = markdown.trim()
    if (trimmed !== lastSavedRef.current.trim()) {
      lastSavedRef.current = trimmed
      onSave(trimmed)
    }
  }, [editor, onSave])

  return (
    <div className="relative notion-editor-wrapper" onBlur={handleBlur}>
      <BlockNoteView
        editor={editor}
        theme="dark"
        sideMenu={true}
      />
      {saveStatus !== 'idle' && (
        <span
          className="absolute top-1 right-1 text-[10px] transition-opacity z-10"
          style={{ color: saveStatus === 'saving' ? 'rgba(255,255,255,0.3)' : '#10b981' }}
        >
          {saveStatus === 'saving' ? 'Saving...' : 'Saved'}
        </span>
      )}
    </div>
  )
}
