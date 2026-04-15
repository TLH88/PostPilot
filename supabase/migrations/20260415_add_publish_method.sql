-- BP-086: Add publish_method to track how a post was published
-- Values: 'scheduled' (auto-published from schedule), 'direct' (Approve & Publish), 'manual' (marked as posted)

alter table posts
  add column if not exists publish_method text
  check (publish_method in ('scheduled', 'direct', 'manual'));

-- Backfill existing posted posts:
-- Posts with scheduled_for AND status='posted' were published via schedule
update posts
  set publish_method = 'scheduled'
  where status = 'posted'
    and scheduled_for is not null
    and publish_method is null;

-- Posts with status='posted' but no scheduled_for were likely posted directly or manually
-- We can't distinguish historically, so mark as 'direct' (most common path)
update posts
  set publish_method = 'direct'
  where status = 'posted'
    and scheduled_for is null
    and publish_method is null;
