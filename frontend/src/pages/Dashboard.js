import React from 'react';
import {
  Box,
  Typography,
  Button,
  Container,
  Grid,
  Card,
  CardContent,
  CardActions,
  Divider,
  useTheme
} from '@mui/material';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import BarChartIcon from '@mui/icons-material/BarChart';
import PeopleIcon from '@mui/icons-material/People';
import AddIcon from '@mui/icons-material/Add';

const Dashboard = () => {
  const theme = useTheme();

  console.log('Dashboard render');

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Bienvenue sur votre tableau de bord
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AutoStoriesIcon sx={{ color: theme.palette.primary.main, mr: 1 }} />
                <Typography variant="h6">Progressions</Typography>
              </Box>
              <Typography variant="h3" color="text.primary">
                12
              </Typography>
              <Typography color="text.secondary">
                Progressions créées
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <BarChartIcon sx={{ color: theme.palette.secondary.main, mr: 1 }} />
                <Typography variant="h6">Statistiques</Typography>
              </Box>
              <Typography variant="h3" color="text.primary">
                85%
              </Typography>
              <Typography color="text.secondary">
                Taux de réussite moyen
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PeopleIcon sx={{ color: theme.palette.success.main, mr: 1 }} />
                <Typography variant="h6">Étudiants</Typography>
              </Box>
              <Typography variant="h3" color="text.primary">
                42
              </Typography>
              <Typography color="text.secondary">
                Étudiants actifs
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          Dernières activités
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button variant="contained" startIcon={<AddIcon />}>
            Nouvelle progression
          </Button>
          <Button variant="contained" color="secondary">
            Voir les statistiques
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default Dashboard;
