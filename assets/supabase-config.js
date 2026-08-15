/* WOY — configuración de Supabase.
   La llave "publishable" está diseñada para vivir en el navegador: no da
   acceso a nada por sí sola. Lo que protege los datos son las políticas
   RLS de la base (ver backend/01-esquema.sql).
   NUNCA poner aquí la llave que empieza con sb_secret_. */
window.WOY_SUPABASE = {
  url: "https://vhtuihtqvskxobkqjeat.supabase.co",
  key: "sb_publishable_4_RuKRCnta4kW1mz5qsH7Q_wKvCSrrO"
};
