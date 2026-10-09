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

- `/` is the original catering homepage, including the founder story and catering information.
- The header's **Order Now** link opens `/orders/start`, where customers choose home delivery or pickup / takeaway before browsing the menu.
- `/orders` opens online ordering. Cart, item, checkout and order confirmation pages live below `/orders`.
- `/occasions` is labelled **Catering** in navigation and links to the quote form.

## Menu and inventory data

The store uses CSV files in `data/` for the live menu, stock, discounts, and orders. The private portal at `/admin/inventorymanagement` updates these files; customer pages and checkout read from the same CSV-backed API. Google Sheets credentials are not required. See [`backend/order-store/SETUP.md`](backend/order-store/SETUP.md) for local and persistent production setup.

On a production VM, set `MK_DATA_DIR` and `MK_UPLOAD_DIR` to durable writable folders outside the deployment checkout so menu edits, orders, and uploaded photos survive code updates. Local and production use the same format and code, with separate files by default.

Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in the server environment to enable the Razorpay checkout. `COD` remains available without those credentials. Do not put the Razorpay secret in a `NEXT_PUBLIC_` variable.

## Change images

All image paths live in `content/images.ts`.

- Replace a file in `public/images` and keep the same name, or
- Point the path in `content/images.ts` at a new file under `public/`.

## Change the menu

Use `/admin/inventorymanagement` to add and update the live menu without changing code. `data/starter-inventory.csv` is the checked-in menu migrated from the existing starter catalog; the server copies it to the runtime `data/inventory.csv` on first use.

## Change contact details and wording

Phone, WhatsApp, Instagram, Facebook, address and the homepage lines are in `content/site.ts`.
