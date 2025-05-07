# Playlist chat rooms

There are popular lofi instrumental radio stations on youtube that plays generic music where people can meet and chat. We want this app to basically fill the same need, but we use spotify playlists as background music instead of generic music. 

This means the discussions rooms will be more music oriented and more about discovering new music and getting feedback on songs people like. 

### Tech stacks and components

The tech stack for this is the latest versions of:

- Nextjs
- Supabase
- Tailwind
- Shadcn
- Spotify APIs

We have already installed some  components to scaffold some of the features we will build so we have a solid fundament to build on. This UI is from supabase and use shadcn:

- This will be used for login with spotify:  https://supabase.com/ui/docs/nextjs/social-auth
- Chat room UI https://supabase.com/ui/docs/nextjs/realtime-chat
- Displaying current users avatar https://supabase.com/ui/docs/nextjs/current-user-avatar
- Display realtime avatar stack in chat room https://supabase.com/ui/docs/nextjs/realtime-avatar-stack

This component is from another GitHub repo and is also part of the initial code base :

- @mention song or artist in the chat using shadcn editor. https://shadcn-editor.vercel.app/

We also need to use the spotify web api https://developer.spotify.com/documentation/web-api and the  spotify web player sdk https://developer.spotify.com/documentation/web-playback-sdk . We use the spotify typescript sdk. @spotify/web-api-ts-sdk

There are some caviats we need to make sure we handle right when we build out the SDK player. This is;

- Token refresh mechanism https://developer.spotify.com/documentation/web-api/tutorials/refreshing-tokens
- Track relinking https://developer.spotify.com/documentation/web-api/concepts/track-relinking
- Spotify player need to reset and remount when device was inactive. We don't want run time errors when we return to using the player. 

### Project repo

This is the staring point for the app.

[https://github.com/paalaleks/dmfm](https://github.com/paalaleks/dmfm)

### The player UI. (Popover component from top navbar.)

It has 3 sections:

**div 1:**

- track image/playlist image (shifting images in UI.)
- song name
- artist name
- playlist name

**div 2:**

- last playlist
- last song
- play/pause
- next song
- next playlist
- shuffle
- volume controll
- save song (save track for current user, https://developer.spotify.com/documentation/web-api/reference/save-tracks-user)
- save playlist (curretn user will follow playlist, https://developer.spotify.com/documentation/web-api/reference/follow-playlist )

Some of the fetaures like, next, play/pause etc., are actions we expect from online music players. **Last and next playlist** takes you back and forth between playlist. **Save  playlist** will have you follow a particular playlist.

### Asynchronous listening

Another important clarification is the way a chat room members listens to songs and playlists. Member of the room will be able to skip back and forth freely and play whatever song and whatever playlist they want at any time. 

User will therefore need the ability to give recommendations and @mention song, artists or playlist in the chat UI.   Since we’re listening to music asynchronously this is needed.  We want @mentions to have UI cards with song image, artist image or playlist image.

### Chat room creation

App should create chat rooms dynamically. We will create a new chat room when we have enough users that splitting into two rooms are sensible.  If we reach 50 users in one room we’ll spilt one chat room into two chat rooms with 25 each. 

We prefer that users of the same mapped out music taste to join in the same rooms when a chat room is broken up.  

### Matching music taste across chat rooms (Taste Driven Dynamic Room System)

We want everyone with matching music taste to share playlists across all chat rooms.  Uploaded playlists will be mapped and  available to everyone with overlapping music taste. We need to store JSONB arrays of artists and songs from the uploaded playlist to be used for comparisons.  To make the taste map even better we can additionally fetch top artist from users Spotify account.

When we have good taste mapping we’re able to filter, match and cue up the appropriate playlist for each user in the room. For instance  a filtering rule can be; we only want to keep playlists , from the arrays of playlists, that at least have 2 similarly tracks/artist as the listening profile. 

One other detail worth mentioning is that the user will never play his own playlists only playlists from other users. (Obvious one.)

```
{
  "name": "dmfm",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@radix-ui/react-avatar": "^1.1.9",
    "@radix-ui/react-slot": "^1.2.2",
    "@radix-ui/react-tooltip": "^1.2.6",
    "@spotify/web-api-ts-sdk": "^1.2.0",
    "@supabase/ssr": "^0.6.1",
    "@supabase/supabase-js": "^2.49.4",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lucide-react": "^0.507.0",
    "next": "15.3.2",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "tailwind-merge": "^3.2.0"
  },
  "devDependencies": {
    "@eslint/eslintrc": "^3",
    "@tailwindcss/postcss": "^4.1.5",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "15.3.2",
    "tailwindcss": "^4.1.5",
    "tw-animate-css": "^1.2.9",
    "typescript": "^5"
  }
}

```

### Preferences

We prefer server actions over routes.
We want to use zod for api type safe validation.
Make sure that we always use Supabase MCP when we work with our database.
Make sure we use Context7 mcp for reading documentation.
Make sure we hava a central typescript types file where we have our database types. Update the pre-installed components with the correct database types.
Make sure that we always print out the latest types using Supabase MCP after changing something on our database. 

We want to develop all the chat functionality before we start implementing the Spotify player and all the other Spotify functions. Mention functionality will be the last thing we do in this project.