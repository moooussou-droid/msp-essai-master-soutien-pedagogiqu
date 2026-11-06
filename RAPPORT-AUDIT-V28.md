# 📋 Rapport — v28 (Accès simple : codes à 6 chiffres, sans serveur)

**Date :** 5 septembre 2026
**Audit automatique :** ✅ **578 tests réussis / 0 échec** (TypeScript : 0 erreur, build : OK)

## Le problème
Quand un utilisateur (ou un autre administrateur) saisissait son code, l'application
affichait **« Ce code n'est pas reconnu par le serveur. Contactez l'administrateur. »**
Cause : après la vérification locale, l'application appelait un **serveur de licence
(Supabase)** ; dès que ce serveur n'était pas joignable ou que le code n'y était pas
enregistré, l'accès était **refusé** — même avec un code valide.

## La solution : un système de codes SIMPLIFIÉ, 100 % local

### Pour les utilisateurs (enseignants)
- **Un seul code à 6 chiffres** (ex. **783 420**), tapé sur le clavier numérique.
- **Le nom devient facultatif** : un code suffit pour entrer (le nom sert
  seulement à personnaliser le profil).
- **Aucun serveur, aucune connexion** : le code est validé localement par un
  chiffre de contrôle — un code généré par un administrateur fonctionne
  **immédiatement, sur tous les appareils, même hors-ligne**.
- Le message « pas reconnu par le serveur » a **totalement disparu** (l'appel
  serveur a été retiré de l'écran d'accès).
- **Compatibilité** : les anciens codes personnels (XXXX-XXXX-XXXX-XXXX liés au
  nom) continuent d'être acceptés — aucun abonné n'est bloqué.

### Pour les administrateurs (Espace Administrateur → onglet « Accès »)
- **Code maître** (6 chiffres) : affiché, modifiable à tout moment ; il ouvre
  l'application pour l'équipe d'administration.
- **« Générer 5 codes »** : produit 5 codes simples immédiatement utilisables.
- Chaque code s'affiche en grand (ex. `684 787`) avec trois boutons :
  **WhatsApp** (envoi direct au titulaire), **Copier**, **Retirer**.
- Le titulaire reste facultatif (facilite le suivi sans imposer une saisie).
- L'ancien générateur d'identifiants complexes (16 caractères liés au nom) a été
  retiré de l'interface.

## Vérifications
- 200 codes générés → tous valides ; codes faux ou mal formés rejetés ✔
- Lot de 5 codes uniques ✔ · Code maître stable, modifiable, invalide refusé ✔
- AccessGate : plus aucune référence au serveur de licence, message d'erreur
  supprimé, champ unique 6 chiffres avec clavier numérique ✔
- Testé en exécution réelle (génération, validation, code maître, formats) ✔
- Audit **578/0** (19 nouveaux tests §37) · TypeScript 0 erreur · Build OK ·
  Cache PWA → `master-soutien-v28`
