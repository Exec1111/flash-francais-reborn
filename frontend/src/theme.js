import { createTheme } from '@mui/material/styles';

// Création du thème personnalisé
const theme = createTheme({
  palette: {
    mode: 'dark', // Passer en mode sombre pour correspondre au template
    primary: {
      main: '#6366f1', // --primary from template
      contrastText: '#ffffff', // Assurer la lisibilité sur la couleur primaire
    },
    secondary: {
      main: '#3730a3', // --secondary from template
      contrastText: '#ffffff', // Assurer la lisibilité sur la couleur secondaire
    },
    background: {
      default: '#0f172a', // --dark-bg from template
      paper: '#1e293b', // --card-bg from template
    },
    text: {
      primary: '#f8fafc', // --text-primary from template
      secondary: '#cbd5e1', // --text-secondary from template
      disabled: '#94a3b8', // --text-muted from template (pour le texte désactivé)
    },
    // Optionnel: ajouter une couleur accent si vous l'utilisez souvent
    accent: {
        main: '#38bdf8', // --accent from template
        contrastText: '#0f172a',
    },
    // Définir la couleur de la bordure (peut être utilisée via Divider ou sx)
    divider: '#334155', // --border-color from template
  },
  typography: {
    fontFamily: [
      'Inter',
      'Roboto',
      '"Helvetica Neue"',
      'Arial', 
      'sans-serif'
    ].join(','),
    h1: {
      fontFamily: '"Inter", "Roboto", sans-serif',
      fontWeight: 700,
    },
    h2: {
      fontFamily: '"Inter", "Roboto", sans-serif',
      fontWeight: 700,
    },
    h3: {
      fontFamily: '"Inter", "Roboto", sans-serif',
      fontWeight: 600,
    },
    h4: {
      fontFamily: '"Inter", "Roboto", sans-serif',
      fontWeight: 600,
    },
    h5: {
      fontFamily: '"Inter", "Roboto", sans-serif',
      fontWeight: 600,
    },
    h6: {
      fontFamily: '"Inter", "Roboto", sans-serif',
      fontWeight: 500,
    },
    subtitle1: {
      fontFamily: '"Inter", "Roboto", sans-serif',
      fontWeight: 500,
    },
    subtitle2: {
      fontFamily: '"Inter", "Roboto", sans-serif',
      fontWeight: 500,
    },
    body1: {
      fontFamily: '"Inter", "Roboto", sans-serif',
    },
    body2: {
      fontFamily: '"Inter", "Roboto", sans-serif',
    },
    button: {
      fontFamily: '"Inter", "Roboto", sans-serif',
      fontWeight: 600,
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarColor: "#6b6b6b #2b2b2b",
          "&::-webkit-scrollbar, & *::-webkit-scrollbar": {
            backgroundColor: "#2b2b2b",
            width: '8px'
          },
          "&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb": {
            borderRadius: 8,
            backgroundColor: "#6b6b6b",
            minHeight: 24,
            border: "1px solid #2b2b2b",
          },
          "&::-webkit-scrollbar-thumb:focus, & *::-webkit-scrollbar-thumb:focus": {
            backgroundColor: "#959595",
          },
          "&::-webkit-scrollbar-thumb:active, & *::-webkit-scrollbar-thumb:active": {
            backgroundColor: "#959595",
          },
          "&::-webkit-scrollbar-thumb:hover, & *::-webkit-scrollbar-thumb:hover": {
            backgroundColor: "#959595",
          },
          "&::-webkit-scrollbar-corner, & *::-webkit-scrollbar-corner": {
            backgroundColor: "#2b2b2b",
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 'var(--border-radius, 8px)', // Utiliser la variable CSS ou valeur directe
          textTransform: 'none', // Empêcher la capitalisation automatique
          boxShadow: 'var(--box-shadow, 0 4px 6px rgba(0, 0, 0, 0.25))', // Appliquer l'ombre du template
          transition: 'var(--transition, all 0.3s ease)',
          '&:hover': {
            // Simuler le :hover du template si nécessaire
            // backgroundColor: 'var(--primary-hover, #818cf8)',
            boxShadow: '0 6px 10px rgba(0, 0, 0, 0.3)', // Légère augmentation de l'ombre au survol
          }
        },
        containedPrimary: {
            '&:hover': {
                backgroundColor: '#818cf8', // --primary-hover
            }
        }
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 'var(--border-radius, 8px)',
          boxShadow: 'var(--box-shadow, 0 4px 6px rgba(0, 0, 0, 0.25))',
          // La couleur de fond est déjà gérée par palette.background.paper
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& label.Mui-focused': {
            color: 'var(--accent, #38bdf8)', // Couleur du label focus
          },
          '& .MuiOutlinedInput-root': {
            borderRadius: 'var(--border-radius, 8px)',
            '& fieldset': {
              borderColor: 'var(--border-color, #334155)', // Bordure par défaut
            },
            '&:hover fieldset': {
              borderColor: 'var(--primary, #6366f1)', // Bordure au survol
            },
            '&.Mui-focused fieldset': {
              borderColor: 'var(--accent, #38bdf8)', // Bordure en focus
            },
          },
        },
      },
    },
  },
});

export default theme;
