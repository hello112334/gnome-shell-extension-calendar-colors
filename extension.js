import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import St from 'gi://St';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

const NOTIFICATIONS_SCHEMA = 'org.gnome.desktop.notifications';
const NOTIFICATION_BUTTON_ROLE = 'calendar-colors-notifications';
const SPLIT_MESSAGE_LIST_STYLE_CLASS = 'calendar-colors-split-message-list';
const SPLIT_DATEMENU_POPOVER_STYLE_CLASS = 'calendar-colors-split-datemenu-popover';
const SPLIT_DATE_BUTTON_STYLE_CLASS = 'calendar-colors-split-date-button';
const SPLIT_NOTIFICATION_BUTTON_STYLE_CLASS = 'calendar-colors-split-notification-button';
const SPLIT_DATE_CONTAINER_STYLE_CLASS = 'calendar-colors-split-date-container';
const SPLIT_NOTIFICATION_CONTAINER_STYLE_CLASS = 'calendar-colors-split-notification-container';

const NotificationHeaderIcon = GObject.registerClass(
class NotificationHeaderIcon extends St.Icon {
    _init() {
        super._init({
            style_class: 'system-status-icon calendar-colors-notification-indicator',
        });

        this._sources = [];
        this._count = 0;
        this._settings = new Gio.Settings({schema_id: NOTIFICATIONS_SCHEMA});

        this._settings.connectObject(
            'changed::show-banners', () => this._sync(),
            this);
        Main.messageTray.connectObject(
            'source-added', (_tray, source) => this._onSourceAdded(source),
            'source-removed', (_tray, source) => this._onSourceRemoved(source),
            'queue-changed', () => this._updateCount(),
            this);

        for (const source of Main.messageTray.getSources())
            this._onSourceAdded(source);

        this.connect('destroy', () => {
            this._settings.disconnectObject(this);
            this._settings.run_dispose();
            this._settings = null;
        });

        this._sync();
    }

    _onSourceAdded(source) {
        source.connectObject(
            'notify::count', () => this._updateCount(),
            this);
        this._sources.push(source);
        this._updateCount();
    }

    _onSourceRemoved(source) {
        source.disconnectObject(this);

        const index = this._sources.indexOf(source);
        if (index >= 0)
            this._sources.splice(index, 1);

        this._updateCount();
    }

    _updateCount() {
        let count = 0;

        for (const source of this._sources)
            count += source.unseenCount;

        this._count = Math.max(0, count - Main.messageTray.queueCount);
        this._sync();
    }

    _sync() {
        const doNotDisturb = !this._settings.get_boolean('show-banners');
        this.icon_name = doNotDisturb
            ? 'notifications-disabled-symbolic'
            : 'message-indicator-symbolic';

        if (this._count > 0)
            this.add_style_class_name('calendar-colors-notification-pending');
        else
            this.remove_style_class_name('calendar-colors-notification-pending');

        if (doNotDisturb)
            this.accessible_name = 'Notifications disabled';
        else if (this._count > 0)
            this.accessible_name = `${this._count} unread notifications`;
        else
            this.accessible_name = 'Notifications';
    }
});

const NotificationMenuButton = GObject.registerClass(
class NotificationMenuButton extends PanelMenu.Button {
    _init() {
        super._init(0.5, 'Notifications');

        this.add_style_class_name('calendar-colors-notification-button');
        this._bannerSettings = new Gio.Settings({schema_id: NOTIFICATIONS_SCHEMA});

        this._icon = new NotificationHeaderIcon();
        this.add_child(this._icon);
        this.label_actor = this._icon;

        this.menu.box.add_style_class_name('datemenu-popover');
        this.menu.box.add_style_class_name('calendar-colors-notification-popover');

        this._contentBox = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            y_expand: true,
            style_class: 'calendar-colors-notification-menu',
        });
        this.menu.box.add_child(this._contentBox);

        const header = new St.BoxLayout({
            x_expand: true,
            style_class: 'calendar-colors-notification-header',
        });

        const headerCopy = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            style_class: 'calendar-colors-notification-header-copy',
        });
        headerCopy.add_child(new St.Label({
            text: 'NOTIFICATIONS',
            x_expand: true,
            style_class: 'calendar-colors-notification-header-label',
        }));
        this._headerMeta = new St.Label({
            x_expand: true,
            style_class: 'calendar-colors-notification-header-meta',
        });
        headerCopy.add_child(this._headerMeta);
        header.add_child(headerCopy);

        this._headerBadge = new St.Label({
            style_class: 'calendar-colors-notification-header-badge',
            visible: false,
        });
        header.add_child(this._headerBadge);
        this._contentBox.add_child(header);

        this._scrollView = new St.ScrollView({
            x_expand: true,
            y_expand: true,
            overlay_scrollbars: true,
            style_class: 'calendar-colors-notification-scroll',
        });
        this._listBox = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            style_class: 'calendar-colors-notification-list',
        });
        if (this._scrollView.add_actor)
            this._scrollView.add_actor(this._listBox);
        else
            this._scrollView.add_child(this._listBox);
        this._contentBox.add_child(this._scrollView);

        this._sources = [];

        Main.messageTray.connectObject(
            'source-added', (_tray, source) => this._onSourceAdded(source),
            'source-removed', (_tray, source) => this._onSourceRemoved(source),
            'queue-changed', () => this._syncNotifications(),
            this);
        this._bannerSettings.connectObject(
            'changed::show-banners', () => this._syncNotifications(),
            this);
        this.menu.connectObject(
            'open-state-changed', () => this._syncNotifications(),
            this);

        for (const source of Main.messageTray.getSources())
            this._onSourceAdded(source);

        // Close the popup when clicking outside it (e.g. desktop wallpaper).
        this._stageClickId = global.stage.connect('captured-event', (_stage, event) => {
            if (!this.menu.isOpen || event.type() !== Clutter.EventType.BUTTON_PRESS)
                return Clutter.EVENT_PROPAGATE;

            const [x, y] = event.get_coords();
            const target = global.stage.get_actor_at_pos(Clutter.PickMode.REACTIVE, x, y);
            if (!this.contains(target) && !this.menu.actor.contains(target))
                this.menu.close();

            return Clutter.EVENT_PROPAGATE;
        });

        this.connect('destroy', () => {
            global.stage.disconnect(this._stageClickId);
            Main.messageTray.disconnectObject(this);
            this._bannerSettings.disconnectObject(this);
            this._bannerSettings.run_dispose();
            this._bannerSettings = null;
            this.menu.disconnectObject(this);

            for (const source of this._sources)
                source.disconnectObject(this);

            this._sources = [];
        });

        this._syncNotifications();
    }

    _onSourceAdded(source) {
        if (this._sources.includes(source))
            return;

        source.connectObject(
            'notification-added', () => this._syncNotifications(),
            'notify::count', () => this._syncNotifications(),
            this);
        this._sources.push(source);
        this._syncNotifications();
    }

    _onSourceRemoved(source) {
        source.disconnectObject(this);

        const index = this._sources.indexOf(source);
        if (index >= 0)
            this._sources.splice(index, 1);

        this._syncNotifications();
    }

    _notificationTimestamp(notification) {
        const value = notification.datetime ?? notification.source?.datetime ?? null;

        if (typeof value === 'number')
            return value;

        if (typeof value?.to_unix === 'function')
            return value.to_unix();

        if (typeof value?.getTime === 'function')
            return Math.floor(value.getTime() / 1000);

        return 0;
    }

    _notificationText(...candidates) {
        for (const candidate of candidates) {
            if (typeof candidate === 'string' && candidate.trim())
                return candidate.trim();
        }

        return '';
    }

    _collectNotifications() {
        const notifications = [];

        for (const source of this._sources) {
            for (const notification of source.notifications ?? []) {
                if (notification.resident && notification.acknowledged)
                    continue;

                notifications.push(notification);
            }
        }

        notifications.sort((a, b) =>
            this._notificationTimestamp(b) - this._notificationTimestamp(a));

        return notifications;
    }

    _clearRows() {
        for (const child of this._listBox.get_children())
            child.destroy();
    }

    _syncHeader(notificationCount) {
        const doNotDisturb = !this._bannerSettings.get_boolean('show-banners');

        if (doNotDisturb && notificationCount > 0)
            this._headerMeta.text = `${notificationCount} unread while Do Not Disturb is on`;
        else if (doNotDisturb)
            this._headerMeta.text = 'Do Not Disturb is on';
        else if (notificationCount > 0)
            this._headerMeta.text = `${notificationCount} unread notifications`;
        else
            this._headerMeta.text = 'Inbox clear';

        if (notificationCount > 0) {
            this._headerBadge.text = `${notificationCount}`;
            this._headerBadge.show();
        } else if (doNotDisturb) {
            this._headerBadge.text = 'DND';
            this._headerBadge.show();
        } else {
            this._headerBadge.hide();
        }
    }

    _createNotificationRow(notification) {
        const row = new St.Button({
            x_expand: true,
            can_focus: true,
            reactive: true,
            track_hover: true,
            style_class: 'calendar-colors-notification-row',
        });
        const box = new St.BoxLayout({
            x_expand: true,
            style_class: 'calendar-colors-notification-row-box',
        });
        row.set_child(box);

        const icon = notification.source?.createIcon?.(16) ?? new St.Icon({
            icon_name: 'dialog-information-symbolic',
            style_class: 'system-status-icon',
        });
        const iconBin = new St.Bin({
            style_class: 'calendar-colors-notification-icon-bin',
        });
        iconBin.set_child(icon);
        box.add_child(iconBin);

        const textBox = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            style_class: 'calendar-colors-notification-text',
        });
        box.add_child(textBox);

        const title = this._notificationText(
            notification.title,
            notification.banner,
            notification.source?.title,
            notification.source?.app?.get_name?.(),
            'Notification');
        textBox.add_child(new St.Label({
            text: title,
            x_expand: true,
            style_class: 'calendar-colors-notification-title',
        }));

        const sourceLabel = this._notificationText(
            notification.source?.title,
            notification.source?.app?.get_name?.());
        if (sourceLabel && sourceLabel !== title) {
            textBox.add_child(new St.Label({
                text: sourceLabel,
                x_expand: true,
                style_class: 'calendar-colors-notification-source',
            }));
        }

        const body = this._notificationText(
            notification.bannerBodyText,
            notification.body);
        if (body) {
            textBox.add_child(new St.Label({
                text: body,
                x_expand: true,
                style_class: 'calendar-colors-notification-body',
            }));
        }

        row.connect('clicked', () => {
            try {
                if (typeof notification.activate === 'function')
                    notification.activate();
                else if (typeof notification.source?.open === 'function')
                    notification.source.open();
            } catch (error) {
                logError(error, 'Calendar Colors: failed to activate notification');
            }

            this.menu.close();
        });

        return row;
    }

    _syncNotifications() {
        this._clearRows();

        const notifications = this._collectNotifications();
        this._syncHeader(notifications.length);
        if (notifications.length === 0) {
            this._listBox.add_child(new St.Label({
                text: 'No notifications',
                x_expand: true,
                style_class: 'calendar-colors-notification-empty',
            }));
            return;
        }

        for (const notification of notifications)
            this._listBox.add_child(this._createNotificationRow(notification));
    }
});

export default class CalendarColorsExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._signalIds = [];
        this._notificationButton = null;
        this._messageListRestore = null;
        this._indicatorRestore = null;
        this._notificationButtonContainer = null;

        this._dateMenu = Main.panel.statusArea.dateMenu;
        this._calendar = this._dateMenu._calendar;
        this._menu = this._dateMenu.menu;
        this._messageList = this._dateMenu._messageList;

        // Refresh when the calendar popup opens.
        this._signalIds.push([
            this._menu,
            this._menu.connect('open-state-changed', (_menu, isOpen) => {
                if (isOpen)
                    this._refresh();
            }),
        ]);

        // Refresh on month navigation and day selection.
        this._signalIds.push([
            this._calendar,
            this._calendar.connect('selected-date-changed', () => {
                this._refresh();
            }),
        ]);

        // Refresh when the event source syncs new events.
        const eventSource = this._calendar._eventSource;
        if (eventSource) {
            this._signalIds.push([
                eventSource,
                eventSource.connect('changed', () => {
                    this._refresh();
                }),
            ]);
        }

        // Refresh when the user changes preferences.
        this._signalIds.push([
            this._settings,
            this._settings.connect('changed', () => this._refresh()),
        ]);
        this._signalIds.push([
            this._settings,
            this._settings.connect('changed::separate-notifications-menu', () => {
                this._syncNotificationSplit();
            }),
        ]);

        // Initial refresh in case the extension is enabled while the calendar is open.
        this._refresh();
        this._syncNotificationSplit();
    }

    disable() {
        for (const [obj, id] of this._signalIds)
            obj.disconnect(id);
        this._signalIds = [];

        this._disableNotificationSplit();
        this._clearStyles();

        this._dateMenu = null;
        this._calendar = null;
        this._menu = null;
        this._messageList = null;
        this._messageListRestore = null;
        this._notificationButtonContainer = null;
        this._settings = null;
    }

    // ------------------------------------------------------------------ //
    // Private helpers
    // ------------------------------------------------------------------ //

    _getHolidaySet() {
        const dates = this._settings.get_strv('holiday-dates');
        return new Set(dates);
    }

    _formatDate(jsDate) {
        const y = jsDate.getFullYear();
        const m = String(jsDate.getMonth() + 1).padStart(2, '0');
        const d = String(jsDate.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    _classifyDate(jsDate, holidaySet) {
        const formatted = this._formatDate(jsDate);

        if (this._settings.get_boolean('enable-holiday-highlight') &&
            holidaySet.has(formatted))
            return 'holiday';

        const eventSource = this._calendar._eventSource;
        if (this._settings.get_boolean('enable-event-highlight') &&
            eventSource && eventSource.hasEvents(jsDate))
            return 'event';

        if (this._settings.get_boolean('enable-weekend-highlight')) {
            const day = jsDate.getDay();
            if (day === 0 || day === 6)
                return 'weekend';
        }

        return null;
    }

    _inlineStyleFor(type) {
        switch (type) {
        case 'weekend': {
            const color = this._settings.get_string('weekend-color');
            return `color: ${color};`;
        }
        case 'holiday': {
            const color = this._settings.get_string('holiday-color');
            return `background-color: ${color}; border-radius: 9999px;`;
        }
        case 'event': {
            const color = this._settings.get_string('event-color');
            return `box-shadow: inset 0 -2px 0 0 ${color};`;
        }
        default:
            return '';
        }
    }

    _refresh() {
        const buttons = this._calendar._buttons;
        if (!buttons || buttons.length === 0)
            return;

        const holidaySet = this._getHolidaySet();

        for (const button of buttons) {
            if (!button._date)
                continue;

            button.set_style('');

            const type = this._classifyDate(button._date, holidaySet);
            if (type)
                button.set_style(this._inlineStyleFor(type));
        }
    }

    _clearStyles() {
        const buttons = this._calendar?._buttons;
        if (!buttons)
            return;

        for (const button of buttons)
            button.set_style('');
    }

    _syncNotificationSplit() {
        if (!this._dateMenu)
            return;

        if (this._settings.get_boolean('separate-notifications-menu'))
            this._enableNotificationSplit();
        else
            this._disableNotificationSplit();
    }

    _enableNotificationSplit() {
        if (this._notificationButton)
            return;

        this._notificationButton = new NotificationMenuButton();
        this._notificationButton.add_style_class_name(SPLIT_NOTIFICATION_BUTTON_STYLE_CLASS);

        const centerBox = Main.panel._centerBox;
        const dateMenuActor = this._dateMenu.container ?? this._dateMenu;
        const dateMenuIndex = centerBox?.get_children().indexOf(dateMenuActor) ?? -1;
        const position = dateMenuIndex >= 0 ? dateMenuIndex + 1 : 1;

        try {
            if (!centerBox)
                throw new Error('Panel center box is unavailable');

            this._notificationButtonContainer =
                this._notificationButton.container ?? this._notificationButton;
            const currentParent = this._notificationButtonContainer.get_parent?.();
            if (currentParent)
                currentParent.remove_child(this._notificationButtonContainer);

            centerBox.insert_child_at_index(this._notificationButtonContainer, position);
            Main.panel.statusArea[NOTIFICATION_BUTTON_ROLE] = this._notificationButton;
            this._notificationButtonContainer
                .add_style_class_name(SPLIT_NOTIFICATION_CONTAINER_STYLE_CLASS);
        } catch (error) {
            delete Main.panel.statusArea[NOTIFICATION_BUTTON_ROLE];
            this._notificationButtonContainer?.get_parent?.()
                ?.remove_child(this._notificationButtonContainer);
            this._notificationButton.destroy();
            this._notificationButton = null;
            this._notificationButtonContainer = null;
            logError(error, `${this.metadata.name}: failed to split notifications menu`);
            return;
        }

        this._suppressDateMenuMessageList();
        this._suppressDateMenuIndicator();
        this._menu.box?.add_style_class_name(SPLIT_DATEMENU_POPOVER_STYLE_CLASS);
        this._dateMenu.add_style_class_name(SPLIT_DATE_BUTTON_STYLE_CLASS);
        (this._dateMenu.container ?? this._dateMenu)
            .add_style_class_name(SPLIT_DATE_CONTAINER_STYLE_CLASS);
    }

    _disableNotificationSplit() {
        this._menu?.box?.remove_style_class_name(SPLIT_DATEMENU_POPOVER_STYLE_CLASS);
        this._dateMenu?.remove_style_class_name(SPLIT_DATE_BUTTON_STYLE_CLASS);
        (this._dateMenu?.container ?? this._dateMenu)
            ?.remove_style_class_name(SPLIT_DATE_CONTAINER_STYLE_CLASS);
        this._restoreDateMenuMessageList();
        this._restoreDateMenuIndicator();

        if (this._notificationButton) {
            delete Main.panel.statusArea[NOTIFICATION_BUTTON_ROLE];
            this._notificationButton.remove_style_class_name(
                SPLIT_NOTIFICATION_BUTTON_STYLE_CLASS);
            this._notificationButtonContainer?.remove_style_class_name(
                SPLIT_NOTIFICATION_CONTAINER_STYLE_CLASS);
            this._notificationButtonContainer?.get_parent?.()
                ?.remove_child(this._notificationButtonContainer);
            this._notificationButton.destroy();
            this._notificationButton = null;
        }

        this._notificationButtonContainer = null;
    }

    _suppressDateMenuIndicator() {
        if (this._indicatorRestore)
            return;

        const indicator = this._dateMenu?._indicator;
        if (!indicator)
            return;

        this._indicatorRestore = {
            indicator,
            wasVisible: indicator.visible,
            signalId: indicator.connect('notify::visible', () => {
                if (this._notificationButton)
                    indicator.hide();
            }),
        };

        // Keep GNOME's DateMenu actor tree intact and only suppress the
        // built-in indicator. Reparenting private DateMenu children can
        // blank the clock label on some shell/theme combinations.
        indicator.hide();
    }

    _restoreDateMenuIndicator() {
        const restore = this._indicatorRestore;
        if (!restore)
            return;

        const {indicator, signalId, wasVisible} = restore;
        indicator.disconnect(signalId);

        if (typeof indicator._sync === 'function')
            indicator._sync();
        else if (wasVisible)
            indicator.show();

        this._indicatorRestore = null;
    }

    _suppressDateMenuMessageList() {
        if (!this._messageList || this._messageListRestore)
            return;

        const messageList = this._messageList;
        this._messageListRestore = {
            style: messageList.style,
            reactive: messageList.reactive,
            canFocus: messageList.can_focus,
            wasVisible: messageList.visible,
            signalId: messageList.connect('notify::visible', () => {
                if (this._notificationButton)
                    messageList.hide();
            }),
        };

        // Keep the stock DateMenu subtree attached, but fully hidden, so
        // notification row separators cannot bleed into the calendar column.
        messageList.reactive = false;
        messageList.can_focus = false;
        messageList.add_style_class_name(SPLIT_MESSAGE_LIST_STYLE_CLASS);
        messageList.hide();
    }

    _restoreDateMenuMessageList() {
        const restore = this._messageListRestore;
        if (!this._messageList || !restore)
            return;

        const messageList = this._messageList;
        const {signalId, reactive, canFocus, style, wasVisible} = restore;
        messageList.disconnect(signalId);
        messageList.reactive = reactive;
        messageList.can_focus = canFocus;
        messageList.set_style(style ?? '');
        messageList.remove_style_class_name(SPLIT_MESSAGE_LIST_STYLE_CLASS);

        if (typeof messageList._sync === 'function')
            messageList._sync();
        else if (wasVisible)
            messageList.show();
        else
            messageList.hide();

        this._messageListRestore = null;
    }

}
