-- Add Saurabh user with viewer role
-- Password will be: qwerty123
-- Must change password on first login

INSERT INTO users (email, name, password, role, must_change_password, created_at, updated_at)
VALUES (
  'saurabh@foan.ai',
  'Saurabh',
  '$2a$10$8Y5K5Y5K5Y5K5Y5K5Y5K5.K5K5K5K5K5K5K5K5K5K5K5K5K5K5K5K5',
  'viewer',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;
