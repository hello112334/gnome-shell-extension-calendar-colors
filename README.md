# Calendar Colors

A GNOME Shell extension that highlights weekends, holidays, and event days in the calendar popup.

## Requirements

- GNOME Shell 45, 46, 47, or 48 (Ubuntu 23.10+)

## Installation

### Manual

1. Clone or download this repository:
   ```bash
   git clone https://github.com/hello112334/gnome-shell-extension-calendar-colors.git
   ```

2. Copy the extension to your local extensions directory:
   ```bash
   mkdir -p ~/.local/share/gnome-shell/extensions
   cp -r gnome-shell-extension-calendar-colors \
       ~/.local/share/gnome-shell/extensions/calendar-colors@hello112334.github.io
   ```

3. Compile the GSettings schema:
   ```bash
   cd ~/.local/share/gnome-shell/extensions/calendar-colors@hello112334.github.io
   glib-compile-schemas schemas/
   ```

4. Enable the extension:
   ```bash
   gnome-extensions enable calendar-colors@hello112334.github.io
   ```

   Or use GNOME Extensions app / GNOME Tweaks.

5. Log out and back in, or restart GNOME Shell (`Alt+F2` → type `r` → Enter) if on X11.

## Usage

Click the clock in the top bar to open the calendar popup. The extension automatically colors calendar days:

| Day type | Visual effect |
|---|---|
| Weekend (Sat/Sun) | Text color change |
| Holiday | Colored background circle |
| Event day | Colored underline |

## Settings

Open the extension preferences via:

```bash
gnome-extensions prefs calendar-colors@hello112334.github.io
```

Or through the GNOME Extensions app.

The preferences window has three tabs:

### General
Toggle each highlight type on or off:
- **Highlight Weekends** — color Saturday and Sunday
- **Highlight Holidays** — color dates from your holiday list
- **Highlight Event Days** — mark days with scheduled GNOME Calendar events

### Colors
Pick custom colors for each highlight type using the color chooser buttons.

### Holidays
Enter your holiday dates one per line in `YYYY-MM-DD` format, for example:

```
2026-01-01
2026-07-04
2026-12-25
```

Changes take effect immediately without restarting the shell.

## Uninstall

```bash
gnome-extensions disable calendar-colors@hello112334.github.io
rm -rf ~/.local/share/gnome-shell/extensions/calendar-colors@hello112334.github.io
```
