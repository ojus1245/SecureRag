import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    AppBar,
    Toolbar,
    Typography,
    IconButton,
    Box,
    Avatar,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Tooltip,
    Badge,
    Chip,
    Divider,
    InputBase,
    Button,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    Popover,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Switch,
    FormControlLabel,
    alpha,
    styled
} from '@mui/material';
import {
    Menu as MenuIcon,
    Search as SearchIcon,
    Notifications as NotificationsIcon,
    Settings as SettingsIcon,
    Person as PersonIcon,
    Logout as LogoutIcon,
    Security as SecurityIcon,
    DarkMode as DarkModeIcon,
    LightMode as LightModeIcon,
    KeyboardArrowDown as ArrowDownIcon,
    Dashboard as DashboardIcon,
    Description as DocumentIcon,
    Chat as ChatIcon,
    History as HistoryIcon,
    Assessment as AssessmentIcon,
    AdminPanelSettings as AdminIcon,
    Close as CloseIcon,
    CheckCircle as CheckCircleIcon,
    Warning as WarningIcon,
    Info as InfoIcon,
    Error as ErrorIcon
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useNotifications } from '../../hooks/useNotifications';
import { authService } from "../../services/authService";
import { auditService } from "../../services/auditService";
import { formatTime, formatDate } from '../../utils/helpers';

const StyledAppBar = styled(AppBar)(({ theme }) => ({
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.text.primary,
    boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
    borderBottom: `1px solid ${theme.palette.divider}`
}));

const SearchBar = styled('div')(({ theme }) => ({
    position: 'relative',
    borderRadius: theme.shape.borderRadius,
    backgroundColor: alpha(theme.palette.action.hover, 0.5),
    '&:hover': {
        backgroundColor: alpha(theme.palette.action.hover, 0.8)
    },
    marginRight: theme.spacing(2),
    marginLeft: 0,
    width: '100%',
    [theme.breakpoints.up('sm')]: {
        marginLeft: theme.spacing(3),
        width: 'auto'
    }
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
    padding: theme.spacing(0, 2),
    height: '100%',
    position: 'absolute',
    pointerEvents: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
    color: 'inherit',
    '& .MuiInputBase-input': {
        padding: theme.spacing(1, 1, 1, 0),
        paddingLeft: `calc(1em + ${theme.spacing(4)})`,
        transition: theme.transitions.create('width'),
        width: '100%',
        [theme.breakpoints.up('md')]: {
            width: '30ch'
        }
    }
}));

const Navbar = ({ onSidebarToggle, sidebarOpen }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuth();
    const { isDarkMode, toggleTheme } = useTheme();
    const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } = useNotifications();

    const [anchorEl, setAnchorEl] = useState(null);
    const [notificationAnchor, setNotificationAnchor] = useState(null);
    const [searchAnchor, setSearchAnchor] = useState(null);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const isMenuOpen = Boolean(anchorEl);
    const isNotificationOpen = Boolean(notificationAnchor);
    const isSearchOpen = Boolean(searchAnchor);

    useEffect(() => {
        if (searchQuery.length >= 2) {
            const debounce = setTimeout(() => {
                handleSearch(searchQuery);
            }, 300);

            return () => clearTimeout(debounce);
        } else {
            setSearchResults([]);
        }
    }, [searchQuery]);

    const handleProfileMenuOpen = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleProfileMenuClose = () => {
        setAnchorEl(null);
    };

    const handleNotificationOpen = (event) => {
        setNotificationAnchor(event.currentTarget);
    };

    const handleNotificationClose = () => {
        setNotificationAnchor(null);
    };

    const handleSearchOpen = (event) => {
        setSearchAnchor(event.currentTarget);
    };

    const handleSearchClose = () => {
        setSearchAnchor(null);
    };

    const handleLogout = async () => {
        handleProfileMenuClose();

        try {
            // Log audit event
            await auditService.logEvent({
                action: 'LOGOUT',
                resourceType: 'auth',
                details: {
                    username: user.username
                },
                status: 'success'
            });

            await logout();
            navigate('/login');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    const handleSearch = async (query) => {
        try {
            const results = await searchService.globalSearch(query);
            setSearchResults(results);
        } catch (error) {
            console.error('Search failed:', error);
        }
    };

    const handleSearchResultClick = (result) => {
        handleSearchClose();
        setSearchQuery('');
        setSearchResults([]);

        switch (result.type) {
            case 'document':
                navigate(`/documents/${result.id}`);
                break;
            case 'chat':
                navigate(`/chat/${result.id}`);
                break;
            case 'user':
                navigate(`/admin/users?search=${result.username}`);
                break;
            default:
                break;
        }
    };

    const handleNotificationClick = async (notification) => {
        await markAsRead(notification.id);
        handleNotificationClose();

        if (notification.link) {
            navigate(notification.link);
        }
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'success':
                return <CheckCircleIcon sx={{ color: 'success.main' }} />;
            case 'warning':
                return <WarningIcon sx={{ color: 'warning.main' }} />;
            case 'error':
                return <ErrorIcon sx={{ color: 'error.main' }} />;
            default:
                return <InfoIcon sx={{ color: 'info.main' }} />;
        }
    };

    const navItems = [
        { label: 'Dashboard', path: '/dashboard', icon: <DashboardIcon /> },
        { label: 'Documents', path: '/documents', icon: <DocumentIcon /> },
        { label: 'Chat', path: '/chat', icon: <ChatIcon /> },
        { label: 'History', path: '/history', icon: <HistoryIcon /> },
        { label: 'Analytics', path: '/analytics', icon: <AssessmentIcon /> }
    ];

    const isActive = (path) => location.pathname.startsWith(path);

    return (
        <StyledAppBar position="sticky">
            <Toolbar>
                {/* Sidebar toggle */}
                <IconButton
                    edge="start"
                    onClick={onSidebarToggle}
                    sx={{ mr: 2, display: { sm: 'none' } }}
                >
                    <MenuIcon />
                </IconButton>

                {/* Logo */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'pointer',
                        mr: 3
                    }}
                    onClick={() => navigate('/dashboard')}
                >
                    <SecurityIcon color="primary" sx={{ mr: 1 }} />
                    <Typography
                        variant="h6"
                        sx={{
                            fontWeight: 700,
                            display: { xs: 'none', sm: 'block' }
                        }}
                    >
                        Privacy-Aware RAG
                    </Typography>
                </Box>

                {/* Desktop navigation */}
                <Box sx={{
                    display: { xs: 'none', md: 'flex' },
                    gap: 1
                }}>
                    {navItems.map((item) => (
                        <Button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            startIcon={item.icon}
                            sx={{
                                color: isActive(item.path) ? 'primary.main' : 'text.secondary',
                                bgcolor: isActive(item.path) ? 'action.hover' : 'transparent',
                                '&:hover': {
                                    bgcolor: 'action.hover'
                                }
                            }}
                        >
                            {item.label}
                        </Button>
                    ))}
                </Box>

                <Box sx={{ flexGrow: 1 }} />

                {/* Search */}
                <SearchBar>
                    <SearchIconWrapper>
                        <SearchIcon />
                    </SearchIconWrapper>
                    <StyledInputBase
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={handleSearchOpen}
                    />
                </SearchBar>

                {/* Theme toggle */}
                <Tooltip title={isDarkMode ? 'Light mode' : 'Dark mode'}>
                    <IconButton onClick={toggleTheme}>
                        {isDarkMode ? <LightModeIcon /> : <DarkModeIcon />}
                    </IconButton>
                </Tooltip>

                {/* Notifications */}
                <Tooltip title="Notifications">
                    <IconButton onClick={handleNotificationOpen}>
                        <Badge badgeContent={unreadCount} color="error">
                            <NotificationsIcon />
                        </Badge>
                    </IconButton>
                </Tooltip>

                {/* User profile */}
                <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
                    <IconButton
                        onClick={handleProfileMenuOpen}
                        sx={{ p: 0 }}
                    >
                        <Avatar
                            sx={{
                                width: 32,
                                height: 32,
                                bgcolor: 'primary.main'
                            }}
                        >
                            {user?.fullName?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase()}
                        </Avatar>
                        <ArrowDownIcon sx={{ ml: 0.5, fontSize: 16 }} />
                    </IconButton>
                </Box>
            </Toolbar>

            {/* Profile menu */}
            <Menu
                anchorEl={anchorEl}
                open={isMenuOpen}
                onClose={handleProfileMenuClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right'
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right'
                }}
            >
                <Box sx={{ px: 2, py: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {user?.fullName || user?.username}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {user?.email}
                    </Typography>
                    {user?.securityClearance && (
                        <Chip
                            label={user.securityClearance.toUpperCase()}
                            size="small"
                            color={user.securityClearance === 'restricted' ? 'error' : 'primary'}
                            variant="outlined"
                            sx={{ mt: 0.5 }}
                        />
                    )}
                </Box>

                <Divider />

                <MenuItem onClick={() => { handleProfileMenuClose(); navigate('/profile'); }}>
                    <ListItemIcon>
                        <PersonIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Profile</ListItemText>
                </MenuItem>

                <MenuItem onClick={() => { handleProfileMenuClose(); setSettingsOpen(true); }}>
                    <ListItemIcon>
                        <SettingsIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Settings</ListItemText>
                </MenuItem>

                {user?.role?.name === 'admin' && (
                    <MenuItem onClick={() => { handleProfileMenuClose(); navigate('/admin'); }}>
                        <ListItemIcon>
                            <AdminIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Admin Panel</ListItemText>
                    </MenuItem>
                )}

                <Divider />

                <MenuItem onClick={handleLogout}>
                    <ListItemIcon>
                        <LogoutIcon fontSize="small" color="error" />
                    </ListItemIcon>
                    <ListItemText sx={{ color: 'error.main' }}>Logout</ListItemText>
                </MenuItem>
            </Menu>

            {/* Notifications menu */}
            <Menu
                anchorEl={notificationAnchor}
                open={isNotificationOpen}
                onClose={handleNotificationClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right'
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right'
                }}
                sx={{ '& .MuiPaper-root': { width: 360 } }}
            >
                <Box sx={{
                    px: 2,
                    py: 1,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        Notifications
                    </Typography>
                    <Box>
                        <Tooltip title="Mark all as read">
                            <IconButton size="small" onClick={markAllAsRead}>
                                <CheckCircleIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Clear all">
                            <IconButton size="small" onClick={clearNotifications}>
                                <CloseIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Box>

                <Divider />

                {notifications.length === 0 ? (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                        <NotificationsIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                        <Typography variant="body2" color="text.secondary">
                            No notifications
                        </Typography>
                    </Box>
                ) : (
                    <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                        {notifications.map((notification) => (
                            <MenuItem
                                key={notification.id}
                                onClick={() => handleNotificationClick(notification)}
                                sx={{
                                    alignItems: 'flex-start',
                                    bgcolor: notification.read ? 'transparent' : 'action.hover'
                                }}
                            >
                                <ListItemIcon>
                                    {getNotificationIcon(notification.type)}
                                </ListItemIcon>
                                <Box>
                                    <Typography variant="body2" sx={{ fontWeight: notification.read ? 400 : 600 }}>
                                        {notification.title}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {notification.message}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" display="block">
                                        {formatTime(notification.timestamp)}
                                    </Typography>
                                </Box>
                            </MenuItem>
                        ))}
                    </Box>
                )}
            </Menu>

            {/* Search results */}
            <Popover
                anchorEl={searchAnchor}
                open={isSearchOpen && searchResults.length > 0}
                onClose={handleSearchClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left'
                }}
            >
                <Box sx={{ width: 400, p: 1 }}>
                    {searchResults.map((result, index) => (
                        <ListItemButton
                            key={index}
                            onClick={() => handleSearchResultClick(result)}
                        >
                            <ListItemIcon>
                                {result.type === 'document' ? <DocumentIcon /> :
                                    result.type === 'chat' ? <ChatIcon /> :
                                        result.type === 'user' ? <PersonIcon /> :
                                            <SearchIcon />}
                            </ListItemIcon>
                            <Box>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {result.title}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {result.subtitle}
                                </Typography>
                            </Box>
                        </ListItemButton>
                    ))}
                </Box>
            </Popover>

            {/* Settings dialog */}
            <Dialog
                open={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Settings</DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 1 }}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={isDarkMode}
                                    onChange={toggleTheme}
                                />
                            }
                            label="Dark Mode"
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSettingsOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </StyledAppBar>
    );
};

export default Navbar;