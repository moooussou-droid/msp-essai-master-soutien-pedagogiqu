# ☁️ Guide pas à pas — Activer le Cloud Supabase

> ✅ **STATUT : CONFIGURÉ LE 1er SEPTEMBRE 2026; fiches officielles préparées le 6 novembre 2026**
> Le projet `fgkxjgwlihmxhvsexotq` est connecté pour les fonctions déjà actives. La migration séparée
> des fiches publiées crée un catalogue public en lecture seule et un bucket de pages; la publication
> exige toujours le déploiement Vercel avec API et un code IA de rôle `principal`.

**Durée :** ~15 minutes · **Coût :** 0 FCFA (plan gratuit) · **Ce que ça débloque :**
- Sauvegarde **chiffrée de bout en bout** de vos classes/élèves/notes sur internet (restauration sur un autre téléphone)
- Validation **serveur** des codes d'accès + révocation à distance (anti-partage abusif)

---

## Étape 1 — Créer un compte Supabase (5 min)

1. Ouvrez **https://supabase.com** dans votre navigateur (Chrome recommandé).
2. Cliquez sur **« Start your project »** → **« Sign up »**.
3. Connectez-vous avec **GitHub** ou **Google** (le plus rapide). Sinon, email + mot de passe, puis validez le lien reçu par email.

## Étape 2 — Créer le projet (5 min)

1. Cliquez sur **« New project »** (bouton vert).
2. Remplissez :
   - **Organization** : celle créée par défaut suffit.
   - **Project name** : `master-soutien-pedagogique`
   - **Database Password** : créez et **notez-le** un mot de passe fort (ex. 20 caractères). ⚠️ *Il ne sert qu'à la maintenance de la base ; l'application n'en a pas besoin, mais notez-le dans un endroit sûr.*
   - **Region** : choisissez **`EU West (London)`** ou **`EU Central (Frankfurt)`** — les plus proches du Bénin (latence minimale).
   - **Plan** : **Free** ✅
3. Cliquez sur **« Create new project »**.
4. **Attendez 1 à 2 minutes** que le projet finisse de démarrer (barre de progression verte).

## Étape 3 — Créer les tables (3 min)

1. Dans le menu de gauche, cliquez sur **« SQL Editor »**.
2. Cliquez sur **« New query »**.
3. **Effacez** tout ce qui est écrit, puis **collez le script complet ci-dessous** :

```sql
-- ============================================================
-- MASTER SOUTIEN PÉDAGOGIQUE — Schéma Supabase (à exécuter tel quel)
-- Tables : backups (sauvegardes chiffrées) + licenses (codes d'accès)
-- ============================================================

create extension if not exists pgcrypto;

-- 1) Sauvegardes chiffrées (le blob est chiffré côté téléphone :
--    Supabase ne voit JAMAIS les notes/élèves en clair)
create table if not exists public.backups (
  sync_code text primary key,
  data text not null,
  updated_at timestamptz not null default now()
);

create index if not exists backups_updated_at_idx
on public.backups (updated_at desc);

alter table public.backups enable row level security;

drop policy if exists "backups_anon_select" on public.backups;
drop policy if exists "backups_anon_insert" on public.backups;
drop policy if exists "backups_anon_update" on public.backups;

create policy "backups_anon_select"
on public.backups for select to anon using (true);

create policy "backups_anon_insert"
on public.backups for insert to anon with check (true);

create policy "backups_anon_update"
on public.backups for update to anon using (true) with check (true);

-- 2) Codes d'accès payants (status : active | revoked)
create table if not exists public.licenses (
  code text primary key,
  name text not null,
  status text not null default 'active' check (status in ('active', 'revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists licenses_status_idx on public.licenses (status);
create index if not exists licenses_created_at_idx on public.licenses (created_at desc);

alter table public.licenses enable row level security;

drop policy if exists "licenses_anon_select" on public.licenses;
drop policy if exists "licenses_anon_insert" on public.licenses;
drop policy if exists "licenses_anon_update" on public.licenses;

create policy "licenses_anon_select"
on public.licenses for select to anon using (true);

create policy "licenses_anon_insert"
on public.licenses for insert to anon with check (true);

create policy "licenses_anon_update"
on public.licenses for update to anon using (true) with check (true);

-- 3) Trigger : updated_at automatique
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists backups_set_updated_at on public.backups;
create trigger backups_set_updated_at
before update on public.backups
for each row execute function public.set_updated_at();

drop trigger if exists licenses_set_updated_at on public.licenses;
create trigger licenses_set_updated_at
before update on public.licenses
for each row execute function public.set_updated_at();
```

4. Cliquez sur **« Run »** (ou Ctrl+Entrée). Vous devez voir **« Success. No rows returned »** ✅

## Étape 3 bis — Synchroniser les fiches officielles

Cette fonctionnalité concerne uniquement les fiches pédagogiques marquées « publiées » par l’administration. Elle ne synchronise ni les brouillons, ni les listes d’élèves, ni les notes, ni les autres ressources.

1. Dans **SQL Editor**, exécutez `supabase/migrations/20261106_prep_fiches_catalog.sql` depuis le dépôt source.
2. La migration crée `msp_prep_fiches_catalog`, accessible publiquement en lecture seule, et le bucket public `msp-prep-fiches`. Aucune écriture publique n’est autorisée; les fonctions serveur Vercel utilisent la clé serveur Supabase pour préparer les dépôts signés et publier le manifeste.
3. Pour publier, déployez le dépôt source complet sur Vercel avec `SUPABASE_URL`, `SUPABASE_SECRET_KEY` (nouvelle clé `sb_secret_...`) et `MSP_AI_SESSION_SECRET`, puis utilisez dans l’écran d’administration un code IA de rôle `principal`. La variable legacy `SUPABASE_SERVICE_ROLE_KEY` reste acceptée si vous avez encore l’ancienne clé `service_role`. Ne mettez jamais une clé serveur Supabase dans le JavaScript du navigateur.
4. Les appareils des utilisateurs lisent le manifeste public, téléchargent les pages nouvelles et les gardent dans IndexedDB pour un usage hors ligne. Le déploiement statique peut synchroniser les téléchargements, mais ne peut pas publier; le ZIP manuel reste le recours hors ligne.
5. Limites appliquées : 45 MB par page, 200 MB par publication; les pages de plus de 6 MiB utilisent un envoi reprenable. La limite globale du projet Supabase reste applicable.

## Étape 4 — Récupérer vos 2 clés (1 min)

1. Cliquez sur l'icône **⚙️ « Settings »** (en bas du menu de gauche, ou via « Project Settings »).
2. Dans **« API »** (menu de gauche de la page Settings), copiez les **2 valeurs** :

| Champ | À copier | Exemple |
|---|---|---|
| **Project URL** | URL complète | `https://abcdefghijkl.supabase.co` |
| **anon public** | la clé `anon` | `eyJhbGciOi...` (très longue) |

3. **Envoyez-moi ces 2 valeurs dans le chat** → je les intègre dans l'application, je reconstruis et je **teste moi-même la connexion** (aller-retour de test, puis nettoyage).

> ⚠️ Ne partagez **jamais** la clé serveur `sb_secret_...` ou l’ancienne clé `service_role` (gardez-la dans les secrets Vercel et un gestionnaire de mots de passe). Seule la clé `anon` / publishable est destinée au navigateur, et les règles RLS doivent rester activées.

---

## Étape 5 — Utilisation dans l'application (après que je l'ai activée)

1. Dans l'application : **Accueil → Synchronisation Cloud**.
2. Générez un **Code de synchronisation** (format `MSP-XXXX-XXXX`).
3. Choisissez un **Mot de passe secret** fort et **notez-le** :
   - 🔐 Il chiffre vos données **sur votre téléphone** avant l'envoi.
   - ⚠️ **Perdu = irrécupérable** : ni moi, ni vous, ni personne ne peut déchiffrer une sauvegarde sans lui.
4. **« Sauvegarder dans le cloud »** → message de succès.
5. Sur un autre téléphone : installez l'app → même code + même mot de passe → **« Récupérer depuis le cloud »**.

## Étape 6 — Gérer les codes d'accès (admin)

Dans l'app : bouton **« Espace administrateur »** (écran d'accueil) → générer un code pour un enseignant.
Désormais chaque code est aussi **enregistré sur le serveur** : vous pouvez le **révoquer à distance** (non-paiement, partage abusif) depuis l'écran de gestion.

---

## 🛠️ Dépannage

| Problème | Solution |
|---|---|
| Ligne de test `AUDIT-TEST-2026` dans la table `backups` | C'est le test automatique effectué le 01/09/2026. Vous pouvez la supprimer : **Table Editor → backups → supprimer la ligne**, ou la laisser (inoffensive). |
| `CLOUD_NON_CONFIGURE` | Les clés ne sont pas encore intégrées → envoyez-les-moi. |
| `Erreur d'envoi (401)` | Clé `anon` mal copiée (espace ou caractère manquant). Re-copiez. |
| `Erreur (404) relation does not exist` | Le script SQL n'a pas été exécuté (Étape 3) ou erreur au Run. Relancez-le. |
| `Erreur (403) RLS` | Une policy manque. Le script ci-dessus crée toutes les policies — re-exécutez-le tel quel. |
| Projet « paused » (plan gratuit) | Après ~1 semaine d'inactivité, Supabase met le projet en pause. Ouvrez le projet → **« Restore project »**. |
| Mot de passe secret oublié | Impossible de récupérer les données (voulu). Seule la sauvegarde locale du téléphone reste valable. |

## 🔒 Rappel de confidentialité

- Le serveur ne stocke que du **texte chiffré** (AES-256) : ni Supabase, ni un pirate, ni l'administrateur ne peuvent lire vos élèves/notes.
- C'est le même principe qu'une messagerie sécurisée : **le mot de passe secret ne quitte jamais votre téléphone**.
