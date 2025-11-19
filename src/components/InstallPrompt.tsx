import React from "react";

// Minimal types for the browser beforeinstallprompt event
type BeforeInstallPromptEvent = Event & {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

/**
 * Render an "Install app" button when the browser signals the PWA
 * is installable (beforeinstallprompt). If not eligible, renders null.
 */
export default function InstallPrompt() {
	const [deferredPrompt, setDeferredPrompt] = React.useState<
		BeforeInstallPromptEvent | null
	>(null);
	const [canInstall, setCanInstall] = React.useState(false);

	React.useEffect(() => {
		const onBeforeInstallPrompt = (e: Event) => {
			// Prevent the mini-infobar on mobile and store the event
			e.preventDefault?.();
			setDeferredPrompt(e as BeforeInstallPromptEvent);
			setCanInstall(true);
		};

		window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
		return () =>
			window.removeEventListener(
				"beforeinstallprompt",
				onBeforeInstallPrompt
			);
	}, []);

	const onInstall = async () => {
		if (!deferredPrompt) return;
		try {
			await deferredPrompt.prompt();
			await deferredPrompt.userChoice;
		} catch {
			// ignore
		} finally {
			setDeferredPrompt(null);
			setCanInstall(false);
		}
	};

	if (!canInstall) return null;

	return (
		<button
			onClick={onInstall}
			title="Install this app"
			style={{
				border: "1.5px solid #8764C1",
				background: "#fff",
				color: "#8764C1",
				fontWeight: 700,
				borderRadius: 10,
				padding: "8px 14px",
				cursor: "pointer",
			}}
		>
			Install app
		</button>
	);
}

