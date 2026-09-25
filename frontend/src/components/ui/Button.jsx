import React, { forwardRef } from 'react';
import {
    Button as MuiButton,
    IconButton as MuiIconButton,
    CircularProgress,
    Tooltip
} from '@mui/material';
import { styled } from '@mui/material/styles';

// Styled button with loading state
const StyledButton = styled(MuiButton)(({ theme, variant, size }) => ({
    borderRadius: theme.shape.borderRadius,
    textTransform: 'none',
    fontWeight: 600,
    padding: size === 'small' ? '4px 12px' : '6px 16px',
    transition: 'all 0.2s ease-in-out',
    '&:hover': {
        transform: 'translateY(-1px)',
        boxShadow: theme.shadows[4]
    },
    '&:active': {
        transform: 'translateY(0)',
        boxShadow: theme.shadows[2]
    },
    '&.Mui-disabled': {
        backgroundColor: theme.palette.action.disabledBackground,
        color: theme.palette.action.disabled
    }
}));

const Button = forwardRef(({
    children,
    loading = false,
    loadingText = 'Loading...',
    icon,
    iconPosition = 'start',
    variant = 'contained',
    color = 'primary',
    size = 'medium',
    disabled = false,
    onClick,
    type = 'button',
    fullWidth = false,
    tooltip,
    ...props
}, ref) => {

    const buttonContent = (
        <StyledButton
            ref={ref}
            variant={variant}
            color={color}
            size={size}
            disabled={disabled || loading}
            onClick={onClick}
            type={type}
            fullWidth={fullWidth}
            startIcon={iconPosition === 'start' && icon && !loading ? icon : null}
            endIcon={iconPosition === 'end' && icon && !loading ? icon : null}
            {...props}
        >
            {loading ? (
                <>
                    <CircularProgress size={16} sx={{ mr: 1 }} color="inherit" />
                    {loadingText}
                </>
            ) : (
                children
            )}
        </StyledButton>
    );

    if (tooltip) {
        return (
            <Tooltip title={tooltip}>
                <span>{buttonContent}</span>
            </Tooltip>
        );
    }

    return buttonContent;
});

Button.displayName = 'Button';

export default Button;