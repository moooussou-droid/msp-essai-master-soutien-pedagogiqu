/**
 * Configuration ADMINISTRATEUR de Master Soutien Pédagogique.
 *
 * ⚠️ RÉSERVÉ AU PROPRIÉTAIRE DE L'APPLICATION.
 *
 * - ADMIN_PASSWORD : mot de passe pour accéder au générateur de codes d'accès.
 *   Changez-le avant de distribuer l'application. Ne le communiquez à personne.
 *
 * - LICENSE_SECRET : clé secrète utilisée pour générer et vérifier les codes d'accès
 *   des utilisateurs. Elle DOIT rester identique dans toutes les copies de l'application
 *   (sinon les codes déjà distribués ne fonctionneront plus).
 *   Changez-la UNE FOIS au départ pour une valeur connue de vous seul, puis n'y touchez plus.
 *
 * Comment ça marche :
 *   1. Un enseignant vous contacte (WhatsApp) et paie.
 *   2. Dans l'app → Administration (protégée par ADMIN_PASSWORD), vous saisissez son NOM
 *      et générez un CODE personnel.
 *   3. Vous lui envoyez le code. Il le saisit avec son nom pour débloquer son espace.
 *   Le code ne fonctionne qu'avec CE nom exact : il est donc personnel.
 */

export const ADMIN_PASSWORD = 'MSP-Catalyste@@007-2026';

export const LICENSE_SECRET = 'MSP-SECRET-CHANGEZ-MOI-2026-benin-education';
