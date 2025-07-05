import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Container } from '@mui/material';
import SessionFicheWizard from '../../components/sessions/SessionFicheWizard';

const SessionFicheBuilderPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <SessionFicheWizard sessionId={id} onFinish={() => navigate(`/sessions/${id}`)} />
    </Container>
  );
};

export default SessionFicheBuilderPage;
