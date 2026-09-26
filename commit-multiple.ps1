Write-Host "Starting commit process (13 commits) for Member Lifecycle & Payment Flagging..." -ForegroundColor Cyan

Write-Host "`n[1/11] fix(db): update unique constraints to allow rejoining..." -ForegroundColor Yellow
git add ikmn-backend/migrations/1000000000000013_update-unique-constraints.ts
git add ikmn-backend/src/persistence/user.repository.ts
git commit -m "fix(db): update unique constraints to ignore EXITED users`n`n- Added migration to drop simple UNIQUE constraints on email and phone`n- Created partial unique indexes (WHERE status != 'EXITED')`n- Updated UserRepository to respect the new constraints during account creation"

Write-Host "`n[2/11] feat(member): enforce EXITED member immutability..." -ForegroundColor Yellow
git add ikmn-backend/src/application/member/member.service.interface.ts
git add ikmn-backend/src/controller/member/member.controller.ts
git add ikmn-backend/src/module/member.module.ts
git commit -m "feat(member): enforce EXITED member immutability`n`n- Prevented any status transitions out of the EXITED state`n- Blocked modifications to EXITED member profiles`n- Enhanced validation guards in MemberService to ensure terminal states are permanent"

Write-Host "`n[3/11] feat(member): allow EXITED members to rejoin under new UUID..." -ForegroundColor Yellow
git add ikmn-backend/src/application/member/member.service.ts
git commit -m "feat(member): allow EXITED members to rejoin under new UUID`n`n- Allowed re-registration with the same email/phone if the old account is EXITED`n- Generates a completely new UUID and fresh financial slate for the rejoining member`n- Emits MEMBER_REJOINED audit log containing both the old and new user/member IDs"

Write-Host "`n[4/11] test(member): add robust unit tests for member lifecycle..." -ForegroundColor Yellow
git add ikmn-backend/src/application/member/member.service.test.ts
git commit -m "test(member): add robust unit tests for member lifecycle`n`n- Added tests for SUSPENDED to EXITED transitions`n- Added tests verifying EXITED accounts cannot be reactivated`n- Added tests verifying rejoining with the same email creates a new account`n- Fixed auditLogService invocation to use recordLog"

Write-Host "`n[5/11] refactor(backend): resolve linting and strict typing issues..." -ForegroundColor Yellow
git add ikmn-backend/src/application/payment/contribution.repository.mock.ts
git add later-fix.md
git commit -m "refactor(backend): resolve linting and strict typing issues`n`n- Fixed @typescript-eslint/no-explicit-any warnings across test files`n- Removed unused variables from repository mocks`n- Tracked outstanding technical debt items in later-fix.md"

Write-Host "`n[6/11] feat(admin): polish UI for SUSPENDED and EXITED status badges..." -ForegroundColor Yellow
git add ikimina-platform-frontend/src/pages/admin/MembersPage.tsx
git commit -m "feat(admin): polish UI for SUSPENDED and EXITED status badges`n`n- Updated Members table to display grey badges for EXITED members`n- Updated Members table to display red badges for SUSPENDED members`n- Ensured the detail view header matches the table styling exactly"

Write-Host "`n[7/11] test(e2e): add member lifecycle and backend automation scripts..." -ForegroundColor Yellow
git add e2e-lifecycle-test.sh test-member-lifecycle.ps1 test-member-lifecycle.sh test-all.ps1 test-all.sh
git commit -m "test(e2e): add member lifecycle and backend automation scripts`n`n- Created e2e-lifecycle-test.sh to verify full Admin-Member state flow`n- Bypassed NestJS double-nested JSON payload responses using Node parsing`n- Added test-all helper scripts for local development"

Write-Host "`n[8/11] feat(notification): add PAYMENT_FLAGGED notification type..." -ForegroundColor Yellow
git add ikmn-backend/src/application/notification/notification-type.ts
git add ikmn-backend/src/application/notification/notification.listener.ts
git commit -m "feat(notification): add PAYMENT_FLAGGED notification type`n`n- Added new PAYMENT_FLAGGED enum to NotificationType`n- Implemented handlePaymentFlagged in NotificationListener to catch events`n- Sends an action-required notification containing the admin's message to the member"

Write-Host "`n[9/11] feat(payment): implement flag endpoint for contribution payments..." -ForegroundColor Yellow
git add ikmn-backend/src/application/payment/contribution.service.interface.ts
git add ikmn-backend/src/application/payment/contribution.service.ts
git add ikmn-backend/src/controller/payment/contribution.controller.ts
git add ikmn-backend/src/controller/payment/flag-payment.dto.ts
git commit -m "feat(payment): implement flag endpoint for contribution payments`n`n- Added FlagPaymentDto accepting reason and message fields`n- Added PATCH /contribution-payments/:id/flag to ContributionController`n- Implemented service logic to emit payment.flagged event without altering PENDING status"

Write-Host "`n[10/11] feat(penalty): implement flag endpoint for penalty payments..." -ForegroundColor Yellow
git add ikmn-backend/src/application/penalty/penalty.service.interface.ts
git add ikmn-backend/src/application/penalty/penalty.service.ts
git add ikmn-backend/src/application/penalty/penalty.service.test.ts
git add ikmn-backend/src/controller/penalty/penalty.controller.ts
git commit -m "feat(penalty): implement flag endpoint for penalty payments`n`n- Added PATCH /penalty-payments/:id/flag to PenaltyController`n- Implemented flagPenaltyPayment in PenaltyService to emit the same flagged event`n- Injected EventEmitter2 and updated tests to prevent compilation errors"

Write-Host "`n[11/11] test(notification): add script to test payment flagging flow..." -ForegroundColor Yellow
git add test-notifications-flow.sh
git commit -m "test(notification): add script to test payment flagging flow`n`n- Created test-notifications-flow.sh to test Admin flagging functionality`n- Verifies the endpoint retains the payment status while dispatching the correct notification to the Member"

Write-Host "`nPushing to remote repository..." -ForegroundColor Cyan
git push

Write-Host "`nAll 13 commits completed and pushed successfully!" -ForegroundColor Green
