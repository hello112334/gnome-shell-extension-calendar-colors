# Visible UI Layout Refresh

## Current Task

- [x] Record the user report that the recent UI refresh did not materially change the calendar or notification layout.
- [x] Inspect the current split-notifications implementation and confirm that the existing revision mostly changes minor notification-menu cosmetics while leaving the stock DateMenu layout intact.
- [x] Add a split-specific DateMenu popover style hook so the calendar popup layout changes visibly when notifications are detached.
- [x] Upgrade the detached notifications menu header and row presentation so it reads as a distinct notifications surface.
- [x] Verify schema compilation and review the final diff; live visual confirmation is still required in GNOME Shell.

## Plan

- [x] Inspect the current extension and shell theme structure to find reversible DateMenu layout hooks.
- [x] Add/remove split-specific layout classes in `extension.js` without changing the unsplit path.
- [x] Implement stronger calendar-popup and detached-notification layout styling in `stylesheet.css`.
- [x] Run local verification and record the result.

## Spec

When `separate-notifications-menu` is enabled:

- The calendar popup must look intentionally different, not just slightly restyled after the message list is hidden.
- The calendar/today/events stack should present as a tighter, more focused single-column surface.
- The detached notifications popover should expose clearer state in its header and a more deliberate row layout.
- Turning the setting off or disabling the extension must remove the custom split-mode layout classes cleanly.

## Review

- `extension.js` now adds a split-only `calendar-colors-split-datemenu-popover` class to the stock DateMenu popup and removes it cleanly when split mode is disabled.
- The detached notifications button now exposes header state for unread count / Do Not Disturb and renders a stronger row layout with a dedicated icon well and source label.
- `stylesheet.css` now gives the split DateMenu popup a visibly tighter card-style calendar/today/events layout instead of leaving the stock column almost unchanged.
- `glib-compile-schemas schemas` succeeded.
- `git diff --check` succeeded.
- `scripts/reload-extension.sh` succeeded after rerunning outside the sandbox so it could write to the live dconf session.
- `journalctl --user --since '3 minutes ago' | rg 'calendar-colors|failed to split notifications menu|TypeError|ReferenceError|JS ERROR|openbar@neuromorph'` returned no matches after the reload.
- Manual visual confirmation of the refreshed calendar popup and detached notifications menu is still pending in the live shell.

# Notification Ghost Lines

## Current Follow-up

- [x] Record the user clarification that the remaining vertical lines inside the datetime block correspond to notification rows, with one line per notification.
- [x] Re-check the split path and identify that the stock `DateMenu` `_messageList` subtree is still structurally active enough to paint row separators.
- [x] Replace the current width/opacity collapse with a non-destructive hidden-state override for the stock `_messageList`.
- [ ] Verify that split notifications still render in the detached header menu after the stronger hide/show override.
- [ ] Visually confirm that the notification-count ghost lines inside the datetime block are gone.

## Plan

- [x] Re-interpret the artifact as hidden notification-row separators inside the date-menu popover rather than the top-bar seam.
- [x] Re-check the shell theme and confirm `.message-list` keeps its own directional border/margins while nested message sections keep per-row spacing.
- [x] Patch the split-notifications path to keep the stock `_messageList` actor tree intact but force the actor hidden while split mode is enabled.
- [x] Restore the original message-list visibility cleanly when split mode is disabled or the extension is turned off.
- [x] Verify schema compilation and extension reload behavior, then record the result.

## Spec

When `separate-notifications-menu` is enabled:

- The original `DateMenu` `_messageList` subtree must remain attached so shell/extension code can still traverse it.
- The stock `_messageList` must not stay visible enough to paint one separator or border fragment per notification row inside the datetime block.
- Detached notifications must continue to render from `Main.messageTray` in the dedicated header button.
- Disabling split mode or disabling the extension must restore the stock `_messageList` visibility behavior cleanly.

## Review

- The user clarified that the leftover artifact scales with notification count, which points to hidden notification rows rather than the top-bar indicator slot.
- `/usr/share/gnome-shell/theme/Yaru-dark/gnome-shell.css` shows `.message-list` still carries its own border and directional padding while `.message-list-section` and `.message-list-section-list` keep row spacing, so collapsing only width/opacity is not a strong enough guarantee that row separators disappear.
- `extension.js` now keeps the stock `DateMenu` `_messageList` attached but hides it non-destructively, and re-hides it if shell code toggles visibility while split mode is on.
- `stylesheet.css` now zeroes any fallback `.message-list` border/margin/padding and nested section spacing under `.calendar-colors-split-message-list`, so no residual per-notification row spacing should remain if the actor briefly becomes visible.
- `glib-compile-schemas schemas` succeeded.
- `scripts/reload-extension.sh` succeeded after rerunning outside the sandbox so it could talk to the live dconf/GNOME Shell session.
- `journalctl --user --since '2 minutes ago' | rg 'calendar-colors|failed to split notifications menu|TypeError|ReferenceError|JS ERROR|openbar@neuromorph'` returned no fresh matches after the live reload.
- Manual visual confirmation of the popup artifact removal and detached notification contents is still pending in the live shell.

# DateTime Indicator Artifact

## Current Follow-up

- [x] Record the user correction that the remaining artifact is on the left side inside the datetime block itself.
- [x] Re-check the shell theme and identify the most likely actor: the built-in `.messages-indicator` inside `.clock-display-box`.
- [x] Collapse the built-in indicator actor and its residual clock-box spacing only while `separate-notifications-menu` is enabled.
- [x] Record the user correction that the CSS-only collapse did not remove the artifact and that split notifications no longer show content.
- [x] Identify the split-notification content bug: the detached menu was backed by a fresh empty actor instead of live `Main.messageTray` data.
- [x] Identify the insertion instability: Open Bar throws while `Main.panel.addToStatusArea()` rescans the already-modified DateMenu structure.
- [x] Patch the detached notifications button to render directly from `Main.messageTray` and stop using `addToStatusArea()` for insertion.
- [ ] Log out and verify the new split-menu code path in a fresh GNOME Shell session.
- [ ] Visually confirm that the left-side glyph inside the datetime block is gone.

## Plan

- [x] Re-evaluate the report against the actual left-side datetime artifact instead of the outer split-button seam.
- [x] Inspect the shell/Open Bar CSS for `clock-display` internals and identify the leftover `messages-indicator` path.
- [x] Add a split-specific CSS override that removes the `messages-indicator` footprint and the `clock-display-box` spacing without affecting the unsplit clock.
- [x] Reload the extension and check logs, then record the result.
- [x] Inspect the shell/Open Bar failure path and identify that `Main.panel.addToStatusArea()` triggers Open Bar against an already-modified DateMenu.
- [x] Replace the empty detached notification list with a live `Main.messageTray`-backed menu and reorder insertion so DateMenu is only collapsed after the new button is in place.
- [ ] Log out and verify the new code path in a fresh shell session because this Wayland session did not reliably reload the updated module.

## Spec

When `separate-notifications-menu` is enabled:

- The built-in notification indicator must not remain visible inside the left side of the top-bar datetime button.
- The datetime label must not keep a dead spacing gap where the hidden built-in indicator used to sit.
- The override must apply only to the split datetime button and must not change the stock unsplit clock.
- Disabling the option or the extension must restore GNOME Shell's normal datetime indicator behavior.
- The detached notifications button must show the same live notification content the stock DateMenu would have shown.

## Review

- `/usr/share/gnome-shell/theme/Yaru-dark/gnome-shell.css` shows `.clock-display-box` keeps internal spacing and `.messages-indicator` is a child of `#panel .panel-button.clock-display`, which matches the user-described left-side artifact inside the datetime block.
- `/run/user/1000/io.github.neuromorph.openbar/stylesheet.css` does not add a separate inner icon there; it mainly styles the outer panel button and the `.clock` label, so the remaining artifact is most likely GNOME Shell's own `messages-indicator`.
- `stylesheet.css` now collapses `.messages-indicator` and forces `.clock-display-box` spacing to `0` only under `.calendar-colors-split-date-button`, so the unsplit clock path is unaffected.
- `glib-compile-schemas schemas` succeeded.
- `scripts/reload-extension.sh` succeeded against the live session when rerun outside the sandbox.
- `journalctl --user --since '2 minutes ago' | rg 'calendar-colors|failed to split notifications menu|TypeError|ReferenceError|JS ERROR'` showed no fresh shell or extension errors after the live reload.
- The user reported that the left-side datetime artifact is still visible and that notifications no longer appear in the detached notifications menu, so the next revision must fix the underlying actor wiring rather than add more CSS.
- `journalctl -b` shows Open Bar throws `TypeError: obj is undefined` from `openbar@neuromorph/extension.js:376` while `calendar-colors` calls `Main.panel.addToStatusArea()`, so the split insertion path must avoid that integration point.
- The new revision changes the detached notifications menu to render directly from `Main.messageTray` and inserts the notification button manually into the panel center box before collapsing the DateMenu internals.
- The current Wayland session did not reliably pick up newly added diagnostic code after `gnome-extensions disable/enable`, so the final behavior still requires a fresh logout to validate.

# Split Menu Divider Removal

## Current Follow-up

- [x] Confirm that the visible divider the user means is in the top-bar date and notification buttons, not only inside the popover content.
- [x] Identify the active source: Open Bar applies borders to all `#panel.openbar .panel-button` actors, including the split clock and notification buttons.
- [ ] Remove the remaining visible gap by eliminating the touching inner `button-container` padding as well as the inner border and corner radius.
- [ ] Visually confirm that disabling the setting or the extension restores the stock divider state.

## Plan

- [x] Inspect the shell theme/layout and identify where the split divider is drawn.
- [x] Extend the split-notifications collapse style so the divider is hidden non-destructively.
- [x] Inspect the active Open Bar runtime stylesheet and confirm the header divider is coming from `#panel.openbar .panel-button` borders.
- [x] Patch the actual divider source by removing only the touching inner borders between the split date and notification buttons.
- [x] Flatten the touching inner corner radii so the date/time button no longer shows short top/bottom border remnants.
- [ ] Remove the touching inner `button-container` padding that can still leave a visible gap between the joined buttons.
- [ ] Verify schema compilation and a shell reload, then record the result.

## Spec

When `separate-notifications-menu` is enabled:

- The top-bar date/time button and the separate notifications button must not show the touching inner vertical divider between them.
- The date/time button must not keep short top/bottom corner border remnants where the inner divider used to be.
- The joined edge between the two top-bar buttons must not keep visible wrapper padding or spacing.
- If Open Bar or another panel styling extension is active, the fix must target the panel-button borders on those two buttons specifically.
- The divider removal must be non-destructive and reversible when the setting is disabled or the extension is turned off.
- The existing date/time label and dedicated notifications button behavior must remain unchanged.

## Review

- `/run/user/1000/io.github.neuromorph.openbar/stylesheet.css` shows Open Bar applies borders to all `#panel.openbar .panel-button` actors, which matches the divider the user described between the split header buttons.
- The current revision adds split-specific style classes to the date menu button and notification button, removes the touching inner left/right border, flattens the touching inner corner radii, and removes the touching inner `button-container` padding on the joined edge.
- `glib-compile-schemas schemas` succeeded.
- `scripts/reload-extension.sh` succeeded against the live session.
- `journalctl --user --since '2 minutes ago' | rg 'calendar-colors|TypeError|ReferenceError|failed to split notifications menu|JS ERROR'` showed no fresh extension errors after the latest reload.
- Visual confirmation is still pending in the live top bar.

# Header Datetime Regression

## Current Follow-up

- [x] Record the user correction that the separate notifications feature was effectively disabled.
- [x] Restore a working separate notifications menu without breaking the header date/time.
- [x] Keep `DateMenu` internals compatible with `openbar@neuromorph` assumptions.
- [x] Verify the change with schema compilation and a shell reload, and note whether a logout is still required.

## Plan

- [x] Inspect the current split-notifications implementation and confirm where the header clock/date is affected.
- [x] Identify the risky code path: reparenting/removing `DateMenu` internal indicator actors during split enable/disable.
- [x] Replace destructive indicator reparenting with a non-destructive hide/restore flow that preserves the `DateMenu` header actor tree.
- [x] Add a safe fallback that keeps the original `DateMenu` intact while the split path remains incompatible in this shell setup.
- [x] Verify schema compilation and extension reload behavior, then record the results.

## Spec

When `separate-notifications-menu` is enabled:

- The top-bar date menu must continue to show the normal date/time label.
- Notifications must continue to appear in the new dedicated header button.
- The original date-menu notification indicator must be suppressed without removing `DateMenu` children from the actor tree.
- The original date-menu notification pane must remain structurally present so extensions that traverse `DateMenu` still find the expected subtree.
- Disabling the option or the extension must restore the built-in indicator behavior cleanly.

## Review

- `glib-compile-schemas schemas` succeeded.
- `scripts/reload-extension.sh` succeeded against the live session.
- `journalctl --user --since '30 seconds ago'` showed no fresh `calendar-colors`, `openbar@neuromorph`, `TypeError`, or `ReferenceError` entries after the final reload.
- A full logout was not proven necessary from this final revision because the fresh post-reload log window was clean.
