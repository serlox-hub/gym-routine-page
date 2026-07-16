-- ============================================
-- MIGRACIÓN 047: bucket público para los GIFs de ejercicios
-- ============================================
-- Contenido compartido (mismo para todos los usuarios), servido en listas y ficha.
-- Bucket PÚBLICO → URL estable y cacheable, sin presigned (a diferencia de los vídeos privados).
-- Los objetos se suben aparte (CLI/dashboard): <store_id>_360.gif y <store_id>_720.gif.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('exercise-gifs', 'exercise-gifs', true, 5242880, array['image/gif'])
on conflict (id) do update set public = excluded.public,
                                file_size_limit = excluded.file_size_limit,
                                allowed_mime_types = excluded.allowed_mime_types;

-- Lectura pública: al ser public=true, Supabase sirve los objetos sin policy adicional.
-- (Las subidas las hace el owner con credenciales elevadas, no requieren policy de INSERT.)
