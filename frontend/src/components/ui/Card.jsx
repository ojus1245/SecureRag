import React, { useState } from 'react';
import {
    Card as MuiCard,
    CardHeader,
    CardContent,
    CardActions,
    CardMedia,
    Typography,
    Box,
    IconButton,
    Collapse,
    Tooltip,
    Avatar,
    Chip
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
    ExpandMore as ExpandMoreIcon,
    MoreVert as MoreVertIcon,
    Favorite as FavoriteIcon,
    Share as ShareIcon
} from '@mui/icons-material';
import IconButton from './IconButton';

const StyledCard = styled(MuiCard)(({ theme, hoverable }) => ({
    transition: 'all 0.3s ease-in-out',
    cursor: hoverable ? 'pointer' : 'default',
    '&:hover': hoverable ? {
        transform: 'translateY(-4px)',
        boxShadow: theme.shadows[8]
    } : {}
}));

const ExpandMore = styled(IconButton)(({ theme, expanded }) => ({
    transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
    transition: theme.transitions.create('transform', {
        duration: theme.transitions.duration.shortest
    })
}));

const Card = ({
    title,
    subtitle,
    avatar,
    avatarText,
    image,
    imageHeight = 200,
    children,
    actions,
    expandable = false,
    expandedContent,
    hoverable = false,
    onClick,
    menu,
    onFavorite,
    onShare,
    isFavorite = false,
    tags = [],
    ...props
}) => {
    const [expanded, setExpanded] = useState(false);

    const handleExpandClick = () => {
        setExpanded(!expanded);
    };

    return (
        <StyledCard hoverable={hoverable} onClick={onClick} {...props}>
            {image && (
                <CardMedia
                    component="img"
                    height={imageHeight}
                    image={image}
                    alt={title}
                />
            )}

            {(title || avatar || avatarText || menu) && (
                <CardHeader
                    avatar={
                        avatar || (avatarText && (
                            <Avatar sx={{ bgcolor: 'primary.main' }}>
                                {avatarText}
                            </Avatar>
                        ))
                    }
                    action={
                        menu && (
                            <IconButton icon={<MoreVertIcon />} />
                        )
                    }
                    title={title}
                    subheader={subtitle}
                />
            )}

            {tags.length > 0 && (
                <Box sx={{ px: 2, pb: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {tags.map((tag, index) => (
                        <Chip
                            key={index}
                            label={tag}
                            size="small"
                            variant="outlined"
                        />
                    ))}
                </Box>
            )}

            {children && (
                <CardContent>
                    {children}
                </CardContent>
            )}

            {(actions || expandable || onFavorite || onShare) && (
                <CardActions disableSpacing>
                    {onFavorite && (
                        <IconButton
                            icon={<FavoriteIcon />}
                            color={isFavorite ? 'error' : 'default'}
                            onClick={onFavorite}
                            tooltip={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                        />
                    )}
                    {onShare && (
                        <IconButton
                            icon={<ShareIcon />}
                            onClick={onShare}
                            tooltip="Share"
                        />
                    )}
                    {actions}
                    {expandable && (
                        <ExpandMore
                            expanded={expanded}
                            onClick={handleExpandClick}
                            aria-expanded={expanded}
                            aria-label="show more"
                            tooltip={expanded ? 'Show less' : 'Show more'}
                            icon={<ExpandMoreIcon />}
                        />
                    )}
                </CardActions>
            )}

            {expandable && (
                <Collapse in={expanded} timeout="auto" unmountOnExit>
                    <CardContent>
                        {expandedContent}
                    </CardContent>
                </Collapse>
            )}
        </StyledCard>
    );
};

export default Card;