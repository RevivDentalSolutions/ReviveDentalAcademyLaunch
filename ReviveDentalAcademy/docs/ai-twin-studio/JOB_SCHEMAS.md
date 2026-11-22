# Proposed contracts — documentation only, NOT applied SQL

## VideoProject
id UUID; course_id UUID; lesson_id UUID; lesson_revision TEXT; owner_id UUID; input_snapshot_hash TEXT; storyboard_version INT; status ENUM(draft,awaiting_review,approved,archived); brand_asset_manifest JSON; created_at; updated_at.
Unique revisioned project identity; original course and lesson records unchanged.

## AvatarProfile
id UUID; owner_id UUID; consent_version TEXT; consent_timestamp TIMESTAMPTZ; consent_scope TEXT; revoked_at TIMESTAMPTZ nullable; encrypted_media_refs JSON; voice_model_ref TEXT nullable; portrait_model_ref TEXT nullable; visibility ENUM(private); created_at.
Never store raw biometric assets in public buckets, logs or repository. Consent revocation blocks future jobs; retention/deletion policy required.

## RenderJob
id UUID; video_project_id UUID; scene_plan_hash TEXT; requested_by UUID; idempotency_key TEXT UNIQUE; status ENUM(queued,claimed,running,cancel_requested,cancelled,failed,awaiting_review,approved,published); worker_lease_expires_at TIMESTAMPTZ; attempts INT; max_attempts INT; gpu_type TEXT; approved_budget_usd NUMERIC; estimated_cost_usd NUMERIC; actual_cost_usd NUMERIC; model_manifest_hash TEXT; error_code TEXT nullable; created_at; updated_at.
Server-side budget validation and atomic claims required; worker never chooses payment credentials. Failed jobs preserve originals.

## RenderArtifact
id UUID; job_id UUID; artifact_type ENUM(audio,avatar_clip,scene,caption,mp4,thumbnail); private_storage_key TEXT; sha256 TEXT; duration_ms INT; created_at; review_status ENUM(pending,approved,rejected); approved_by UUID nullable; approved_at nullable.
Only approved MP4 may attach to lesson. Publish is separate audited action and must not overwrite previously approved versions.

## Example non-executable job envelope
{
  "schemaVersion": 1,
  "jobId": "UUID",
  "courseId": "UUID",
  "lessonId": "UUID",
  "lessonRevision": "immutable-revision",
  "scenePlanHash": "sha256",
  "avatarProfileId": "UUID",
  "modelManifestHash": "sha256",
  "budgetLimitUsd": 5,
  "approvedByAdmin": false,
  "autoPublish": false
}

## Access policy
Student: no project/avatar/job reads. Admin: scoped review actions. Worker: narrow service identity to claim jobs and upload outputs. Owner: revoke/delete likeness. Separate read-only preview tokens. No service-role credentials in browser.
