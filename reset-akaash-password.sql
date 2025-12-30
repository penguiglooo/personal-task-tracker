-- Reset Akaash's password to qwerty123
UPDATE users
SET password = '$2b$10$8Hhng.mOj1vgvklooLXp/.qweTBTMslPJfkeWz7gvpxnbKg0j7pbK',
    must_change_password = TRUE
WHERE email = 'akaash@muncho.app';
