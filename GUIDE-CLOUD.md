# ☁️ Master Soutien Pédagogique — Synchronisation Cloud (chiffrée)

L'application peut désormais **sauvegarder vos données sur internet** tout en garantissant
une **confidentialité totale** grâce au **chiffrement de bout en bout**.

---

## 🔐 Comment la confidentialité est-elle garantie ?

1. Vos données sont **chiffrées SUR VOTRE TÉLÉPHONE** avec votre **mot de passe secret**,
   **avant** d'être envoyées sur internet (algorithme AES-256).
2. Le serveur ne reçoit et ne stocke **qu'un contenu illisible** (chiffré).
3. **Personne** ne peut lire vos élèves/notes sans votre mot de passe secret :
   ni le serveur, ni l'administrateur de l'application, ni un pirate.
4. Le déchiffrement se fait **uniquement sur votre appareil**, avec votre mot de passe.

> C'est le même principe que les applications de messagerie sécurisées.
> Votre mot de passe secret n'est **jamais** envoyé sur internet.

---

## 👩‍🏫 Pour l'enseignant (utilisation)

1. Ouvrez **Accueil → Synchronisation Cloud**
2. Notez votre **Code de synchronisation** (ex. `MSP-A1B2-C3D4`)
3. Choisissez un **mot de passe secret** (notez-le en lieu sûr !)
4. Appuyez sur **« Sauvegarder dans le cloud »**
5. Sur un autre téléphone : entrez le **même code + même mot de passe**,
   puis **« Récupérer depuis le cloud »**

⚠️ **Si vous oubliez le mot de passe secret, les données sont irrécupérables**
(c'est le prix de la confidentialité totale). Notez-le soigneusement.

---

## ⚙️ Pour l'administrateur (activation, à faire UNE fois)

Le cloud utilise **Supabase** (hébergement gratuit). Configuration en 5 minutes :

1. Créez un compte sur **https://supabase.com** puis un **nouveau projet** (gratuit)
2. Dans **SQL Editor**, ouvrez un nouveau script et collez tout le contenu du fichier :
   **`supabase-schema.sql`**
3. Cliquez sur **Run**. Cela crée automatiquement :
   - `backups` : sauvegardes chiffrées des données
   - `licenses` : codes d'accès payants et révocation
   - les policies RLS nécessaires
4. Dans **Project Settings → API**, copiez :
   - **Project URL**
   - **anon public key**
5. Ouvrez le fichier `src/utils/cloudConfig.ts` et collez ces deux valeurs :
   ```ts
   export const SUPABASE_URL = 'https://xxxx.supabase.co';
   export const SUPABASE_ANON_KEY = 'eyJhbGciOi...';
   ```
6. Reconstruisez l'application (`npm run build`) et redéployez.

> Tant que ces valeurs restent vides, l'application fonctionne **100 % en local**
> (aucune synchronisation), exactement comme avant.

### Si vous voulez créer les tables manuellement
Utilisez plutôt le fichier `supabase-schema.sql`. Il contient déjà les tables, index,
triggers et policies. Voici uniquement le principe de policy SQL permissive :
```sql
alter table backups enable row level security;

create policy "acces_anon_backups"
on backups for all
to anon
using (true)
with check (true);
```

Comme les données sont **déjà chiffrées de bout en bout**, cette policy n'expose
aucune information lisible.

---

**Master Soutien Pédagogique** — Vos données, partout, en toute confidentialité 🇧🇯
