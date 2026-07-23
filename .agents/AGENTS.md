# UI & PRODUCTION COMPLETENESS CONTRACT

The application must be treated as a production-ready application, not a prototype.

Do not assume that only documented business features are required.

Every application must also include the complete set of standard production UI and UX elements expected by users.

Never leave placeholder content.

Never leave unfinished screens.

Never leave inaccessible navigation.

Never leave missing actions.

Every screen must be fully usable.

---

## Mandatory UI Audit

Before implementing or completing any screen, perform a UI audit.

Verify that the screen contains every standard element expected for its purpose.

If something is missing, implement it even if it was not explicitly mentioned in the documentation, provided it does not conflict with the documented requirements.

---

## Navigation Requirements

The application must include complete navigation.

Examples include:

* Home
* Back
* Close
* Cancel
* Save
* Edit
* Delete
* Search
* Filter
* Refresh
* Profile
* Settings
* Help
* About
* Notifications
* Logout / Sign Out
* Account
* Privacy
* Terms
* Contact Support

Only display actions appropriate to the user's role and current context.

---

## Profile Screen Requirements

Every authenticated application must include a proper profile section.

The profile should include, where appropriate:

* Profile photo
* User name
* User role
* Email
* Phone number
* Digital ID status
* Language selection
* Theme selection (if supported)
* Notification preferences
* Privacy settings
* Security settings
* Change password (if applicable)
* Connected devices (if applicable)
* Active sessions (if applicable)
* Delete account
* Logout / Sign Out

Logout must:

* Clear authentication tokens
* Clear cached sensitive data
* End the active session
* Redirect to the login screen
* Require confirmation if there is unsaved work

---

## Settings Screen

Include a production-quality settings screen containing only relevant options for the user's role.

Possible categories include:

* Account
* Security
* Privacy
* Notifications
* Language
* Accessibility
* Data usage
* Offline settings
* Permissions
* About
* App version
* Licenses
* Contact support

---

## Replace Every Placeholder

Never leave:

* John Doe
* Test User
* Demo User
* Sample Hospital
* Hospital ABC
* Police Station 1
* Lorem Ipsum
* Dummy Text
* Placeholder Images
* Random Icons
* Example Notifications
* Example Trips
* Example Incidents

Never use fictional production data.

If no real data exists yet:

* Show an empty state.
* Explain why the list is empty.
* Provide the appropriate call to action.

---

## Empty States

Every list must have an empty state.

Instead of fake records, show messages such as:

* No active trips found.
* No incidents reported.
* No notifications available.
* No emergency contacts added.
* No medical information added.

Each empty state should guide the user to the next action.

---

## Loading States

Every asynchronous operation must include:

* Loading indicator
* Disabled controls while processing
* Retry option when appropriate

---

## Error States

Every screen must handle:

* No Internet
* Timeout
* Unauthorized
* Forbidden
* Server Error
* Validation Error
* Missing Permissions
* GPS Disabled
* Notification Permission Denied

Provide clear recovery guidance.

---

## Button Audit

For every screen, verify that all expected actions are present.

Each button must define:

* Purpose
* Visibility
* Permission requirements
* Enabled/disabled state
* Confirmation (if destructive)
* API or local action
* Success behavior
* Failure behavior

Do not omit common actions simply because they were not individually listed in the documentation.

---

## Accessibility

Every interactive element must have:

* Accessible label
* Proper touch target size
* Keyboard support (where applicable)
* Screen reader support
* Sufficient color contrast
* Visible focus state

---

## Production Review Before Completing a Screen

Before marking any screen complete, verify:

* No dummy content
* No placeholder names
* No placeholder images
* No unfinished buttons
* No dead navigation
* No broken routes
* No unreachable screens
* No unused components
* No missing loading state
* No missing empty state
* No missing error state
* No missing confirmation dialogs for destructive actions
* No missing logout path
* No missing settings access
* No missing profile access

---

## Final Rule

Before considering any feature complete, perform a "Production Readiness Review."

Ask:

> "If this application were released to real users today, would every screen feel complete, intuitive, and production-ready without exposing placeholders, missing actions, or unfinished UI?"

If the answer is **no**, continue refining the implementation until the feature meets production-quality expectations.
