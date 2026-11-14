CORRECTIF — DÉPÔT SIGNÉ DES FICHES

Ce paquet contient les fichiers source modifiés pour le dépôt Vercel lié :
  moooussou-droid/msp-essai-master-soutien-pedagogiqu (branche main)

Installation :
1. Clonez/ouvrez ce dépôt dans GitHub Desktop.
2. Extrayez le contenu de cette archive à la racine du clone, en conservant les dossiers server/ et tests/ et en autorisant le remplacement.
3. Dans GitHub Desktop, vérifiez les deux fichiers modifiés, puis committez et faites Push origin.
4. Attendez le nouveau déploiement Vercel Production avant de retester la synchronisation.

Le correctif envoie un objet JSON vide lors de la demande d’URL de dépôt signée
et affiche/logue uniquement le statut/code HTTP Storage en cas d’échec. Il ne
contient aucun secret et ne change pas les politiques Supabase. La migration et
le bucket ont déjà été vérifiés.
