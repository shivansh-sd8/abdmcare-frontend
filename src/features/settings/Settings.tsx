import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Switch,
  FormControlLabel,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Card,
  CardContent,
  Alert,
  TextField,
  CircularProgress,
} from '@mui/material';
import {
  Notifications,
  Language,
  Palette,
  Security,
  Storage,
  Save,
  Lock,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import api from '../../services/api';

const Settings: React.FC = () => {
  const [settings, setSettings] = useState({
    emailNotifications: false,
    pushNotifications: false,
    smsNotifications: false,
    appointmentReminders: false,
    systemUpdates: false,
    language: 'en',
    theme: 'light',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    try {
      const savedSettings = localStorage.getItem('userSettings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleSave = async () => {
    try {
      localStorage.setItem('userSettings', JSON.stringify(settings));
      await api.put('/api/v1/users/settings', settings);
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) { toast.error('Fill in all password fields'); return; }
    if (newPassword.length < 6) { toast.error('New password must be at least 6 characters'); return; }
    if (newPassword !== confirmNewPassword) { toast.error('Passwords do not match'); return; }
    setPwdLoading(true);
    try {
      await api.post('/api/v1/auth/update-password', { currentPassword, newPassword });
      toast.success('Password updated successfully');
      setCurrentPassword(''); setNewPassword(''); setConfirmNewPassword('');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update password');
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <Box>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 4,
      }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" sx={{ mb: 0.5 }}>
            Settings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your application preferences and configurations
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Save />}
          onClick={handleSave}
        >
          Save Changes
        </Button>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Notifications color="primary" />
              <Typography variant="h6" fontWeight="600">
                Notifications
              </Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.emailNotifications}
                    onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                  />
                }
                label="Email Notifications"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.pushNotifications}
                    onChange={(e) => setSettings({ ...settings, pushNotifications: e.target.checked })}
                  />
                }
                label="Push Notifications"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.smsNotifications}
                    onChange={(e) => setSettings({ ...settings, smsNotifications: e.target.checked })}
                  />
                }
                label="SMS Notifications"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.appointmentReminders}
                    onChange={(e) => setSettings({ ...settings, appointmentReminders: e.target.checked })}
                  />
                }
                label="Appointment Reminders"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.systemUpdates}
                    onChange={(e) => setSettings({ ...settings, systemUpdates: e.target.checked })}
                  />
                }
                label="System Updates"
              />
            </Box>
          </Paper>

          <Paper sx={{ p: 3, mt: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Security color="primary" />
              <Typography variant="h6" fontWeight="600">
                Security & Privacy
              </Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />

            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Lock fontSize="small" color="action" />
                <Typography variant="subtitle1" fontWeight={600}>Change Password</Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  fullWidth size="small" type="password" label="Current Password"
                  value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
                />
                <TextField
                  fullWidth size="small" type="password" label="New Password"
                  value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  helperText="At least 6 characters"
                />
                <TextField
                  fullWidth size="small" type="password" label="Confirm New Password"
                  value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)}
                  error={confirmNewPassword.length > 0 && newPassword !== confirmNewPassword}
                  helperText={confirmNewPassword.length > 0 && newPassword !== confirmNewPassword ? 'Passwords do not match' : ''}
                />
                <Button
                  variant="contained" onClick={handleChangePassword}
                  disabled={pwdLoading || !currentPassword || !newPassword || newPassword !== confirmNewPassword}
                  startIcon={pwdLoading ? <CircularProgress size={16} /> : <Lock />}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  {pwdLoading ? 'Updating...' : 'Update Password'}
                </Button>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button variant="outlined" fullWidth>
                Manage Session Timeout
              </Button>
              <Button variant="outlined" fullWidth>
                View Login History
              </Button>
              <Button variant="outlined" fullWidth>
                Download My Data
              </Button>
              <Button variant="outlined" fullWidth color="error">
                Delete Account
              </Button>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Language color="primary" />
              <Typography variant="h6" fontWeight="600">
                Language & Region
              </Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Language</InputLabel>
                <Select
                  value={settings.language}
                  label="Language"
                  onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                >
                  <MenuItem value="en">English</MenuItem>
                  <MenuItem value="hi">Hindi</MenuItem>
                  <MenuItem value="ta">Tamil</MenuItem>
                  <MenuItem value="te">Telugu</MenuItem>
                  <MenuItem value="bn">Bengali</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Date Format</InputLabel>
                <Select
                  value={settings.dateFormat}
                  label="Date Format"
                  onChange={(e) => setSettings({ ...settings, dateFormat: e.target.value })}
                >
                  <MenuItem value="DD/MM/YYYY">DD/MM/YYYY</MenuItem>
                  <MenuItem value="MM/DD/YYYY">MM/DD/YYYY</MenuItem>
                  <MenuItem value="YYYY-MM-DD">YYYY-MM-DD</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Time Format</InputLabel>
                <Select
                  value={settings.timeFormat}
                  label="Time Format"
                  onChange={(e) => setSettings({ ...settings, timeFormat: e.target.value })}
                >
                  <MenuItem value="12h">12 Hour</MenuItem>
                  <MenuItem value="24h">24 Hour</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Paper>

          <Paper sx={{ p: 3, mt: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Palette color="primary" />
              <Typography variant="h6" fontWeight="600">
                Appearance
              </Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            
            <FormControl fullWidth>
              <InputLabel>Theme</InputLabel>
              <Select
                value={settings.theme}
                label="Theme"
                onChange={(e) => setSettings({ ...settings, theme: e.target.value })}
              >
                <MenuItem value="light">Light</MenuItem>
                <MenuItem value="dark">Dark</MenuItem>
                <MenuItem value="auto">Auto</MenuItem>
              </Select>
            </FormControl>
          </Paper>

          <Card sx={{ mt: 3, bgcolor: '#e3f2fd' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Storage color="primary" />
                <Typography variant="h6" fontWeight="600">
                  Storage
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Cache and temporary files
              </Typography>
              <Button variant="outlined" size="small" sx={{ mt: 1 }}>
                Clear Cache
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Alert severity="info">
            Changes to notification settings will take effect immediately. Other settings may require you to log out and log back in.
          </Alert>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Settings;
