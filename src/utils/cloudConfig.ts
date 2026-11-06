/**
 * Configuration de la synchronisation cloud.
 *
 * ⚙️ POUR ACTIVER LE CLOUD (à faire UNE SEULE FOIS par le propriétaire de l'app) :
 *
 * 1. Créez un compte gratuit sur https://supabase.com
 * 2. Créez un nouveau projet (gratuit)
 * 3. Dans "Table Editor", créez une table nommée `backups` avec les colonnes :
 *      - sync_code   : type text   (Primary Key)
 *      - data        : type text
 *      - updated_at  : type timestamptz  (valeur par défaut: now())
 * 4. Créez une table nommée `licenses` (validation des codes d'accès) avec :
 *      - code        : type text   (Primary Key)
 *      - name        : type text
 *      - status      : type text   (valeur par défaut: 'active')  // 'active' | 'revoked'
 *      - created_at  : type timestamptz  (valeur par défaut: now())
 * 5. Dans "Project Settings > API", copiez :
 *      - Project URL       → collez-le dans SUPABASE_URL ci-dessous
 *      - anon public key   → collez-la dans SUPABASE_ANON_KEY ci-dessous
 * 6. (Sécurité) Activez RLS et ajoutez une policy autorisant insert/select/update
 *    sur les tables `backups` et `licenses` pour le rôle `anon`.
 *
 * ⚠️ IMPORTANT : Même si ces identifiants sont publics, VOS DONNÉES RESTENT PRIVÉES
 *    car elles sont chiffrées de bout en bout AVANT l'envoi (voir crypto.ts).
 *    Le serveur ne stocke que du texte chiffré illisible.
 *
 * Les fiches officielles publiées utilisent en plus la table publique
 * `msp_prep_fiches_catalog` et le bucket public `msp-prep-fiches` : le navigateur
 * ne dispose que d’un accès en lecture. La publication passe exclusivement par
 * les fonctions Vercel avec la clé service-role conservée côté serveur.
 *
 * Tant que ces valeurs restent vides, les fonctions cloud qui les utilisent
 * restent indisponibles; les fiches déjà téléchargées demeurent locales.
 */

export const SUPABASE_URL = 'https://fgkxjgwlihmxhvsexotq.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZna3hqZ3dsaWhteGh2c2V4b3RxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyNzg2MTEsImV4cCI6MjEwMzg1NDYxMX0._Ifoe5CT6eygVs1G4VKcSHIigvgbHNeb2iICq_lJBG8';

export function isCloudConfigured(): boolean {
  return SUPABASE_URL.trim().length > 0 && SUPABASE_ANON_KEY.trim().length > 0;
}
