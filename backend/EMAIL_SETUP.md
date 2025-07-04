# Email Setup Guide for Password Reset

The application now supports real SMTP email sending for password reset functionality. Follow this guide to configure your email provider.

## Current Status
- ✅ SMTP Email Service implemented
- ✅ HTML and Text email templates
- ✅ Automatic fallback to development mode if not configured
- ✅ Professional email styling

## Configuration Required

Update your `appsettings.json` file with your email provider settings:

### Gmail Configuration
```json
{
  "Email": {
    "SmtpHost": "smtp.gmail.com",
    "SmtpPort": 587,
    "EnableSsl": true,
    "FromEmail": "your-email@gmail.com",
    "FromName": "Gomoku Game",
    "Username": "your-email@gmail.com",
    "Password": "your-app-password"
  }
}
```

### Outlook/Hotmail Configuration
```json
{
  "Email": {
    "SmtpHost": "smtp-mail.outlook.com",
    "SmtpPort": 587,
    "EnableSsl": true,
    "FromEmail": "your-email@outlook.com",
    "FromName": "Gomoku Game",
    "Username": "your-email@outlook.com",
    "Password": "your-password"
  }
}
```

### Other Providers
| Provider | SMTP Host | Port | SSL |
|----------|-----------|------|-----|
| Yahoo | smtp.mail.yahoo.com | 587 | Yes |
| iCloud | smtp.mail.me.com | 587 | Yes |
| Custom | your-smtp-server.com | 587/465 | Yes |

## Setting Up App Passwords

### Gmail Setup (Recommended)
1. **Enable 2-Factor Authentication** on your Google account
2. Go to **Google Account Settings** → **Security** → **2-step verification**
3. Click **App passwords**
4. Select **Mail** and **Custom** device
5. Enter "Gomoku Game" as the device name
6. Copy the generated 16-character password
7. Use this app password in the configuration (not your regular password)

### Outlook Setup
1. Go to **Microsoft Account Security**
2. Enable **2-step verification**
3. Generate an **App password** for "Mail"
4. Use this app password in the configuration

## Security Notes
- ✅ Never commit real passwords to version control
- ✅ Use environment variables for production
- ✅ Use app passwords, not regular account passwords
- ✅ Enable 2FA on your email account

## Environment Variables (Production)
For production deployment, use environment variables:

```bash
export Email__SmtpHost="smtp.gmail.com"
export Email__SmtpPort="587"
export Email__FromEmail="your-email@gmail.com"
export Email__Username="your-email@gmail.com"
export Email__Password="your-app-password"
```

## Testing the Setup

1. Configure your email settings in `appsettings.json`
2. Restart the backend application
3. Try the forgot password feature
4. Check for successful email delivery

## Fallback Behavior

If email settings are not configured or sending fails:
- System automatically falls back to **development mode**
- Reset URLs are logged to the console
- Look for: `🔗 COPY THIS URL TO RESET PASSWORD:`

## Email Templates

The system sends professional HTML emails with:
- 🎮 Branded header with game logo
- 📱 Mobile-responsive design
- 🔒 Security warnings and expiration notices
- 🎨 Professional styling with buttons and formatting
- 📧 Plain text fallback for all email clients

## Troubleshooting

### "Email settings not configured"
- Check your `appsettings.json` has the Email section
- Ensure FromEmail and SmtpHost are not empty

### "Authentication failed"
- Verify you're using an app password, not regular password
- Check that 2FA is enabled on your email account
- Confirm the username matches your email address

### "Connection failed"
- Verify SMTP host and port are correct
- Check that EnableSsl is set to true
- Ensure your firewall allows outbound connections on port 587

## Support
- Gmail: https://support.google.com/accounts/answer/185833
- Outlook: https://support.microsoft.com/en-us/account-billing/using-app-passwords-with-apps-that-don-t-support-two-step-verification-5896ed9b-4263-e681-128a-a6f2979a7944