'use client'

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { PenLine, Paperclip, Send } from 'lucide-react'

interface VideoDetailTabsProps {
  assetsContent: React.ReactNode
  attachmentsContent: React.ReactNode
  publishingContent: React.ReactNode
  assetSummary: string
  attachmentCount: number
}

export function VideoDetailTabs({
  assetsContent,
  attachmentsContent,
  publishingContent,
  assetSummary,
  attachmentCount,
}: VideoDetailTabsProps) {
  const triggerCls = "text-xs uppercase tracking-wider font-semibold data-[state=active]:text-white/90 data-[state=active]:after:bg-[#dc2626] text-white/35 hover:text-white/60 rounded-none border-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:border-transparent px-4"

  return (
    <Tabs defaultValue="writing" className="w-full">
      <TabsList
        variant="line"
        className="w-full justify-start border-b gap-0"
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <TabsTrigger value="writing" className={triggerCls}>
          <PenLine className="w-3.5 h-3.5" />
          Writing
          <span
            className="text-[10px] font-mono px-1.5 py-0.5 rounded-full ml-1"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)' }}
          >
            {assetSummary}
          </span>
        </TabsTrigger>
        <TabsTrigger value="attachments" className={triggerCls}>
          <Paperclip className="w-3.5 h-3.5" />
          Attachments
          {attachmentCount > 0 && (
            <span
              className="text-[10px] font-mono px-1.5 py-0.5 rounded-full ml-1"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)' }}
            >
              {attachmentCount}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="publishing" className={triggerCls}>
          <Send className="w-3.5 h-3.5" />
          Editing
        </TabsTrigger>
      </TabsList>

      <TabsContent value="writing" className="mt-0 outline-none">
        {assetsContent}
      </TabsContent>
      <TabsContent value="attachments" className="mt-0 outline-none">
        {attachmentsContent}
      </TabsContent>
      <TabsContent value="publishing" className="mt-0 outline-none">
        {publishingContent}
      </TabsContent>
    </Tabs>
  )
}
