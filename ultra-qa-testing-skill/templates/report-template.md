# Test Report — {date}

## Environment
- **Target:** {target_url}
- **Browser:** {browser_version}
- **Session:** {session_id}
- **Timestamp:** {timestamp}

## Summary
| Metric | Value |
|--------|-------|
| Total Tests | {total} |
| Passed | {passed} |
| Failed | {failed} |
| Skipped | {skipped} |
| Duration | {duration} |
| Pass Rate | {pass_rate}% |

## Results

### {status_icon} {test_name}
- **Status:** {status}
- **Duration:** {duration}
- **Priority:** {priority}
{if_failed}
- **Error:** {error_message}
{endif}

#### Steps
{for_each_step}
{step_status} Step {step_id}: {description} ({step_duration})
{if_screenshot}Screenshot: {screenshot_path}{endif}
{if_failed}Error: {step_error}{endif}
{end_for_each}

#### Evidence
- Video: {video_path}
- Screenshots: {screenshots_dir}

---

## Failed Tests Detail

{for_each_failed_test}
### {test_name}
- **Expected:** {expected}
- **Actual:** {actual}
- **Step Failed:** {failed_step}

#### Reproduction Steps
{repro_steps}

#### Screenshots
{screenshots}

#### Video
{video_path}

---
{end_for_each_failed_test}

## Passed Tests

{for_each_passed_test}
- ✅ {test_name} ({duration})
{end_for_each_passed_test}

## Artifacts
- Full results: `reports/results.json`
- Screenshots: `screenshots/`
- Videos: `videos/`
