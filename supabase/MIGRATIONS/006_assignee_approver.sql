-- Migration 006: assignee + approver on reconciliations
-- Run in Supabase SQL editor after 005_features.sql

ALTER TABLE reconciliations
  ADD COLUMN IF NOT EXISTS assignee_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approver_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
