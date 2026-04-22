# Current CRM Features

This document lists the CRM features that are currently implemented across the
web app and the CRM service.

## Authentication and Access

- sign up with:
  - name
  - surname
  - email
  - phone number
  - gender
  - password
- sign in with email and password
- protected dashboard session handling with SuperTokens
- sign out flow
- account settings page for:
  - name
  - surname
  - phone number
  - gender
- signed-in user identity shown in the dashboard shell

## Company Management

- create company
- list accessible companies
- select company from company workspace
- company-specific dashboard navigation
- delete company
- when a company is deleted, its customers are deleted in the CRM service
- company creator audit fields:
  - creator user id
  - creator user name
- creator info displayed in the Companies UI

## Customer Management

- create customer
- list customers by selected company
- edit customer
- delete customer
- customer delete confirmation popup
- customer detail drawer
- customer records include:
  - name
  - first name
  - last name
  - email
  - phone
  - status
  - preferred language
  - country code
  - extra data

## Lead Management

- dedicated `/dashboard/leads` page
- company-scoped lead listing
- lead detail panel
- lead create flow
- lead edit flow
- lead delete flow
- backend filtering for leads by:
  - company
  - status
  - source
  - assignee
  - unassigned only
  - search query
- lead fields now include:
  - name
  - email
  - phone
  - notes
  - pipeline status
  - source
  - assignee user id
  - assignee user name
  - assignment method
  - value
  - conversion metadata
- pipeline stages:
  - `new`
  - `contacted`
  - `qualified`
  - `lost`
  - `converted`
- manual assignment support
- round-robin assignment support
- round-robin cursor stored in company `extra_data`
- lead conversion flow:
  - convert lead to customer
  - optionally create a deal during conversion
  - mark lead as converted
  - store converted customer/deal references on the lead

## Deal Support Related To Leads

- deal creation from lead conversion
- deal stage selection during conversion
- deal stages supported by CRM service:
  - `new`
  - `qualified`
  - `proposal`
  - `negotiation`
  - `won`
  - `lost`

## Deal Management

- dedicated `/dashboard/deals` page
- kanban-style deal board
- company-scoped deal listing
- deal detail popup
- deal create flow
- deal edit flow
- deal delete flow
- deal fields include:
  - name
  - stage
  - amount
  - currency
  - expected close date
  - termination date
  - won reason
  - loss reason
  - assignee user id
  - assignee user name
  - source lead id
  - extra data
- related records shown in UI:
  - company
  - customer
  - source lead
- deal stage history shown in UI
- shared deal comments stored in CRM service
- kanban cards show comment counts and key metadata
- deal backend filtering by:
  - company
  - customer
  - stage
  - assignee
  - search query

## Task Management

- dedicated `/dashboard/tasks` page
- publish a task to one teammate
- publish a task to everyone in the selected company
- broadcast tasks grouped in the UI by one publish action
- task response workflow:
  - pending
  - accepted
  - rejected
- task status workflow:
  - open
  - in progress
  - done
  - canceled
- `Open Tickets` acts as the response inbox
- `My Tasks` shows accepted work only
- accepted tasks move out of `Open Tickets` and into `My Tasks`
- task creator can delete a mistakenly published task
- broadcast delete removes all task copies in that publish group
- task visibility rules:
  - individual task is visible to creator and assignee only
  - creator can still monitor broadcast task outcomes
- task fields include:
  - title
  - note
  - due date
  - assignee
  - creator
  - response status
  - assignment scope
  - broadcast group id
  - extra data

## Customer Import

- CSV upload import flow
- CSV preview step
- field mapping step
- AI-assisted mapping suggestion through the CRM service
- import mapping approval
- apply approved mapping profile to CSV rows
- create customers from imported rows
- blocking progress modal during import

## Authorization and Tenant Scope

- web BFF validates signed-in session before CRM access
- company access is restricted by company membership
- customer access is restricted by company access
- company memberships are stored in SuperTokens User Metadata
- owner membership is created automatically when a user creates a company

## Data Rules and Integrity

- customer must belong to a company
- customer identity is company-scoped, not global
- the same email/phone can exist in different companies
- duplicate customer identity is prevented within the same company

## UI and Product Shell

- sidebar-driven dashboard layout
- separate pages for:
  - overview
  - companies
  - customer import
  - leads
  - deals
  - tasks
  - customers
  - account settings
- wide dashboard layout
- modal-based create/edit/delete flows
- backdrop click closes interactive popups

## CRM Service APIs Present

- companies
- customers
- leads
- deals
- calls
- tasks
- import profile routes:
  - suggest
  - suggest-from-csv
  - approve
  - active
  - apply

## Notes

- some CRM domains exist at API level before full web UI exists
- calls remain available at API level without a full dedicated dashboard page yet

## Recommended Next Improvements

- lead activity timeline
- stage history with timestamps
- lost reason capture
- duplicate detection against existing leads/customers
- bulk lead actions
- saved lead views like `My Leads` or `Unassigned`
- kanban-style lead board
- richer assignment rules beyond simple round-robin
