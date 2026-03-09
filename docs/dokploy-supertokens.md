# Dokploy SuperTokens Setup

This file contains the exact values to use when creating the SuperTokens Core service in Dokploy.

## Recommended Dokploy Service

- Service type: `Application`
- Name: `SuperTokens-Core`
- App Name: `supertokens-core`
- Image: `registry.supertokens.io/supertokens/supertokens-postgresql:latest`

## Environment Variables

Set these on the SuperTokens Core service:

```env
POSTGRESQL_CONNECTION_URI=postgresql://<user>:<password>@<host>:5432/<database>
API_KEYS=
```

Notes:

- `POSTGRESQL_CONNECTION_URI` points to the dedicated auth database, not `CRM-DB`.
- Leave `API_KEYS` empty unless you explicitly want to protect the Core API with a separate SuperTokens API key.

## After Creating The Service

After Dokploy creates the SuperTokens service, get its internal hostname or internal URL and update the web app env:

```env
SUPERTOKENS_CONNECTION_URI=http://<DOKPLOY_SUPERTOKENS_INTERNAL_HOST>:3567
```

Do not keep `http://localhost:3567` if the web app itself is also deployed inside Dokploy. `localhost` would point to the web container itself, not the SuperTokens service.

## Web App Reminder

The web app still needs:

```env
CRM_BASE_URL=http://localhost:9090
CRM_INTERNAL_API_KEY=<your-crm-internal-api-key>
```

Adjust `CRM_BASE_URL` if the web app will call the CRM service over Dokploy internal networking instead of local host access.

## Inspecting Users In pgAdmin

After connecting pgAdmin to the auth database, the first table to inspect for signed-up users is:

```txt
emailpassword_users
```

You can also inspect:

```txt
all_auth_recipe_users
```

Recommended order:

1. Open `emailpassword_users` to see email/password sign-up records.
2. Open `all_auth_recipe_users` to see the broader auth-recipe user list.

In pgAdmin:

1. Expand `Databases`
2. Open `lisent_auth`
3. Expand `Schemas`
4. Expand `public`
5. Expand `Tables`
6. Right click `emailpassword_users`
7. Choose `View/Edit Data`
8. Choose `All Rows`
