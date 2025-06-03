# Personal API

This repository contains a Firebase-backed service I use to fetch and sync data for widgets on my personal website, [www.chrisvogt.me](https://www.chrisvogt.me).

## How To Install

To install this project, first clone it.

```
# You can also fork the project and clone that
git clone git@github.com:chrisvogt/metrics.git
```

Then install the Firebase CLI and login to the project. You can use npm (below) or any of the other [documented install methods](https://firebase.google.com/docs/cli#mac-linux-npm).

```
# Install the `firebase` command using npm
# See the documentation for other ways to install it
npm install -g firebase-tools
```

```
# Login to Firebase
# You'll need access to the `personal-stats-chrisvogt` project
firebase login
```

Next, using the version specified in [.nvmrc](./.nvmrc), navigate to [/functions](./functions) and install the package and its dependencies.

```
# Navigate to the /functions directory
cd functions
```

```
# Install dependencies
npm install
```

You'll also need to [download an Admin SDK token](https://console.firebase.google.com/u/1/project/personal-stats-chrisvogt/settings/serviceaccounts/adminsdk) and place it in the /functions directory, at /functions/token.json.

Finally, you can use the following command to download the secrets from Firebase. You'll need these to run any of the sync jobs. These belong in /functions/.runtimeconfig.json.

```
# Download and save secrets
firebase functions:config:get > .runtimeconfig.json
```

```
# Starts the local server on port 5054
npm run serve
```

## Usage

After installing, use the command `npm run serve` to run the local Firebase emulators on port 5054. If everything is working as expected then the following routes should become available.

| Widget | Description |
|--------|-------------|
| [widgets/github](http://localhost:5002/api/widgets/github) | GET the GitHub widget content.                                           |
| [widgets/sync/github](http://localhost:5002/api/widgets/sync/github) | GET request that runs a job syncing GitHub widget content.          |
| [widgets/goodreads](http://localhost:5002/api/widgets/goodreads) | GET the Goodreads widget content.                                  |
| [widgets/sync/goodreads](http://localhost:5002/api/widgets/sync/goodreads) | GET request that runs a job syncing Goodreads widget content. |
| [widgets/instagram](http://localhost:5002/api/widgets/instagram) | GET the Instagram widget content.                                  |
| [widgets/sync/instagram](http://localhost:5002/api/widgets/sync/instagram) | GET request that runs a job syncing Instagram widget content. |
| [widgets/spotify](http://localhost:5002/api/widgets/spotify) | GET the Spotify widget content.                                        |
| [widgets/sync/spotify](http://localhost:5002/api/widgets/sync/spotify) | GET request that runs a job syncing Spotify widget content.       |
| [widgets/steam](http://localhost:5002/api/widgets/steam) | GET the Steam widget content.                                              |
| [widgets/sync/steam](http://localhost:5002/api/widgets/sync/steam) | GET request that runs a job syncing Steam widget content.             |

## Copyright & License

Copyright © 2023 [Chris Vogt](https://www.chrisvogt.me). Released under the [MIT License](LICENSE).
