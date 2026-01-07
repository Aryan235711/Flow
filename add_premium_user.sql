-- SQL Script to Add Gmail as Pro User
-- Replace 'your.email@gmail.com' with your actual Gmail address

-- Method 1: Update existing user to premium
UPDATE users 
SET is_premium = true, updated_at = now() 
WHERE email = 'your.email@gmail.com';

-- Method 2: Insert new user as premium (if user doesn't exist yet)
INSERT INTO users (email, name, is_premium, avatar_seed, picture) 
VALUES (
  'your.email@gmail.com', 
  'Your Name', 
  true, 
  'Felix',
  'https://api.dicebear.com/9.x/notionists/svg?seed=Felix&backgroundColor=c0aede,d1d4f9,b6e3f4,ffd5dc,ffdfbf'
)
ON CONFLICT (email) DO UPDATE SET 
  is_premium = true, 
  updated_at = now();

-- Verify the update
SELECT email, name, is_premium, created_at, updated_at 
FROM users 
WHERE email = 'your.email@gmail.com';