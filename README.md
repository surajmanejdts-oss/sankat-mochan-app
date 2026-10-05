# Sankat Mochan Sevarth Sanstha

Full-stack starter for a React Native/Expo mobile app + Node.js/Express API + MongoDB.

## Main workflow

1. An administrator creates a member account with name, username and password.
2. Registration is saved in MongoDB and the member is given their login credentials.
3. Member logs in with those credentials.
4. Member completes the English membership application.
5. Application is stored in a separate MongoDB collection.
6. Admin receives an in-app notification and, after push setup, a phone notification.
7. Admin verifies the member.
8. Verified members can access the community.
9. Verified members can submit text/image posts.
10. Every post enters the admin moderation queue as `pending`.
11. Admin approves or rejects the post.
12. Only approved posts appear in the community feed.
13. Important events are saved in the Notifications collection and can also be delivered as mobile push notifications.

## Security

Member passwords are stored only as bcrypt hashes. The admin cannot retrieve plaintext passwords. Do not store plaintext passwords in MongoDB.

## Backend setup

```bash
cd server
npm install
```

Copy `.env.example` to `.env` and edit it.

For phone testing, `PUBLIC_BASE_URL` should use the PC LAN IP, for example:

```env
PUBLIC_BASE_URL=http://192.168.1.101:5000
```

Start:

```bash
npm run dev
```

The server listens on `0.0.0.0:5000` so devices on the same LAN can reach it.

## Mobile setup

```bash
cd mobile
npm install
```

Create `mobile/.env` for local development:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.101:5000/api
```

Replace the IP with the current IPv4 address of the development PC. Without this override, the app uses the hosted API, including in EAS builds.

Start Expo:

```bash
npx expo start -c
```

## Push notifications

The project uses `expo-notifications` and the Expo Push Service. Notifications are also stored in MongoDB and shown in the app's Notifications screen.

Important events currently covered:

- New member registration -> admin
- Membership application submitted -> admin + member
- Member verified -> member
- New post submitted -> admin + author
- Post approved -> author + verified members
- Post rejected -> author

### Expo Go limitation

On Android, remote push notifications are not available in Expo Go for SDK 53 and newer. Local/in-app notifications can still be used in Expo Go. To test real phone push notifications, create an Expo development build. See the official Expo documentation:

https://docs.expo.dev/push-notifications/overview/

### EAS setup for push notifications

Install/login to EAS:

```bash
npx eas-cli login
```

Initialize the project:

```bash
cd mobile
npx eas-cli init
```

Then install/build a development client:

```bash
npx expo install expo-notifications expo-constants expo-device
npx eas-cli build:configure
npx eas-cli build --profile development --platform android
```

For Android push credentials, follow Expo's current FCM setup instructions. EAS will guide you through the required credentials.

Official setup:
https://docs.expo.dev/push-notifications/push-notifications-setup/

After installing the development build on the phone, run:

```bash
npx expo start --dev-client
```

Log in to the app. The app registers its Expo push token with the backend. The backend sends notifications through the Expo Push Service.

## Admin

Admin credentials are controlled by:

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change-this-admin-password
```

The admin dashboard has:

- Notifications
- Member list
- Admin-only member registration
- Searchable member reports with selected-member PDF export
- Total, verified and pending member counts in reports
- Pending/verified member colors
- Member verification
- Member detail view
- Member deletion
- Post moderation queue
- Approve & publish
- Reject
- Delete post

## Database collections

- `users`
- `applications`
- `posts`
- `notifications`
- `devicetokens`

## Network note

For an Android phone to call the API during development, the phone and PC should be on the same Wi-Fi/LAN. Do not use `localhost` in `EXPO_PUBLIC_API_URL` for a physical phone.
