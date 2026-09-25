import React, { forwardRef } from 'react';
import {
    IconButton as MuiIconButton,
    Tooltip,
    Badge,
    CircularProgress
} from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledIconButton = styled(MuiIconButton)(({ theme, size }) => ({
    transition: 'all 0.2s ease-in-out',
    '&:hover': {
        backgroundColor: theme.palette.action.hover,
        transform: 'scale(1.1)'
    },
    '&:active': {
        transform: 'scale(0.95)'
    }
}));

const IconButton = forwardRef(({
    children,
    icon,
    tooltip,
    badgeContent,
    badgeColor = 'error',
    loading = false,
    disabled = false,
    size = 'medium',
    color = 'default',
    onClick,
    ariaLabel,
    edge = false,
    ...props
}, ref) => {

    const iconButton = (
        <StyledIconButton
            ref={ref}
            size={size}
            color={color}
            disabled={disabled || loading}
            onClick={onClick}
            aria-label={ariaLabel || tooltip || 'icon button'}
            edge={edge}
            {...props}
        >
            {loading ? (
                <CircularProgress size={size === 'small' ? 16 : 20} />
            ) : (
                icon || children
            )}
        </StyledIconButton>
    );

    const withBadge = badgeContent !== undefined ? (
        <Badge badgeContent={badgeContent} color={badgeColor}>
            {iconButton}
        </Badge>
    ) : iconButton;

    if (tooltip) {
        return (
            <Tooltip title={tooltip}>
                <span>{withBadge}</span>
            </Tooltip>
        );
    }

    return withBadge;
});

IconButton.displayName = 'IconButton';

export default IconButton;