import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Button, 
  Container,
  useTheme
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SchoolIcon from '@mui/icons-material/School';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import AssignmentIcon from '@mui/icons-material/Assignment';

const slides = [
  {
    title: "Bienvenue sur Flash Français",
    subtitle: "L'outil idéal pour les professeurs de français",
    description: "Créez des progressions pédagogiques personnalisées pour vos élèves et suivez leur évolution en temps réel.",
    icon: SchoolIcon,
    color: "#4F6AFF"
  },
  {
    title: "Créez des flashcards interactives",
    subtitle: "Personnalisez votre contenu pédagogique",
    description: "Ajoutez du vocabulaire, des exemples et définissez le niveau de difficulté pour adapter l'apprentissage à chaque élève.",
    icon: AutoStoriesIcon,
    color: "#FF4F6A"
  },
  {
    title: "Suivez les progrès de vos élèves",
    subtitle: "Analysez leurs performances",
    description: "Visualisez les statistiques d'apprentissage et identifiez les points à améliorer pour optimiser votre enseignement.",
    icon: AssignmentIcon,
    color: "#66BB6A"
  }
];

// Suppression de la prop onComplete qui n'est pas utilisée
const Onboarding = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();
  const theme = useTheme();

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      // Dernière slide, rediriger vers la page de connexion
      navigate('/login');
    }
  };

  const handlePrevious = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleSkip = () => {
    // Rediriger directement vers la page de connexion
    navigate('/login');
  };

  const CurrentIcon = slides[currentSlide].icon;

  return (
    <Container maxWidth="md" className="onboarding-container">
      <Box className="onboarding-slide">
        <Box 
          className="onboarding-icon-container"
          sx={{
            backgroundColor: slides[currentSlide].color,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: '50%',
            width: 120,
            height: 120,
            margin: '0 auto 2rem',
            color: 'white'
          }}
        >
          <CurrentIcon sx={{ fontSize: 60 }} />
        </Box>

        <Typography 
          variant="h3" 
          component="h1" 
          align="center" 
          gutterBottom
          sx={{ 
            fontWeight: 'bold',
            color: theme.palette.primary.main
          }}
        >
          {slides[currentSlide].title}
        </Typography>
        
        <Typography 
          variant="h5" 
          component="h2" 
          align="center" 
          gutterBottom
          sx={{ 
            fontWeight: 'medium',
            color: theme.palette.text.secondary,
            mb: 3
          }}
        >
          {slides[currentSlide].subtitle}
        </Typography>
        
        <Typography 
          variant="body1" 
          align="center" 
          paragraph
          sx={{ 
            fontSize: '1.1rem',
            maxWidth: '80%',
            margin: '0 auto 3rem',
            color: theme.palette.text.secondary
          }}
        >
          {slides[currentSlide].description}
        </Typography>

        <Box 
          className="onboarding-progress"
          sx={{
            display: 'flex',
            justifyContent: 'center',
            margin: '2rem 0'
          }}
        >
          {slides.map((_, index) => (
            <Box
              key={index}
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: index === currentSlide ? theme.palette.primary.main : theme.palette.grey[300],
                margin: '0 5px',
                transition: 'background-color 0.3s'
              }}
            />
          ))}
        </Box>

        <Box 
          className="onboarding-actions"
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            mt: 4
          }}
        >
          <Button 
            variant="outlined" 
            onClick={handlePrevious}
            disabled={currentSlide === 0}
            startIcon={<ArrowBackIcon />}
          >
            Précédent
          </Button>
          
          <Button 
            variant="text" 
            color="secondary"
            onClick={handleSkip}
          >
            Passer
          </Button>
          
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleNext}
            endIcon={<ArrowForwardIcon />}
          >
            {currentSlide === slides.length - 1 ? "Commencer" : "Suivant"}
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default Onboarding;
