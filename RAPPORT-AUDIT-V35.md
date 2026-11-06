# RAPPORT D'AUDIT — Master Soutien Pédagogique v35

**Date :** 13 septembre 2026 · **Cache PWA :** `master-soutien-v35`

## Résultats de validation

| Contrôle | Résultat |
|---|---|
| TypeScript (`tsc --noEmit`) | **0 erreur** |
| Audit fonctionnel (`tests/audit.ts`) | **785 / 0** (+30 tests v35) |
| Test de fumée (`tests/smoke.ts`) | **59 / 0** |
| E2E (`tests/e2e.mjs`) | **24 / 0** |
| E2E v34 (`tests/e2e-v34.mjs`) | **5 / 0** |
| **E2E v35 (`tests/e2e-v35.mjs`)** | **12 / 0** — cloisonnement réel des rôles |
| Build de production | **OK** — `deploy/` 3 838 Ko |

---

## 1. FAILLE DE SÉCURITÉ CORRIGÉE — pourquoi toute l'équipe était Super Admin

**Cause exacte :** à la connexion, la session d'un membre était enregistrée sous la
forme `member:<id>`. Mais à la relecture (rechargement de page, réouverture de
l'application), cette valeur **n'était jamais décodée** : l'application cherchait un
membre dont l'identifiant serait littéralement `member:m-tech`, ne le trouvait pas,
et le rôle retombait sur la valeur par défaut du code :

```ts
const currentRole = currentAdmin?.role ?? 'Super Administrateur';  // ← faille
```

**Résultat :** n'importe quel membre devenait **Super Administrateur** après un simple
rechargement, et voyait la nomination des membres et la génération des codes.

**Corrections apportées :**
1. la session `member:<id>` est **correctement décodée** ;
2. le repli n'est plus « Super Administrateur » mais **« Support »**, le rôle le plus
   restreint — un membre inconnu n'obtient donc **aucun** privilège ;
3. **seul** le titulaire du code général (session `owner`) est Super Administrateur ;
4. bug annexe corrigé : la vérification « membre suspendu » s'exécutait sur une liste
   d'équipe encore vide au premier rendu et déconnectait à tort les membres légitimes.

## 2. Fonctions RÉSERVÉES aux Super Administrateurs

```ts
export const SUPER_ADMIN_ONLY: AdminTab[] = ['team', 'access'];
```

- **Nomination des membres** de l'équipe (ajout, suspension, retrait, invitation) ;
- **Génération et envoi des codes d'accès** (clients et administrateurs).

Protection à **deux niveaux** :
- **Affichage** : les onglets « Équipe » et « Accès » ne sont pas rendus pour les autres rôles ;
- **Action** : garde-fou `requireSuperAdmin()` sur les **7 fonctions sensibles**
  (`addMember`, `toggleMember`, `deleteMember`, `inviteMember`, `generateCredential`,
  `generateAdminCode`, `sendAdminCodeByWhatsApp`) — l'opération est refusée même si
  l'interface était contournée.

## 3. NOUVEAU POSTE — Gestionnaire Technique

Ajouté à l'équipe de gouvernance, avec son propre onglet **« Technique »** :

- **Diagnostic de l'application** : version du cache, état du Service Worker (mode
  hors-ligne), mode d'affichage (installée / navigateur), connexion, **stockage local utilisé** ;
- **Purger le cache** et forcer le rechargement de la dernière version publiée
  (aucune donnée d'enseignant supprimée) ;
- **Exporter le rapport de diagnostic** (.txt) pour le support.

Permissions : *Maintenance technique · Sauvegardes et restauration · Diagnostic ·
Suivi du stockage · Purge du cache / mises à jour · Assistance technique*.
**Il ne peut ni nommer des membres, ni générer des codes d'accès.**

## 4. Cloisonnement : chaque membre n'a QUE ses fonctions

| Poste | Onglets accessibles |
|---|---|
| **Super Administrateur** | Ressources · **Équipe** · **Accès** · Orientation · Cours · Technique · Gouvernance |
| **Gestionnaire Technique** | **Technique** · Gouvernance |
| **Responsable Ressources** | Ressources · Orientation · Cours · Gouvernance |
| **Responsable Annonces** | Gouvernance *(annonces et publicités via les ressources qui lui sont confiées)* |
| **Modérateur** | Cours · Gouvernance |
| **Support** | Gouvernance |

- À la connexion, chaque membre **atterrit automatiquement sur le premier onglet
  autorisé** par son rôle (plus de page vide ni d'onglet interdit).
- L'onglet **Gouvernance** reste visible par tous : il affiche les règles, la liste des
  postes, leur mission et **met en évidence les fonctions réservées** (cadenas).
- La fiche de chaque membre et le formulaire de nomination affichent désormais la
  **mission du poste** et ses permissions ; choisir « Super Administrateur » déclenche
  un **avertissement explicite**.

### Vérification en conditions réelles (E2E v35)
Après **rechargement de session** — le scénario exact de la faille :
- Gestionnaire Technique → « Équipe » et « Accès » **masqués**, « Technique » disponible, rôle correctement reconnu ✅
- Responsable Ressources → « Équipe »/« Accès » masqués, « Ressources » disponible ✅
- Support → « Équipe »/« Accès »/« Technique » masqués ✅
- Super Administrateur → tout disponible ✅

---

## Compatibilité

- Les membres déjà enregistrés conservent leur fiche ; leur rôle est désormais
  **réellement appliqué**. Vérifiez dans *Équipe* que chaque personne porte le bon poste.
- Code d'accès global inchangé : `MSP-Catalyste@@007-2026`.
- Cache `master-soutien-v35` : mise à jour automatique chez tous les utilisateurs.
