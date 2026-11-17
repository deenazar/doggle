# doggle

## PixelFriend

The extracted `PixelFriend-v5.zip` desktop companion and subsequent updates live in
[`pixelfriend-v5/`](pixelfriend-v5/). It is an **Electron / JavaScript** application,
not a Python application.

```sh
cd pixelfriend-v5
npm install
npm start
```

See the [technical review](docs/pixelfriend-v5-analysis.md) for architecture,
known issues, verification results and desktop testing limitations. The initial import’s original file
checksums are in [the SHA-256 manifest](docs/pixelfriend-v5-sha256.json).

## Local personal agent (v1.1)

Tamil/English Ollama chat, local notes, approval-based Downloads organization and email sending, Gmail/Calendar notifications and weather alerts are available from the tray menu. Follow the [personal-agent setup guide](docs/personal-agent.md) for Ollama and Google OAuth setup, capability limits and validation.
