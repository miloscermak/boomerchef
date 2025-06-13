-- Vytvoření admin uživatele pro Boomerchef
-- Spusťte tento SQL v Supabase SQL Editor

-- Nejdříve smažeme existující uživatele (pokud existují)
DELETE FROM auth.users WHERE email IN ('extracermak@gmail.com', 'admin@test.cz');

-- Vytvoření nového admin uživatele
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    confirmation_sent_at,
    raw_app_meta_data,
    raw_user_meta_data
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'admin@test.cz',
    crypt('admin123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"email_verified": true}'
);

-- Ověření, že uživatel byl vytvořen
SELECT email, email_confirmed_at, created_at 
FROM auth.users 
WHERE email = 'admin@test.cz';