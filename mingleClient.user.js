// ==UserScript==
// @name         MingleClient
// @namespace    https://github.com/owengregson/MingleClient
// @homepage     https://github.com/owengregson/MingleClient
// @updateURL    https://owengregson.github.io/MingleClient/mingleClient.user.js
// @icon         https://owengregson.github.io/MingleClient/assets/images/icon_circle.png
// @license      MIT
// @version      1.2
// @description  Two-loop aimbot with predictive aiming & bloom correction. Hold SHIFT (configurable) to aim. Press C to toggle rage (hardlocking) mode. Includes ESP (Digit 1) & Tracers (Digit 2).
// @match        *://shellshock.io/*
// @grant        none
// @run-at       document-start
// @require      https://owengregson.github.io/MingleClient/assets/libs/crypto-js/4.2.0/crypto.js
// @require      https://owengregson.github.io/MingleClient/assets/libs/babylon/7.45.0/babylon.js
// @require      https://owengregson.github.io/MingleClient/assets/libs/butterup/2.0.0/butterup.js
// ==/UserScript==

/* eslint-disable no-useless-escape */

(function () {
	"use strict";
	const MOD_VERSION = 1.2;

	const AIM_HOLD_KEY = "ShiftLeft";
	const HARDLOCK_KEY = "KeyC";
	let HARDLOCKING = false;
	const ESP_KEY = /* digit 1 */ "Digit1";
	const TRACER_KEY = /* digit 2 */ "Digit2";
	const SMOOTH_FACTOR = 0.3;
	let ENABLE_ESP = true;
	let ENABLE_TRACERS = true;
	let predictiveOn = true;
	const ANGLE_WEIGHT = 2.0;
	const DISTANCE_WEIGHT = 1.4;
	const MAX_FOV_ANGLE = 1.37;
	const MAX_DISTANCE = 50;

	let crackedShell = typeof $WEBSOCKET !== "undefined";
	let originalReplace = String.prototype.replace;
	String.prototype.originalReplace = function () {
		return originalReplace.apply(this, arguments);
	};
	let AIMING = false;
	let TARGETED = null;
	let desiredYaw = 0;
	let desiredPitch = 0;
	let playerHistory = {};
	const F = {};
	let H = {};
	/* Credit to @StateFarmNetwork / StateFarmClient & LibertyMutualClient */
	const clientKeysURL =
		"https://raw.githubusercontent.com/StateFarmNetwork/client-keys/main/statefarm_";
	const modIconURL =
		"https://owengregson.github.io/MingleClient/assets/images/favicon.ico";
	let onlineClientKeys;
	const functionNames = {};
	const ESPArray = [];
	let tNotif = ["success", "Enabled"];
	const cssString = `.toaster,ol.rack{list-style:none;margin:0}.toaster{font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,Noto Sans,sans-serif,Apple Color Emoji,Segoe UI Emoji,Segoe UI Symbol,Noto Color Emoji;box-sizing:border-box;padding:5px;outline:0;z-index:999999999;position:fixed}.butteruptoast,.butteruptoast.brutalist{font-size:13px;display:flex;padding:16px;width:325px}.toaster.bottom-right{bottom:20px;right:20px}.toaster.bottom-left{bottom:20px;left:20px}.toaster.top-right{top:20px;right:20px}.toaster.top-left{top:20px;left:20px}.toaster.bottom-center{bottom:20px;left:50%;transform:translateX(-50%)}.toaster.top-center{top:20px;left:50%;transform:translateX(-50%)}.toaster.top-center ol.rack,.toaster.top-left ol.rack,.toaster.top-right ol.rack{flex-direction:column-reverse}.toaster.bottom-center ol.rack,.toaster.bottom-left ol.rack,.toaster.bottom-right ol.rack{flex-direction:column}ol.rack{padding:0;display:flex}ol.rack li{margin-bottom:16px}ol.rack.upperstack li{margin-bottom:-35px;transition:.3s ease-in-out}ol.rack.upperstack li:hover{margin-bottom:16px;scale:1.03;transition:.3s ease-in-out}ol.rack.lowerstack li{margin-top:-35px}ol.rack.lowerstack{margin-bottom:0}.butteruptoast{border-radius:8px;box-shadow:0 4px 12px #0000001a;border:1px solid #ededed;background-color:#fff;gap:6px;color:#282828}.butteruptoast.dismissable{cursor:pointer}.butteruptoast .icon{display:flex;align-items:start;flex-direction:column}.butteruptoast .icon svg{width:20px;height:20px;fill:#282828}.notif .desc{display:flex;flex-direction:column;gap:2px}.notif .desc .title{font-weight:600;line-height:1.5}.notif .desc .message{font-weight:400;line-height:1.4}.butteruptoast.success{background-color:#ebfef2;color:#00892d;border:1px solid #d2fde4}.butteruptoast.success .icon svg{fill:hsl(140,100%,27%)}.butteruptoast.error .icon svg{fill:hsl(0,100%,27%)}.butteruptoast.warning .icon svg{fill:hsl(50,100%,27%)}.butteruptoast.info .icon svg{fill:hsl(210,100%,27%)}.butteruptoast.error{background-color:#fef0f0;color:#890000;border:1px solid #fdd2d2}.butteruptoast.warning{background-color:#fffdf0;color:#897200;border:1px solid #fdf6d2}.butteruptoast.info{background-color:#f0f8ff;color:#004489;border:1px solid #d2e8fd}.toast-buttons{display:flex;gap:8px;width:100%;align-items:center;flex-direction:row;margin-top:16px}.toast-buttons .toast-button.primary{background-color:#282828;color:#fff;padding:8px 16px;border-radius:4px;cursor:pointer;border:none;width:100%}.toast-buttons .toast-button.secondary{background-color:#f0f8ff;color:#004489;border:1px solid #d2e8fd;padding:8px 16px;border-radius:4px;cursor:pointer;width:100%}.butteruptoast.success .toast-button.primary{background-color:#27ae5f;color:#fff}.butteruptoast.success .toast-button.secondary{background-color:#daf0e3;color:#1e8549;border:1px solid #8ae4b0}.butteruptoast.error .toast-button.primary{background-color:#db3748;color:#fff}.butteruptoast.error .toast-button.secondary{background-color:#eddddf;color:#be2131;border:1px solid #eb8e97}.butteruptoast.warning .toast-button.primary{background-color:#ffc005;color:#4c3900}.butteruptoast.warning .toast-button.secondary{background-color:#fff9ea;color:#9e7600;border:1px solid #ffe084}.butteruptoast.info .toast-button.primary{background-color:#2094f3;color:#fff}.butteruptoast.info .toast-button.secondary{background-color:#e1f1fd;color:#085ea4;border:1px solid #81c2f8}.toastUp{animation:.5s ease-in-out forwards slideUp}.toastDown{animation:.5s ease-in-out forwards slideDown}@keyframes slideDown{0%{opacity:0;transform:translateY(-100%)}100%{opacity:1;transform:translateY(0)}}@keyframes slideUp{0%{opacity:0;transform:translateY(100%)}100%{opacity:1;transform:translateY(0)}}.fadeOutToast{animation:.3s ease-in-out forwards fadeOut}@keyframes fadeOut{0%{opacity:1}100%{opacity:0}}.butteruptoast.glass{background-color:rgba(255,255,255,.42)!important;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:none;box-shadow:0 4px 12px #0000001a;color:#282828}.butteruptoast.glass.success{background-color:rgba(235,254,242,.42)!important;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:none;box-shadow:0 4px 12px #0000001a;color:#00892d}.butteruptoast.glass.error,.butteruptoast.glass.warning{backdrop-filter:blur(10px);border:none;box-shadow:0 4px 12px #0000001a}.butteruptoast.glass.error{background-color:rgba(254,240,240,.42)!important;-webkit-backdrop-filter:blur(10px);color:#890000}.butteruptoast.glass.warning{background-color:rgba(255,253,240,.42)!important;-webkit-backdrop-filter:blur(10px);color:#897200}.butteruptoast.glass.info{background-color:rgba(240,248,255,.42)!important;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:none;box-shadow:0 4px 12px #0000001a;color:#004489}.butteruptoast.brutalist{border-radius:0;box-shadow:0 4px 12px #0000001a;border:2px solid #282828;align-items:center;background-color:#fff;gap:6px;color:#282828}.butteruptoast.brutalist.success{background-color:#ebfef2;color:#00892d;border:2px solid #00892d}.butteruptoast.brutalist.error{background-color:#fef0f0;color:#890000;border:2px solid #890000}.butteruptoast.brutalist.warning{background-color:#fffdf0;color:#897200;border:2px solid #897200}.butteruptoast.brutalist.info{background-color:#f0f8ff;color:#004489;border:2px solid #004489}`;
	const style = document.createElement("style");
	style.type = "text/css";
	style.appendChild(document.createTextNode(cssString));
	const head = document.head || document.getElementsByTagName("head")[0];
	head.appendChild(style);
	document.addEventListener(
		"keydown",
		(evt) => {
			if (evt.code === AIM_HOLD_KEY && !AIMING) {
				AIMING = true;
				TARGETED = F.pickBestTargetByAngle();
			} else if (evt.code === HARDLOCK_KEY) {
				HARDLOCKING = !HARDLOCKING;
				console.log("HARDLOCKING: " + HARDLOCKING);
				if (HARDLOCKING) {
					tNotif = ["success", "Enabled"];
				} else {
					tNotif = ["error", "Disabled"];
				}
				createToast(
					"Hardlocking " + tNotif[1],
					"The selected module has been " + tNotif[1].toLowerCase(),
					tNotif[0]
				);
			} else if (evt.code === ESP_KEY) {
				ENABLE_ESP = !ENABLE_ESP;
				console.log("ESP: " + ENABLE_ESP);
				if (ENABLE_ESP) {
					tNotif = ["success", "Enabled"];
				} else {
					tNotif = ["error", "Disabled"];
				}
				createToast(
					"ESP " + tNotif[1],
					"The selected module has been " + tNotif[1].toLowerCase(),
					tNotif[0]
				);
			} else if (evt.code === TRACER_KEY) {
				ENABLE_TRACERS = !ENABLE_TRACERS;
				console.log("TRACERS:" + ENABLE_TRACERS);
				if (ENABLE_TRACERS) {
					tNotif = ["success", "Enabled"];
				} else {
					tNotif = ["error", "Disabled"];
				}
				createToast(
					"Tracers " + tNotif[1],
					"The selected module has been " + tNotif[1].toLowerCase(),
					tNotif[0]
				);
			}
		},
		true
	);
	document.addEventListener(
		"keyup",
		(evt) => {
			if (evt.code === AIM_HOLD_KEY) {
				AIMING = false;
				TARGETED = null;
			}
		},
		true
	);
	document.addEventListener(
		"keydown",
		(evt) => {
			if (evt.key.toLowerCase() === "p") {
				predictiveOn = !predictiveOn;
				console.log("[Aimbot] Predictive =", predictiveOn);
			}
		},
		true
	);
	const originalXHROpen = XMLHttpRequest.prototype.open;
	const originalXHRGetResponse = Object.getOwnPropertyDescriptor(
		XMLHttpRequest.prototype,
		"response"
	);
	let shellshockjs = null;
	XMLHttpRequest.prototype.open = function (...args) {
		const url = args[1];
		if (url && url.includes("js/shellshock.js")) {
			shellshockjs = this;
		}
		originalXHROpen.apply(this, args);
	};
	Object.defineProperty(XMLHttpRequest.prototype, "response", {
		get: function () {
			if (this === shellshockjs) {
				return modifyShellshock(originalXHRGetResponse.get.call(this));
			}
			return originalXHRGetResponse.get.call(this);
		},
	});
	Object.defineProperty(window, "uuid", {
		get: () => {
			return 0;
		},
	}); /* anticheat bypass */
	Object.defineProperty(Object, "hideAds", {
		/* ad removal */ enumerable: false,
		get() {
			return true;
		},
		set(v) {
			return v.hideAds;
		},
	});
	function createToast(title, message, type) {
		/* types: success, warning, error, info */
		if (type == "" || type == "classic") {
			butterup.toast({
				title: title,
				message: "",
				location: "top-right",
				dismissable: false,
			});
		} else {
			butterup.toast({
				title: title,
				message: "",
				location: "top-right",
				dismissable: false,
				icon: true,
				type: type,
			});
		}
	}
	function getScrambled() {
		return Array.from({ length: 10 }, () =>
			String.fromCharCode(97 + Math.floor(Math.random() * 26))
		).join("");
	}
	function fetchTextContent(url) {
		const xhr = new XMLHttpRequest();
		xhr.open("GET", url, false);
		xhr.send();
		if (xhr.status === 200) {
			return xhr.responseText;
		} else {
			console.error("Error fetching text content. Status:", xhr.status);
			return null;
		}
	}
	function findKeyWithProperty(obj, propertyToFind) {
		for (const key in obj) {
			if (!obj.hasOwnProperty(key)) continue;
			if (key === propertyToFind) {
				return [key];
			} else if (
				typeof obj[key] === "object" &&
				obj[key] !== null &&
				obj[key].hasOwnProperty(propertyToFind)
			) {
				return key;
			}
		}
		return null;
	}
	function createAnonFunction(name, func) {
		const funcName = getScrambled();
		window[funcName] = func;
		F[name] = window[funcName];
		functionNames[name] = funcName;
	}
	function modifyShellshock(gameJS) {
		window.butterup = butterup;
		let originalJS = gameJS;
		if (crackedShell) {
			const altJS = fetchTextContent("/js/shellshock.og.js");
			if (altJS) originalJS = altJS;
		}
		const getVardata = function (hash) {
			return fetchTextContent(
				clientKeysURL + hash + ".json?v=" + Date.now()
			);
		};
		const hash = CryptoJS.SHA256(originalJS).toString(CryptoJS.enc.Hex);
		let clientKeys = null;
		onlineClientKeys = getVardata(hash);
		const vardataCache = {};
		if (onlineClientKeys == "value_undefined" || onlineClientKeys == null) {
			onlineClientKeys = getVardata("latest");
		}
		if (onlineClientKeys && !clientKeys)
			clientKeys = JSON.parse(onlineClientKeys);
		if (vardataCache && onlineClientKeys) {
			vardataCache[clientKeys.checksum] = onlineClientKeys;
			vardataCache.latest = onlineClientKeys;
		}
		H = clientKeys.vars;
		let injectionString = "";
		const variableNameRegex = /^[a-zA-Z0-9_$\[\]"\\\.,]*$/;
		let match = new RegExp(`!${H.CULL}&&(.+?\\}\\})`).exec(gameJS);
		H.SERVERSYNC = match
			? match[1].replace(/[a-zA-Z$_\.\[\]]+shots/, 0)
			: "function(){console.log('SERVERSYNC hook failed.')}";
		match = new RegExp(
			`,setTimeout\\(\\(\\(\\)=>\\{([=A-z0-9\\(\\),\\{ \\.;!\\|\\?:\\}]+send\\([a-zA-Z$_]+\\))`
		).exec(gameJS);
		H.PAUSE = match
			? `function(){${match[1]}}`
			: `function(){console.log('PAUSE hook failed.')}`;
		for (let name in H) {
			let deobf = H[name];
			if (
				name == "SERVERSYNC" ||
				name == "PAUSE" ||
				variableNameRegex.test(deobf)
			) {
				injectionString = `${injectionString}${name}:  (() => { let variable = "value_undefined"; try { eval("variable = ${deobf};"); } catch (error) { return "value_undefined"; }; return variable; })(),`;
			} else {
				alert(
					"WARNING! The keys inputted contain non-variable characters! There is a possibility that this could run code unintended by the StateFarm team, although possibly there is also a mistake. Do NOT proceed with using this, and report to the StateFarm developers what is printed in the console."
				);
			}
		}

		window.ss = H;
		const f = function (varName) {
			return varName.replace("$", "\\$");
		};
		function modifyJS(find, replace) {
			const oldJS = gameJS;
			gameJS = gameJS.originalReplace(find, replace);
			if (oldJS === gameJS) {
				console.warn("Replace FAILED for pattern:", find);
			}
		}
		modifyJS(
			`${H.SCENE}.render`,
			`window["${functionNames.retrieveFunctions}"]({${injectionString}},true)||${H.SCENE}.render`
		);
		modifyJS(`{if(${H.CULL})`, `{if(true)`);
		modifyJS(
			"fire(){var",
			"fire(){window." + functionNames.beforeFiring + "(this.player);var"
		);
		/*let matchPE = new RegExp(
			`\\.prototype\\.${f(H._update)}=function\\([a-zA-Z$_,]+\\)\\{`
		).exec(gameJS)[0];
		modifyJS(
			matchPE,
			`${matchPE}${f(H.CONTROLKEYS)}=window.${
				functionNames.modifyControls
			}(${f(H.CONTROLKEYS)});`
		);*/
		modifyJS("iFrame removed", "MingleClient injected successfully!");
		console.log("\n");
		console.log(
			"%cMingleClient",
			"font-weight: bold; color: #ffc700; font-size: 40px; text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;"
		);
		console.log(
			"%cClient injection successful!",
			"font-weight: bold; font-size: 16px; color: #ffffff; text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;"
		);
		console.log("\n");
		document.title = "MingleClient v" + MOD_VERSION.toString();
		var link = document.querySelector("link[rel~='icon']");
		if (!link) {
			link = document.createElement("link");
			link.rel = "icon";
			document.head.appendChild(link);
		}
		link.type = "";
		link.href = modIconURL + "?v=" + MOD_VERSION.toString();
		window.butterup.options.toastLife = 2250;
		return gameJS;
	}
	createAnonFunction("retrieveFunctions", function (vars) {
		window.ss = vars;
		F.clientTick();
	});
	createAnonFunction("clientTick", function () {
		ss.PLAYERS.forEach((p) => {
			if (p.hasOwnProperty("ws")) {
				ss.MYPLAYER = p;
			}
		});
		H.actor = findKeyWithProperty(ss.MYPLAYER, H.mesh);
		if (!window.r1) {
			var scene = BABYLON.Engine.LastCreatedScene;
			if (scene) {
				scene.getEngine().setMaxFPS(Infinity); /* uncap fps */
			}
			console.log("\n");
			console.log(
				"%cMingleClient",
				"font-weight: bold; color: #ffc700; font-size: 40px; text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;"
			);
			console.log(
				"%cRender loop hijacked successfully!",
				"font-weight: bold; font-size: 16px; color: #ffffff; text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;"
			);
			console.log("\n");
			window.r1 = true;
		}
		localStorage.timesPlayed = 0;
		F.updatePlayerVelocities();
		F.updateESPandTracers();
		if (AIMING && TARGETED && !TARGETED[H.playing]) {
			TARGETED = null;
			createToast(
				"Target Eliminated",
				"Your aimbot target is no longer alive.",
				"warning"
			);
		}
		if (
			AIMING &&
			TARGETED &&
			TARGETED[H.playing] &&
			F.getLineOfSight(TARGETED, predictiveOn)
		) {
			let targetPosition = F.getAimLocation(TARGETED);
			let directionVector = F.getDirectionVectorFacingTarget(
				targetPosition,
				true,
				-0.05
			);
			let direction = {
				yawReal: F.calculateYaw(directionVector),
				pitchReal: F.calculatePitch(directionVector),
			};
			if (
				ss.MYPLAYER.weapon &&
				ss.MYPLAYER.weapon.constructor &&
				ss.MYPLAYER.weapon.constructor.standardMeshName !== "dozenGauge"
			) {
				direction = F.applyBloom(direction, 1);
			}
			desiredYaw = direction.yawReal;
			desiredPitch = direction.pitchReal;
		} else {
			desiredYaw = ss.MYPLAYER[H.yaw];
			desiredPitch = ss.MYPLAYER[H.pitch];
		}
		F.smoothAim();
	});
	createAnonFunction("beforeFiring", function (player) {
		if (AIMING && TARGETED && TARGETED[H.playing]) {
			let targetPosition = F.getAimLocation(TARGETED);
			let directionVector = F.getDirectionVectorFacingTarget(
				targetPosition,
				true,
				-0.05
			);
			console.log("dVector", directionVector);
			let direction = {
				yawReal: F.calculateYaw(directionVector),
				pitchReal: F.calculatePitch(directionVector),
			};
			console.log("direction", direction);
			if (
				ss.MYPLAYER.weapon &&
				ss.MYPLAYER.weapon.constructor &&
				ss.MYPLAYER.weapon.constructor.standardMeshName !== "dozenGauge"
			) {
				direction = F.applyBloom(direction, 1);
			}
			let aimbot = direction;
			let diffYaw =
				(Math.radDifference(ss.MYPLAYER[H.yaw], aimbot.yawReal) * 180) /
				Math.PI;
			let diffPositive = diffYaw > 0;
			diffYaw *= diffPositive ? 1 : -1;
			for (let i = 0; i < 3; i++) {
				let state =
					ss.MYPLAYER[H.stateBuffer][
						Math.mod(ss.MYPLAYER.stateIdx - i, 256)
					];
				let newControlKeys = 0;
				if (diffYaw > 157.5) {
					newControlKeys |=
						ss.CONTROLKEYS & ss.CONTROLKEYSENUM.left
							? ss.CONTROLKEYSENUM.right
							: 0;
					newControlKeys |=
						ss.CONTROLKEYS & ss.CONTROLKEYSENUM.right
							? ss.CONTROLKEYSENUM.left
							: 0;
					newControlKeys |=
						ss.CONTROLKEYS & ss.CONTROLKEYSENUM.up
							? ss.CONTROLKEYSENUM.down
							: 0;
					newControlKeys |=
						ss.CONTROLKEYS & ss.CONTROLKEYSENUM.down
							? ss.CONTROLKEYSENUM.up
							: 0;
				} else if (diffYaw > 112.5) {
					if (diffPositive) {
						newControlKeys |=
							ss.CONTROLKEYS & ss.CONTROLKEYSENUM.left
								? ss.CONTROLKEYSENUM.up +
								  ss.CONTROLKEYSENUM.right
								: 0;
						newControlKeys |=
							ss.CONTROLKEYS & ss.CONTROLKEYSENUM.right
								? ss.CONTROLKEYSENUM.down +
								  ss.CONTROLKEYSENUM.left
								: 0;
						newControlKeys |=
							ss.CONTROLKEYS & ss.CONTROLKEYSENUM.up
								? ss.CONTROLKEYSENUM.down +
								  ss.CONTROLKEYSENUM.right
								: 0;
						newControlKeys |=
							ss.CONTROLKEYS & ss.CONTROLKEYSENUM.down
								? ss.CONTROLKEYSENUM.up +
								  ss.CONTROLKEYSENUM.left
								: 0;
					} else {
						newControlKeys |=
							ss.CONTROLKEYS & ss.CONTROLKEYSENUM.left
								? ss.CONTROLKEYSENUM.down +
								  ss.CONTROLKEYSENUM.right
								: 0;
						newControlKeys |=
							ss.CONTROLKEYS & ss.CONTROLKEYSENUM.right
								? ss.CONTROLKEYSENUM.up +
								  ss.CONTROLKEYSENUM.left
								: 0;
						newControlKeys |=
							ss.CONTROLKEYS & ss.CONTROLKEYSENUM.up
								? ss.CONTROLKEYSENUM.down +
								  ss.CONTROLKEYSENUM.left
								: 0;
						newControlKeys |=
							ss.CONTROLKEYS & ss.CONTROLKEYSENUM.down
								? ss.CONTROLKEYSENUM.up +
								  ss.CONTROLKEYSENUM.right
								: 0;
					}
				} else if (diffYaw > 67.5) {
					if (diffPositive) {
						newControlKeys |=
							ss.CONTROLKEYS & ss.CONTROLKEYSENUM.left
								? ss.CONTROLKEYSENUM.up
								: 0;
						newControlKeys |=
							ss.CONTROLKEYS & ss.CONTROLKEYSENUM.right
								? ss.CONTROLKEYSENUM.down
								: 0;
						newControlKeys |=
							ss.CONTROLKEYS & ss.CONTROLKEYSENUM.up
								? ss.CONTROLKEYSENUM.right
								: 0;
						newControlKeys |=
							ss.CONTROLKEYS & ss.CONTROLKEYSENUM.down
								? ss.CONTROLKEYSENUM.left
								: 0;
					} else {
						newControlKeys |=
							ss.CONTROLKEYS & ss.CONTROLKEYSENUM.left
								? ss.CONTROLKEYSENUM.down
								: 0;
						newControlKeys |=
							ss.CONTROLKEYS & ss.CONTROLKEYSENUM.right
								? ss.CONTROLKEYSENUM.up
								: 0;
						newControlKeys |=
							ss.CONTROLKEYS & ss.CONTROLKEYSENUM.up
								? ss.CONTROLKEYSENUM.left
								: 0;
						newControlKeys |=
							ss.CONTROLKEYS & ss.CONTROLKEYSENUM.down
								? ss.CONTROLKEYSENUM.right
								: 0;
					}
				} else if (diffYaw > 22.5) {
					if (diffPositive) {
						newControlKeys |=
							ss.CONTROLKEYS & ss.CONTROLKEYSENUM.left
								? ss.CONTROLKEYSENUM.up +
								  ss.CONTROLKEYSENUM.left
								: 0;
						newControlKeys |=
							ss.CONTROLKEYS & ss.CONTROLKEYSENUM.right
								? ss.CONTROLKEYSENUM.down +
								  ss.CONTROLKEYSENUM.right
								: 0;
						newControlKeys |=
							ss.CONTROLKEYS & ss.CONTROLKEYSENUM.up
								? ss.CONTROLKEYSENUM.up +
								  ss.CONTROLKEYSENUM.right
								: 0;
						newControlKeys |=
							ss.CONTROLKEYS & ss.CONTROLKEYSENUM.down
								? ss.CONTROLKEYSENUM.down +
								  ss.CONTROLKEYSENUM.left
								: 0;
					} else {
						newControlKeys |=
							ss.CONTROLKEYS & ss.CONTROLKEYSENUM.left
								? ss.CONTROLKEYSENUM.down +
								  ss.CONTROLKEYSENUM.left
								: 0;
						newControlKeys |=
							ss.CONTROLKEYS & ss.CONTROLKEYSENUM.right
								? ss.CONTROLKEYSENUM.up +
								  ss.CONTROLKEYSENUM.right
								: 0;
						newControlKeys |=
							ss.CONTROLKEYS & ss.CONTROLKEYSENUM.up
								? ss.CONTROLKEYSENUM.up +
								  ss.CONTROLKEYSENUM.left
								: 0;
						newControlKeys |=
							ss.CONTROLKEYS & ss.CONTROLKEYSENUM.down
								? ss.CONTROLKEYSENUM.down +
								  ss.CONTROLKEYSENUM.right
								: 0;
					}
				}
				state.controlKeys |= newControlKeys;
				state[H.yaw] = F.setPrecision(aimbot.yawReal);
				state[H.pitch] = F.setPrecision(aimbot.pitchReal);
				ss.MYPLAYER[H.stateBuffer][
					Math.mod(ss.MYPLAYER.stateIdx - i, 256)
				] = state;
			}
			ss.SERVERSYNC();
		}
	});
	createAnonFunction("pickBestTargetByAngle", function () {
		let best = null;
		let bestScore = -Infinity;
		const myYaw = ss.MYPLAYER[H.yaw];
		const myPitch = ss.MYPLAYER[H.pitch];
		const timeNow = Date.now();
		ss.PLAYERS.forEach((player) => {
			if (!player) return;
			player.timecode = timeNow;
			const differentTeam =
				ss.MYPLAYER.team === 0 || player.team !== ss.MYPLAYER.team;
			if (player !== ss.MYPLAYER && differentTeam && player[H.playing]) {
				const dx = -(player[H.x] - ss.MYPLAYER[H.x]);
				const dy = -(player[H.y] - ss.MYPLAYER[H.y]);
				const dz = -(player[H.z] - ss.MYPLAYER[H.z]);
				const targYaw = F.calculateYaw({ x: dx, y: dy, z: dz });
				const targPitch = F.calculatePitch({ x: dx, y: dy, z: dz });
				const yawDiff = F.angleDifference(targYaw, myYaw);
				const pitchDiff = F.angleDifference(targPitch, myPitch);
				const angleDist = Math.sqrt(
					yawDiff * yawDiff + pitchDiff * pitchDiff
				);
				const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
				const normalizedAngle =
					angleDist <= MAX_FOV_ANGLE
						? (MAX_FOV_ANGLE - angleDist) / MAX_FOV_ANGLE
						: 0;
				const normalizedDistance =
					distance <= MAX_DISTANCE
						? (MAX_DISTANCE - distance) / MAX_DISTANCE
						: 0;
				const score =
					normalizedAngle * ANGLE_WEIGHT +
					normalizedDistance * DISTANCE_WEIGHT;
				if (score > bestScore) {
					bestScore = score;
					best = player;
				}
			}
		});
		return best;
	});
	createAnonFunction("smoothAim", function () {
		const currYaw = ss.MYPLAYER[H.yaw];
		const currPitch = ss.MYPLAYER[H.pitch];
		ss.MYPLAYER[H.yaw] = F.smoothAngle(
			currYaw,
			desiredYaw,
			HARDLOCKING ? 0.99 : SMOOTH_FACTOR
		);
		ss.MYPLAYER[H.pitch] = F.smoothAngle(
			currPitch,
			desiredPitch,
			HARDLOCKING ? 0.99 : SMOOTH_FACTOR
		);
	});
	createAnonFunction("getAimLocation", function (player) {
		if (!predictiveOn) {
			return {
				x: player[H.x],
				y: player[H.y],
				z: player[H.z],
			};
		}
		const predicted = F.predictPosition(player);
		return {
			x: predicted.x,
			y: predicted.y,
			z: predicted.z,
		};
	});
	createAnonFunction("updatePlayerVelocities", function () {
		const now = Date.now();
		ss.PLAYERS.forEach((player) => {
			if (!player) return;
			if (!player.id) {
				player.__someRandomId = player.__someRandomId || Math.random();
				player.id = player.__someRandomId;
			}
			const old = playerHistory[player.id];
			if (!old) {
				playerHistory[player.id] = {
					x: player[H.x],
					y: player[H.y],
					z: player[H.z],
					t: now,
					vx: 0,
					vy: 0,
					vz: 0,
				};
			} else {
				const dt = (now - old.t) / 1000;
				if (dt > 0) {
					const vx = (player[H.x] - old.x) / dt;
					const vy = (player[H.y] - old.y) / dt;
					const vz = (player[H.z] - old.z) / dt;
					playerHistory[player.id] = {
						x: player[H.x],
						y: player[H.y],
						z: player[H.z],
						t: now,
						vx,
						vy,
						vz,
					};
				}
			}
		});
	});
	createAnonFunction("updateESPandTracers", function () {
		const CROSSHAIRS = new BABYLON.Vector3();
		CROSSHAIRS.copyFrom(ss.MYPLAYER[H.actor][H.mesh].position);
		CROSSHAIRS.y += 0.4;
		const forwardOffset = -5;
		const yaw = ss.MYPLAYER[H.yaw];
		const pitch = -ss.MYPLAYER[H.pitch];
		const fx = Math.sin(yaw) * Math.cos(pitch);
		const fy = Math.sin(pitch);
		const fz = Math.cos(yaw) * Math.cos(pitch);
		CROSSHAIRS.x += fx * forwardOffset;
		CROSSHAIRS.y += fy * forwardOffset;
		CROSSHAIRS.z += fz * forwardOffset;
		const timeNow = Date.now();
		ss.PLAYERS.forEach((player) => {
			if (!player) return;
			player.timecode = timeNow;
			const isEnemy =
				ss.MYPLAYER.team === 0 || player.team !== ss.MYPLAYER.team;
			if (player !== ss.MYPLAYER && isEnemy) {
				if (!player.generatedESP) {
					const boxSize = { width: 0.4, height: 0.65, depth: 0.4 };
					const v = [
						new BABYLON.Vector3(
							-boxSize.width / 2,
							0,
							-boxSize.depth / 2
						),
						new BABYLON.Vector3(
							boxSize.width / 2,
							0,
							-boxSize.depth / 2
						),
						new BABYLON.Vector3(
							boxSize.width / 2,
							boxSize.height,
							-boxSize.depth / 2
						),
						new BABYLON.Vector3(
							-boxSize.width / 2,
							boxSize.height,
							-boxSize.depth / 2
						),
						new BABYLON.Vector3(
							-boxSize.width / 2,
							0,
							boxSize.depth / 2
						),
						new BABYLON.Vector3(
							boxSize.width / 2,
							0,
							boxSize.depth / 2
						),
						new BABYLON.Vector3(
							boxSize.width / 2,
							boxSize.height,
							boxSize.depth / 2
						),
						new BABYLON.Vector3(
							-boxSize.width / 2,
							boxSize.height,
							boxSize.depth / 2
						),
					];
					const lines = [];
					for (let i = 0; i < 4; i++) {
						lines.push([v[i], v[(i + 1) % 4]]);
						lines.push([v[i + 4], v[((i + 1) % 4) + 4]]);
						lines.push([v[i], v[i + 4]]);
					}
					const box = BABYLON.MeshBuilder.CreateLineSystem(
						getScrambled(),
						{ lines },
						player[H.actor].scene
					);
					box.renderingGroupId = 1;
					box.parent = player[H.actor][H.mesh];
					const tracers = BABYLON.MeshBuilder.CreateLines(
						"lines",
						{
							points: [
								player[H.actor][H.mesh].position,
								CROSSHAIRS,
							],
						},
						player[H.actor].scene
					);
					tracers.renderingGroupId = 1;
					if (player === TARGETED) {
						box.color = new BABYLON.Color3(1, 0, 0);
						tracers.color = new BABYLON.Color3(1, 0, 0);
					} else {
						box.color = new BABYLON.Color3(1, 1, 1);
						tracers.color = new BABYLON.Color3(1, 1, 1);
					}
					const crosshairLines = [
						[
							new BABYLON.Vector3(-0.1, 0, 0),
							new BABYLON.Vector3(0.1, 0, 0),
						],
						[
							new BABYLON.Vector3(0, -0.1, 0),
							new BABYLON.Vector3(0, 0.1, 0),
						],
					];
					const crosshair = BABYLON.MeshBuilder.CreateLineSystem(
						"targetCrosshair",
						{
							lines: crosshairLines,
						},
						player[H.actor].scene
					);
					crosshair.color = new BABYLON.Color3(1, 0, 0);
					crosshair.renderingGroupId = 1;
					crosshair.parent = player[H.actor][H.mesh];
					crosshair.position.y = 0.3;
					player.box = box;
					player.tracers = tracers;
					player.crosshair = crosshair;
					player.generatedESP = true;
					ESPArray.push([box, tracers, player]);
				}
				player.tracers.setVerticesData(
					BABYLON.VertexBuffer.PositionKind,
					[
						CROSSHAIRS.x,
						CROSSHAIRS.y,
						CROSSHAIRS.z,
						player[H.actor][H.mesh].position.x,
						player[H.actor][H.mesh].position.y,
						player[H.actor][H.mesh].position.z,
					]
				);
				player.box.visibility = ENABLE_ESP;
				player.tracers.visibility = player[H.playing] && ENABLE_TRACERS;
				if (player.crosshair) {
					player.crosshair.isVisible = player === TARGETED;
					if (player === TARGETED) {
						player.box.color = new BABYLON.Color3(1, 0, 0);
						player.tracers.color = new BABYLON.Color3(1, 0, 0);
					} else {
						player.box.color = new BABYLON.Color3(1, 1, 1);
						player.tracers.color = new BABYLON.Color3(1, 1, 1);
					}
				}
			}
		});
		for (let i = 0; i < ESPArray.length; i++) {
			const p = ESPArray[i][2];
			if (!p || p.timecode !== timeNow) {
				ESPArray[i][0].dispose();
				ESPArray[i][1].dispose();
				ESPArray.splice(i, 1);
			}
		}
	});
	createAnonFunction("getLineOfSight", function (target, usePrediction) {
		if (
			target &&
			target[H.actor] &&
			target[H.actor][H.bodyMesh] &&
			target[H.actor][H.bodyMesh].renderOverlay &&
			target[H.actor][H.bodyMesh].overlayColor.g == 1
		)
			return;
		let myPlayerPosition = ss.MYPLAYER[H.actor][H.mesh].position;
		let targetPosition = usePrediction
			? F.predictPosition(target)
			: target[H.actor][H.mesh].position;
		let directionVector = F.getDirectionVectorFacingTarget(
			targetPosition,
			true
		);
		directionVector.x = -directionVector.x;
		directionVector.y = -directionVector.y;
		directionVector.z = -directionVector.z;
		let rotationMatrix = BABYLON.Matrix.RotationYawPitchRoll(
			F.calculateYaw(directionVector),
			F.calculatePitch(directionVector),
			0
		);
		let directionMatrix = BABYLON.Matrix.Translation(
			0,
			0,
			ss.MYPLAYER.weapon.constructor.range
		).multiply(rotationMatrix);
		directionVector = directionMatrix.getTranslation();
		let position = BABYLON.Matrix.Translation(0, 0.1, 0)
			.multiply(rotationMatrix)
			.add(
				BABYLON.Matrix.Translation(
					myPlayerPosition.x,
					myPlayerPosition.y + 0.3,
					myPlayerPosition.z
				)
			)
			.getTranslation();
		let rayCollidesWithMap = ss.RAYS[H.rayCollidesWithMap](
			position,
			directionVector,
			ss.RAYS.projectileCollidesWithCell
		);
		let distanceToMap = rayCollidesWithMap
			? BABYLON.Vector3.DistanceSquared(
					position,
					rayCollidesWithMap.pick.pickedPoint
			  )
			: Infinity;
		let distanceToTarget = BABYLON.Vector3.DistanceSquared(
			position,
			targetPosition
		);
		return distanceToTarget < distanceToMap;
	});
	createAnonFunction("angleDifference", function (a, b) {
		let d = a - b;
		d = ((d + Math.PI) % (2 * Math.PI)) - Math.PI;
		return d;
	});
	createAnonFunction("smoothAngle", function (current, target, factor) {
		const diff = F.angleDifference(target, current);
		return current + diff * factor;
	});
	createAnonFunction("setPrecision", function (value) {
		return Math.floor(value * 8192) / 8192;
	});
	createAnonFunction("distancePlayers", function (player, yMultiplier) {
		if (player && player[H.actor] && player[H.actor][H.mesh]) {
			yMultiplier = yMultiplier || 1;
			const vector = F.getDirectionVectorFacingTarget(player);
			return Math.hypot(vector.x, vector.y * yMultiplier, vector.z);
		} else {
			console.log("bad");
		}
		return 0;
	});
	createAnonFunction("calculateYaw", function (pos) {
		return F.setPrecision(
			(Math.atan2(pos.x, pos.z) + 2 * Math.PI) % (2 * Math.PI)
		);
	});
	createAnonFunction("calculatePitch", function (pos) {
		return F.setPrecision(
			-Math.atan2(pos.y, Math.hypot(pos.x, pos.z)) % 1.5
		);
	});
	createAnonFunction("radianAngleDiff", function (angle1, angle2) {
		const fullCircle = 2 * Math.PI;
		angle1 = ((angle1 % fullCircle) + fullCircle) % fullCircle;
		angle2 = ((angle2 % fullCircle) + fullCircle) % fullCircle;
		let diff = Math.abs(angle1 - angle2);
		diff = Math.min(diff, fullCircle - diff);
		if ((angle1 - angle2 + fullCircle) % fullCircle > Math.PI) {
			return -diff;
		} else {
			return diff;
		}
	});
	createAnonFunction(
		"getDirectionVectorFacingTarget",
		function (target, vectorPassed, offsetY) {
			if (
				vectorPassed ||
				(target && target[H.actor] && target[H.actor][H.mesh])
			) {
				target = vectorPassed
					? target
					: target[H.actor][H.mesh].position;
				offsetY = offsetY || 0;
				return {
					x: -(target.x - ss.MYPLAYER[H.actor][H.mesh].position.x),
					y: -(
						target.y -
						ss.MYPLAYER[H.actor][H.mesh].position.y +
						offsetY
					),
					z: -(target.z - ss.MYPLAYER[H.actor][H.mesh].position.z),
				};
			} else {
				console.log("some shit went wrong");
				return {
					x: 0,
					y: 0,
					z: 0,
				};
			}
		}
	);
	createAnonFunction("predictBloom", function (yaw, pitch) {
		let seed = ss.MYPLAYER[H.randomGen].seed;
		let numbers = [];
		const accuracy = ss.MYPLAYER.weapon.accuracy;
		for (let i = 0; i < 3; i++) {
			seed = (seed * 9301 + 49297) % 233280;
			numbers.push((seed / 233280 - 0.5) * accuracy);
		}
		const range = ss.MYPLAYER.weapon.constructor.range;
		const playerRotationMatrix = BABYLON.Matrix.RotationYawPitchRoll(
			yaw,
			pitch,
			0
		);
		const rangeMatrix = BABYLON.Matrix.Translation(0, 0, range);
		const playerAndRangeMatrix = rangeMatrix.multiply(playerRotationMatrix);
		const bloomMatrix = BABYLON.Matrix.RotationYawPitchRoll(
			numbers[0],
			numbers[1],
			numbers[2]
		);
		const finalBulletMatrix = playerAndRangeMatrix.multiply(bloomMatrix);
		const finalBulletTranslation = finalBulletMatrix.getTranslation();
		const bulletYaw = F.calculateYaw(finalBulletTranslation);
		const bulletPitch = F.calculatePitch(finalBulletTranslation);
		const bulletYawDiff = F.radianAngleDiff(yaw, bulletYaw);
		const bulletPitchDiff = F.radianAngleDiff(pitch, bulletPitch);
		return [bulletYawDiff, bulletPitchDiff];
	});
	createAnonFunction("applyBloom", function (dir, multiplier) {
		const bloomValues = F.predictBloom(dir.yawReal, dir.pitchReal);
		return {
			yawReal: dir.yawReal + bloomValues[0] * multiplier,
			pitchReal: dir.pitchReal + bloomValues[1] * multiplier,
		};
	});
	createAnonFunction("predictPosition", function (player) {
		let velocityVector = new BABYLON.Vector3(0, 0, 0);
		velocityVector.x = player.dx;
		velocityVector.y = player.dy;
		velocityVector.z = player.dz;
		const bulletSpeed = ss.MYPLAYER.weapon.constructor.velocity;
		const timeDiff = F.distancePlayers(player, 1) / bulletSpeed + 1;
		let newPos = new BABYLON.Vector3(
			player[H.x],
			player[H.y],
			player[H.z]
		).add(velocityVector.scale(timeDiff));
		newPos.y = player[H.y];
		let cappedVector = new BABYLON.Vector3(
			velocityVector.x,
			0.29,
			velocityVector.z
		);
		Math.capVector3(cappedVector);
		const terminalVelocity = -cappedVector.y;
		const timeAccelerating = Math.min(
			timeDiff,
			(terminalVelocity - velocityVector.y) / -0.012
		);
		if (player.onGround == 0) {
			const predictedY =
				velocityVector.y * timeAccelerating +
				(timeAccelerating * timeAccelerating * -0.012) / 2 +
				newPos.y +
				terminalVelocity * Math.max(timeDiff - timeAccelerating, 0);
			let rayVector = new BABYLON.Vector3(0, predictedY - newPos.y, 0);
			const rayToGround = ss.RAYS[H.rayCollidesWithMap](
				newPos,
				rayVector,
				ss.RAYS.grenadeCollidesWithCell
			);
			newPos.y =
				Math.max(
					rayToGround ? rayToGround.pick.pickedPoint.y : 0,
					predictedY
				) - 0.072;
		}
		return newPos;
	});
})();
