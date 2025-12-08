-- Añadir campo video_url a completed_sets para guardar videos de técnica/PRs
ALTER TABLE completed_sets ADD COLUMN video_url TEXT;

-- Comentario descriptivo
COMMENT ON COLUMN completed_sets.video_url IS 'URL del video en Cloudinary (opcional)';
