import Gdk from 'gi://Gdk';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk?version=4.0';
import Adw from 'gi://Adw';

import {
    ExtensionPreferences,
    gettext as _,
} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class CalendarColorsPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        // --------------------------------------------------------- //
        // Page: General — feature toggles
        // --------------------------------------------------------- //
        const page = new Adw.PreferencesPage({
            title: _('General'),
            icon_name: 'preferences-system-symbolic',
        });
        window.add(page);

        const toggleGroup = new Adw.PreferencesGroup({
            title: _('Features'),
            description: _('Choose which calendar day types to highlight.'),
        });
        page.add(toggleGroup);

        const weekendRow = new Adw.SwitchRow({
            title: _('Highlight Weekends'),
            subtitle: _('Color Saturday and Sunday cells.'),
        });
        toggleGroup.add(weekendRow);
        settings.bind(
            'enable-weekend-highlight',
            weekendRow,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );

        const holidayRow = new Adw.SwitchRow({
            title: _('Highlight Holidays'),
            subtitle: _('Color dates listed in the holiday list.'),
        });
        toggleGroup.add(holidayRow);
        settings.bind(
            'enable-holiday-highlight',
            holidayRow,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );

        const eventRow = new Adw.SwitchRow({
            title: _('Highlight Event Days'),
            subtitle: _('Mark calendar days that have scheduled events.'),
        });
        toggleGroup.add(eventRow);
        settings.bind(
            'enable-event-highlight',
            eventRow,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );

        const splitRow = new Adw.SwitchRow({
            title: _('Separate Notifications Menu'),
            subtitle: _('Move notifications into their own header button next to the clock.'),
        });
        toggleGroup.add(splitRow);
        settings.bind(
            'separate-notifications-menu',
            splitRow,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );

        // --------------------------------------------------------- //
        // Page: Colors — color pickers
        // --------------------------------------------------------- //
        const colorsPage = new Adw.PreferencesPage({
            title: _('Colors'),
            icon_name: 'color-select-symbolic',
        });
        window.add(colorsPage);

        const colorsGroup = new Adw.PreferencesGroup({
            title: _('Highlight Colors'),
            description: _('Customize the color used for each highlight type.'),
        });
        colorsPage.add(colorsGroup);

        this._addColorRow(colorsGroup, settings,
            _('Weekend Color'),
            _('Applied to Saturday and Sunday cells.'),
            'weekend-color');

        this._addColorRow(colorsGroup, settings,
            _('Holiday Color'),
            _('Text color applied to dates in the holiday list.'),
            'holiday-color');

        this._addColorRow(colorsGroup, settings,
            _('Event Color'),
            _('Underline color for days with scheduled events.'),
            'event-color');

        // --------------------------------------------------------- //
        // Page: Holidays — editable date list
        // --------------------------------------------------------- //
        const holidayPage = new Adw.PreferencesPage({
            title: _('Holidays'),
            icon_name: 'x-office-calendar-symbolic',
        });
        window.add(holidayPage);

        const holidayGroup = new Adw.PreferencesGroup({
            title: _('Holiday Dates'),
            description: _(
                'Enter one date per line in YYYY-MM-DD format (e.g. 2026-12-25).'
            ),
        });
        holidayPage.add(holidayGroup);

        const textRow = new Adw.PreferencesRow({title: _('Dates')});
        holidayGroup.add(textRow);

        const scrolled = new Gtk.ScrolledWindow({
            min_content_height: 200,
            vexpand: true,
            margin_top: 8,
            margin_bottom: 8,
            margin_start: 12,
            margin_end: 12,
        });
        textRow.set_child(scrolled);

        const textView = new Gtk.TextView({
            wrap_mode: Gtk.WrapMode.WORD_CHAR,
            accepts_tab: false,
            monospace: true,
        });
        scrolled.set_child(textView);

        // Populate from GSettings.
        textView.buffer.text = settings.get_strv('holiday-dates').join('\n');

        // Save back to GSettings on every change, validating format.
        const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
        textView.buffer.connect('changed', buffer => {
            const text = buffer.text.trim();
            const valid = text.length > 0
                ? text.split('\n').map(l => l.trim()).filter(l => ISO_RE.test(l))
                : [];
            settings.set_strv('holiday-dates', valid);
        });
    }

    _addColorRow(group, settings, title, subtitle, key) {
        const row = new Adw.ActionRow({title, subtitle});

        const btn = new Gtk.ColorButton({
            valign: Gtk.Align.CENTER,
            use_alpha: true,
        });

        const syncToButton = () => {
            const rgba = new Gdk.RGBA();
            rgba.parse(settings.get_string(key));
            btn.set_rgba(rgba);
        };
        syncToButton();

        btn.connect('color-set', () => {
            settings.set_string(key, btn.get_rgba().to_string());
        });
        settings.connect(`changed::${key}`, syncToButton);

        row.add_suffix(btn);
        row.activatable_widget = btn;
        group.add(row);
    }
}
