import { localeConfig, type Language, type Locale } from "@/lib/i18n";

export type AuthCopy = {
  login: string;
  signup: string;
  appointments: string;
  favorites: string;
  logout: string;
  close: string;
  email: string;
  password: string;
  code: string;
  continue: string;
  otherEmail: string;
  codeHint: string;
  guest: string;
  bookTitle: string;
  bookBody: string;
  saveTitle: string;
  saveBody: string;
  accountTitle: string;
  accountBody: string;
  welcome: string;
  welcomeBody: string;
  checkEmail: string;
  checkEmailBody: (email: string) => string;
  profileTitle: string;
  profileBody: string;
  firstName: string;
  lastName: string;
  phone: string;
  saveProfile: string;
  forBusiness: string;
  google: string;
  apple: string;
  or: string;
  emailError: string;
  passwordError: string;
  codeError: string;
  profileError: string;
  signingIn: string;
  guestTitle: string;
  guestBody: string;
  note: string;
  confirm: string;
  priceUnavailable: string;
  booked: string;
  backToSalon: string;
  keepAppointment: string;
  keepAppointmentBody: string;
  noAppointments: string;
  noFavorites: string;
  signInPrompt: string;
  canceled: string;
  rememberDetails: string;
  editDetails: string;
  working: string;
};

const nl: AuthCopy = {
  login: "Inloggen",
  signup: "Registreren",
  appointments: "Afspraken",
  favorites: "Favorieten",
  logout: "Uitloggen",
  close: "Sluiten",
  email: "E-mail",
  password: "Wachtwoord",
  code: "Code",
  continue: "Ga verder",
  otherEmail: "Ander e-mailadres",
  codeHint: "We sturen je een code ter controle.",
  guest: "Ga verder zonder account",
  bookTitle: "Log in of maak een account",
  bookBody: "We controleren even dat jij het bent om verder te gaan.",
  saveTitle: "Log in om te bewaren",
  saveBody: "Je likes blijven aan je account gekoppeld.",
  accountTitle: "Log in of maak een account",
  accountBody: "Met een account vind je je afspraken en favorieten terug.",
  welcome: "Welkom terug",
  welcomeBody: "Vul het wachtwoord in voor dit e-mailadres.",
  checkEmail: "Check je e-mail",
  checkEmailBody: (email) => `We hebben een code gestuurd naar ${email}.`,
  profileTitle: "Nog een paar gegevens",
  profileBody: "Zo weet de salon wie er komt.",
  firstName: "Voornaam",
  lastName: "Achternaam",
  phone: "Telefoon",
  saveProfile: "Opslaan",
  forBusiness: "Voor bedrijven",
  google: "Ga verder met Google",
  apple: "Ga verder met Apple",
  or: "of",
  emailError: "Dit e-mailadres kon niet worden gecontroleerd.",
  passwordError: "E-mail of wachtwoord klopt niet.",
  codeError: "Die code klopt niet of is verlopen.",
  profileError: "Je gegevens konden niet worden opgeslagen.",
  signingIn: "Bezig met aanmelden…",
  guestTitle: "Je gegevens",
  guestBody: "De salon heeft je naam en e-mail nodig. Een account is niet verplicht.",
  note: "Opmerking",
  confirm: "Bevestig",
  priceUnavailable: "Prijs niet beschikbaar",
  booked: "Je bent geboekt",
  backToSalon: "Terug naar de salon",
  keepAppointment: "Bewaar deze afspraak",
  keepAppointmentBody: "Maak een account met hetzelfde e-mailadres, dan vind je de afspraak later terug.",
  noAppointments: "Nog geen afspraken.",
  noFavorites: "Nog geen bewaarde salons.",
  signInPrompt: "Log in om dit te zien.",
  canceled: "Geannuleerd",
  rememberDetails: "Onthoud mijn gegevens voor de volgende keer",
  editDetails: "Gegevens wijzigen",
  working: "Bezig",
};

const fr: AuthCopy = {
  ...nl,
  login: "Se connecter",
  signup: "S’inscrire",
  appointments: "Rendez-vous",
  favorites: "Favoris",
  logout: "Se déconnecter",
  close: "Fermer",
  email: "E-mail",
  password: "Mot de passe",
  code: "Code",
  continue: "Continuer",
  otherEmail: "Autre adresse e-mail",
  codeHint: "Nous vous envoyons un code de vérification.",
  guest: "Continuer sans compte",
  bookTitle: "Connectez-vous ou créez un compte",
  bookBody: "Nous vérifions que c’est bien vous pour continuer.",
  saveTitle: "Connectez-vous pour enregistrer",
  saveBody: "Vos favoris restent liés à votre compte.",
  accountTitle: "Connectez-vous ou créez un compte",
  accountBody: "Un compte vous permet de retrouver vos rendez-vous et favoris.",
  welcome: "Bon retour",
  welcomeBody: "Entrez le mot de passe de cette adresse.",
  checkEmail: "Vérifiez votre e-mail",
  checkEmailBody: (email) => `Nous avons envoyé un code à ${email}.`,
  profileTitle: "Encore quelques informations",
  profileBody: "Ainsi le salon sait qui vient.",
  firstName: "Prénom",
  lastName: "Nom",
  phone: "Téléphone",
  saveProfile: "Enregistrer",
  forBusiness: "Pour les pros",
  google: "Continuer avec Google",
  apple: "Continuer avec Apple",
  or: "ou",
  emailError: "Cette adresse n’a pas pu être vérifiée.",
  passwordError: "E-mail ou mot de passe incorrect.",
  codeError: "Ce code est incorrect ou expiré.",
  profileError: "Vos informations n’ont pas pu être enregistrées.",
  signingIn: "Connexion…",
  guestTitle: "Vos coordonnées",
  guestBody: "Le salon a besoin de votre nom et de votre e-mail. Un compte n’est pas obligatoire.",
  note: "Remarque",
  confirm: "Confirmer",
  priceUnavailable: "Prix indisponible",
  booked: "C’est réservé",
  backToSalon: "Retour au salon",
  keepAppointment: "Garder ce rendez-vous",
  keepAppointmentBody: "Créez un compte avec la même adresse e-mail pour le retrouver plus tard.",
  noAppointments: "Pas encore de rendez-vous.",
  noFavorites: "Pas encore de salons enregistrés.",
  signInPrompt: "Connectez-vous pour voir ceci.",
  canceled: "Annulé",
  rememberDetails: "Retenir mes coordonnées pour la prochaine fois",
  editDetails: "Modifier les coordonnées",
  working: "Patientez",
};

const en: AuthCopy = {
  ...nl,
  login: "Log in",
  signup: "Sign up",
  appointments: "Appointments",
  favorites: "Favourites",
  logout: "Log out",
  close: "Close",
  email: "Email",
  password: "Password",
  code: "Code",
  continue: "Continue",
  otherEmail: "Different email",
  codeHint: "We’ll send you a verification code.",
  guest: "Continue without an account",
  bookTitle: "Log in or create an account",
  bookBody: "We’ll verify it’s you before you continue.",
  saveTitle: "Log in to save",
  saveBody: "Your likes stay on your account.",
  accountTitle: "Log in or create an account",
  accountBody: "An account keeps your appointments and favourites.",
  welcome: "Welcome back",
  welcomeBody: "Enter the password for this email.",
  checkEmail: "Check your email",
  checkEmailBody: (email) => `We sent a code to ${email}.`,
  profileTitle: "A few more details",
  profileBody: "So the salon knows who is coming.",
  firstName: "First name",
  lastName: "Last name",
  phone: "Phone",
  saveProfile: "Save",
  forBusiness: "For businesses",
  google: "Continue with Google",
  apple: "Continue with Apple",
  or: "or",
  emailError: "This email could not be checked.",
  passwordError: "Email or password is incorrect.",
  codeError: "That code is wrong or expired.",
  profileError: "Your details could not be saved.",
  signingIn: "Signing in…",
  guestTitle: "Your details",
  guestBody: "The salon needs your name and email. An account is optional.",
  note: "Note",
  confirm: "Confirm",
  priceUnavailable: "Price unavailable",
  booked: "You’re booked",
  backToSalon: "Back to the salon",
  keepAppointment: "Keep this appointment",
  keepAppointmentBody: "Create an account with the same email to find it later.",
  noAppointments: "No appointments yet.",
  noFavorites: "No saved salons yet.",
  signInPrompt: "Log in to see this.",
  canceled: "Canceled",
  rememberDetails: "Remember my details for next time",
  editDetails: "Edit details",
  working: "Working",
};

const de: AuthCopy = {
  ...nl,
  login: "Anmelden",
  signup: "Registrieren",
  appointments: "Termine",
  favorites: "Favoriten",
  logout: "Abmelden",
  close: "Schließen",
  email: "E-Mail",
  password: "Passwort",
  code: "Code",
  continue: "Weiter",
  otherEmail: "Andere E-Mail",
  codeHint: "Wir schicken dir einen Code zur Kontrolle.",
  guest: "Ohne Konto fortfahren",
  bookTitle: "Anmelden oder Konto erstellen",
  bookBody: "Wir prüfen kurz, dass du es bist.",
  saveTitle: "Anmelden zum Speichern",
  saveBody: "Deine Likes bleiben mit deinem Konto verbunden.",
  accountTitle: "Anmelden oder Konto erstellen",
  accountBody: "Mit einem Konto findest du Termine und Favoriten wieder.",
  welcome: "Willkommen zurück",
  welcomeBody: "Gib das Passwort für diese E-Mail ein.",
  checkEmail: "Prüfe deine E-Mail",
  checkEmailBody: (email) => `Wir haben einen Code an ${email} geschickt.`,
  profileTitle: "Noch ein paar Angaben",
  profileBody: "So weiß der Salon, wer kommt.",
  firstName: "Vorname",
  lastName: "Nachname",
  phone: "Telefon",
  saveProfile: "Speichern",
  forBusiness: "Für Betriebe",
  google: "Weiter mit Google",
  apple: "Weiter mit Apple",
  or: "oder",
  emailError: "Diese E-Mail konnte nicht geprüft werden.",
  passwordError: "E-Mail oder Passwort stimmt nicht.",
  codeError: "Der Code stimmt nicht oder ist abgelaufen.",
  profileError: "Deine Angaben konnten nicht gespeichert werden.",
  signingIn: "Anmeldung läuft…",
  guestTitle: "Deine Angaben",
  guestBody: "Der Salon braucht Namen und E-Mail. Ein Konto ist nicht nötig.",
  note: "Anmerkung",
  confirm: "Bestätigen",
  priceUnavailable: "Preis nicht verfügbar",
  booked: "Du bist gebucht",
  backToSalon: "Zurück zum Salon",
  keepAppointment: "Diesen Termin behalten",
  keepAppointmentBody: "Erstelle ein Konto mit derselben E-Mail, dann findest du den Termin später.",
  noAppointments: "Noch keine Termine.",
  noFavorites: "Noch keine gespeicherten Salons.",
  signInPrompt: "Melde dich an, um das zu sehen.",
  canceled: "Storniert",
  rememberDetails: "Angaben für das nächste Mal merken",
  editDetails: "Angaben ändern",
  working: "Einen Moment",
};

const byLanguage: Record<Language, AuthCopy> = { nl, fr, en, de };

export function authCopy(locale: Locale): AuthCopy {
  return byLanguage[localeConfig[locale].language];
}
