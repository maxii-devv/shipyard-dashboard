'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Settings, Calendar, X, Trash2 } from 'lucide-react'
import { Video } from '@/lib/types'

export function VideoActions({ video }: { video: Video }) {
  const [status, setStatus] = useState(video.status)
  const [youtubeUrl, setYoutubeUrl] = useState(video.youtube_url ?? '')
  const [scheduledAt, setScheduledAt] = useState(
    video.scheduled_at
      ? new Date(video.scheduled_at).toISOString().slice(0, 16)
      : ''
  )
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const handleSave = async () => {
    setLoading(true)
    await supabase
      .from('videos')
      .update({
        status,
        youtube_url: youtubeUrl || null,
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        published_at:
          status === 'published' && !video.published_at
            ? new Date().toISOString()
            : video.published_at,
        updated_at: new Date().toISOString(),
      })
      .eq('id', video.id)
    setLoading(false)
    setOpen(false)
    router.refresh()
  }

  const clearSchedule = () => setScheduledAt('')

  const handleDelete = async () => {
    setDeleteLoading(true)
    await fetch(`/api/videos/${video.id}`, { method: 'DELETE' })
    setDeleteLoading(false)
    setDeleteOpen(false)
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="flex items-center gap-2">
    {/* Delete confirmation dialog */}
    <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-red-800 text-red-500 hover:text-white hover:bg-red-900 gap-2"
        >
          <Trash2 className="w-4 h-4" /> Delete
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle>Delete Video?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-400 mt-2">
          This will permanently delete <span className="text-white font-medium">"{video.title}"</span> and all its assets. This cannot be undone.
        </p>
        <div className="flex gap-2 pt-4">
          <Button
            onClick={handleDelete}
            disabled={deleteLoading}
            className="bg-red-700 hover:bg-red-800 text-white"
          >
            {deleteLoading ? 'Deleting...' : 'Yes, delete it'}
          </Button>
          <Button
            variant="ghost"
            onClick={() => setDeleteOpen(false)}
            className="text-gray-400"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800 gap-2"
        >
          <Settings className="w-4 h-4" /> Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle>Video Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
            <Select value={status} onValueChange={(v) => setStatus(v as Video['status'])}>
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700 text-white">
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="ready_to_create">Ready to Create</SelectItem>
                <SelectItem value="editing">Editing</SelectItem>
                <SelectItem value="ready">Ready</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="backlog">Backlog</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Schedule */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Scheduled Date
            </label>
            <div className="flex gap-2">
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-red-500 text-sm [color-scheme:dark]"
              />
              {scheduledAt && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSchedule}
                  className="text-gray-400 hover:text-white px-2"
                  title="Clear schedule"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Set a publish date to show this video on the calendar.
            </p>
          </div>

          {/* YouTube URL */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">YouTube URL</label>
            <input
              type="url"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
              placeholder="https://youtube.com/watch?v=..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleSave}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? 'Saving...' : 'Save'}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              className="text-gray-400"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </div>
  )
}
