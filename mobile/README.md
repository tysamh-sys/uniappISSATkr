# ISSATK Attendance - Application Mobile (React Native + Expo)

Application mobile universitaire officielle pour la gestion des présences à l'**ISSAT Kairouan**.

---

## 📱 Comment lancer l'application sur votre téléphone (Expo Go)

### 1. Prérequis sur votre téléphone
- Téléchargez et installez l'application **Expo Go** depuis l'App Store (iOS) ou le Google Play Store (Android).

### 2. Démarrer le serveur Expo sur votre PC
Ouvrez un terminal dans ce dossier et exécutez la commande :

```bash
npm start
```
*(ou `npx expo start -g`)*

> 💡 **Astuce si votre téléphone et votre PC ne sont pas sur le même réseau Wi-Fi :**  
> Utilisez le mode tunnel :  
> ```bash
> npx expo start --tunnel
> ```

### 3. Scanner le QR Code
- **Sur Android** : Ouvrez **Expo Go**, appuyez sur **"Scan QR code"** et scannez le code qui s'affiche dans votre terminal.
- **Sur iPhone (iOS)** : Ouvrez l'application **Appareil photo**, scannez le QR code et appuyez sur la notification pour l'ouvrir dans **Expo Go**.

L'application va se charger directement sur votre téléphone ! 🎉

---

## ✨ Fonctionnalités incluses

### 🔄 Sélecteur de rôle interactif (Étudiant & Enseignant)
Vous pouvez tester les deux profils à tout moment :
- **Étudiant (Amine Ben Amor)**
- **Enseignant (Mme. Sonia Mansouri)**

### 📱 Écrans et modules
1. **Écran de Connexion (Login)** : Choix de rôle, mot de passe avec affichage/masquage, bascule de langue (FR/EN) et thème (Clair/Sombre).
2. **Accueil (Home)** : Carte du prochain cours ("Dans 12 min"), chronologie de la journée avec badges d'état, raccourci des demandes administratives pour enseignant.
3. **Emploi du temps (Timetable)** : Sélecteur de jours (Lun 17 à Sam 22), navigation dans la semaine, liste complète des cours.
4. **Gestion des Présences (Attendance)** :
   - **Vue Étudiant** : Statistiques (18 Présences, 2 Absences, 1 Justifiée), filtres (Toutes, Absences, En attente), historique détaillé, bouton scanner justificatif.
   - **Vue Enseignant** : Feuille d'appel interactive avec boutons **P** (Présent) et **A** (Absent), compteur en temps réel, blocage de sécurité hors-ligne, bouton de confirmation.
5. **Détails du cours (Class Details)** : Badge matière, horaires, salle, annonces aux étudiants, boutons d'action rapide enseignant.
6. **Notifications** : Alertes de changement de salle, confirmations de présence, mises à jour administratives.
7. **Scanner de justificatif (Scanner)** : Viseur de caméra avec repères de cadrage, document simulé, bouton déclencheur et compteur de pages.
8. **Aperçu du certificat médical (Preview)** : Document réaliste avec signature et cachet, outils de retouche (Recadrer, Ajuster, Ajouter), enregistrement en brouillon si hors-ligne.
9. **Reçu de confirmation (Submission)** : Référence officielle (`ATT-...` ou `JUS-...`), statut, horodatage.
10. **Nouvelle annonce (Announcement)** : Rédacteur de message pour l'enseignant, prévisualisation en direct de l'affichage étudiant, accusé d'envoi.
11. **Demandes administratives (Requests)** : Formulaire de demande d'absence ou modification de séance, historique avec statuts d'approbation.
12. **Profil & Réglages (Profile)** : Carte d'identité universitaire, choix du thème (Clair / Sombre / Système), choix de la langue, interrupteur de notifications, déconnexion.
13. **Indicateur de connectivité** : Appuyez sur la pastille en haut pour alterner entre **Synchronisé** et **Hors ligne** et tester la résilience de l'application !
