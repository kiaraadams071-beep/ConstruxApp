# Security Specification for ConstruxTrack

## Data Invariants
1. An attendance record must contain a valid userId that matches the authenticated user and a valid projectId.
2. Only Admins can modify project status or create new projects.
3. Contractors can view projects and create reports for projects they are assigned to (for simplicity, we'll allow all signed-in users to see projects, but restring writes).
4. Attendance cannot be modified once created.
5. All IDs must be strictly formatted.
6. Timestamps must be server-validated.

## Dirty Dozen Payloads
1. **Identity Spoofing**: Attempting to create an attendance record for another user.
2. **State Shortcutting**: Attempting to change a project's status to 'completed' as a contractor.
3. **ID Poisoning**: Injecting long junk strings into document IDs.
4. **Shadow Updates**: Adding a field `isAdmin: true` to a user profile update.
5. **Time Spoofing**: Sending a `createdAt` timestamp from a month ago.
6. **Selfie Bypass**: Creating attendance without a `selfieUrl`.
7. **Coordinate Injection**: Sending invalid types for latitude/longitude.
8. **Admin Promotion**: A contractor trying to change their role to 'admin'.
9. **History Erasure**: Attempting to delete attendance logs.
10. **Orphaned Reports**: Creating a report for a non-existent project ID.
11. **Mass Unfiltered Reads**: Querying all users' PII without filters.
12. **Blanket Write**: Attempting to overwrite a whole project document with minimal data to bypass schema checks.

## Security Rules Plan
- `isValidId(id)` helper for path hardening.
- `isValidUser`, `isValidProject`, `isValidAttendance`, `isValidReport` helpers for pillar 2.
- `isOwner(userId)` and `isAdmin()` checks.
- `exists()` check for project existence during reporting.
