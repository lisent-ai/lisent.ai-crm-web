# Questions

## How do we relate a signed-in user from the web app to a company stored in the CRM service?

Use a separate membership mapping table in the web/BFF layer instead of trying to store auth users inside the CRM service database.

The clean model is:

1. SuperTokens creates the auth user and gives a stable `userId`.
2. The CRM service creates the company and returns a stable `company_id`.
3. The web/BFF layer stores the relationship in its own table.

Example table:

```sql
user_company_memberships
- id
- supertokens_user_id
- company_id
- role
- created_at
```

The flow is:

1. User signs up on the web app.
2. User creates a company from the web app.
3. The web app calls the CRM service to create the company.
4. The CRM service returns `company_id`.
5. The web app stores:
   - `supertokens_user_id`
   - `company_id`
   - `role = owner`

After that:

1. The browser sends requests to the web app.
2. The web app validates the SuperTokens session.
3. The web app reads `session.userId`.
4. The web app looks up the membership table.
5. The web app resolves which `company_id` values the user can access.
6. The web app calls the CRM service with the correct tenant/company context.

Why this is the right boundary:

- SuperTokens remains the source of truth for identity.
- The CRM service remains the source of truth for company and CRM domain data.
- The web/BFF layer remains the source of truth for authorization and tenant membership.

Do not try to create a database-level foreign key between SuperTokens user tables and CRM service company tables across two systems. Use stable IDs and an application-level mapping instead.

## How is authorization implemented right now?

The current implementation uses SuperTokens User Metadata as the first membership store.

Current runtime behavior:

1. A user signs in through SuperTokens.
2. When that user creates a company, the web BFF stores an `owner` membership in SuperTokens User Metadata.
3. The BFF checks those memberships before forwarding company and customer requests to the CRM service.

Practical result:

- users only see companies they own
- users only see customers for companies they can access
- company-scoped import routes are also blocked if the company is not in the signed-in user’s membership list

This is a valid first-pass authorization layer. If role management, invites, or multi-user company membership becomes more complex later, this can be migrated to a dedicated membership table.
