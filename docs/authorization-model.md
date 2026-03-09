# Authorization Model

## Current Implementation

The web app now enforces tenant access in the BFF layer.

Source of truth for company access:

- SuperTokens session identifies the signed-in user
- SuperTokens User Metadata stores `companyMemberships`

Current membership shape:

```json
{
  "companyMemberships": [
    {
      "companyId": "uuid",
      "role": "owner",
      "createdAt": "2026-03-09T00:00:00.000Z"
    }
  ]
}
```

## Request Flow

1. Browser calls `lisent.ai-crm-web`
2. `/api/crm/[...path]` validates the SuperTokens session
3. BFF loads the signed-in user’s memberships from SuperTokens User Metadata
4. BFF allows or blocks the CRM request
5. Only authorized requests are forwarded to `lisent.ai-CRM-service`

## Current Enforcement

- `POST /companies`
  - allowed for any signed-in user
  - on success, BFF stores an `owner` membership for the created company

- `GET /companies`
  - filtered to the signed-in user’s memberships

- `GET /customers`
  - if `company_id` is present, user must be allowed for that company
  - if `company_id` is absent, BFF aggregates customer lists only from allowed companies

- `POST /customers`
  - `company_id` must be present
  - user must be allowed for that company

- `GET/PATCH/PUT/DELETE /customers/:id`
  - BFF first resolves the customer’s `company_id`
  - request is blocked if the user does not have access to that company

- `POST/GET/DELETE /companies/:id/...`
  - company-scoped routes are blocked unless the signed-in user can access that company

## Limitation

This implementation currently stores only owner memberships created by company creation flow.

It does not yet include:

- inviting another user to a company
- multiple roles
- membership transfer
- membership admin UI

If those become required, move the membership store to a dedicated web-side table.
