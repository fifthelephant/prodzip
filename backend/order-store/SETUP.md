# Google Sheets inventory and private menu manager

Once this is set up, the website reads its menu from a Google Sheet:

- **The site shows exactly the items in your Sheet**, with the names, prices and categories you type there.
- **Low stock:** when stock is 10 or less, the item shows "ONLY 7 LEFT!".
- **Sold out or unticked:** when stock reaches 0 the item shows **SOLD OUT**. If you untick *available*, it shows **NOT AVAILABLE**. Either way it greyed out and can't be ordered.
- **Every order is checked against the stock.** If it goes through, the stock goes down and the order is added to an **Orders** tab.
- **Pages already open update within about a minute** of a change in the Sheet.

The private menu manager is at `/admin/inventorymanagement`. It is not linked from the customer website. You can create and draft items, publish them, set stock and availability, schedule fixed-date items such as Navratri thalis, upload photos, define sizes and add-ons, and create discount codes there. Customer checkout rechecks prices and discount rules on the server, then the Sheet serializes orders and deducts stock after the payment is verified.

---

## 1. Create the Sheet

1. Go to **https://sheets.new**. A blank Google Sheet opens. Name it *Marwadi Khana Inventory*.
2. Download [`inventory-template.csv`](inventory-template.csv) from this folder on GitHub (open it, then click **Download raw file**).
3. In the Sheet: **File → Import → Upload**, choose the file, pick **Replace current sheet**, and click **Import data**.

You now have one row per item.

## 2. Add the script

1. In the Sheet: **Extensions → Apps Script**. A code editor opens in a new tab.
2. Delete everything in the editor. Then paste in all of [`Code.gs`](Code.gs) from this folder.
3. Click the 💾 **Save** icon.

## 3. Configure the Apps Script admin token and run setup

1. In the Apps Script editor, open **Project Settings → Script properties**.
2. Add a `SHEETS_ADMIN_TOKEN` property with a long random value. Keep the same value for the website server environment variable of the same name. Do not put this token in a public sheet or customer-facing code.
3. Optional: add `INVENTORY_IMAGE_FOLDER_ID` to store uploaded photos in a dedicated Drive folder. Create the folder first and copy its ID from the folder URL. If omitted, photos go in the script owner's Drive.
4. Run `setup` once. It creates/updates the `Inventory`, `Orders`, and `Discounts` tabs and appends new columns without moving existing data.
5. Run `authorizeDrive` once to grant the script permission to save menu photos to Drive.
6. Google asks for permission. Click **Review permissions** and pick your account. If Google says the app is unverified, click **Advanced → Go to project → Allow**.
7. Go back to the Sheet. It should now have `Inventory`, `Orders`, and `Discounts` tabs.

## 4. Publish it as a web app

1. In the Apps Script tab: **Deploy → New deployment**.
2. Click the ⚙️ next to *Select type* and choose **Web app**.
3. Set **Execute as: Me** and **Who has access: Anyone**. The website needs to read it without signing in.
4. Click **Deploy** and copy the **Web app URL**. It ends in `/exec`.

## 5. Configure the website server

Set these values in the production server's ignored `.env.production.local` file (or its secret manager):

- `NEXT_PUBLIC_BACKEND_URL` = the Apps Script `/exec` URL. It is public because the shop menu reads stock directly from the Sheet.
- `SHEETS_ADMIN_TOKEN` = the same private token from Apps Script Script properties.
- `INVENTORY_ADMIN_USERNAME` and `INVENTORY_ADMIN_PASSWORD` = the manager's sign-in credentials. Keep these server-side and do not commit them.
- `ADMIN_SESSION_SECRET` = a separate random value used to sign the secure admin session cookie.

For example, generate separate random values with `openssl rand -hex 32`. Set the requested manager username/password as secret values on the server, not in Git. Run the site's `./startup.sh` after saving the file. Next.js compiles `NEXT_PUBLIC_BACKEND_URL` into the customer menu during the build; restarting without rebuilding will not update that public URL.

Done 🎉

---

## Day-to-day: inventory and menu management

Use `/admin/inventorymanagement` for regular menu changes. The Google Sheet remains the source of truth. You can also edit the tabs directly, but use the portal for JSON choices and image uploads.

| Column | What it does |
| --- | --- |
| **id** | Short unique name, e.g. `kaju-katli`. Don't change it once an item is live. It links the row to the item's sizes, add-ons and emoji in `data/menu.ts`. |
| **name** | Name shown on the site. |
| **category** | Section on the menu, e.g. *Navratri Specials*. Type a new name and a new section appears. |
| **description** | Text under the name. Leave blank to use the one in `data/menu.ts`. |
| **price** | Starting price in ₹ (for the smallest size). |
| **stock** | How many you can still sell. 10 or less shows "ONLY N LEFT!". **0 = SOLD OUT**. **Blank = unlimited**. |
| **available** | Untick to switch an item off (it shows NOT AVAILABLE). |
| **badge** | Optional label: `POPULAR`, `NEW`, `VRAT FRIENDLY`… |
| **shelf_life** | Optional, e.g. `7 days`. Shown as "🕒 Shelf life: 7 days" on the item. |
| **image** | Optional photo link, e.g. `images/besan-halwa-jar.webp` or a full https link. For several photos (shown as a gallery on the item page), separate them with commas. |
| **published** | False keeps a draft out of the customer menu; true publishes it. |
| **options_json** | Optional JSON for sizes and add-ons, managed in the portal. |
| **delivery_date / order_from / visible_until** | Optional special-menu ordering and visibility dates, including Navratri thalis. |

The portal lets you create/delete items and custom categories without a code change. On first use, choose **Import missing items from current website menu** to copy in any existing menu items that are not already in the Sheet. Imported items start at zero stock; enter the real stock counts before selling them. Blank stock means unlimited. Setting stock to zero marks an item sold out. Draft items stay in the Sheet but are hidden from customers.

## Discount codes

Use the **Discount engine** tab in the portal to create percentage or fixed-rupee codes, set minimum spend, start/end dates, total redemption cap, and optional item/category scope. Customers enter the code at checkout. The server recomputes the discount before creating a Razorpay order, and the Sheet records use counts when the paid order is recorded. Tax is calculated after the item discount; delivery is calculated separately.

## Photo uploads

The portal compresses photos in the browser and saves them in Google Drive through Apps Script. Drive links are set to **Anyone with the link can view** so product photos can load on the public menu. Do not upload private or customer images. The uploaded URL is added to the item's image field; save the item to publish it.

- **Add an item:** use the portal. Custom items, sizes and add-ons are stored in the Sheet and do not require a code edit.
- **Remove an item completely:** delete its row.
- **Stock is counted per item, not per size:** an order of 2 × 500 g and 1 × 1 kg Kaju Katli uses 3 from Kaju Katli's stock.
- **Orders tab:** each order is a new row with status *New* and a **Fulfillment** value of *delivery* or *pickup*. You can change the status yourself (*Confirmed*, *Delivered*…). The website doesn't read this tab. On the next order, existing tabs get a Fulfillment column appended without moving existing columns.

## Changing the script later

If you paste in a newer `Code.gs`, publish the change: **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**.
The URL stays the same, so the website doesn't need changing.

## Good to know

- **Only one order is processed at a time,** so two customers can't both buy the last box.
- **The Sheet does the final stock check when an order is placed.** If an item ran out in the meantime, the customer is told and their cart is updated.
- **Totals in the Orders tab come from the customer's browser.** As always, match the payment you receive against the order ID before dispatching.
- **The web-app link is public** (the website has to read it). Anyone who finds it could see your item list and stock, or send fake orders that use up stock. If stock suddenly drops with no matching WhatsApp messages or payments, check the Orders tab and correct the numbers.
