import React from 'react';
import { Link } from 'react-router-dom';
import { Box, Typography } from '@mui/material';

const Logo = () => {
  return (
    <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center',
        gap: 1
      }}>
        <img 
          src="/logo.png"
          alt="PhyloNext-v2 Logo" 
          style={{ 
            height: 32,
            width: 'auto'
          }} 
        />
        <Typography 
          variant="h6" 
          sx={{ 
            fontSize: '1.2rem',
            fontWeight: 600,
            color: '#1890ff'
          }}
        >
          PhyloNext-v2
        </Typography>
      </Box>
    </Link>
  );
};

export default Logo;