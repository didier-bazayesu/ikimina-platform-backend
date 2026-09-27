#!/bin/bash

echo -e "\033[0;36mStarting commit process (13 commits) for Member Lifecycle & Payment Flagging...\033[0m"

echo -e "\n\033[0;33m[1/11] fix(db): update unique constraints to allow rejoining\033[0m"
git add ikmn-backend/migrations/1000000000000013_update-unique-constraints.ts
git add ikmn-backend/src/persistence/user.repository.ts
git commit -m "fix(db): update unique constraints to ignore EXITED users

- Added migration to drop simple UNIQUE constraints on email and phone
- Created partial unique indexes (WHERE status != 'EXITED')
- Updated UserRepository to respect the new constraints during account creation"

echo -e "\n\033[0;33m[2/11] feat(member): enforce EXITED member immutability\033[0m"
git add ikmn-backend/src/application/member/member.service.interface.ts
git add ikmn-backend/src/controller/member/member.controller.ts
git add ikmn-backend/src/module/member.module.ts
git commit -m "feat(member): enforce EXITED member immutability

- Prevented any status transitions out of the EXITED state
- Blocked modifications to EXITED member profiles
- Enhanced validation guards in MemberService to ensure terminal states are permanent"

echo -e "\n\033[0;33m[3/11] feat(member): allow EXITED members to rejoin under new UUID\033[0m"
git add ikmn-backend/src/application/member/member.service.ts
git commit -m "feat(member): allow EXITED members to rejoin under new UUID

- Allowed re-registration with the same email/phone if the old account is EXITED
- Generates a completely new UUID and fresh financial slate for the rejoining member
- Emits MEMBER_REJOINED audit log containing both the old and new user/member IDs"

echo -e "\n\033[0;33m[4/11] test(member): add robust unit tests for member lifecycle\033[0m"
git add ikmn-backend/src/application/member/member.service.test.ts
git commit -m "test(member): add robust unit tests for member lifecycle

- Added tests for SUSPENDED to EXITED transitions
- Added tests verifying EXITED accounts cannot be reactivated
- Added tests verifying rejoining with the same email creates a new account
- Fixed auditLogService invocation to use recordLog"

echo -e "\n\033[0;33m[5/11] refactor(backend): resolve linting and strict typing issues\033[0m"
git add ikmn-backend/src/application/payment/contribution.repository.mock.ts
git add later-fix.md
git commit -m "refactor(backend): resolve linting and strict typing issues

- Fixed @typescript-eslint/no-explicit-any warnings across test files
- Removed unused variables from repository mocks
- Tracked outstanding technical debt items in later-fix.md"

echo -e "\n\033[0;33m[6/11] feat(admin): polish UI for SUSPENDED and EXITED status badges\033[0m"
git add ikimina-platform-frontend/src/pages/admin/MembersPage.tsx
git commit -m "feat(admin): polish UI for SUSPENDED and EXITED status badges

- Updated Members table to display grey badges for EXITED members
- Updated Members table to display red badges for SUSPENDED members
- Ensured the detail view header matches the table styling exactly"

echo -e "\n\033[0;33m[7/11] test(e2e): add member lifecycle and backend automation scripts\033[0m"
git add e2e-lifecycle-test.sh test-member-lifecycle.ps1 test-member-lifecycle.sh test-all.ps1 test-all.sh
git commit -m "test(e2e): add member lifecycle and backend automation scripts

- Created e2e-lifecycle-test.sh to verify full Admin-Member state flow
- Bypassed NestJS double-nested JSON payload responses using Node parsing
- Added test-all helper scripts for local development"

echo -e "\n\033[0;33m[8/11] feat(notification): add PAYMENT_FLAGGED notification type\033[0m"
git add ikmn-backend/src/application/notification/notification-type.ts
git add ikmn-backend/src/application/notification/notification.listener.ts
git commit -m "feat(notification): add PAYMENT_FLAGGED notification type

- Added new PAYMENT_FLAGGED enum to NotificationType
- Implemented handlePaymentFlagged in NotificationListener to catch events
- Sends an action-required notification containing the admin's message to the member"

echo -e "\n\033[0;33m[9/11] feat(payment): implement flag endpoint for contribution payments\033[0m"
git add ikmn-backend/src/application/payment/contribution.service.interface.ts
git add ikmn-backend/src/application/payment/contribution.service.ts
git add ikmn-backend/src/controller/payment/contribution.controller.ts
git add ikmn-backend/src/controller/payment/flag-payment.dto.ts
git commit -m "feat(payment): implement flag endpoint for contribution payments

- Added FlagPaymentDto accepting reason and message fields
- Added PATCH /contribution-payments/:id/flag to ContributionController
- Implemented service logic to emit payment.flagged event without altering PENDING status"

echo -e "\n\033[0;33m[10/11] feat(penalty): implement flag endpoint for penalty payments\033[0m"
git add ikmn-backend/src/application/penalty/penalty.service.interface.ts
git add ikmn-backend/src/application/penalty/penalty.service.ts
git add ikmn-backend/src/application/penalty/penalty.service.test.ts
git add ikmn-backend/src/controller/penalty/penalty.controller.ts
git commit -m "feat(penalty): implement flag endpoint for penalty payments

- Added PATCH /penalty-payments/:id/flag to PenaltyController
- Implemented flagPenaltyPayment in PenaltyService to emit the same flagged event
- Injected EventEmitter2 and updated tests to prevent compilation errors"

echo -e "\n\033[0;33m[11/11] test(notification): add script to test payment flagging flow\033[0m"
git add test-notifications-flow.sh
git commit -m "test(notification): add script to test payment flagging flow

- Created test-notifications-flow.sh to test Admin flagging functionality
- Verifies the endpoint retains the payment status while dispatching the correct notification to the Member"

echo -e "\n\033[0;33m[12/13] feat(payment): implement backend record-on-behalf functionality\033[0m"
git add ikmn-backend/src/controller/payment/record-on-behalf.dto.ts
git add ikmn-backend/src/controller/payment/contribution.controller.ts
git add ikmn-backend/src/module/contribution.module.ts
git add ikmn-backend/src/application/payment/contribution.service.interface.ts
git add ikmn-backend/src/application/payment/contribution.service.ts
git add ikmn-backend/src/application/payment/contribution.service.test.ts
git commit -m "feat(payment): implement backend record-on-behalf functionality

- Created POST /contribution-payments/record-on-behalf endpoint restricted to Admins
- Developed logic to automatically waive or pay penalties alongside contributions
- Set transactions to instantly auto-approve, bypassing the standard PENDING state
- Updated module dependencies and expanded service unit tests to cover the new flow"

echo -e "\n\033[0;33m[13/13] feat(admin): build Record on behalf frontend modal UI\033[0m"
git add ikimina-platform-frontend/src/pages/admin/MembersPage.tsx
git commit -m "feat(admin): build Record on behalf frontend modal UI

- Built the interactive RecordOnBehalfModal inside MembersPage
- Connected UI form fields to the new Record-on-behalf backend endpoint
- Implemented dynamic fetching of unpaid obligations using React Query
- Configured instant cache invalidation to update dashboards post-approval"

echo -e "\n\033[0;36mPushing to remote repository...\033[0m"
git push

echo -e "\n\033[0;32mAll 13 commits completed and pushed successfully!\033[0m"
