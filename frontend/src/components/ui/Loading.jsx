import React from 'react';
import {
    Box,
    CircularProgress,
    LinearProgress,
    Typography,
    Skeleton,
    Stack
} from '@mui/material';
import { styled } from '@mui/material/styles';

const LoadingContainer = styled(Box)(({ theme, fullScreen }) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing(2),
    padding: theme.spacing(4),
    minHeight: fullScreen ? '100vh' : 200
}));

const Loading = ({
    type = 'circular', // 'circular', 'linear', 'skeleton', 'text'
    message = 'Loading...',
    size = 40,
    fullScreen = false,
    skeletonCount = 3,
    skeletonHeight = 40,
    ...props
}) => {

    if (type === 'skeleton') {
        return (
            <Stack spacing={1} sx={{ width: '100%' }}>
                {Array.from({ length: skeletonCount }).map((_, index) => (
                    <Skeleton
                        key={index}
                        variant="rectangular"
                        height={skeletonHeight}
                        animation="wave"
                    />
                ))}
            </Stack>
        );
    }

    if (type === 'linear') {
        return (
            <Box sx={{ width: '100%' }}>
                <LinearProgress />
            </Box>
        );
    }

    if (type === 'text') {
        return (
            <LoadingContainer fullScreen={fullScreen} {...props}>
                <Typography variant="body1" color="text.secondary">
                    {message}
                </Typography>
            </LoadingContainer>
        );
    }

    return (
        <LoadingContainer fullScreen={fullScreen} {...props}>
            <CircularProgress size={size} />
            {message && (
                <Typography variant="body2" color="text.secondary">
                    {message}
                </Typography>
            )}
        </LoadingContainer>
    );
};

export default Loading;