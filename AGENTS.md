# AI video editing bundle

This repository distributes skills and a setup script. It is not a user's video project.

For a request to install this bundle:
1. Read README.md and scripts/setup.mjs. Do not render or edit the person's own media as part of setup.
2. Check Node.js >=22. If absent, install an LTS release from the official Node.js source or the OS package manager; reuse a sufficient existing release. Respect host permissions. Do not install Codex itself or change its account settings.
3. Run `node scripts/setup.mjs`. It copies missing skills into `~/.agents/skills`, reuses working tools, and installs missing runtime dependencies in `~/.ai-video-editing/runtime`. Existing skill folders are preserved.
4. Run `node scripts/smoke.mjs`: it creates and renders a synthetic 2-second sample without needing private media or a HeyGen account.
5. Report actual results, installed and preserved skills, the tool paths and the sample MP4 path. Do not claim readiness if a tool or render failed. If skills don't appear on the next turn, recommend restarting Codex.

For editing work, load skills/ai-video-editing/SKILL.md and the relevant upstream skill. Originals remain unchanged. Never infer duration, aspect ratio, private links or speech missing from the user's materials.

Do not commit credentials, machine-specific setup-report.json, smoke-output, node_modules, private video/audio, screenshots, or a user's project folder. This repository contains only the toolkit and upstream public demonstration assets.
