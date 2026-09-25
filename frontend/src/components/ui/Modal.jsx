import React, { useEffect, useCallback } from 'react';
import {
    Modal as MuiModal,
    Box,
    Paper,
    IconButton,
    Typography,
    Fade,
    Backdrop,
    Divider
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { Close as CloseIcon } from '@mui/icons-material';

const StyledModal = styled(MuiModal)(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
}));

const ModalContent = styled(Paper)(({ theme, maxWidth, fullScreen }) => ({
    position: 'relative',
    width: fullScreen ? '100%' : 'auto',
    maxWidth: fullScreen ? '100%' : maxWidth || 600,
    maxHeight: fullScreen ? '100%' : '90vh',
    overflow: 'auto',
    borderRadius: fullScreen ? 0 : theme.shape.borderRadius * 2,
    outline: 'none',
    boxShadow: theme.shadows[24]
}));

const ModalHeader = styled(Box)(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing(2),
    borderBottom: `1px solid ${theme.palette.divider}`
}));

const ModalBody = styled(Box)(({ theme }) => ({
    padding: theme.spacing(2)
}));

const ModalFooter = styled(Box)(({ theme }) => ({
    padding: theme.spacing(2),
    borderTop: `1px solid ${theme.palette.divider}`,
    display: 'flex',
    justifyContent: 'flex-end',
    gap: theme.spacing(1)
}));

const Modal = ({
    open,
    onClose,
    title,
    subtitle,
    children,
    footer,
    maxWidth = 600,
    fullScreen = false,
    closeOnBackdropClick = true,
    closeOnEscape = true,
    showCloseButton = true,
    disableBackdropClick = false,
    ...props
}) => {

    const handleKeyDown = useCallback((event) => {
        if (event.key === 'Escape' && closeOnEscape && onClose) {
            onClose();
        }
    }, [closeOnEscape, onClose]);

    useEffect(() => {
        if (open) {
            document.addEventListener('keydown', handleKeyDown);
            return () => {
                document.removeEventListener('keydown', handleKeyDown);
            };
        }
    }, [open, handleKeyDown]);

    const handleBackdropClick = (event) => {
        if (closeOnBackdropClick && !disableBackdropClick) {
            if (event.target === event.currentTarget && onClose) {
                onClose();
            }
        }
    };

    return (
        <StyledModal
            open={open}
            onClose={onClose}
            closeAfterTransition
            BackdropComponent={Backdrop}
            BackdropProps={{
                timeout: 500,
                onClick: handleBackdropClick
            }}
            {...props}
        >
            <Fade in={open}>
                <ModalContent maxWidth={maxWidth} fullScreen={fullScreen}>
                    {(title || showCloseButton) && (
                        <ModalHeader>
                            <Box>
                                {title && (
                                    <Typography variant="h6" component="h2">
                                        {title}
                                    </Typography>
                                )}
                                {subtitle && (
                                    <Typography variant="body2" color="text.secondary">
                                        {subtitle}
                                    </Typography>
                                )}
                            </Box>
                            {showCloseButton && (
                                <IconButton onClick={onClose} size="small">
                                    <CloseIcon />
                                </IconButton>
                            )}
                        </ModalHeader>
                    )}

                    <ModalBody>
                        {children}
                    </ModalBody>

                    {footer && (
                        <>
                            <Divider />
                            <ModalFooter>
                                {footer}
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Fade>
        </StyledModal>
    );
};

export default Modal;