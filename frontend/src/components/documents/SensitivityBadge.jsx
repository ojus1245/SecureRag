import React, { memo } from 'react';
import {
    Box,
    Chip,
    Tooltip,
    Typography
} from '@mui/material';
import {
    Public as PublicIcon,
    LockOpen as LockOpenIcon,
    Lock as LockIcon,
    LockOutlined as LockOutlinedIcon,
    Security as SecurityIcon,
    Info as InfoIcon
} from '@mui/icons-material';

const SensitivityBadge = memo(({
    level = 'internal',
    size = 'small',
    showLabel = true,
    variant = 'filled'
}) => {

    const config = {
        public: {
            label: 'Public',
            color: 'success',
            icon: PublicIcon,
            description: 'Available to everyone',
            bgColor: '#e8f5e9',
            textColor: '#2e7d32',
            borderColor: '#4caf50'
        },
        internal: {
            label: 'Internal',
            color: 'info',
            icon: LockOpenIcon,
            description: 'Available within organization',
            bgColor: '#e3f2fd',
            textColor: '#1565c0',
            borderColor: '#2196f3'
        },
        confidential: {
            label: 'Confidential',
            color: 'warning',
            icon: LockIcon,
            description: 'Restricted access',
            bgColor: '#fff3e0',
            textColor: '#e65100',
            borderColor: '#ff9800'
        },
        restricted: {
            label: 'Restricted',
            color: 'error',
            icon: LockOutlinedIcon,
            description: 'Highest security level',
            bgColor: '#ffebee',
            textColor: '#c62828',
            borderColor: '#f44336'
        }
    };

    const badgeConfig = config[level] || config.internal;
    const BadgeIcon = badgeConfig.icon;

    if (variant === 'outlined') {
        return (
            <Tooltip title={badgeConfig.description}>
                <Chip
                    icon={<BadgeIcon sx={{ fontSize: size === 'small' ? 16 : 20 }} />}
                    label={showLabel ? badgeConfig.label : undefined}
                    size={size}
                    variant="outlined"
                    sx={{
                        borderColor: badgeConfig.borderColor,
                        color: badgeConfig.textColor,
                        fontWeight: 600,
                        '& .MuiChip-icon': {
                            color: badgeConfig.textColor
                        }
                    }}
                />
            </Tooltip>
        );
    }

    if (variant === 'dot') {
        return (
            <Tooltip title={`${badgeConfig.label}: ${badgeConfig.description}`}>
                <Box
                    sx={{
                        width: size === 'small' ? 12 : 16,
                        height: size === 'small' ? 12 : 16,
                        borderRadius: '50%',
                        bgcolor: badgeConfig.borderColor,
                        border: '2px solid white',
                        boxShadow: '0 0 0 1px ' + badgeConfig.borderColor,
                        cursor: 'help'
                    }}
                />
            </Tooltip>
        );
    }

    // Default filled variant
    return (
        <Tooltip title={badgeConfig.description}>
            <Box
                sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.5,
                    px: size === 'small' ? 1 : 1.5,
                    py: size === 'small' ? 0.25 : 0.5,
                    borderRadius: 1,
                    bgcolor: badgeConfig.bgColor,
                    border: '1px solid',
                    borderColor: badgeConfig.borderColor,
                    cursor: 'help'
                }}
            >
                <BadgeIcon
                    sx={{
                        fontSize: size === 'small' ? 14 : 18,
                        color: badgeConfig.textColor
                    }}
                />
                {showLabel && (
                    <Typography
                        variant={size === 'small' ? 'caption' : 'body2'}
                        sx={{
                            color: badgeConfig.textColor,
                            fontWeight: 600,
                            fontSize: size === 'small' ? '0.7rem' : '0.875rem'
                        }}
                    >
                        {badgeConfig.label}
                    </Typography>
                )}
            </Box>
        </Tooltip>
    );
});

SensitivityBadge.displayName = 'SensitivityBadge';

export default SensitivityBadge;