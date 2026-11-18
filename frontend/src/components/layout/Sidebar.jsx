import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Box,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Divider,
    Typography,
    Collapse,
    Chip,
    Tooltip,
    Badge,
    Avatar,
    IconButton,
    styled,
    useTheme
} from '@mui/material';
import {
    Dashboard as DashboardIcon,
    Description as DocumentIcon,
    Chat as ChatIcon,
    History as HistoryIcon,
    Assessment as AssessmentIcon,
    AdminPanelSettings as AdminIcon,
    Security as SecurityIcon,
    People as PeopleIcon,
    Storage as StorageIcon,
    Settings as SettingsIcon,
    ExpandLess as ExpandLessIcon,
    ExpandMore as ExpandMoreIcon,
    ChevronLeft as ChevronLeftIcon,
    ChevronRight as ChevronRightIcon,
    Upload as UploadIcon,
    Search as SearchIcon,
    Folder as FolderIcon,
    FolderOpen as FolderOpenIcon,
    Star as StarIcon,
    StarBorder as StarBorderIcon,
    Share as ShareIcon,
    Archive as ArchiveIcon,
    Delete as DeleteIcon,
    Lock as LockIcon,
    LockOpen as LockOpenIcon,
    VerifiedUser as VerifiedUserIcon,
    PrivacyTip as PrivacyIcon,
    Shield as ShieldIcon
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';

const DRAWER_WIDTH = 280;
const COLLAPSED_WIDTH = 64;

const StyledDrawer = styled(Drawer, {
    shouldForwardProp: (prop) => prop !== 'collapsed'
})(({ theme, collapsed }) => ({
    width: collapsed ? COLLAPSED_WIDTH : DRAWER_WIDTH,
    flexShrink: 0,
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
    transition: theme.transitions.create('width', {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.enteringScreen
    }),
    '& .MuiDrawer-paper': {
        width: collapsed ? COLLAPSED_WIDTH : DRAWER_WIDTH,
        overflowX: 'hidden',
        transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen
        }),
        backgroundColor: theme.palette.background.paper,
        borderRight: `1px solid ${theme.palette.divider}`
    }
}));

const Sidebar = ({ open, onClose, collapsed, onCollapse }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const theme = useTheme();
    const { user, hasPermission } = useAuth();

    const [expandedSections, setExpandedSections] = useState({
        documents: true,
        admin: false,
        system: false
    });

    const isActive = (path) => location.pathname.startsWith(path);

    const menuItems = useMemo(() => [
        {
            label: 'Dashboard',
            path: '/dashboard',
            icon: <DashboardIcon />,
            requiredPermission: null
        },
        {
            label: 'Documents',
            path: '/documents',
            icon: <DocumentIcon />,
            requiredPermission: 'document:read',
            children: [
                {
                    label: 'All Documents',
                    path: '/documents',
                    icon: <FolderIcon />
                },
                {
                    label: 'Upload Document',
                    path: '/documents/upload',
                    icon: <UploadIcon />,
                    requiredPermission: 'document:create'
                },
                {
                    label: 'Search',
                    path: '/documents/search',
                    icon: <SearchIcon />
                },
                {
                    label: 'Favorites',
                    path: '/documents/favorites',
                    icon: <StarIcon />
                },
                {
                    label: 'Shared with Me',
                    path: '/documents/shared',
                    icon: <ShareIcon />
                },
                {
                    label: 'Archived',
                    path: '/documents/archived',
                    icon: <ArchiveIcon />
                }
            ]
        },
        {
            label: 'Chat',
            path: '/chat',
            icon: <ChatIcon />,
            requiredPermission: 'chat:query'
        },
        {
            label: 'History',
            path: '/history',
            icon: <HistoryIcon />,
            requiredPermission: 'chat:history'
        },
        {
            label: 'Analytics',
            path: '/analytics',
            icon: <AssessmentIcon />,
            requiredPermission: 'audit:view'
        },
        {
            label: 'Admin',
            path: '/admin',
            icon: <AdminIcon />,
            requiredPermission: 'user:manage',
            children: [
                {
                    label: 'User Management',
                    path: '/admin/users',
                    icon: <PeopleIcon />,
                    requiredPermission: 'user:manage'
                },
                {
                    label: 'Role Management',
                    path: '/admin/roles',
                    icon: <SecurityIcon />,
                    requiredPermission: 'role:manage'
                },
                {
                    label: 'Audit Dashboard',
                    path: '/admin/audit',
                    icon: <AssessmentIcon />,
                    requiredPermission: 'audit:view'
                },
                {
                    label: 'System Settings',
                    path: '/admin/settings',
                    icon: <SettingsIcon />,
                    requiredPermission: 'system:configure'
                }
            ]
        }
    ], []);

    const filterItemsByPermission = (items) => {
        return items.filter(item => {
            if (item.requiredPermission && !hasPermission(item.requiredPermission)) {
                return false;
            }
            if (item.children) {
                item.children = filterItemsByPermission(item.children);
            }
            return true;
        });
    };

    const visibleItems = filterItemsByPermission(menuItems);

    const handleSectionToggle = (label) => {
        setExpandedSections(prev => ({
            ...prev,
            [label.toLowerCase()]: !prev[label.toLowerCase()]
        }));
    };

    const handleNavigation = (path) => {
        navigate(path);
        if (onClose) {
            onClose();
        }
    };

    const renderMenuItem = (item, depth = 0) => {
        const hasChildren = item.children && item.children.length > 0;
        const isExpanded = expandedSections[item.label.toLowerCase()];
        const active = isActive(item.path);

        return (
            <React.Fragment key={item.path}>
                <ListItemButton
                    onClick={() => {
                        if (hasChildren) {
                            handleSectionToggle(item.label);
                        } else {
                            handleNavigation(item.path);
                        }
                    }}
                    sx={{
                        minHeight: 48,
                        px: collapsed ? 1.5 : depth === 0 ? 2 : 3,
                        justifyContent: collapsed ? 'center' : 'initial',
                        bgcolor: active ? 'action.selected' : 'transparent',
                        '&:hover': {
                            bgcolor: 'action.hover'
                        },
                        borderLeft: active ? 3 : 0,
                        borderColor: 'primary.main'
                    }}
                >
                    <Tooltip title={collapsed ? item.label : ''} placement="right">
                        <ListItemIcon
                            sx={{
                                minWidth: 0,
                                mr: collapsed ? 'auto' : 2,
                                justifyContent: 'center',
                                color: active ? 'primary.main' : 'text.secondary'
                            }}
                        >
                            {item.icon}
                        </ListItemIcon>
                    </Tooltip>

                    {!collapsed && (
                        <>
                            <ListItemText
                                primary={item.label}
                                sx={{
                                    '& .MuiListItemText-primary': {
                                        fontWeight: active ? 600 : 400,
                                        color: active ? 'primary.main' : 'text.primary'
                                    }
                                }}
                            />

                            {hasChildren && (
                                isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />
                            )}
                        </>
                    )}
                </ListItemButton>

                {hasChildren && !collapsed && (
                    <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                        <List component="div" disablePadding>
                            {item.children.map((child) => (
                                <ListItemButton
                                    key={child.path}
                                    onClick={() => handleNavigation(child.path)}
                                    sx={{
                                        pl: 4,
                                        minHeight: 40,
                                        bgcolor: isActive(child.path) ? 'action.selected' : 'transparent',
                                        '&:hover': {
                                            bgcolor: 'action.hover'
                                        }
                                    }}
                                >
                                    <ListItemIcon sx={{ minWidth: 0, mr: 2 }}>
                                        {child.icon}
                                    </ListItemIcon>
                                    <ListItemText primary={child.label} />
                                </ListItemButton>
                            ))}
                        </List>
                    </Collapse>
                )}
            </React.Fragment>
        );
    };

    return (
        <StyledDrawer
            variant="permanent"
            open={open}
            collapsed={collapsed}
            sx={{
                display: { xs: 'none', sm: 'block' }
            }}
        >
            {/* Header */}
            <Box sx={{
                height: 64,
                display: 'flex',
                alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'space-between',
                px: collapsed ? 1 : 2,
                borderBottom: 1,
                borderColor: 'divider'
            }}>
                {!collapsed && (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <ShieldIcon color="primary" sx={{ mr: 1 }} />
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                            Menu
                        </Typography>
                    </Box>
                )}

                <IconButton onClick={onCollapse} size="small">
                    {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
                </IconButton>
            </Box>

            {/* User info */}
            {!collapsed && (
                <Box sx={{
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    borderBottom: 1,
                    borderColor: 'divider'
                }}>
                    <Avatar
                        sx={{
                            width: 40,
                            height: 40,
                            bgcolor: 'primary.main'
                        }}
                    >
                        {user?.fullName?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase()}
                    </Avatar>

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, noWrap: true }}>
                            {user?.fullName || user?.username}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                            {user?.role?.name || 'user'}
                        </Typography>
                    </Box>

                    {user?.securityClearance && (
                        <Tooltip title={
                            user.securityClearance === 'restricted'
                                ? 'Security Clearance: Top Tier (Restricted - Full Access to all data)'
                                : `Clearance: ${user.securityClearance}`
                        }>
                            <Chip
                                icon={<ShieldIcon />}
                                size="small"
                                color="success"
                                variant="outlined"
                            />
                        </Tooltip>
                    )}
                </Box>
            )}

            {/* Navigation */}
            <List sx={{ flexGrow: 1, py: 1 }}>
                {visibleItems.map((item) => renderMenuItem(item))}
            </List>

            {/* Footer */}
            <Box sx={{
                p: 2,
                borderTop: 1,
                borderColor: 'divider',
                display: collapsed ? 'none' : 'block'
            }}>
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    mb: 1
                }}>
                    <PrivacyIcon sx={{ fontSize: 16, color: 'success.main' }} />
                    <Typography variant="caption" color="text.secondary">
                        Privacy-Aware Mode
                    </Typography>
                </Box>

                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                }}>
                    <VerifiedUserIcon sx={{ fontSize: 16, color: 'info.main' }} />
                    <Typography variant="caption" color="text.secondary">
                        Encrypted & Secure
                    </Typography>
                </Box>
            </Box>
        </StyledDrawer>
    );
};

export default Sidebar;