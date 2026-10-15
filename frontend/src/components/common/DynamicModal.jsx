import CloseIcon from '@mui/icons-material/Close';
import {
  alpha,
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography
} from '@mui/material';

const actionButtonSx = (theme) => ({
  borderRadius: 2,
  px: 2.2,
  py: 1,
  textTransform: 'none',
  fontWeight: 700,
  letterSpacing: '-0.01em',
  boxShadow: 'none',
  '&:hover': {
    boxShadow: 'none'
  },
  ...(theme.palette.mode === 'dark' && {
    backgroundColor: alpha(theme.palette.primary.main, 0.12),
    color: theme.palette.primary.light
  })
});

const DynamicModal = ({
  open,
  onClose,
  title,
  subtitle,
  icon,
  children,
  actions,
  maxWidth = 'sm',
  fullWidth = true,
  paperSx = {}
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      scroll="body"
      PaperProps={{
        sx: {
          borderRadius: '28px',
          overflow: 'hidden',
          border: (theme) => `1px solid ${alpha(theme.palette.divider, 0.8)}`,
          background: (theme) =>
            theme.palette.mode === 'dark'
              ? 'rgba(17, 23, 38, 0.96)'
              : 'rgba(255, 255, 255, 0.94)',
          boxShadow: (theme) =>
            theme.palette.mode === 'dark'
              ? '0 28px 80px rgba(0, 0, 0, 0.42)'
              : '0 28px 80px rgba(31, 41, 55, 0.16)',
          backdropFilter: 'blur(22px)',
          backgroundImage: 'none',
          ...paperSx
        }
      }}
    >
      <Box
        sx={{
          height: 6,
          background: (theme) =>
            `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 45%, ${theme.palette.secondary.main} 100%)`
        }}
      />

      <DialogTitle sx={{ px: 3, py: 2.5, pb: 1.5 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.5}>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
            {icon && (
              <Box
                sx={{
                  display: 'grid',
                  placeItems: 'center',
                  width: 42,
                  height: 42,
                  borderRadius: 3,
                  background: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.15 : 0.1),
                  color: 'primary.main',
                  flexShrink: 0
                }}
              >
                {icon}
              </Box>
            )}

            <Box sx={{ minWidth: 0 }}>
              {subtitle && (
                <Typography
                  variant="overline"
                  sx={{
                    display: 'block',
                    color: 'primary.main',
                    letterSpacing: '0.14em',
                    fontWeight: 700,
                    lineHeight: 1.2,
                    mb: 0.5
                  }}
                >
                  {subtitle}
                </Typography>
              )}

              <Typography
                variant="h5"
                sx={{
                  m: 0,
                  fontWeight: 760,
                  letterSpacing: '-0.045em',
                  color: 'text.primary'
                }}
              >
                {title}
              </Typography>
            </Box>
          </Stack>

          <IconButton
            onClick={onClose}
            aria-label="close dialog"
            sx={{
              color: 'text.secondary',
              border: (theme) => `1px solid ${alpha(theme.palette.divider, 0.8)}`,
              background: (theme) =>
                theme.palette.mode === 'dark'
                  ? 'rgba(255,255,255,0.02)'
                  : 'rgba(17, 23, 38, 0.02)',
              '&:hover': {
                background: (theme) =>
                  theme.palette.mode === 'dark'
                    ? 'rgba(255,255,255,0.06)'
                    : 'rgba(17, 23, 38, 0.06)'
              }
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ px: 3, py: 1.5, color: 'text.primary' }}>{children}</DialogContent>

      {actions && (
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, gap: 1.2 }}>
          {actions}
        </DialogActions>
      )}
    </Dialog>
  );
};

export default DynamicModal;
