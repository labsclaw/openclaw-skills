# Issue Taxonomy

## Contents
- Severity levels
- Issue categories
- Exploration checklist

---

## Severity Levels

| Level | Name | Description | Action |
|-------|------|-------------|--------|
| P0 | **Critical** | Data loss, security vulnerability, complete feature failure, legal/compliance risk | Fix immediately |
| P1 | **High** | Major feature broken, no workaround available, affects core user flow | Fix before release |
| P2 | **Medium** | Feature degraded, workaround exists, affects secondary flow | Fix in next sprint |
| P3 | **Low** | Cosmetic issue, minor UX friction, non-blocking | Backlog |
| P4 | **Info** | Enhancement suggestion, nice-to-have, documentation gap | Consider |

## Issue Categories

| Category | Examples |
|----------|----------|
| **Functional** | Button doesn't work, form submission fails, data not saved |
| **UX** | Confusing flow, missing feedback, accessibility barrier |
| **Visual** | Layout broken, text clipped, misalignment, color contrast |
| **Performance** | Slow load, unresponsive, memory leak |
| **Security** | XSS, CSRF, data exposure, auth bypass |
| **Data** | Wrong data displayed, data corruption, missing data |
| **Console** | JS errors, failed requests, warnings |
| **Compatibility** | Browser-specific, responsive breakpoint issues |

## Exploration Checklist

### Navigation
- [ ] All nav links work
- [ ] Back/forward browser buttons work
- [ ] Deep linking works
- [ ] 404 page is helpful
- [ ] Redirects are correct

### Forms
- [ ] Required field validation
- [ ] Email format validation
- [ ] Password strength validation
- [ ] Submit with empty fields
- [ ] Submit with invalid data
- [ ] Success feedback after submit
- [ ] Error messages are clear
- [ ] Form reset works

### Authentication
- [ ] Login with valid credentials
- [ ] Login with invalid credentials
- [ ] Logout flow
- [ ] Session timeout
- [ ] Password reset
- [ ] Remember me

### Data
- [ ] Create new record
- [ ] Edit existing record
- [ ] Delete with confirmation
- [ ] List/search/filter
- [ ] Pagination
- [ ] Empty states
- [ ] Error states

### Edge Cases
- [ ] Very long text input
- [ ] Special characters
- [ ] Rapid clicking
- [ ] Browser resize
- [ ] Offline behavior
- [ ] Console errors on every page

### Accessibility
- [ ] Keyboard navigation
- [ ] Screen reader labels
- [ ] Color contrast
- [ ] Focus indicators
- [ ] Error announcements
