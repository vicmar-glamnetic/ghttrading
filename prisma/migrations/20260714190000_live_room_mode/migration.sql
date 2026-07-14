-- Add an interactive "Live room" mode (Jitsi call) alongside the existing
-- embedded webinar stream. `mode` selects which one /live renders; `roomName`
-- holds the Jitsi room slug when mode = 'room'.
ALTER TABLE "live_webinar" ADD COLUMN "mode" TEXT NOT NULL DEFAULT 'webinar';
ALTER TABLE "live_webinar" ADD COLUMN "roomName" TEXT;
