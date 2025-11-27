-- Atualizar função handle_new_user para incluir phone, instagram e followers_range
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, gender, phone, instagram, followers_range)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    NEW.raw_user_meta_data->>'gender',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'instagram',
    NEW.raw_user_meta_data->>'followers_range'
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;