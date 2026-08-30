# DRB Horizon

Create a premium, production-quality Hotel Property Management System (PMS) frontend for DRB Hotel.

The application should be a complete, highly polished hotel management dashboard with dummy/mock data and working demo logins only. Do not build backend functionality or real integrations. Every major screen, button, table, filter, modal, calendar, dashboard card, status indicator, and workflow should feel realistic and interactive using mock data.

BRAND & DESIGN DIRECTION

Hotel name: DRB Hotel

Create a sophisticated, modern hospitality SaaS interface — luxury hotel aesthetic combined with a clean enterprise management dashboard.

The UI should feel:

Premium

Elegant

Spacious

Extremely polished

Easy for hotel staff to operate

Modern but not overly futuristic

Suitable for desktop/tablet hotel operations

Visually rich without becoming cluttered

Use a refined hotel-inspired visual language with:

Beautiful room illustrations/icons

Elegant status indicators

Soft shadows

Rounded cards

Subtle gradients

High-quality typography

Excellent spacing

Clear hierarchy

Premium charts

Smooth hover states

Clean tables

Professional modals and drawers

Consistent iconography

The Room Status interface should be a major visual highlight.

Create beautiful visual room cards/icons showing statuses such as:

🟢 Vacant Clean
🔵 Occupied
🟠 Vacant Dirty
🟡 Cleaning
🔴 Out of Order
⚫ Out of Service
🟣 Reserved
🟤 Maintenance

Room cards should visually communicate the status immediately through a combination of:

Room illustration/icon

Room number

Room type

Guest name when occupied

Floor

Status badge

Check-in/check-out time

Housekeeping indicator

Small visual amenities

Current rate where appropriate

Include a beautiful hotel floor-plan / room-grid style visualization as an alternative to the standard table view.

DEMO LOGIN

Create a beautiful login page for DRB Hotel PMS.

Display:

DRB HOTEL
Property Management System

Demo accounts:

General Manager

Username: manager

Password: demo123

Front Desk

Username: frontdesk

Password: demo123

Housekeeping

Username: housekeeping

Password: demo123

Accounts

Username: accounts

Password: demo123

Provide a polished login experience with role-based demo access.

After login, show the appropriate dashboard/navigation experience for the selected role.

MAIN APPLICATION STRUCTURE

Create a persistent professional sidebar navigation.

Main Navigation

Dashboard

Reservations

Front Desk

Rooms

Guests

Housekeeping

Billing & Finance

Revenue

POS / Restaurant

Channel Manager

Staff

Reports

Compliance

Notifications

Bottom section:

Help & Support

Settings

Current user profile

Logout

Include a collapsible sidebar.

Top navigation should contain:

Global search

Current hotel/date

Notifications

Quick Add button

User profile

Role indicator

1. DASHBOARD

Create a visually impressive hotel management dashboard.

Header:

Good Morning, Manager
DRB Hotel — Today's Operations

Show KPI cards:

Occupancy

Today's Arrivals

Today's Departures

Rooms Available

ADR

RevPAR

Today's Revenue

Outstanding Dues

Include percentage comparisons with previous day/week.

Occupancy Visualization

Large beautiful occupancy chart showing:

Occupied

Reserved

Vacant

Out of Order

Today's Operations

Create three prominent sections:

Arrivals

Guest

Room

ETA

Booking source

Payment status

Check-in button

Departures

Guest

Room

Checkout time

Folio balance

Checkout button

Housekeeping

Rooms to clean

Cleaning

Ready

Maintenance

Room Status Overview

Create a beautiful miniature room grid with the hotel's 25 rooms.

Every room should be represented visually.

Example:

101 🟢
102 🔵
103 🟠
104 🟢
105 🟣
201 🔵
202 🟢
203 🔴

Clicking a room opens its room details.

2. RESERVATIONS

Create a complete reservation management interface.

Header:

Reservations

Actions:

New Reservation

Group Booking

Block Rooms

Waitlist

Include tabs:

All

Confirmed

Tentative

Checked In

Checked Out

Cancelled

No Show

Waitlist

Create a powerful reservation table with:

Confirmation #

Guest

Room

Room Type

Arrival

Departure

Nights

Rate Plan

Source

Payment

Status

Actions

Include:

Search

Date filter

Status filter

Booking source filter

Room type filter

3. RESERVATION CREATION

Create a beautiful multi-step booking workflow.

Step 1 — Guest

Existing guest search

New guest

Guest details

ID proof

Contact information

Step 2 — Stay

Arrival

Departure

Number of guests

Room type

Available rooms

Rate plan

Step 3 — Pricing

Show:

Room rate

Taxes

Discount

Service charge

Total

Deposit

Step 4 — Confirmation

Show complete booking summary.

Actions:

Hold Reservation
Confirm Booking

Show a simulated reservation confirmation.

4. FRONT DESK

Create a dedicated operational front desk screen.

Large visual controls:

Today's Arrivals | Today's Departures | In-House Guests | Walk-ins

Create:

Check-In Queue

Show guest cards with:

Guest name

Booking number

Room

Arrival

ID status

Payment status

Button:

Check In

Create a polished check-in modal with:

Guest information

ID document preview

Room assignment

Payment

Deposit

Signature area

Check-in confirmation

Walk-In Booking

Create a fast walk-in workflow.

Room Transfer

Allow demo room transfers.

Upgrade / Downgrade

Show available room types and price differences.

5. ROOMS

Make this one of the most beautiful sections of the application.

Header:

Rooms & Inventory

Views:

Room Grid

Floor View

Tape Chart

List View

Create a visually rich 25-room hotel room grid.

Organize:

Ground Floor

101 — Deluxe
102 — Deluxe
103 — Standard
104 — Standard
105 — Suite

First Floor

201 — Deluxe
202 — Deluxe
203 — Standard
204 — Standard
205 — Suite

Continue until all 25 rooms are represented.

Each room card should look like a premium miniature hotel room card.

Example visual:

101
Deluxe King

🟢 Vacant Clean

Floor 1
King Bed
2 Guests
₹4,500

Clicking the room opens a detailed room drawer.

Room Detail

Show:

Room image/illustration

Room number

Room type

Current status

Current guest

Booking

Rate

Housekeeping status

Maintenance

Amenities

Mini-bar

Linen

Room history

Actions:

Assign Guest

Change Status

Mark Clean

Mark Dirty

Maintenance

Block Room

6. TAPE CHART

Create a professional hotel reservation tape chart.

Vertical axis:

Rooms

Horizontal axis:

Dates

Bookings should appear as beautiful horizontal reservation blocks.

Different booking states should be visually distinguishable.

Allow:

Drag simulation

Room transfer simulation

Booking extension simulation

Room assignment

Include today marker.

7. GUEST CRM

Create:

Guest Management

Dashboard cards:

Total Guests

Returning Guests

VIP Guests

Corporate Guests

Guest table:

Name

Contact

Country

Last Stay

Total Stays

Total Spend

Guest Type

VIP

Actions

Create a beautiful guest profile page.

Sections:

Overview

Stay History

Preferences

Billing

Communication

Feedback

Complaints

Show example preferences:

King bed

High floor

Non-smoking

Extra pillow

Vegetarian

Include VIP and repeat guest visual indicators.

8. HOUSEKEEPING

Create an operational housekeeping dashboard.

Top cards:

Rooms to Clean

Cleaning

Ready

Inspected

Maintenance

Create room cleaning board:

Dirty → Assigned → Cleaning → Inspection → Ready

Housekeepers should appear as team cards.

Example:

Priya
12 rooms assigned
8 completed
4 remaining

Create housekeeping task cards.

Each card:

Room 204
Deluxe King
Checkout 11:00 AM
Deep Clean
Assigned: Priya

Actions:

Start Cleaning

Mark Complete

Inspection

Report Issue

Include housekeeping checklist:

☑ Bed linen
☑ Towels
☑ Bathroom
☑ Toiletries
☑ Floor
☑ Dusting
☑ Minibar
☑ Final inspection

9. BILLING & FINANCE

Create a premium financial dashboard.

KPI cards:

Today's Revenue

Room Revenue

F&B Revenue

Taxes

Outstanding

Refunds

Create folio interface.

Show:

Room Charge
Breakfast
Restaurant
Laundry
Minibar
Taxes
Discount
Payments
Balance

Allow demo actions:

Add Charge

Add Payment

Split Folio

Refund

Generate Invoice

Create GST invoice preview.

10. NIGHT AUDIT

Create a dedicated Night Audit screen.

Show:

Business Date

Occupancy

Room Revenue

F&B Revenue

Tax

Payments

Outstanding

Cash Balance

Audit checklist:

✓ Room charges posted
✓ Restaurant charges posted
✓ Payments reconciled
✓ No-show processed
✓ Taxes calculated
✓ Revenue verified

Large action:

Run Night Audit

Use a confirmation modal before completion.

11. REVENUE MANAGEMENT

Create a beautiful revenue intelligence dashboard.

Show:

Occupancy %

ADR

RevPAR

Room Revenue

Forecast

Charts:

Occupancy trend

ADR trend

RevPAR trend

Revenue forecast

Create a rate calendar.

Rows:

Room Type

Columns:

Dates

Cells show:

₹4,500
₹5,000
₹6,000

Include:

Weekend pricing

Seasonal pricing

High-demand dates

Low-demand dates

12. CHANNEL MANAGER

Create a channel management dashboard.

Show channel cards:

Booking.com

MakeMyTrip

Goibibo

Agoda

Airbnb

Direct Website

Each card shows:

Connected / Demo Connected

Bookings

Revenue

Commission

Sync status

Create a beautiful Rate & Inventory Sync interface.

Include simulated sync controls:

Sync Now

Show last synchronization time.

Create rate parity comparison:

DRB Hotel
Booking.com
MakeMyTrip
Goibibo
Agoda
Direct

13. POS / RESTAURANT

Create a modern restaurant POS interface.

Categories:

Breakfast

Starters

Main Course

Beverages

Desserts

Room Service

Create beautiful food item cards.

Each item should show:

Image placeholder

Name

Price

Category

Create order panel.

Show:

Table / Room
Guest
Items
Quantity
Subtotal
Tax
Total

Actions:

Send KOT
Charge to Room
Pay Now

14. BANQUET / EVENTS

Create an optional banquet management screen.

Show:

Event calendar

Event bookings

Hall availability

Event revenue

Example:

DRB Grand Hall

Wedding
150 Guests
18 Aug
₹85,000

Create event booking modal.

15. STAFF

Create staff management dashboard.

Show:

Total Staff

Present

Absent

On Leave

Current Shift

Create staff cards with:

Photo/avatar

Name

Department

Role

Shift

Attendance

Tasks

Create shift scheduling interface.

16. REPORTS

Create a professional reporting center.

Categories:

Front Office

Arrival Report

Departure Report

Occupancy Report

Guest History

Revenue

Daily Revenue

Room Revenue

ADR

RevPAR

Revenue by Source

Finance

Payment Report

Outstanding

GST Report

Tax Report

Expense Report

Operations

Housekeeping

Maintenance

Staff Performance

Every report should have:

Date range

Filters

Preview

Export PDF

Export Excel

Use mock data.

17. COMPLIANCE

Create a dedicated compliance dashboard.

Sections:

Guest ID Documents

Foreign Guest Records

C-Form Status

GST

Invoices

Audit Logs

Data Security

Create status indicators:

Verified
Pending
Needs Review

Create mock Aadhaar/passport document previews without exposing real personal information.

18. NOTIFICATIONS

Create notification center.

Examples:

🔔 New booking received
🔔 Room 203 needs cleaning
🔔 Guest checkout in 30 minutes
🔔 Payment pending
🔔 VIP guest arriving
🔔 Maintenance issue reported
🔔 OTA reservation received

Use realistic timestamps.

19. SETTINGS

Create complete settings interface.

Sections:

Hotel Profile

Room Types

Rooms

Rate Plans

Taxes

Cancellation Policies

Payment Methods

Users & Roles

Notifications

Integrations

Audit Logs

20. QUICK ACTION SYSTEM

Create a global Quick Add (+) button available throughout the application.

Options:

New Reservation

Walk-in Guest

Check-in

Check-out

Add Payment

Add Guest

Maintenance Request

Housekeeping Task

Restaurant Order

Expense

IMPORTANT INTERACTION REQUIREMENTS

The application must feel like a real working PMS even though everything uses dummy data.

Implement realistic frontend interactions:

Search

Filtering

Sorting

Tabs

Dropdowns

Modals

Drawers

Date pickers

Status changes

Room assignment

Booking creation

Check-in

Check-out

Payment entry

Folio updates

Housekeeping status changes

Maintenance requests

Notifications

Report filters

Dashboard updates

When a user performs an action, update the visible demo data and UI state appropriately.

Do not leave major buttons as dead/non-functional placeholders.

DEMO DATA

Populate the application with realistic dummy hotel data.

Hotel:

DRB Hotel

25 rooms.

Include realistic:

Guest names

Room numbers

Reservations

Booking sources

Room rates

Payments

Restaurant orders

Housekeeping tasks

Staff

Expenses

Maintenance tickets

Do not use real people's personal information.

RESPONSIVE DESIGN

The primary experience should be optimized for:

Desktop

Hotel reception monitors

Tablets

The layout must remain usable on smaller screens.

FINAL QUALITY STANDARD

This should not look like a generic admin dashboard.

It should look like a premium commercial hotel PMS product that could be demonstrated to a hotel owner tomorrow.

Prioritize:

Beautiful room visualization + excellent dashboard + fast front-desk workflows + polished reservation experience + strong housekeeping interface + premium financial/revenue dashboards.

Every page should share the same visual language and feel like one cohesive product.

Use realistic empty states, loading states, confirmation dialogs, success messages, error states, tooltips, badges, status indicators, hover effects and subtle transitions.

The finished frontend should feel luxury, professional, modern, operationally practical, and exceptionally polished, with DRB Hotel branding throughout.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/efdcdbf4-11f6-473f-bd78-88ba0bc67065).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
