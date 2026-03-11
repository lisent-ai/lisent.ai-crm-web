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
- leads, deals, calls, and tasks are available in the service, but do not yet
  have full dedicated dashboard pages in the web app
