import React from 'react';
import { Card as MuiCard, CardContent, Typography, Box, useTheme, Avatar } from '@mui/material';
import { TrendingUp, Analytics } from '@mui/icons-material';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
}

export const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  subtitle, 
  icon, 
  color = 'primary' 
}) => {
  const theme = useTheme();

  const getColorConfig = (colorName: string) => {
    const colors = {
      primary: { main: theme.palette.primary.main, light: theme.palette.primary.light },
      secondary: { main: theme.palette.secondary.main, light: theme.palette.secondary.light },
      success: { main: theme.palette.success.main, light: '#C8E6C9' },
      warning: { main: theme.palette.warning.main, light: '#FFE0B2' },
      error: { main: theme.palette.error.main, light: '#FFCDD2' },
      info: { main: theme.palette.info?.main || '#2196F3', light: '#BBDEFB' }
    };
    return colors[colorName as keyof typeof colors] || colors.primary;
  };

  const colorConfig = getColorConfig(color);

  return (
    <MuiCard 
      elevation={8} 
      sx={{ 
        borderRadius: 4,
        background: theme.palette.mode === 'dark' 
          ? 'linear-gradient(145deg, rgba(26,26,26,0.9) 0%, rgba(42,42,42,0.9) 100%)'
          : 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(248,249,250,0.95) 100%)',
        backdropFilter: 'blur(20px)',
        border: `1px solid ${colorConfig.main}40`,
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: theme.palette.mode === 'dark'
            ? `0 12px 40px rgba(0,0,0,0.4), 0 0 0 1px ${colorConfig.main}60`
            : `0 12px 40px rgba(0,0,0,0.15), 0 0 0 1px ${colorConfig.main}40`,
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: `linear-gradient(90deg, ${colorConfig.main}, ${colorConfig.light})`,
          opacity: 0.8,
        }
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Box display="flex" alignItems="flex-start" justifyContent="space-between">
          <Box flex={1}>
            <Typography 
              variant="overline" 
              color="text.secondary"
              sx={{ 
                fontSize: { xs: '0.65rem', sm: '0.75rem' }, 
                fontWeight: 600,
                letterSpacing: '0.5px',
                opacity: 0.8
              }}
            >
              {title}
            </Typography>
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: 800, 
                mt: 1,
                mb: 0.5,
                background: `linear-gradient(45deg, ${colorConfig.main}, ${colorConfig.light})`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontSize: { xs: '1.4rem', sm: '1.8rem', md: '2rem' }
              }}
            >
              {value}
            </Typography>
            {subtitle && (
              <Typography 
                variant="caption" 
                color="text.secondary"
                sx={{ 
                  fontSize: { xs: '0.7rem', sm: '0.8rem' },
                  opacity: 0.7,
                  fontWeight: 500,
                  display: { xs: 'none', sm: 'block' }
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>

          <Avatar
            sx={{ 
              width: { xs: 40, sm: 48, md: 56 }, 
              height: { xs: 40, sm: 48, md: 56 },
              background: theme.palette.mode === 'dark'
                ? `linear-gradient(135deg, ${colorConfig.main}20, ${colorConfig.light}10)`
                : `linear-gradient(135deg, ${colorConfig.main}10, ${colorConfig.light}20)`,
              border: `2px solid ${colorConfig.main}30`,
              '& .MuiSvgIcon-root': {
                color: colorConfig.main,
                fontSize: { xs: 20, sm: 24, md: 28 }
              }
            }}
          >
            {icon || <Analytics />}
          </Avatar>
        </Box>

        {/* Subtle animated background decoration */}
        <Box
          sx={{
            position: 'absolute',
            bottom: -20,
            right: -20,
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${colorConfig.main}08, transparent)`,
            opacity: 0.6,
          }}
        />
      </CardContent>
    </MuiCard>
  );
};

export default StatCard;
