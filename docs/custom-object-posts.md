# Custom Object Posts

Separate CRUD feature in `app_custom_cartridge`, using the existing BM `CustomPost` type. External API controllers, services, helpers, templates and scripts are unchanged. The shared navigation has an additional **Custom Posts** link.

## Files

All feature paths below are relative to `app_custom_cartridge/cartridges/app_custom_cartridge/cartridge/`:

| File | Responsibility |
| --- | --- |
| `controllers/CustomPosts.js` | Thin HTTPS routes, CSRF middleware, rendering and JSON responses |
| `scripts/helpers/customPostsHelper.js` | Validation, transactional persistence, error handling and database pagination |
| `templates/default/customPosts/posts.isml` | Listing, counts, conditional pagination and page assets |
| `templates/default/customPosts/components/postList.isml` | Table, rows, empty state and AJAX pagination |
| `templates/default/customPosts/modal/postModal.isml` | One modal for create/view/edit/delete confirmation |
| `templates/resources/customPosts.properties` | Labels, validation messages and operation feedback |
| `client/default/js/customPosts.js` | Modal behavior, frontend validation and AJAX mutations |
| `client/default/scss/customPosts.scss` | Scoped table styling |
| `templates/default/components/header/menu.isml` | Adds the new navigation link |

Regression checks: `app_custom_cartridge/test/customPosts.test.js`.

## Business Manager contract

The implementation expects exactly:

- Object type: **CustomPost**.
- String key attribute: **postId**. This is the key created with `CustomObjectMgr.createCustomObject()`, not an additional generated UUID attribute.
- Custom fields: **userId** (Integer), **title** (String), **body** (Text), grouped for editing in BM.
- The type's configured Local/Global storage scope determines whether records are site-specific or shared. Use Local for separate site records.

Existing manually created keys such as `POST-001` work. New keys are generated on the server with `UUIDUtils.createUUID()`. Updates never change a key. `userId` is the post's entered user reference, not an authentication/ownership field.

Backend and frontend check only required values and datatypes: User ID must be an Integer within its native 32-bit storage range, and title/description must be non-empty strings after trimming. No application-level positivity rule or text length limits are imposed. Existing BM attribute constraints still apply: for example, if `userId` is configured with minimum 1, BM will still reject smaller values during persistence. No HTTP service or external credentials are needed.

## Request flow

Open `URLUtils.url('CustomPosts-Show')`, or use the **Custom Posts** navigation link.

| Route | Method | Behavior |
| --- | --- | --- |
| `CustomPosts-Show?page=1` | GET | Renders the full page; the form template generates its CSRF token |
| `CustomPosts-GetPosts?page=1` | GET | Renders only the listing and pagination for AJAX updates |
| `CustomPosts-ViewPost?id=POST-001` | GET | Returns the current record for view/edit/delete confirmation |
| `CustomPosts-SavePost` | POST | Validates and persists a new post |
| `CustomPosts-UpdatePost` | POST | Validates and updates an existing post |
| `CustomPosts-DeletePost` | POST | Deletes the confirmed post |

All routes use HTTPS. Writes use SFRA's existing `validateAjaxRequest` middleware. The form uses its own `csrf` view data from `generateToken`, so it does not depend on the recently viewed feature or consent markup. Listing and CRUD endpoints have no page-cache middleware; do not configure shared page caching for this form/data.

Pagination is server-side, with ten records per page, newest first. The helper passes the sorted `queryCustomObjects()` iterator and total count to SFCC `PagingModel`, sets page size/start, and reads `pageElements` once. Page counts and boundaries come from the model. The database iterator is closed in `finally`; records are not all loaded into an array. Pagination is entirely hidden at 0–10 records and shown from 11 onward. Previous/Next links are disabled at the relevant boundary. PagingModel requires a known total count; a count/query failure returns a friendly error rather than inaccurate pagination.

Navigation between pages uses normal GET links. Modal CRUD uses AJAX; after a successful mutation the page reloads from storage. Create opens page one, update preserves the selected page, and delete preserves the page where possible. If deletion empties the last page, the helper clamps to the preceding valid page; if the count becomes ten, pagination disappears. There is no View More endpoint or button.

## Build and deploy

```powershell
npm --prefix app_custom_cartridge run compile:js
npm --prefix app_custom_cartridge run compile:scss
node app_custom_cartridge/test/customPosts.test.js
```

Deploy the new controller, helper, templates, resource bundle and header link, together with generated `static/default/js/customPosts.js` and `static/default/css/customPosts.css`. Generated assets are ignored by Git but must be deployed to the sandbox. Keep `app_custom_cartridge` ahead of `app_storefront_base` in the target site's cartridge path. Invalidate the affected menu/template cache to see the new link.

Local verification completed: **14 mocked regression tests passed**, ESLint passed for the three new JavaScript files, and both custom-cartridge JS and SCSS builds succeeded. The existing Sass toolchain reports legacy-JS-API deprecation warnings. The default Node shim has no active version, so commands were executed using the already-installed `v24.22.1/node.exe` directly without changing machine configuration.

The tests exercise pagination thresholds/limits, immutable keys, validation, CRUD persistence behavior, transactional rollback, iterator cleanup and CSRF middleware rejection. They use mocked persistence and do not prove sandbox configuration, actual ISML rendering or browser behavior.

## Manual acceptance checks

1. Open Custom Posts on the intended site. The existing BM test record should appear.
2. Create a valid post; confirm success feedback and persistence in BM and after a refresh.
3. View and edit that post. Confirm all fields, the immutable Post ID and saved changes.
4. Submit missing/non-integer user IDs and empty/whitespace-only title or description; verify field-level feedback. Repeat with direct invalid POST data to verify backend validation. Confirm a short non-empty description is accepted and no extra text length limits are enforced by the application.
5. Dismiss the delete confirmation: no record should be removed. Confirm deletion: the record should disappear from both the listing and BM.
6. At exactly ten records, pagination must be absent. Create an eleventh: page two becomes available, with ten records on page one and one on page two.
7. Check first/last-page Previous/Next states, then delete the only record on page two: return to page one with pagination hidden.
8. Open a nonexistent record or delete a record removed elsewhere: display an error without breaking the page.
9. Remove/alter the CSRF token in a write request: confirm the existing SFRA CSRF middleware blocks the mutation.
10. Check mobile table scrolling, modal controls, duplicate-submit prevention, and the unchanged External API feature.

Live deployment, actual database/browser verification and screenshots have not been performed. Concurrent inserts/deletes can change which records occupy an offset-based page; the server recalculates counts and page boundaries on reload.
