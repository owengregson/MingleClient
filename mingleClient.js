// ==UserScript==
// @name         MingleClient
// @namespace    https://github.com/owengregson/MingleClient
// @icon         https://raw.githubusercontent.com/owengregson/MingleClient/refs/heads/main/icon_rounded.png
// @license      MIT
// @version      1.0
// @description  Two-loop aimbot with predictive aiming & bloom correction. Toggles with P. Hold SHIFT (configurable) to aim. Includes ESP & Tracers.
// @match        *://shellshock.io/*
// @grant        none
// @run-at       document-start
// @require      https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.2.0/crypto-js.min.js
// @require      https://cdn.jsdelivr.net/npm/babylonjs@7.15.0/babylon.min.js
// ==/UserScript==

/* eslint-disable no-useless-escape */

(function () {
	"use strict";
	const AIM_HOLD_KEY = "ShiftLeft";
	const SMOOTH_FACTOR = 0.45;
	const ENABLE_ESP = true;
	const ENABLE_TRACERS = true;
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
	let onlineClientKeys;
	const functionNames = {};
	const ESPArray = [];
	document.addEventListener(
		"keydown",
		(evt) => {
			if (evt.code === AIM_HOLD_KEY && !AIMING) {
				AIMING = true;
				TARGETED = F.pickBestTargetByAngle();
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
		modifyJS(
			"iFrame removed",
			"MingleClient injected successfully!"
		);
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
		F.updatePlayerVelocities();
		F.updateESPandTracers();
		if (AIMING && TARGETED && !TARGETED[H.playing]) {
			TARGETED = null;
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
		ss.MYPLAYER[H.yaw] = F.smoothAngle(currYaw, desiredYaw, SMOOTH_FACTOR);
		ss.MYPLAYER[H.pitch] = F.smoothAngle(
			currPitch,
			desiredPitch,
			SMOOTH_FACTOR
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
