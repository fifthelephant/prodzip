# CSV store and deployment data

The application stores live menu inventory, discounts, orders, payment settings, and audit history as CSV files. Keep these files outside the code repository so data edits do not change the build or get replaced by a deployment.

The files are `inventory.csv`, `discounts.csv`, `orders.csv`, `payment-settings.csv`, and `history.csv`. The private portal at `/admin/inventorymanagement` writes to this store; storefront and checkout routes read the same files. History records changes to items, discounts, orders, payment methods, and charges. Order history omits customer contact details and addresses.

## Local use

No spreadsheet credentials or backend URL are needed. By default, local runs use the sibling folder `MKCater-data` beside the repository. Set `MK_DATA_DIR` to choose another writable directory. The store creates missing files on its first request. If no inventory file exists, it creates the initial catalogue from the built-in source in `lib/order-store/menu-config.ts`; missing discounts and orders start empty.

Set `MK_UPLOAD_DIR` to store uploaded menu images outside the checkout as well. Without it, uploads use `public/uploads/menu/`.

## Production persistence

Run the app on a persistent server or VM with a writable disk. Do not use an ephemeral/serverless filesystem for this CSV store. Configure a stable directory outside each deployment checkout, for example:

```text
MK_DATA_DIR=/srv/shared/prodzip-data
MK_UPLOAD_DIR=/srv/shared/prodzip-uploads/menu
```

Create both directories and grant the Node process write access before starting the site. Build and deploy the code independently; keep the data directory when replacing the checkout. Back up the CSV files and upload folder regularly. The CSV store uses a filesystem lock for a single application process and is not intended as a multi-host database.

Local and production use the same formats and code, but separate data directories by default. A local edit does not automatically synchronize to production.

## Menu and stock behavior

Set stock to a number to enforce a limit; leave it blank for unlimited stock. A placed order checks current availability and stock, writes the order, and decrements finite stock. Discount redemption counts update as part of order placement. Draft items remain private until published. Uploaded image URLs are kept in `inventory.csv`.
