ALTER TABLE user_profile
  ADD COLUMN selected_duration_days integer
  CHECK (selected_duration_days IN (21, 30, 60, 90, 100));
