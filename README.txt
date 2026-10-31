VidMark Studio - Website + Live Admin Panel
===========================================

LIVE MODE (no code, changes go live instantly)
-----------------------------------------------
1. Install Node.js (free, nodejs.org, version 16 or newer) on the computer/server that hosts your site.
2. Put this whole folder on that computer/server.
3. Windows: double-click start.bat    Mac/Linux: run  node server.js
4. First run prints your ADMIN PASSWORD in the black window. Save it.
5. Website:  http://YOUR-ADDRESS:3000/        Admin: http://YOUR-ADDRESS:3000/admin/
6. Log in to the admin. Now every change you make is saved and shows on the website immediately.
   Top bar shows "Live ✓ Saved".

ADD A NEW PORTFOLIO VIDEO
  Admin -> Portfolio media -> "Add new video to portfolio" -> choose category -> choose video file(s).
  It uploads, makes a thumbnail automatically, and appears in that portfolio category on the live site.
  (Delete a video with the X button on its row. The file stays in media/.)

Other things
- Page texts: edit headings/paragraphs written directly in pages (hero, About, Careers, footer).
- Media library: upload, see all files, "Run media check" finds missing files.
- Backups: the last 30 saves are kept in data/backups/ (copy one to data/content.json to restore).
- Change password: delete data/password.json and restart (new one is printed), or set ADMIN_PASSWORD.
- Port: set PORT (e.g. PORT=80). Keep it running with pm2:  npm i -g pm2 && pm2 start server.js

WHERE TO HOST (needs Node.js, plain shared hosting / Netlify / GitHub Pages will NOT work in live mode)
- A VPS (DigitalOcean, Hetzner, Contabo...), or cPanel hosting that has "Setup Node.js App".
- Render / Railway: you MUST attach a persistent disk to this folder's data/ and media/ folders, otherwise
  uploads are erased on every restart.
- Always use HTTPS in front (Nginx/Caddy/Cloudflare) because the admin password is sent to the server.

OFFLINE MODE (no server)
------------------------
Open admin/index.html directly in Chrome. Edit, then Publish -> Download ZIP and unzip over your site folder.

Folder
  server.js  index.html  content.js  media/  admin/  data/ (created automatically)
