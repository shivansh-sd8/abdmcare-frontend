import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  Avatar,
  IconButton,
  Chip,
  Tabs,
  Tab,
  Badge,
  Button,
  Stack,
  alpha,
  useTheme,
  Tooltip,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Delete,
  CheckCircle,
  Info,
  Warning,
  Error as ErrorIcon,
  DoneAll,
  Search,
} from '@mui/icons-material';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { PageHeader, EmptyState, StatCard } from '../../components/ui';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  category: 'all' | 'appointments' | 'patients' | 'system';
}

const Notifications: React.FC = () => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<'all' | 'appointments' | 'patients' | 'system'>('all');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchNotifications(); }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get<{ data: Notification[] }>('/api/v1/notifications');
      setNotifications(response.data || []);
    } catch (error) {
      console.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle sx={{ color: theme.palette.success.main }} />;
      case 'warning': return <Warning sx={{ color: theme.palette.warning.main }} />;
      case 'error':   return <ErrorIcon sx={{ color: theme.palette.error.main }} />;
      default:        return <Info sx={{ color: theme.palette.info.main }} />;
    }
  };

  const toneColor = (type: string): string => {
    switch (type) {
      case 'success': return theme.palette.success.main;
      case 'warning': return theme.palette.warning.main;
      case 'error':   return theme.palette.error.main;
      default:        return theme.palette.info.main;
    }
  };

  const filteredNotifications = useMemo(() => {
    let list = activeTab === 'all' ? notifications : notifications.filter((n) => n.category === activeTab);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((n) =>
        n.title.toLowerCase().includes(q) ||
        n.message.toLowerCase().includes(q)
      );
    }
    return list;
  }, [notifications, activeTab, search]);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const totalCount = notifications.length;

  const counts = useMemo(() => ({
    all: notifications.length,
    appointments: notifications.filter(n => n.category === 'appointments').length,
    patients: notifications.filter(n => n.category === 'patients').length,
    system: notifications.filter(n => n.category === 'system').length,
  }), [notifications]);

  const markAllAsRead = async () => {
    try {
      await api.put('/api/v1/notifications/mark-all-read');
      setNotifications(notifications.map((n) => ({ ...n, read: true })));
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark notifications as read');
    }
  };

  const markOneAsRead = async (id: string) => {
    try {
      await api.put(`/api/v1/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch {/* silent */}
  };

  const deleteNotification = async (id: string) => {
    try {
      await api.delete(`/api/v1/notifications/${id}`);
      setNotifications(notifications.filter((n) => n.id !== id));
      toast.success('Notification deleted');
    } catch (error) {
      toast.error('Failed to delete notification');
    }
  };

  return (
    <Box>
      <PageHeader
        title="Notifications"
        subtitle={`${unreadCount} unread of ${totalCount}`}
        icon={<NotificationsIcon />}
        actions={
          <Button
            variant="outlined"
            startIcon={<DoneAll />}
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
          >
            Mark all read
          </Button>
        }
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2.5 }}>
        <StatCard label="Unread" value={unreadCount.toLocaleString()} tone="warning" loading={loading}
          icon={<NotificationsIcon />} />
        <StatCard label="Total" value={totalCount.toLocaleString()} tone="info" loading={loading}
          icon={<DoneAll />} />
        <TextField
          placeholder="Search notifications…"
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flex: 1, alignSelf: { sm: 'center' } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            ),
          }}
        />
      </Stack>

      <Paper variant="outlined" sx={{ mb: 2, borderRadius: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_, value) => setActiveTab(value)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ px: 1 }}
        >
          {[
            { label: 'All', value: 'all', count: counts.all },
            { label: 'Appointments', value: 'appointments', count: counts.appointments },
            { label: 'Patients', value: 'patients', count: counts.patients },
            { label: 'System', value: 'system', count: counts.system },
          ].map(t => (
            <Tab
              key={t.value}
              value={t.value}
              label={
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <span>{t.label}</span>
                  {t.count > 0 && (
                    <Badge
                      badgeContent={t.count}
                      color="primary"
                      sx={{ '& .MuiBadge-badge': { position: 'static', transform: 'none', fontSize: '0.65rem' } }}
                    />
                  )}
                </Stack>
              }
            />
          ))}
        </Tabs>
      </Paper>

      <Paper variant="outlined" sx={{ borderRadius: 2 }}>
        {loading ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">Loading…</Typography>
          </Box>
        ) : filteredNotifications.length === 0 ? (
          <EmptyState
            icon={<NotificationsIcon />}
            title="You're all caught up"
            message={search ? 'No notifications match your search.' : "We'll let you know when something needs your attention."}
          />
        ) : (
          <List disablePadding>
            {filteredNotifications.map((n, index) => {
              const ts = new Date(n.timestamp);
              const tone = toneColor(n.type);
              return (
                <ListItem
                  key={n.id}
                  sx={{
                    py: 1.75, px: 2.25, gap: 1.5,
                    borderLeft: '3px solid',
                    borderLeftColor: n.read ? 'transparent' : tone,
                    bgcolor: n.read ? 'transparent' : alpha(tone, 0.04),
                    transition: 'background-color 150ms ease',
                    '&:hover': { bgcolor: alpha(tone, 0.06) },
                    cursor: n.read ? 'default' : 'pointer',
                    borderTop: index === 0 ? 'none' : `1px solid ${theme.palette.divider}`,
                  }}
                  onClick={() => !n.read && markOneAsRead(n.id)}
                >
                  <Avatar sx={{
                    width: 38, height: 38,
                    bgcolor: alpha(tone, 0.12),
                  }}>
                    {getIcon(n.type)}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.25 }}>
                      <Typography variant="body2" fontWeight={n.read ? 500 : 700} sx={{ flex: 1, minWidth: 0 }} noWrap>
                        {n.title}
                      </Typography>
                      {!n.read && (
                        <Chip label="New" size="small" color="primary"
                          sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700 }} />
                      )}
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.25 }}>
                      {n.message}
                    </Typography>
                    <Tooltip title={format(ts, 'MMM dd, yyyy hh:mm a')}>
                      <Typography variant="caption" color="text.disabled">
                        {formatDistanceToNow(ts, { addSuffix: true })}
                      </Typography>
                    </Tooltip>
                  </Box>
                  <Tooltip title="Delete">
                    <IconButton
                      size="small"
                      onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                      sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </ListItem>
              );
            })}
          </List>
        )}
      </Paper>
    </Box>
  );
};

export default Notifications;
