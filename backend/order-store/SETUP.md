# Local CSV inventory and menu store

Google Sheets is no longer part of the live menu, inventory, checkout, or admin flow. The app uses CSV files as its data store:

- `data/inventory.csv` — menu items, prices, stock, availability, images, and options (runtime file, ignored by Git).
- `data/discounts.csv` — discount rules and redemption counts (runtime file, ignored by Git).
- `data/orders.csv` — successfully placed orders and customer details (runtime file, ignored by Git).

The repository includes `data/starter-inventory.csv`, migrated from the menu data that was previously built into the site. Runtime CSVs are ignored by Git to prevent order and customer data from being committed. If the configured data directory does not have CSVs yet, the server copies the starter CSVs into it on first request. The private admin portal at `/admin/inventorymanagement` edits the same files that the customer menu and checkout use.

## Local use

No spreadsheet credentials or backend URL are needed. By default the server uses the repository's `data/` folder and creates the runtime CSV files from the starter data on first use. Run `startup.bat` on Windows or `./startup.sh` on Linux/macOS. Changes made in the admin portal are written to the CSV files on disk.

Optional local environment variables:

- `MK_DATA_DIR` — alternate writable directory for the three CSV files. Leave unset to use `<repo>/data`.
- `MK_UPLOAD_DIR` — folder for menu photos uploaded through the portal. Leave unset to use `<repo>/public/uploads/menu`.

## Production persistence

The production host must run the app on a persistent server or VM with writable disk. Do not use an ephemeral/serverless filesystem for this CSV store. Use a stable directory outside a deployment checkout, for example `/srv/shared/prodzip-data`, and set `MK_DATA_DIR=/srv/shared/prodzip-data` in the production server's private environment. Set `MK_UPLOAD_DIR=/srv/shared/prodzip-uploads/menu` to preserve uploaded images across code deployments. Create these directories and grant the Node process write access before starting the site.

On the first run with an empty persistent directory, the app copies the repository's starter CSVs into it. The website always reads and updates that persistent CSV directory afterward. Back up the CSV files and image folder regularly. Run a single application process against the files; the CSV store uses a filesystem lock to serialize concurrent requests, but it is not intended as a multi-host database.

Local and production use the same CSV format and application code, but each environment has its own files unless you deliberately mount one shared filesystem in both places. A local edit does not automatically synchronize to production.

## Menu and stock behavior

Set stock to a number to enforce a limit; leave it blank for unlimited stock. A placed order checks current availability and stock, writes the order, and decrements finite stock. Discount redemption counts are updated in the same store operation. Draft items remain private until published. Images uploaded through the portal are stored in the configured upload directory, and their `/menu-image/<filename>` URLs are kept in `inventory.csv`.
