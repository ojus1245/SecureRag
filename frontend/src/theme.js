// Re-export from themes for backward compatibility
export { lightTheme, darkTheme } from './themes';
export { createTheme } from '@mui/material/styles';

export const getTheme = (mode) => {
  if (mode === 'dark') {
    const { darkTheme } = require('./themes');
    return darkTheme;
  }
  const { lightTheme } = require('./themes');
  return lightTheme;
};
