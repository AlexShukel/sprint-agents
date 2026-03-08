import { execSync } from 'node:child_process';
import { platform } from 'node:os';

function isWSL(): boolean {
	try {
		execSync('command -v powershell.exe', { stdio: 'pipe' });
		return true;
	} catch {
		return false;
	}
}

function notifyWSL(title: string, message: string): void {
	const ps = `
		[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
		[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom, ContentType = WindowsRuntime] | Out-Null
		$xml = [Windows.Data.Xml.Dom.XmlDocument]::new()
		$xml.LoadXml('<toast><visual><binding template="ToastText02"><text id="1">${title}</text><text id="2">${message}</text></binding></visual></toast>')
		[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('Sprint Agents').Show([Windows.UI.Notifications.ToastNotification]::new($xml))
	`;
	execSync(`powershell.exe -Command "${ps.replace(/"/g, '\\"')}"`, { stdio: 'pipe' });
}

function notifyMacOS(title: string, message: string): void {
	execSync(
		`osascript -e 'display notification "${message.replace(/"/g, '\\"')}" with title "${title.replace(/"/g, '\\"')}"'`,
		{ stdio: 'pipe' },
	);
}

function notifyLinux(title: string, message: string): void {
	execSync(`notify-send "${title.replace(/"/g, '\\"')}" "${message.replace(/"/g, '\\"')}"`, { stdio: 'pipe' });
}

export function notify(title: string, message: string): void {
	try {
		if (isWSL()) {
			notifyWSL(title, message);
		} else if (platform() === 'darwin') {
			notifyMacOS(title, message);
		} else if (platform() === 'linux') {
			notifyLinux(title, message);
		}
	} catch {
		// Notification is best-effort — silently ignore failures
	}
}
