# Marwadi Khana

Combined Marwadi Khana catering and online ordering website, built with Next.js and React.

## Run it

On Windows, double-click `startup.bat` or run it from Command Prompt. On macOS, Linux, or Git Bash on Windows, run:

```bash
chmod +x startup.sh
./startup.sh
```

Both startup scripts install dependencies, build the site, and start it at http://localhost:3000. Node.js 20 or newer is required.

For day-to-day editing, `npm run dev` starts a local preview that reloads as you change files.

## Pages

- `/` and `/landingpage` are the two-option landing page, with links to the catering website and online ordering.
- `/website` opens the existing catering homepage; its existing menu, quote, about and information pages remain available.
- `/orders` opens online ordering. Cart, item, checkout and order confirmation pages live below `/orders`.

## Ordering integrations

Set `NEXT_PUBLIC_BACKEND_URL` to the deployed Google Apps Script web-app URL to sync inventory and record orders in Google Sheets. The setup instructions are in `backend/order-store/SETUP.md`.

Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in the server environment to enable the Razorpay checkout. `COD` remains available without those credentials. Do not put the Razorpay secret in a `NEXT_PUBLIC_` variable.

## Change images

All image paths live in `content/images.ts`.

- Replace a file in `public/images` and keep the same name, or
- Point the path in `content/images.ts` at a new file under `public/`.

## Change the menu

Edit dish names and categories in `content/menu.ts`. The Menu page reads that file.

## Change contact details and wording

Phone, WhatsApp, Instagram, Facebook, address and the homepage lines are in `content/site.ts`.
