import React from 'react';
import { Link } from 'react-router-dom'; // Importer Link pour la navigation
import './LandingPage.css'; // Importer le CSS spécifique
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import ShareIcon from '@mui/icons-material/Share';
import AssessmentIcon from '@mui/icons-material/Assessment';
import heroImage from '../images/hero1.png';
import NavigationButton from '../components/NavigationButton';
import { styled, useTheme } from '@mui/material/styles';
import { Box, Button } from '@mui/material';

const StyledButton = styled(Button)(({ theme }) => ({
  textTransform: 'none',
  borderRadius: 30,
  padding: '8px 24px',
  minWidth: 120,
  '&:hover': {
    backgroundColor: theme.palette.primary.light,
    transform: 'translateY(-1px)',
    transition: 'transform 0.2s ease-in-out',
  },
  '&:active': {
    transform: 'translateY(0)',
  },
}));

const Header = styled(Box)(({ theme }) => ({
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  zIndex: 1,
  bgcolor: 'background.paper',
  borderBottom: '1px solid',
  borderColor: 'divider',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  py: 2,
}));

const Navigation = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
}));

const ButtonGroup = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: 2,
  alignItems: 'center',
}));

const ActionButton = styled(Button)(({ theme }) => ({
  textTransform: 'none',
  borderRadius: 30,
  padding: '8px 24px',
  minWidth: 120,
  '&:hover': {
    backgroundColor: theme.palette.primary.light,
    transform: 'translateY(-1px)',
    transition: 'transform 0.2s ease-in-out',
  },
  '&:active': {
    transform: 'translateY(0)',
  },
}));

const LandingPage = () => {
  return (
    <div className="landing-page-container">
      {/* Header */}
      <header>
        <div className="container header-content">
          <a href="#" className="logo">
            {/* Logo image removed */}
            <span>FlashFrançais</span>
          </a>
          <nav>
            <ul>
              <li>
                <StyledButton component={Link} to="/features" variant="outlined" color="primary">
                  Fonctionnalités
                </StyledButton>
              </li>
              <li>
                <StyledButton component={Link} to="/onboarding" variant="outlined" color="primary">
                  Démarrage
                </StyledButton>
              </li>
              <li>
                <StyledButton component={Link} to="/pricing" variant="outlined" color="primary">
                  Tarifs
                </StyledButton>
              </li>
              <li>
                <StyledButton component={Link} to="/contact" variant="outlined" color="primary">
                  Contact
                </StyledButton>
              </li>
            </ul>
          </nav>
          <div className="header-buttons">
            <NavigationButton to="/login" className="btn btn-outline" style={{ marginRight: '10px' }}>
              Connexion
            </NavigationButton>
            <NavigationButton to="/register" className="btn">
              Inscription
            </NavigationButton>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="container" style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
          <div className="hero-content">
            <h1>Transformez l'enseignement du français avec <span>FlashFrançais</span></h1>
            <p>
              La plateforme tout-en-un pour créer, gérer et partager des flashcards interactives.
              Engagez vos élèves et suivez leurs progrès comme jamais auparavant.
            </p>
            <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center' }}>
              <NavigationButton to="/register" variant="contained" size="large" color="primary">
                Commencer gratuitement
              </NavigationButton>
              <ActionButton variant="outlined" size="large" color="primary">
                Découvrir les fonctionnalités
              </ActionButton>
            </Box>
          </div>
          <div className="hero-image">
            <img src={heroImage} alt="Illustration FlashFrançais" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features" id="features">
        <div className="container">
          <div className="section-title">
            <h2>Des outils puissants pour un apprentissage efficace</h2>
            <p>Tout ce dont vous avez besoin pour dynamiser vos cours de français et simplifier votre travail.</p>
          </div>
          <div className="features-grid">
            {/* Feature 1 */}
            <div className="feature-card">
              <div className="feature-icon">
                <AddCircleOutlineIcon style={{ color: 'white', fontSize: 25 }} />
              </div>
              <h3>Création Facile</h3>
              <p>Créez rapidement votre progression pédagogique pour des élèves de toute classe en vous faisant aider par l'intelligence artificielle</p>
            </div>
            {/* Feature 2 */}
            <div className="feature-card">
              <div className="feature-icon">
                <FolderOpenIcon style={{ color: 'white', fontSize: 25 }} />
              </div>
              <h3>Gestion de vos ressources</h3>
              <p>Cours, exercices, évalusations : générez ou stockez des documents et associez les à vos scéances et vos séquences</p>
            </div>
            {/* Feature 3 */}
            <div className="feature-card">
              <div className="feature-icon">
                <ShareIcon style={{ color: 'white', fontSize: 25 }} />
              </div>
              <h3>Partage Simplifié</h3>
              <p>Partagez vos jeux de cartes avec vos élèves ou d'autres professeurs en un clic.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Onboarding Steps Section */}
      <section className="onboarding-steps" id="onboarding">
        <div className="container">
          <div className="section-title">
            <h2>Comment démarrer avec FlashFrançais</h2>
            <p>Quatre étapes simples pour transformer votre enseignement du français</p>
          </div>
          <div className="steps-container">
            {/* Step 1 */}
            <div className="step">
              <div className="step-number">1</div>
              <h3>Inscrivez-vous gratuitement</h3>
              <p>Créez votre compte enseignant en quelques secondes pour accéder à toutes les fonctionnalités.</p>
            </div>
            {/* Step 2 */}
            <div className="step">
              <div className="step-number">2</div>
              <h3>Créez votre premier jeu</h3>
              <p>Utilisez notre éditeur intuitif pour concevoir votre première série de flashcards.</p>
            </div>
            {/* Step 3 */}
            <div className="step">
              <div className="step-number">3</div>
              <h3>Invitez vos élèves</h3>
              <p>Partagez un lien unique ou invitez vos classes à rejoindre la plateforme.</p>
            </div>
            {/* Step 4 */}
            <div className="step">
              <div className="step-number">4</div>
              <h3>Suivez et adaptez</h3>
              <p>Observez les progrès, identifiez les difficultés et personnalisez l'apprentissage.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="cta-section">
        <div className="container">
          <h2>Prêt à révolutionner votre enseignement du français ?</h2>
          <p>Rejoignez plus de 10 000 professeurs qui utilisent déjà FlashFrançais pour créer des cours engageants et efficaces.</p>
          <div className="cta-buttons">
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <NavigationButton to="/register" variant="contained" size="large" color="primary">
                Je m'inscris (c'est gratuit !)
              </NavigationButton>
              <ActionButton variant="outlined" size="large" color="primary">
                Demander une démo
              </ActionButton>
            </Box>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer>
        <div className="container">
          <p>&copy; 2025 FlashFrançais. Tous droits réservés.</p>
          {/* Ajouter d'autres liens si nécessaire: Politique de confidentialité, etc. */}
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
