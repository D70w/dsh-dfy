//#region ../src/client/renderer/whale-rig2/secondary-motion.ts
const MAX_FRAME_SECONDS = 1 / 20;
const FIXED_STEP_SECONDS = 1 / 120;
function clamp(value, minimum, maximum) {
	return Math.max(minimum, Math.min(maximum, value));
}
/** Small deterministic damped spring used after the primary animation pose. */
var SpringValue = class {
	parameters;
	value = 0;
	velocity = 0;
	constructor(parameters) {
		this.parameters = parameters;
	}
	reset(value = 0) {
		this.value = value;
		this.velocity = 0;
	}
	step(target, deltaMs) {
		let remaining = clamp(deltaMs / 1e3, 0, MAX_FRAME_SECONDS);
		const boundedTarget = clamp(target, -this.parameters.maxOffset, this.parameters.maxOffset);
		while (remaining > 0) {
			const seconds = Math.min(FIXED_STEP_SECONDS, remaining);
			const acceleration = this.parameters.stiffness * (boundedTarget - this.value) - this.parameters.damping * this.velocity;
			this.velocity += acceleration * seconds;
			this.value += this.velocity * seconds;
			this.value = clamp(this.value, -this.parameters.maxOffset, this.parameters.maxOffset);
			remaining -= seconds;
		}
		if (!Number.isFinite(this.value) || !Number.isFinite(this.velocity)) this.reset(boundedTarget);
		return this.value;
	}
};

//#endregion
//#region ../src/client/renderer/community-rig/motion.ts
function clampPointer(value) {
	return Math.max(-1, Math.min(1, value));
}
function blinkOpenness(elapsedMs, durationMs = 150) {
	if (elapsedMs < 0 || elapsedMs >= durationMs) return 1;
	const phase = elapsedMs / durationMs;
	if (phase < .42) return 1 - phase / .42;
	return (phase - .42) / .58;
}
function sampleIdleMotion(nowMs, pointerX, pointerY, breathing = true) {
	const breath = breathing ? (1 - Math.cos(nowMs / 3800 * Math.PI * 2)) * .5 : 0;
	const x = clampPointer(pointerX);
	const y = clampPointer(pointerY);
	return {
		breath,
		headX: x * 7,
		headY: y * 3.5 - breath * 1.1,
		headRotationDeg: x * 2.1
	};
}

//#endregion
//#region ../src/client/renderer/see-through-rig/see-through-idle-rig-v2.ts
const DESIGN_SIZE = 1280;
const seeThroughLayerOptions = [
	{
		id: "tail",
		label: "鲸尾"
	},
	{
		id: "hair-back",
		label: "后发"
	},
	{
		id: "whale-fins",
		label: "鲸鱼耳鳍"
	},
	{
		id: "ears",
		label: "人耳"
	},
	{
		id: "lower-body",
		label: "腿／裙摆"
	},
	{
		id: "torso",
		label: "身体／衣领底层"
	},
	{
		id: "arms-back",
		label: "手臂后层"
	},
	{
		id: "shoes",
		label: "鞋子"
	},
	{
		id: "head",
		label: "脸／前发／发箍"
	},
	{
		id: "collar-ruffles",
		label: "胸口白边"
	},
	{
		id: "hands",
		label: "手掌"
	},
	{
		id: "arms-front",
		label: "袖口前层"
	}
];
const defaultSeeThroughLayerOrder = seeThroughLayerOptions.map((option) => option.id);
const partNames = [
	"hair-back",
	"hair-back-center",
	"hair-back-inner-left",
	"hair-back-outer-left",
	"hair-back-inner-right",
	"hair-back-outer-right",
	"tail",
	"face",
	"mouth",
	"neck",
	"torso",
	"torso-bow",
	"collar-front",
	"human-ears",
	"arm-left-sleeve",
	"hand-left-rest-side",
	"hand-left-wave-front",
	"arm-right",
	"leg-left",
	"leg-right",
	"shoe-left",
	"shoe-right",
	"eye-white-left",
	"eye-white-right",
	"iris-left",
	"iris-right",
	"lash-left",
	"lash-right",
	"brow-left",
	"brow-right",
	"hair-front",
	"ahoge",
	"maid-headband",
	"skirt",
	"whale-fins",
	"side-bow"
];
const boneLabels = {
	root: "总控制",
	pelvis: "骨盆",
	waist: "腰部",
	chest: "胸腔",
	neck: "颈部",
	head: "头部",
	armLeftUpper: "左上臂",
	armLeftForearm: "左前臂／肘关节",
	handLeft: "左手掌",
	armRightUpper: "右上臂",
	armRightForearm: "右前臂／肘关节",
	handRight: "右手掌",
	legLeft: "左腿",
	legRight: "右腿",
	hairBackRoot: "后发根部",
	hairBackOuterLeft: "左后发外束",
	hairBackInnerLeft: "左后发内束",
	hairBackCenter: "后发中束",
	hairBackInnerRight: "右后发内束",
	hairBackOuterRight: "右后发外束",
	torsoBow: "胸前蝴蝶结",
	hairFrontLeft: "左前发梢",
	hairFrontRight: "右前发梢",
	ahogeRoot: "呆毛根部",
	ahogeTip: "呆毛尖端",
	tailRoot: "鲸尾根部",
	tail1: "鲸尾第一段",
	tail2: "鲸尾第二段",
	tailTip: "鲸尾尖端"
};
const committedArmPivots = {
	leftForearm: {
		x: 483,
		y: 682
	},
	rightForearm: {
		x: 770,
		y: 681
	}
};
const waveFrontPalmPlacement = {
	targetX: 440,
	targetY: 760,
	rotationOffset: -66.5,
	mirrorAxis: 105,
	sourceWristX: 422,
	sourceWristY: 754
};
const gestureDurations = {
	wave: 1600,
	nod: 1800,
	tilt: 2100
};
const PET_REACTION_DURATION = 760;
const expressionStyles = {
	neutral: {
		mouthScaleX: 1,
		mouthScaleY: 1,
		blushOpacity: 0,
		headLift: 0
	},
	smug: {
		mouthScaleX: 1.18,
		mouthScaleY: .92,
		blushOpacity: .68,
		headLift: -.8
	},
	happy: {
		mouthScaleX: 1.08,
		mouthScaleY: 1.75,
		blushOpacity: 1,
		headLift: -1.7
	}
};
const waveTracks = {
	anticipation: [
		{
			time: 0,
			value: 0,
			curve: "easeOut"
		},
		{
			time: .085,
			value: 1,
			curve: "easeInOut"
		},
		{
			time: .16,
			value: 0,
			curve: "linear"
		},
		{
			time: 1,
			value: 0
		}
	],
	raised: [
		{
			time: 0,
			value: 0,
			curve: "linear"
		},
		{
			time: .06,
			value: 0,
			curve: "easeInOut"
		},
		{
			time: .23,
			value: 1,
			curve: "linear"
		},
		{
			time: .67,
			value: 1,
			curve: "easeInOut"
		},
		{
			time: .87,
			value: 0,
			curve: "linear"
		},
		{
			time: 1,
			value: 0
		}
	],
	arrival: [
		{
			time: 0,
			value: 0,
			curve: "linear"
		},
		{
			time: .17,
			value: 0,
			curve: "easeOut"
		},
		{
			time: .24,
			value: 1,
			curve: "easeInOut"
		},
		{
			time: .32,
			value: 0,
			curve: "linear"
		},
		{
			time: 1,
			value: 0
		}
	],
	waveEnergy: [
		{
			time: 0,
			value: 0,
			curve: "linear"
		},
		{
			time: .2,
			value: 0,
			curve: "easeOut"
		},
		{
			time: .28,
			value: 1,
			curve: "linear"
		},
		{
			time: .64,
			value: 1,
			curve: "easeInOut"
		},
		{
			time: .73,
			value: 0,
			curve: "linear"
		},
		{
			time: 1,
			value: 0
		}
	],
	returnOvershoot: [
		{
			time: 0,
			value: 0,
			curve: "linear"
		},
		{
			time: .78,
			value: 0,
			curve: "easeOut"
		},
		{
			time: .9,
			value: 1,
			curve: "easeInOut"
		},
		{
			time: 1,
			value: 0
		}
	]
};
const waveExpressionTracks = {
	smile: [
		{
			time: 0,
			value: 0,
			curve: "linear"
		},
		{
			time: .05,
			value: 0,
			curve: "easeOut"
		},
		{
			time: .18,
			value: 1,
			curve: "easeInOut"
		},
		{
			time: .72,
			value: .95,
			curve: "easeInOut"
		},
		{
			time: .84,
			value: .42,
			curve: "easeInOut"
		},
		{
			time: 1,
			value: 0
		}
	],
	mouthOpen: [
		{
			time: 0,
			value: 0,
			curve: "linear"
		},
		{
			time: .06,
			value: 0,
			curve: "easeOut"
		},
		{
			time: .18,
			value: 1,
			curve: "easeInOut"
		},
		{
			time: .68,
			value: .9,
			curve: "easeOut"
		},
		{
			time: .78,
			value: .38,
			curve: "easeInOut"
		},
		{
			time: .9,
			value: 0,
			curve: "linear"
		},
		{
			time: 1,
			value: 0
		}
	],
	blush: [
		{
			time: 0,
			value: 0,
			curve: "linear"
		},
		{
			time: .08,
			value: .1,
			curve: "easeOut"
		},
		{
			time: .2,
			value: .88,
			curve: "easeInOut"
		},
		{
			time: .72,
			value: .8,
			curve: "easeInOut"
		},
		{
			time: 1,
			value: 0
		}
	],
	browLift: [
		{
			time: 0,
			value: 0,
			curve: "linear"
		},
		{
			time: .08,
			value: 0,
			curve: "easeOut"
		},
		{
			time: .2,
			value: 1,
			curve: "easeInOut"
		},
		{
			time: .68,
			value: .76,
			curve: "easeInOut"
		},
		{
			time: .82,
			value: 0,
			curve: "linear"
		},
		{
			time: 1,
			value: 0
		}
	]
};
const waveHandSpriteTrack = [
	{
		time: 0,
		state: "rest-side"
	},
	{
		time: .08,
		state: "wave-front",
		transition: .12
	},
	{
		time: .74,
		state: "rest-side",
		transition: .12
	}
];
function loadImage(url) {
	return new Promise((resolve, reject) => {
		const image = new Image();
		image.onload = () => resolve(image);
		image.onerror = () => reject(/* @__PURE__ */ new Error(`see-through rig: failed to load ${url}`));
		image.src = url;
	});
}
async function loadParts(baseUrl) {
	const normalized = baseUrl.replace(/\/$/, "");
	const manifest = await fetch(`${normalized}/manifest.json`).then(async (response) => {
		if (!response.ok) throw new Error(`see-through rig: manifest ${response.status}`);
		return response.json();
	});
	if (manifest.designSize[0] !== DESIGN_SIZE || manifest.designSize[1] !== DESIGN_SIZE) throw new Error("see-through rig: unexpected design size");
	const entries = await Promise.all(partNames.map(async (name) => {
		const part = manifest.parts[name];
		if (!part) throw new Error(`see-through rig: missing ${name}`);
		return [name, {
			...part,
			image: await loadImage(`${normalized}/${part.file}`)
		}];
	}));
	return Object.fromEntries(entries);
}
function clamp01(value) {
	return Math.max(0, Math.min(1, value));
}
function grabLeverWeight(pointX, pointY, grabX, grabY, materialGain = 1, min = .16, max = 1.55) {
	const dx = (pointX - grabX) * 1.05;
	const dy = (pointY - grabY) * 1.2;
	return Math.max(min, Math.min(max, (.16 + Math.hypot(dx, dy) * 1.55) * materialGain));
}
function smoothstep(edge0, edge1, value) {
	const t = clamp01((value - edge0) / Math.max(1e-4, edge1 - edge0));
	return t * t * (3 - 2 * t);
}
function easeInOutCubic(value) {
	const t = clamp01(value);
	return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
function applyScalarCurve(curve, value) {
	const t = clamp01(value);
	if (curve === "easeIn") return t * t * t;
	if (curve === "easeOut") return 1 - Math.pow(1 - t, 3);
	if (curve === "easeInOut") return easeInOutCubic(t);
	return t;
}
function sampleScalarTrack(track, time) {
	if (track.length === 0) return 0;
	const t = clamp01(time);
	if (t <= track[0].time) return track[0].value;
	const last = track[track.length - 1];
	if (t >= last.time) return last.value;
	for (let index = 0; index < track.length - 1; index += 1) {
		const current = track[index];
		const next = track[index + 1];
		if (t > next.time) continue;
		const duration = Math.max(1e-4, next.time - current.time);
		const progress = clamp01((t - current.time) / duration);
		if (current.curve === "hermite") {
			const p2 = progress * progress;
			const p3 = p2 * progress;
			const m0 = (current.outTangent ?? 0) * duration;
			const m1 = (next.inTangent ?? 0) * duration;
			return (2 * p3 - 3 * p2 + 1) * current.value + (p3 - 2 * p2 + progress) * m0 + (-2 * p3 + 3 * p2) * next.value + (p3 - p2) * m1;
		}
		const curved = applyScalarCurve(current.curve ?? "linear", progress);
		return current.value + (next.value - current.value) * curved;
	}
	return last.value;
}
function sampleSpriteStateWeight(track, time, targetState) {
	if (track.length === 0) return 0;
	const t = clamp01(time);
	let previous = track[0];
	let current = track[0];
	for (let index = 1; index < track.length; index += 1) {
		const candidate = track[index];
		if (candidate.time > t) break;
		previous = current;
		current = candidate;
	}
	if (current === track[0] || !current.transition || current.transition <= 0) return current.state === targetState ? 1 : 0;
	const mix = easeInOutCubic((t - current.time) / current.transition);
	const from = previous.state === targetState ? 1 : 0;
	return from + ((current.state === targetState ? 1 : 0) - from) * mix;
}
function interpolateExpression(from, to, progress) {
	const t = easeInOutCubic(progress);
	const mix = (a, b) => a + (b - a) * t;
	return {
		mouthScaleX: mix(from.mouthScaleX, to.mouthScaleX),
		mouthScaleY: mix(from.mouthScaleY, to.mouthScaleY),
		blushOpacity: mix(from.blushOpacity, to.blushOpacity),
		headLift: mix(from.headLift, to.headLift)
	};
}
function phase(progress, start, end) {
	return easeInOutCubic((progress - start) / Math.max(1e-4, end - start));
}
function pulse(progress, start, peak, end) {
	if (progress <= start || progress >= end) return 0;
	return progress < peak ? phase(progress, start, peak) : 1 - phase(progress, peak, end);
}
function samplePetReaction(now, startedAt, direction, reducedMotion) {
	const elapsed = now - startedAt;
	if (!Number.isFinite(elapsed) || elapsed < 0 || elapsed >= PET_REACTION_DURATION) return {
		active: false,
		progress: 1,
		rootY: 0,
		scaleX: 1,
		scaleY: 1,
		pelvisY: 0,
		pelvisRotation: 0,
		waistRotation: 0,
		chestRotation: 0,
		headY: 0,
		headRotation: 0,
		secondaryX: 0,
		secondaryY: 0,
		blinkOpenness: 1,
		smile: 0,
		blush: 0
	};
	const t = clamp01(elapsed / PET_REACTION_DURATION);
	const amount = reducedMotion ? .38 : 1;
	const press = pulse(t, 0, .055, .16);
	const rebound = pulse(t, .075, .22, .43);
	const settle = pulse(t, .32, .5, .72);
	const finish = pulse(t, .62, .77, .98);
	const blushEnvelope = phase(t, .025, .13) * (1 - phase(t, .56, .94));
	const side = Math.max(-1, Math.min(1, direction));
	return {
		active: true,
		progress: t,
		rootY: (press * 7 - rebound * 12 + settle * 4 - finish * 1.4) * amount,
		scaleX: 1 + (press * .035 - rebound * .012 + settle * .006) * amount,
		scaleY: 1 + (-press * .03 + rebound * .014 - settle * .006) * amount,
		pelvisY: (press * 2.8 - rebound * 3.6 + settle * 1.25) * amount,
		pelvisRotation: side * (-press * 1.1 + rebound * 2.2 - settle * .75) * amount,
		waistRotation: side * (-press * 1.55 + rebound * 3.1 - settle * 1.05 + finish * .28) * amount,
		chestRotation: side * (-press * 2.1 + rebound * 4.2 - settle * 1.45 + finish * .42) * amount,
		headY: (press * 1.4 - rebound * 5.5 + settle * 2.35 - finish * .55) * amount,
		headRotation: side * (-press * 2.7 + rebound * 5.4 - settle * 2 + finish * .55) * amount,
		secondaryX: side * (press * .34 - rebound * .62 + settle * .24) * amount,
		secondaryY: (press * .42 - rebound * .76 + settle * .26) * amount,
		blinkOpenness: 1 - press * .24 * amount,
		smile: (.22 * rebound + .14 * settle) * amount,
		blush: blushEnvelope * .92 * amount
	};
}
function sampleHeldBlush(now, startedAt, from, target, holdUntil, fadeUntil) {
	if (!Number.isFinite(startedAt) || target <= 0) return 0;
	const entered = from + (target - from) * phase(now, startedAt, startedAt + 240);
	if (now <= holdUntil) return entered;
	if (now >= fadeUntil) return 0;
	return entered * (1 - phase(now, holdUntil, fadeUntil));
}
const transientEmotionStyles = {
	love: { headY: -2, headRotation: -3.2, headPitch: .04, gazeX: -.04, gazeY: -.03, blinkOpenness: .56, smile: .42, mouthOpen: 0, mouthOverride: 1, browY: -2, browLeftRotation: -4, browRightRotation: 4, blush: .76, shoulderLeftX: 3, shoulderLeftY: 1, shoulderRightX: -3, shoulderRightY: 1 },
	shy: { headY: 3, headRotation: -2.2, headPitch: .22, gazeX: .26, gazeY: .68, blinkOpenness: .58, smile: .08, mouthOpen: 0, mouthOverride: 1, browY: -1, browLeftRotation: -8, browRightRotation: 8, blush: .96, shoulderLeftX: 4, shoulderLeftY: 2, shoulderRightX: -4, shoulderRightY: 2 },
	angry: { headY: 1, headRotation: 0, headPitch: .08, gazeX: 0, gazeY: -.04, blinkOpenness: .84, smile: -.2, mouthOpen: 0, mouthOverride: 1, browY: 5, browLeftRotation: 18, browRightRotation: -18, blush: 0, shoulderLeftX: -2, shoulderLeftY: -2, shoulderRightX: 2, shoulderRightY: -2 },
	surprise: { headY: -4, headRotation: 0, gazeY: -.12, blinkOpenness: 1, smile: .12, mouthOpen: .88, browY: -8, browLeftRotation: 0, browRightRotation: 0, blush: .12 },
	sad: { headY: 6, headRotation: 1, headPitch: .24, gazeX: -.04, gazeY: .5, blinkOpenness: .96, smile: -.22, mouthOpen: 0, mouthOverride: 1, browY: -3, browLeftRotation: -15, browRightRotation: 15, blush: .08, tear: 1, chestRotation: -.8, shoulderLeftX: 3, shoulderLeftY: 6, shoulderRightX: -3, shoulderRightY: 6 },
	happy: { headY: -3, headRotation: -1.4, headPitch: .02, gazeX: 0, gazeY: -.05, blinkOpenness: .92, smile: .48, mouthOpen: 0, mouthOverride: 1, browY: -4, browLeftRotation: -3, browRightRotation: 3, blush: .26, waistRotation: -1.2, chestRotation: 1.8, shoulderLeftX: 2, shoulderLeftY: -3, shoulderRightX: -2, shoulderRightY: -3 },
	confused: { headY: 1, headRotation: 7, headPitch: .08, gazeX: .42, gazeY: -.08, blinkOpenness: .92, smile: -.04, mouthOpen: 0, mouthOverride: 1, browY: -1, browLeftRotation: -10, browRightRotation: -2, blush: .04, waistRotation: -1.4, chestRotation: 2.2, shoulderLeftX: 1, shoulderLeftY: 1, shoulderRightX: -1, shoulderRightY: 3 },
	pout: { headY: 5, headRotation: -2, headPitch: .22, gazeX: -.12, gazeY: .42, blinkOpenness: .94, smile: -.28, mouthOpen: 0, mouthOverride: 1, browY: -3, browLeftRotation: -14, browRightRotation: 14, blush: .34, tear: .28, waistRotation: 1, chestRotation: -1.6, shoulderLeftX: 3, shoulderLeftY: 4, shoulderRightX: -3, shoulderRightY: 4 },
	sleepy: { headY: 6, headRotation: -5, headPitch: .3, gazeX: -.05, gazeY: .36, blinkOpenness: .42, smile: -.02, mouthOpen: 0, mouthOverride: 1, browY: 2, browLeftRotation: -2, browRightRotation: 2, blush: .08, waistRotation: 1.8, chestRotation: -2.6, shoulderLeftX: 2, shoulderLeftY: 5, shoulderRightX: -2, shoulderRightY: 5 },
	proud: { headY: -2, headRotation: 4, headPitch: -.1, gazeX: -.34, gazeY: -.14, blinkOpenness: .78, smile: .26, mouthOpen: 0, mouthOverride: 1, browY: -1, browLeftRotation: 7, browRightRotation: -7, blush: .1, waistRotation: -2.2, chestRotation: 3.2, shoulderLeftX: -3, shoulderLeftY: -3, shoulderRightX: 3, shoulderRightY: -3 },
	excited: { headY: -5, headRotation: -1, headPitch: -.02, gazeX: 0, gazeY: -.1, blinkOpenness: 1, smile: .54, mouthOpen: 0, mouthOverride: 1, browY: -7, browLeftRotation: 0, browRightRotation: 0, blush: .34, waistRotation: -1.6, chestRotation: 2.8, shoulderLeftX: 4, shoulderLeftY: -5, shoulderRightX: -4, shoulderRightY: -5 },
	mischievous: { headY: -1, headRotation: -5.5, headPitch: -.04, gazeX: .38, gazeY: -.08, blinkOpenness: .88, smile: .38, mouthOpen: 0, mouthOverride: 1, browY: -2, browLeftRotation: -10, browRightRotation: -1, blush: .16, waistRotation: 2, chestRotation: -2.8, shoulderLeftX: 2, shoulderLeftY: -1, shoulderRightX: -2, shoulderRightY: 1 },
	// These three deliberately use different acting silhouettes:
	// relieved = exhale and release, determined = locked-in square stance,
	// nervous = guarded shoulders with a small involuntary tremor.
	relieved: { headY: 2, headRotation: -2.8, headPitch: -.12, gazeX: -.06, gazeY: .12, blinkOpenness: .3, smile: .34, mouthOpen: 0, mouthOverride: 1, browY: 2, browLeftRotation: -1, browRightRotation: 1, blush: .08, waistRotation: 1.5, chestRotation: -2.6, shoulderLeftX: 4, shoulderLeftY: 8, shoulderRightX: -4, shoulderRightY: 8 },
	determined: { headY: -4, headRotation: 0, headPitch: -.18, gazeX: 0, gazeY: -.2, blinkOpenness: .58, smile: -.02, mouthOpen: 0, mouthOverride: 1, browY: 4, browLeftRotation: 17, browRightRotation: -17, blush: .02, waistRotation: -2.4, chestRotation: 4.6, shoulderLeftX: -4, shoulderLeftY: -5, shoulderRightX: 4, shoulderRightY: -5 },
	nervous: { headY: 4, headRotation: 4.8, headPitch: .16, gazeX: -.42, gazeY: -.2, blinkOpenness: 1, smile: -.2, mouthOpen: 0, mouthOverride: 1, browY: -10, browLeftRotation: -16, browRightRotation: 16, blush: .42, waistRotation: 2.8, chestRotation: -3.8, shoulderLeftX: 6, shoulderLeftY: -8, shoulderRightX: -6, shoulderRightY: -8 },
	hungry: { headY: -2, headRotation: -2.2, headPitch: -.02, gazeX: .24, gazeY: -.05, blinkOpenness: 1, smile: .3, mouthOpen: .18, mouthOverride: 1, browY: -5, browLeftRotation: -2, browRightRotation: 2, blush: .18, waistRotation: -1.2, chestRotation: 1.8, shoulderLeftX: 2, shoulderLeftY: -2, shoulderRightX: -2, shoulderRightY: -2 }
};
function sampleTransientEmotion(clock, name, elapsed, duration) {
	const style = transientEmotionStyles[name];
	const empty = { active: false, weight: 0, headY: 0, headRotation: 0, headPitch: 0, gazeX: 0, gazeY: 0, blinkOpenness: 1, smile: 0, mouthOpen: 0, mouthOverride: 0, browY: 0, browLeftRotation: 0, browRightRotation: 0, blush: 0, tear: 0, tearPool: 0, tearStream: 0, tearDrop: 0, tearDropPhase: 0, waistRotation: 0, chestRotation: 0, shoulderLeftX: 0, shoulderLeftY: 0, shoulderRightX: 0, shoulderRightY: 0 };
	if (!style || !Number.isFinite(elapsed) || elapsed >= duration + 460) return empty;
	const entered = phase(elapsed, 0, 180);
	const weight = elapsed <= duration ? entered : entered * (1 - phase(elapsed, duration, duration + 460));
	const normalized = clamp01(elapsed / Math.max(1, duration));
	const release = smoothstep(.18, .72, normalized);
	// Keep nervousness readable without a high-frequency shake. The previous
	// 75/110 rad/s inputs produced visible frame-to-frame twitching.
	const nervousEnvelope = name === "nervous" ? Math.max(0, 1 - normalized) * (0.82 + .18 * Math.cos(normalized * Math.PI)) : 0;
	const nervousTremor = name === "nervous" ? Math.sin(elapsed * .0044 + .4) * nervousEnvelope : 0;
	const nervousTremorY = name === "nervous" ? Math.sin(elapsed * .0062 + 1.4) * nervousEnvelope : 0;
	const scaled = {};
	for (const key of ["headY", "headRotation", "headPitch", "gazeX", "gazeY", "smile", "mouthOpen", "mouthOverride", "browY", "browLeftRotation", "browRightRotation", "blush", "tear", "waistRotation", "chestRotation", "shoulderLeftX", "shoulderLeftY", "shoulderRightX", "shoulderRightY"]) scaled[key] = (style[key] ?? 0) * weight;
	if (name === "relieved") {
		// A visible sigh: chest rises first, then shoulders and head settle.
		scaled.headY += Math.sin(normalized * Math.PI) * -2.6 * weight;
		scaled.chestRotation += Math.sin(normalized * Math.PI) * 2.2 * weight;
		scaled.shoulderLeftY += Math.sin(normalized * Math.PI) * 3.5 * weight;
		scaled.shoulderRightY += Math.sin(normalized * Math.PI) * 3.5 * weight;
	} else if (name === "determined") {
		// Anticipation, then a firm locked hold; no floaty idle-like sway.
		const lock = smoothstep(.08, .34, normalized);
		scaled.headY += (1 - lock) * 2.2 * weight;
		scaled.chestRotation += lock * 1.2 * weight;
		scaled.shoulderLeftX -= lock * 1.5 * weight;
		scaled.shoulderRightX += lock * 1.5 * weight;
	} else if (name === "nervous") {
		// Small asynchronous flinches make this read as tension, not surprise.
		scaled.headRotation += nervousTremor * 1.15 * weight;
		scaled.headY += nervousTremorY * .62 * weight;
		scaled.shoulderLeftX += nervousTremor * .9 * weight;
		scaled.shoulderRightX -= nervousTremor * .72 * weight;
		scaled.shoulderLeftY += Math.abs(nervousTremorY) * .72 * weight;
		scaled.shoulderRightY += Math.abs(nervousTremorY) * .46 * weight;
	}
	const isSad = name === "sad";
	const tearPool = isSad ? phase(elapsed, 220, 620) * weight : 0;
	const tearStream = isSad ? phase(elapsed, 560, 1050) * weight : 0;
	const tearDropPhase = isSad && elapsed >= 760 ? (elapsed - 760) % 1250 / 1250 : 0;
	const tearDrop = isSad ? pulse(tearDropPhase, 0, .2, .92) * weight : 0;
	return {
		...empty,
		...scaled,
		active: weight > .001,
		weight,
		blinkOpenness: 1 + ((style.blinkOpenness ?? 1) - 1) * weight,
		headRotation: scaled.headRotation,
		tearPool,
		tearStream,
		tearDrop,
		tearDropPhase
	};
}
function emptyGesturePose() {
	return {
		pelvisX: 0,
		pelvisY: 0,
		pelvisRotation: 0,
		waistRotation: 0,
		chestRotation: 0,
		headX: 0,
		headY: 0,
		headRotation: 0,
		headScaleX: 1,
		headScaleY: 1,
		headPitch: 0,
		shoulderLeftX: 0,
		shoulderLeftY: 0,
		shoulderRightX: 0,
		shoulderRightY: 0,
		armLeftUpper: 0,
		armLeftForearm: 0,
		handLeft: 0,
		armRightUpper: 0,
		armRightForearm: 0,
		handRight: 0,
		legLeftUpper: 0,
		legRightUpper: 0,
		skirtSway: 0,
		wavePalm: 0,
		gazeX: 0,
		gazeY: 0,
		blinkOpenness: 1,
		smile: 0,
		mouthOpen: 0,
		blush: 0,
		browLeftRotation: 0,
		browRightRotation: 0,
		browY: 0,
		shoulderMorph: 0,
		shoulderShrug: 0,
		elbowMorph: 0,
		cuffMorph: 0
	};
}
function sampleGesture(gesture, progress, amplitude) {
	const pose = emptyGesturePose();
	if (gesture === "none") return pose;
	const t = clamp01(progress);
	if (gesture === "wave") {
		const anticipation = sampleScalarTrack(waveTracks.anticipation, t);
		const raised = sampleScalarTrack(waveTracks.raised, t);
		const arrival = sampleScalarTrack(waveTracks.arrival, t);
		const waveWindow = sampleScalarTrack(waveTracks.waveEnergy, t);
		const forearmWave = Math.sin((t - .28) * Math.PI * 5.2) * waveWindow;
		const palmFollowWave = Math.sin((t - .31) * Math.PI * 5.2) * waveWindow;
		const returnOvershoot = sampleScalarTrack(waveTracks.returnOvershoot, t);
		pose.pelvisX = (raised * 2.2 - returnOvershoot * .75) * amplitude;
		pose.pelvisY = (-raised * 1.4 + arrival * .7) * amplitude;
		pose.pelvisRotation = (raised * .7 - returnOvershoot * .25) * amplitude;
		pose.waistRotation = (raised * 1.25 - returnOvershoot * .5) * amplitude;
		pose.chestRotation = (raised * 2.15 - anticipation * .75 - returnOvershoot * .8) * amplitude;
		pose.headX = (-raised * 3.5 + returnOvershoot * 1.2) * amplitude;
		pose.headY = (-raised * 1.2 + arrival * .75) * amplitude;
		pose.headRotation = (raised * 6.5 + forearmWave * .12 - anticipation * .7 - returnOvershoot * 1.8) * amplitude;
		pose.headScaleY = 1 - arrival * .0045 * amplitude;
		pose.shoulderLeftX = (-raised * 1.5 - arrival * .45) * amplitude;
		pose.shoulderLeftY = (-raised * 1.35 - arrival * .5) * amplitude;
		pose.armLeftUpper = (-anticipation * 2.8 + raised * 24 - forearmWave * .35 + arrival * 1.5) * amplitude;
		pose.armLeftForearm = (-anticipation * 3.5 + raised * 88 + forearmWave * 7 + arrival * 2.5) * amplitude;
		pose.handLeft = (raised * 1.5 + palmFollowWave * 3 + arrival * 2.5 - returnOvershoot * 2.2) * amplitude;
		pose.wavePalm = sampleSpriteStateWeight(waveHandSpriteTrack, t, "wave-front");
		pose.shoulderMorph = raised * amplitude;
		pose.elbowMorph = clamp01((raised * .86 + arrival * .14) * amplitude);
		pose.cuffMorph = clamp01((raised * .78 + Math.abs(forearmWave) * .22) * amplitude);
		pose.shoulderRightX = raised * .55 * amplitude;
		pose.shoulderRightY = raised * .7 * amplitude;
		pose.armRightUpper = (-raised * 2.6 + returnOvershoot * .7) * amplitude;
		pose.armRightForearm = raised * 1.4 * amplitude;
		pose.handRight = -raised * 1.2 * amplitude;
		pose.legLeftUpper = (raised * 1.65 - returnOvershoot * .55) * amplitude;
		pose.legRightUpper = (-raised * .72 + returnOvershoot * .24) * amplitude;
		pose.skirtSway = (-raised * 3.2 + forearmWave * .25 + returnOvershoot * 1.15) * amplitude;
		pose.gazeX = -raised * .2 * amplitude;
		pose.gazeY = -raised * .06 * amplitude;
		const greetingBlink = pulse(t, .06, .12, .19);
		const happySquint = pulse(t, .42, .5, .58) * .16 * amplitude;
		pose.blinkOpenness = 1 - greetingBlink * amplitude - happySquint;
		pose.smile = sampleScalarTrack(waveExpressionTracks.smile, t) * amplitude;
		pose.mouthOpen = sampleScalarTrack(waveExpressionTracks.mouthOpen, t) * amplitude;
		pose.blush = sampleScalarTrack(waveExpressionTracks.blush, t) * amplitude;
		const browLift = sampleScalarTrack(waveExpressionTracks.browLift, t) * amplitude;
		pose.browLeftRotation = -3.6 * browLift;
		pose.browRightRotation = 3.6 * browLift;
		pose.browY = -2.2 * browLift;
	} else if (gesture === "nod") {
		const prepare = pulse(t, 0, .07, .14);
		const gazeDown = phase(t, .025, .14) * (1 - phase(t, .76, .93));
		const chinDown = phase(t, .1, .28) * (1 - phase(t, .65, .88));
		const chestFollow = phase(t, .2, .36) * (1 - phase(t, .7, .92));
		const returnOvershoot = pulse(t, .84, .93, 1);
		pose.pelvisY = (chestFollow * .35 - prepare * .15) * amplitude;
		pose.waistRotation = (-prepare * .12 + returnOvershoot * .1) * amplitude;
		pose.chestRotation = (-prepare * .22 + returnOvershoot * .16) * amplitude;
		pose.headY = (-prepare * 1.2 + chinDown * 5.8 - returnOvershoot * 1.4) * amplitude;
		pose.headRotation = (-prepare * .3 + returnOvershoot * .25) * amplitude;
		pose.headPitch = (chinDown * .96 - returnOvershoot * .06) * amplitude;
		pose.headScaleX = 1;
		pose.headScaleY = 1;
		pose.shoulderLeftX = chestFollow * 3.2 * amplitude;
		pose.shoulderRightX = -chestFollow * 3.2 * amplitude;
		pose.shoulderLeftY = -chestFollow * 4.6 * amplitude;
		pose.shoulderRightY = -chestFollow * 4.6 * amplitude;
		pose.shoulderShrug = chestFollow * amplitude;
		pose.armLeftUpper = (-chestFollow * 1.7 + returnOvershoot * .2) * amplitude;
		pose.armRightUpper = (chestFollow * 1.7 - returnOvershoot * .2) * amplitude;
		pose.legLeftUpper = chinDown * .22 * amplitude;
		pose.legRightUpper = -chinDown * .22 * amplitude;
		pose.skirtSway = (-chestFollow * .18 + returnOvershoot * .28) * amplitude;
		pose.gazeY = (gazeDown * .78 - returnOvershoot * .08) * amplitude;
		pose.blinkOpenness = 1 - pulse(t, .055, .105, .16) * .1 * amplitude - chinDown * .31 * amplitude;
		pose.smile = phase(t, .15, .34) * (1 - phase(t, .74, .95)) * .36 * amplitude;
		pose.mouthOpen = 0;
		pose.blush = chinDown * .24 * amplitude;
		pose.browLeftRotation = chinDown * 1.1 * amplitude;
		pose.browRightRotation = -chinDown * 1.1 * amplitude;
		pose.browY = chinDown * 1.65 * amplitude;
	} else {
		const prepare = pulse(t, 0, .095, .19);
		const headTilt = phase(t, .105, .33) * (1 - phase(t, .73, .91));
		const torsoFollow = phase(t, .19, .43) * (1 - phase(t, .77, .95));
		const curiousHold = phase(t, .3, .43) * (1 - phase(t, .7, .82));
		const returnOvershoot = pulse(t, .82, .925, 1);
		pose.pelvisX = (-torsoFollow * 1.8 + returnOvershoot * .6) * amplitude;
		pose.pelvisRotation = (-torsoFollow * .45 + returnOvershoot * .18) * amplitude;
		pose.waistRotation = (-torsoFollow * .9 + returnOvershoot * .35) * amplitude;
		pose.chestRotation = (-torsoFollow * 2.25 + returnOvershoot * .85 + prepare * .35) * amplitude;
		pose.headX = (prepare * 1.8 - headTilt * 8.2 + returnOvershoot * 2.2) * amplitude;
		pose.headY = (-prepare * .8 + headTilt * 2.5 - returnOvershoot * .7) * amplitude;
		pose.headRotation = (prepare * 2.2 - headTilt * 12.5 + returnOvershoot * 2.8) * amplitude;
		pose.headScaleY = 1 - curiousHold * .0025 * amplitude;
		pose.shoulderLeftX = -torsoFollow * .8 * amplitude;
		pose.shoulderLeftY = torsoFollow * .75 * amplitude;
		pose.shoulderRightX = torsoFollow * .55 * amplitude;
		pose.shoulderRightY = -torsoFollow * .35 * amplitude;
		pose.armLeftUpper = (torsoFollow * 3.2 - returnOvershoot * .8) * amplitude;
		pose.armLeftForearm = torsoFollow * 1.1 * amplitude;
		pose.armRightUpper = (-torsoFollow * 2.2 + returnOvershoot * .65) * amplitude;
		pose.armRightForearm = -torsoFollow * .7 * amplitude;
		pose.legLeftUpper = (torsoFollow * .72 - returnOvershoot * .26) * amplitude;
		pose.legRightUpper = (torsoFollow * 1.35 - returnOvershoot * .48) * amplitude;
		pose.skirtSway = (torsoFollow * 3.8 - returnOvershoot * 1.7) * amplitude;
		pose.gazeX = (-phase(t, .06, .25) * (1 - phase(t, .76, .94)) * .3 + returnOvershoot * .06) * amplitude;
		pose.gazeY = curiousHold * .06 * amplitude;
		pose.blinkOpenness = 1 - pulse(t, .285, .345, .41) * .72 * amplitude;
		pose.smile = phase(t, .23, .4) * (1 - phase(t, .76, .96)) * .42 * amplitude;
		pose.mouthOpen = pose.smile * .5;
		pose.blush = pose.smile * .72;
		pose.browLeftRotation = -1.8 * curiousHold * amplitude;
		pose.browRightRotation = 2.8 * curiousHold * amplitude;
		pose.browY = -.8 * curiousHold * amplitude;
	}
	return pose;
}
function localBoneMatrix(pose) {
	const matrix = new DOMMatrix();
	matrix.translateSelf(pose.pivotX, pose.pivotY);
	matrix.translateSelf(pose.x ?? 0, pose.y ?? 0);
	matrix.rotateSelf(pose.rotation ?? 0);
	matrix.scaleSelf(pose.scaleX ?? 1, pose.scaleY ?? 1);
	matrix.translateSelf(-pose.pivotX, -pose.pivotY);
	return matrix;
}
function solveBones(poses) {
	const byId = new Map(poses.map((pose) => [pose.id, pose]));
	const solved = /* @__PURE__ */ new Map();
	const solve = (id, visiting = /* @__PURE__ */ new Set()) => {
		const existing = solved.get(id);
		if (existing) return existing;
		const pose = byId.get(id);
		if (!pose || visiting.has(id)) return new DOMMatrix();
		visiting.add(id);
		const result = (pose.parent ? solve(pose.parent, visiting) : new DOMMatrix()).multiply(localBoneMatrix(pose));
		solved.set(id, result);
		return result;
	};
	for (const pose of poses) solve(pose.id);
	return solved;
}
function applyMatrix(context, matrix) {
	context.transform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f);
}
function drawPart(context, part, matrix) {
	context.save();
	applyMatrix(context, matrix);
	context.drawImage(part.image, part.x, part.y, part.width, part.height);
	context.restore();
}
const facePitchSurface = {
	centerX: 631.5,
	rotationY: 315,
	pitchDegrees: 15,
	cameraDistance: 920,
	radiusX: 165,
	radiusY: 215,
	depthCenterY: 360,
	baseDepth: 5,
	bulgeDepth: 17,
	influenceStartY: 218,
	correctiveDrop: 3.4
};
const frontHairPitchSurface = {
	centerX: 623,
	rotationY: 250,
	pitchDegrees: 12,
	cameraDistance: 980,
	radiusX: 205,
	radiusY: 245,
	depthCenterY: 330,
	baseDepth: 7,
	bulgeDepth: 13,
	influenceStartY: 145,
	correctiveDrop: 2.2
};
/**
* Projects one authored 2.5D surface around a horizontal pitch axis. Depth is
* estimated from an elliptical face/hair volume, then perspective projection
* naturally foreshortens the lower plane and narrows regions that rotate away
* from the camera. This is intentionally not a screen-space vertical warp.
*/
function projectHeadPitchSurface(x, y, pitch, surface) {
	const amount = Math.max(-1, Math.min(1, pitch));
	if (Math.abs(amount) < 1e-5) return {
		x: 0,
		y: 0
	};
	const theta = amount * surface.pitchDegrees * Math.PI / 180;
	const localX = x - surface.centerX;
	const localY = y - surface.rotationY;
	const radialX = localX / surface.radiusX;
	const radialY = (y - surface.depthCenterY) / surface.radiusY;
	const radial = clamp01(1 - Math.sqrt(radialX * radialX + radialY * radialY));
	const lowerDepthFalloff = 1 - smoothstep(420, 520, y) * .5;
	const depth = (surface.baseDepth + surface.bulgeDepth * radial * radial) * lowerDepthFalloff;
	const rotatedY = localY * Math.cos(theta) + depth * Math.sin(theta);
	const rotatedDepth = depth * Math.cos(theta) - localY * Math.sin(theta);
	const perspective = surface.cameraDistance / (surface.cameraDistance - rotatedDepth);
	const projectedX = surface.centerX + localX * perspective;
	const projectedY = surface.rotationY + rotatedY * perspective;
	const influence = smoothstep(surface.influenceStartY, surface.rotationY + 45, y);
	const authoredDrop = surface.correctiveDrop * influence * amount;
	return {
		x: (projectedX - x) * influence,
		y: (projectedY - y) * influence + authoredDrop
	};
}
/**
* Downward head-pitch keyform for the face plane. The rigid skull preserves
* its 1:1 scale; the face itself rotates in depth, so the eyes settle slightly
* lower while the chin foreshortens upward and the jaw narrows in perspective.
*/
function sampleHeadPitchDeformation(x, y, pitch) {
	return projectHeadPitchSurface(x, y, pitch, facePitchSurface);
}
function sampleFrontHairPitchDeformation(x, y, pitch, bend) {
	const verticalProgress = clamp01((y - 140) / 500);
	const bangFocus = Math.exp(-Math.pow((x - 623) / 142, 2));
	const bangBand = smoothstep(150, 315, y) * (1 - smoothstep(455, 625, y));
	const sideLock = smoothstep(330, 620, y);
	const projected = projectHeadPitchSurface(x, y, pitch, frontHairPitchSurface);
	const pitchWeight = Math.max(bangBand * .82, sideLock * .22);
	return {
		x: bend * verticalProgress * verticalProgress + projected.x * pitchWeight,
		y: projected.y * pitchWeight + (1.1 + 1.5 * bangFocus) * bangBand * pitch + .7 * sideLock * pitch
	};
}
function sampleFrontHairDynamicDeformation(x, y, pitch, commonMotion, splitMotion, flutter) {
	// Head-pitch deformation remains the base form.  Wind then bends the same
	// continuous texture: crown vertices stay pinned, the centre bangs receive
	// a readable but restrained arc, and the long side locks travel farther.
	const projected = sampleFrontHairPitchDeformation(x, y, pitch, 0);
	const rootY = 168;
	const lengthFromRoot = Math.max(0, y - rootY);
	const vertical = smoothstep(184, 610, y);
	const sideDistance = clamp01(Math.abs(x - 623) / 205);
	const sideMaterial = smoothstep(285, 620, y) * (.48 + sideDistance * .72);
	const bangMaterial = smoothstep(188, 335, y) * (1 - smoothstep(430, 565, y)) * (.34 + sideDistance * .3);
	const bangRootPin = smoothstep(176, 310, y);
	const motionInfluence = Math.max(sideMaterial * vertical, bangMaterial * bangRootPin);
	const sideSign = x < 623 ? 1 : -1;
	const rotation = (commonMotion * 1.02 + splitMotion * sideSign * .78) * motionInfluence;
	const radians = rotation * Math.PI / 180;
	const gustOffset = flutter * (.42 + sideDistance * .82) * vertical * 1.7;
	const offsetX = -Math.sin(radians) * lengthFromRoot + gustOffset;
	const arcLift = (Math.cos(radians) - 1) * lengthFromRoot;
	const stretchRatio = Math.min(.022, Math.abs(commonMotion) * .00175 + Math.abs(splitMotion) * .0011);
	const lengthCompensation = lengthFromRoot * stretchRatio * sideMaterial;
	return {
		x: projected.x + offsetX,
		y: projected.y + arcLift + lengthCompensation
	};
}
function drawDeformedPart(context, part, matrix, deformAt, columns, rows) {
	const vertices = [];
	for (let row = 0; row <= rows; row += 1) {
		const v = row / rows;
		for (let column = 0; column <= columns; column += 1) {
			const u = column / columns;
			const x = part.x + part.width * u;
			const y = part.y + part.height * v;
			const deformation = deformAt(x, y);
			const target = matrix.transformPoint(new DOMPoint(x + deformation.x, y + deformation.y));
			vertices.push({
				source: {
					x: part.image.naturalWidth * u,
					y: part.image.naturalHeight * v
				},
				target: {
					x: target.x,
					y: target.y
				}
			});
		}
	}
	const vertex = (column, row) => vertices[row * (columns + 1) + column];
	for (let row = 0; row < rows; row += 1) for (let column = 0; column < columns; column += 1) {
		const a = vertex(column, row);
		const b = vertex(column + 1, row);
		const c = vertex(column, row + 1);
		const d = vertex(column + 1, row + 1);
		drawTexturedTriangle(context, part.image, a.source, b.source, c.source, a.target, b.target, c.target);
		drawTexturedTriangle(context, part.image, b.source, d.source, c.source, b.target, d.target, c.target);
	}
}
function drawPartClippedToDesignRect(context, part, matrix, x, y, width, height) {
	context.save();
	applyMatrix(context, matrix);
	context.beginPath();
	context.rect(x, y, width, height);
	context.clip();
	context.drawImage(part.image, part.x, part.y, part.width, part.height);
	context.restore();
}
function drawNeckVisiblePatch(context, part, matrix) {
	context.save();
	applyMatrix(context, matrix);
	context.beginPath();
	context.moveTo(597, 486);
	context.lineTo(659, 486);
	context.lineTo(650, 538);
	context.quadraticCurveTo(628, 545, 606, 538);
	context.closePath();
	context.clip();
	context.drawImage(part.image, part.x, part.y, part.width, part.height);
	context.restore();
}
function drawCollarSideRuffles(context, part, matrix) {
	drawPartClippedToDesignRect(context, part, matrix, 520, 520, 50, 104);
	drawPartClippedToDesignRect(context, part, matrix, 688, 520, 50, 104);
}
function drawPartScaledAtPivot(context, part, matrix, pivotX, pivotY, scaleX, rotation = 0, mirrorAxis, sourcePivotX = pivotX, sourcePivotY = pivotY) {
	if (Math.abs(scaleX) <= .001) return;
	context.save();
	applyMatrix(context, matrix);
	context.translate(pivotX, pivotY);
	context.rotate(rotation * Math.PI / 180);
	if (mirrorAxis !== void 0) {
		context.rotate(mirrorAxis * Math.PI / 180);
		context.scale(1, -1);
		context.rotate(-mirrorAxis * Math.PI / 180);
	}
	context.scale(scaleX, 1);
	context.translate(-sourcePivotX, -sourcePivotY);
	context.drawImage(part.image, part.x, part.y, part.width, part.height);
	context.restore();
}
function drawPartRotatedAtPivot(context, part, matrix, pivotX, pivotY, rotation) {
	context.save();
	applyMatrix(context, matrix);
	context.translate(pivotX, pivotY);
	context.rotate(rotation * Math.PI / 180);
	context.translate(-pivotX, -pivotY);
	context.drawImage(part.image, part.x, part.y, part.width, part.height);
	context.restore();
}
function drawBentPart(context, part, matrix, bend, slices = 18, reverse = false) {
	context.save();
	applyMatrix(context, matrix);
	const sourceSlice = part.image.naturalHeight / slices;
	const destinationSlice = part.height / slices;
	for (let row = 0; row < slices; row += 1) {
		const progress = row / Math.max(1, slices - 1);
		const influence = reverse ? 1 - progress : progress;
		const offsetX = bend * influence * influence;
		context.drawImage(part.image, 0, Math.max(0, row * sourceSlice - 1), part.image.naturalWidth, Math.min(part.image.naturalHeight - row * sourceSlice + 1, sourceSlice + 2), part.x + offsetX, part.y + row * destinationSlice - 1, part.width, destinationSlice + 2);
	}
	context.restore();
}
// The five authored back-hair textures reconstruct one continuous silhouette
// only while their crown regions overlap.  Rotating each whole bitmap opens
// those cut edges.  Keep the crown fixed to the head and progressively bend
// only the downstream rows; a tiny length compensation prevents the curl from
// appearing to retract as it swings.
function drawContinuousBackHair(context, part, headMatrix, controlRotations) {
	const controlCenters = [390, 515, 640, 765, 890];
	const weightRadius = 118;
	drawDeformedPart(context, part, headMatrix, (x, y) => {
		let totalWeight = 0;
		let weightedRotation = 0;
		for (let index = 0; index < controlCenters.length; index += 1) {
			const distance = (x - controlCenters[index]) / weightRadius;
			const weight = Math.exp(-distance * distance);
			totalWeight += weight;
			weightedRotation += controlRotations[index] * weight;
		}
		const rotation = totalWeight > 1e-5 ? weightedRotation / totalWeight : controlRotations[2];
		// Crown vertices remain exactly on the head.  The lower half bends as
		// one continuous surface, so neighboring regions always share vertices.
		const vertical = smoothstep(270, 805, y);
		const bendInfluence = vertical * vertical;
		const lengthFromRoot = Math.max(0, y - 270);
		const radians = rotation * .62 * bendInfluence * Math.PI / 180;
		const offsetX = -Math.sin(radians) * lengthFromRoot;
		const arcLift = (Math.cos(radians) - 1) * lengthFromRoot;
		const stretchRatio = Math.min(.022, Math.abs(rotation) * .0013);
		const lengthCompensation = lengthFromRoot * stretchRatio * bendInfluence;
		return {
			x: offsetX,
			y: arcLift + lengthCompensation
		};
	}, 13, 20);
}
function weightedPoint(bones, x, y, weights) {
	let total = 0;
	let resultX = 0;
	let resultY = 0;
	for (const [id, rawWeight] of weights) {
		const weight = Math.max(0, rawWeight);
		if (weight <= 0) continue;
		const point = (bones.get(id) ?? new DOMMatrix()).transformPoint(new DOMPoint(x, y));
		resultX += point.x * weight;
		resultY += point.y * weight;
		total += weight;
	}
	return total > 0 ? {
		x: resultX / total,
		y: resultY / total
	} : {
		x,
		y
	};
}
function wrapRadians(value) {
	let angle = value;
	while (angle > Math.PI) angle -= Math.PI * 2;
	while (angle < -Math.PI) angle += Math.PI * 2;
	return angle;
}
function weightedRigidPoint(bones, x, y, weights) {
	const active = weights.map(([id, rawWeight]) => ({
		matrix: bones.get(id) ?? new DOMMatrix(),
		weight: Math.max(0, rawWeight)
	})).filter((item) => item.weight > 0);
	if (active.length === 0) return {
		x,
		y
	};
	const total = active.reduce((sum, item) => sum + item.weight, 0);
	const referenceAngle = Math.atan2(active[0].matrix.b, active[0].matrix.a);
	let angleOffset = 0;
	let scaleX = 0;
	let scaleY = 0;
	let translateX = 0;
	let translateY = 0;
	for (const { matrix, weight } of active) {
		const normalizedWeight = weight / total;
		const angle = Math.atan2(matrix.b, matrix.a);
		angleOffset += wrapRadians(angle - referenceAngle) * normalizedWeight;
		scaleX += Math.hypot(matrix.a, matrix.b) * normalizedWeight;
		scaleY += Math.hypot(matrix.c, matrix.d) * normalizedWeight;
		translateX += matrix.e * normalizedWeight;
		translateY += matrix.f * normalizedWeight;
	}
	const angle = referenceAngle + angleOffset;
	const cosine = Math.cos(angle);
	const sine = Math.sin(angle);
	return {
		x: cosine * scaleX * x - sine * scaleY * y + translateX,
		y: sine * scaleX * x + cosine * scaleY * y + translateY
	};
}
function drawTexturedTriangle(context, image, sourceA, sourceB, sourceC, targetA, targetB, targetC) {
	const denominator = sourceA.x * (sourceB.y - sourceC.y) + sourceB.x * (sourceC.y - sourceA.y) + sourceC.x * (sourceA.y - sourceB.y);
	if (Math.abs(denominator) < 1e-5) return;
	const a = (targetA.x * (sourceB.y - sourceC.y) + targetB.x * (sourceC.y - sourceA.y) + targetC.x * (sourceA.y - sourceB.y)) / denominator;
	const b = (targetA.y * (sourceB.y - sourceC.y) + targetB.y * (sourceC.y - sourceA.y) + targetC.y * (sourceA.y - sourceB.y)) / denominator;
	const c = (targetA.x * (sourceC.x - sourceB.x) + targetB.x * (sourceA.x - sourceC.x) + targetC.x * (sourceB.x - sourceA.x)) / denominator;
	const d = (targetA.y * (sourceC.x - sourceB.x) + targetB.y * (sourceA.x - sourceC.x) + targetC.y * (sourceB.x - sourceA.x)) / denominator;
	const e = (targetA.x * (sourceB.x * sourceC.y - sourceC.x * sourceB.y) + targetB.x * (sourceC.x * sourceA.y - sourceA.x * sourceC.y) + targetC.x * (sourceA.x * sourceB.y - sourceB.x * sourceA.y)) / denominator;
	const f = (targetA.y * (sourceB.x * sourceC.y - sourceC.x * sourceB.y) + targetB.y * (sourceC.x * sourceA.y - sourceA.x * sourceC.y) + targetC.y * (sourceA.x * sourceB.y - sourceB.x * sourceA.y)) / denominator;
	const centerX = (targetA.x + targetB.x + targetC.x) / 3;
	const centerY = (targetA.y + targetB.y + targetC.y) / 3;
	const expand = (point) => {
		const offsetX = point.x - centerX;
		const offsetY = point.y - centerY;
		const length = Math.max(.001, Math.hypot(offsetX, offsetY));
		const overlap = 1.35;
		return {
			x: point.x + offsetX / length * overlap,
			y: point.y + offsetY / length * overlap
		};
	};
	const clipA = expand(targetA);
	const clipB = expand(targetB);
	const clipC = expand(targetC);
	context.save();
	context.beginPath();
	context.moveTo(clipA.x, clipA.y);
	context.lineTo(clipB.x, clipB.y);
	context.lineTo(clipC.x, clipC.y);
	context.closePath();
	context.clip();
	context.transform(a, b, c, d, e, f);
	context.drawImage(image, 0, 0);
	context.restore();
}
function drawSkinnedPart(context, part, bones, weightsAt, columns, rows, firstRow = 0, lastRow = rows, deformAt, preserveRigidity = false) {
	const vertices = [];
	for (let row = 0; row <= rows; row += 1) {
		const v = row / rows;
		for (let column = 0; column <= columns; column += 1) {
			const u = column / columns;
			const x = part.x + part.width * u;
			const y = part.y + part.height * v;
			const deformation = deformAt?.(x, y) ?? {
				x: 0,
				y: 0
			};
			const pointAt = preserveRigidity ? weightedRigidPoint : weightedPoint;
			vertices.push({
				source: {
					x: part.image.naturalWidth * u,
					y: part.image.naturalHeight * v
				},
				target: pointAt(bones, x + deformation.x, y + deformation.y, weightsAt(x, y))
			});
		}
	}
	const vertex = (column, row) => vertices[row * (columns + 1) + column];
	for (let row = Math.max(0, firstRow); row < Math.min(rows, lastRow); row += 1) for (let column = 0; column < columns; column += 1) {
		const a = vertex(column, row);
		const b = vertex(column + 1, row);
		const c = vertex(column, row + 1);
		const d = vertex(column + 1, row + 1);
		drawTexturedTriangle(context, part.image, a.source, b.source, c.source, a.target, b.target, c.target);
		drawTexturedTriangle(context, part.image, b.source, d.source, c.source, b.target, d.target, c.target);
	}
}
const armLeftAxisX = -124 / Math.hypot(-124, 227);
const armLeftAxisY = 227 / Math.hypot(-124, 227);
const armLeftNormalX = -armLeftAxisY;
const armLeftNormalY = armLeftAxisX;
function armLeftCoordinates(x, y) {
	const offsetX = x - 550;
	const offsetY = y - 548;
	return {
		along: offsetX * armLeftAxisX + offsetY * armLeftAxisY,
		across: offsetX * armLeftNormalX + offsetY * armLeftNormalY
	};
}
function createArmLeftCorrectiveDeformer(pose) {
	return (x, y) => {
		const { along, across } = armLeftCoordinates(x, y);
		const elbowProgress = clamp01((along - 130) / 42);
		const elbowBand = Math.sin(elbowProgress * Math.PI) * pose.elbowMorph;
		const elbowExpansion = Math.tanh(across / 14) * elbowBand * 7.25;
		const shoulderBand = (1 - smoothstep(0, 105, along)) * pose.shoulderShrug;
		return {
			x: armLeftNormalX * elbowExpansion + shoulderBand * 3.2,
			y: armLeftNormalY * elbowExpansion - shoulderBand * 4.8
		};
	};
}
function createArmRightCorrectiveDeformer(pose) {
	return (x, y) => {
		const shoulderBand = (1 - smoothstep(533, 650, y)) * pose.shoulderShrug;
		return {
			x: -shoulderBand * 3.2,
			y: -shoulderBand * 4.8
		};
	};
}
function armChainWeights(value, upper, forearm, hand) {
	const upperToForearm = smoothstep(650, 682, value);
	const forearmToHand = smoothstep(744, 806, value);
	return [
		[upper, 1 - upperToForearm],
		[forearm, upperToForearm * (1 - forearmToHand)],
		[hand, forearmToHand]
	];
}
function armLeftWeights(x, y) {
	const { along } = armLeftCoordinates(x, y);
	const upperToForearm = smoothstep(132, 152, along);
	const limbWeights = [["armLeftUpper", 1 - upperToForearm], ["armLeftForearm", upperToForearm]];
	const chestPin = (1 - smoothstep(14, 102, along)) * smoothstep(470, 555, x) * .94;
	return [["chest", chestPin], ...limbWeights.map(([id, weight]) => [id, weight * (1 - chestPin)])];
}
function armRightWeights(x, y) {
	const limbWeights = armChainWeights(y, "armRightUpper", "armRightForearm", "handRight");
	const chestPin = (1 - smoothstep(550, 645, y)) * (1 - smoothstep(701, 786, x)) * .94;
	return [["chest", chestPin], ...limbWeights.map(([id, weight]) => [id, weight * (1 - chestPin)])];
}
function drawEye(context, white, iris, lash, matrix, centerX, centerY, openness, gazeX, gazeY) {
	context.save();
	applyMatrix(context, matrix);
	context.translate(centerX, centerY);
	context.scale(1, Math.max(.035, openness));
	context.translate(-centerX, -centerY);
	context.drawImage(white.image, white.x, white.y, white.width, white.height);
	if (openness > .1) context.drawImage(iris.image, iris.x + gazeX * 6, iris.y + gazeY * 5.2, iris.width, iris.height);
	context.drawImage(lash.image, lash.x, lash.y, lash.width, lash.height);
	context.restore();
}
function traceEmotionEyeOpening(context, centerX, centerY, openness, side, emotionName) {
	const radiusX = 43;
	const open = Math.max(.12, Math.min(1, openness));
	let outerCornerY = 0;
	let innerCornerY = 0;
	let upperLift = -33 * open;
	let lowerDrop = 27 * open;
	if (emotionName === "angry") {
		outerCornerY = -3;
		innerCornerY = 7;
		upperLift = -25 * open;
		lowerDrop = 20 * open;
	} else if (emotionName === "sad") {
		outerCornerY = 6;
		innerCornerY = -2;
		upperLift = -28 * open;
		lowerDrop = 23 * open;
	} else if (emotionName === "shy") {
		outerCornerY = 3;
		innerCornerY = 1;
		upperLift = -27 * open;
		lowerDrop = 21 * open;
	}
	const leftCornerY = side === "left" ? outerCornerY : innerCornerY;
	const rightCornerY = side === "left" ? innerCornerY : outerCornerY;
	context.beginPath();
	context.moveTo(centerX - radiusX, centerY + leftCornerY);
	context.quadraticCurveTo(centerX, centerY + upperLift, centerX + radiusX, centerY + rightCornerY);
	context.quadraticCurveTo(centerX, centerY + lowerDrop, centerX - radiusX, centerY + leftCornerY);
	context.closePath();
}
// Bounded eye keyforms keep the eye anchors planted while changing silhouette,
// iris focus, and lid attitude per emotion. This avoids whole-face scaling.
const emotionEyeGeometry = {
	shy: { whiteY: .72, irisY: .82, irisOffsetY: 9, corner: 1.25, upper: .74 },
	angry: { whiteY: .7, irisY: .76, irisOffsetY: -1, corner: 3.2, upper: .55 },
	sad: { whiteY: .86, irisY: .9, irisOffsetY: 9, corner: 2.35, upper: .88 },
	surprise: { whiteY: 1.27, irisY: 1.17, irisOffsetY: -3, corner: .25, upper: 1.12 },
	sleepy: { whiteY: .46, irisY: .58, irisOffsetY: 5, corner: 3.4, upper: .42 },
	confused: { whiteY: .82, irisY: .9, irisOffsetY: -2, corner: 2.2, upper: .86 },
	nervous: { whiteY: 1.12, irisY: 1.06, irisOffsetY: -1, corner: .65, upper: 1.04 },
	hungry: { whiteY: 1.16, irisY: 1.1, irisOffsetY: -2, corner: .35, upper: 1.06 },
	love: { whiteY: .68, irisY: .68, irisOffsetY: 7, corner: 1.8, upper: .6 },
	happy: { whiteY: .74, irisY: .76, irisOffsetY: 4, corner: 1.5, upper: .64 },
	pout: { whiteY: .9, irisY: .94, irisOffsetY: 7, corner: 2.2, upper: .86 },
	proud: { whiteY: .68, irisY: .76, irisOffsetY: -2, corner: 2.3, upper: .62 },
	excited: { whiteY: 1.16, irisY: 1.1, irisOffsetY: -3, corner: .3, upper: 1.05 },
	mischievous: { whiteY: .7, irisY: .8, irisOffsetY: 1, corner: 2.2, upper: .58 },
	relieved: { whiteY: .58, irisY: .68, irisOffsetY: 5, corner: 2.8, upper: .5 },
	determined: { whiteY: .62, irisY: .72, irisOffsetY: -2, corner: 3.4, upper: .5 },
};
function sampleEmotionEyeMeshDeformation(x, y, centerX, centerY, openness, side, emotionName, pose, layer, gazeX, gazeY) {
	const targetOpen = Math.max(.08, pose.blinkOpenness);
	const blinkFactor = clamp01(openness / targetOpen);
	const eyeGeometry = emotionEyeGeometry[emotionName] || {};
	let baseScaleY = eyeGeometry.whiteY ?? .84;
	if (emotionName === "angry") baseScaleY = .86;
	else if (emotionName === "sad") baseScaleY = .98;
	else if (emotionName === "happy") baseScaleY = .94;
	else if (emotionName === "confused") baseScaleY = side === "left" ? .84 : 1.01;
	else if (emotionName === "pout") baseScaleY = 1.04;
	else if (emotionName === "sleepy") baseScaleY = .54;
	else if (emotionName === "proud") baseScaleY = side === "left" ? .48 : .82;
	else if (emotionName === "excited") baseScaleY = 1.08;
	else if (emotionName === "surprise") baseScaleY = 1.12;
	else if (emotionName === "mischievous") baseScaleY = side === "left" ? .3 : .88;
	else if (emotionName === "relieved") baseScaleY = .28;
	else if (emotionName === "determined") baseScaleY = .58;
	else if (emotionName === "nervous") baseScaleY = side === "left" ? 1.22 : 1.12;
	else if (emotionName === "hungry") baseScaleY = 1.09;
	if (layer === "iris" && eyeGeometry.irisY) baseScaleY = eyeGeometry.irisY;
	else if (layer !== "iris" && eyeGeometry.whiteY) baseScaleY = eyeGeometry.whiteY;
	const localX = (x - centerX) / 43;
	const innerAxis = side === "left" ? localX : -localX;
	const innerWeight = clamp01((innerAxis + 1) * .5);
	const outerWeight = 1 - innerWeight;
	let cornerY = 0;
	if (emotionName === "angry") cornerY = (innerWeight * 5 - outerWeight * 1.5) * (eyeGeometry.corner ?? 1);
	else if (emotionName === "sad") cornerY = outerWeight * 4 - innerWeight * 1.5;
	else if (emotionName === "confused") cornerY = side === "left" ? outerWeight * 4 : -innerWeight * 2.5;
	else if (emotionName === "pout") cornerY = outerWeight * 3.5 - innerWeight * 1;
	else if (emotionName === "sleepy") cornerY = innerWeight * 2 + outerWeight * 4.5;
	else if (emotionName === "proud") cornerY = innerWeight * 1.5 - outerWeight * 2;
	else if (emotionName === "happy") cornerY = outerWeight * 1.2 - innerWeight * 1.4;
	else if (emotionName === "excited") cornerY = -1.2;
	else if (emotionName === "surprise" || emotionName === "nervous" || emotionName === "hungry") cornerY = -.8;
	else if (emotionName === "mischievous") cornerY = side === "left" ? outerWeight * 3 : -innerWeight * 1.5;
	else if (emotionName === "relieved") cornerY = outerWeight * 4.2 + innerWeight * 2.8;
	else if (emotionName === "determined") cornerY = (innerWeight * 4.8 - outerWeight * 1.8) * (eyeGeometry.corner ?? 1);
	else cornerY = outerWeight * 2.5 + innerWeight * .5;
	if (emotionName !== "angry" && emotionName !== "determined") cornerY *= eyeGeometry.corner ?? 1;
	const layerScaleY = layer === "iris" ? Math.min(emotionName === "sad" ? 1.08 : 1.3, baseScaleY + .08) : baseScaleY;
	const scaleY = Math.max(.06, layerScaleY * blinkFactor);
	let scaleX = layer === "iris" ? 1 : emotionName === "angry" ? 1.035 : 1.015;
	if (emotionName === "sad") scaleX = layer === "iris" ? 1.025 : 1.04;
	if (emotionName === "pout" || emotionName === "excited") scaleX += layer === "iris" ? .055 : .035;
	if (emotionName === "sleepy") scaleX += layer === "iris" ? -.02 : .025;
	if (emotionName === "surprise" || emotionName === "nervous" || emotionName === "hungry") scaleX += layer === "iris" ? .04 : .025;
	if (emotionName === "relieved") scaleX += layer === "iris" ? -.015 : 0;
	if (emotionName === "determined") scaleX += layer === "iris" ? .035 : .02;
	const cornerInfluence = layer === "iris" ? .35 : layer === "white" ? .72 : 1;
	const irisOffsetY = layer === "iris" ? (eyeGeometry.irisOffsetY ?? 0) * pose.weight : 0;
	const lidBias = layer === "lash" ? (eyeGeometry.upper ?? 1) * (side === "left" ? .8 : -.8) * pose.weight : 0;
	return {
		x: (x - centerX) * (scaleX - 1) + (layer === "iris" ? gazeX * 6 : 0),
		y: (y - centerY) * (scaleY - 1) + cornerY * cornerInfluence + (layer === "iris" ? gazeY * 5.2 + irisOffsetY : 0) + lidBias
	};
}
function drawExpressiveEye(context, white, iris, lash, matrix, centerX, centerY, openness, gazeX, gazeY, side, emotionName, pose) {
	const expressive = pose.active && ["love", "shy", "angry", "surprise", "sad", "happy", "confused", "pout", "sleepy", "proud", "excited", "mischievous", "relieved", "determined", "nervous", "hungry"].includes(emotionName);
	const weight = expressive ? pose.weight : 0;
	if (weight < .999) {
		context.save();
		context.globalAlpha *= 1 - weight;
		drawEye(context, white, iris, lash, matrix, centerX, centerY, openness, gazeX, gazeY);
		context.restore();
	}
	if (weight <= .001) return;
	context.save();
	context.globalAlpha *= weight;
	if (emotionName === "love") {
		applyMatrix(context, matrix);
		const outerX = side === "left" ? centerX - 43 : centerX + 43;
		const innerX = side === "left" ? centerX + 39 : centerX - 39;
		context.strokeStyle = "#35456f";
		context.lineWidth = 8;
		context.lineCap = "round";
		context.beginPath();
		context.moveTo(outerX, centerY - 1);
		context.quadraticCurveTo(centerX, centerY + 22, innerX, centerY - 1);
		context.stroke();
		context.lineWidth = 4;
		context.beginPath();
		context.moveTo(outerX, centerY - 1);
		context.lineTo(outerX + (side === "left" ? -8 : 8), centerY - 7);
		context.stroke();
		context.restore();
		return;
	}
	const deform = (layer) => (x, y) => sampleEmotionEyeMeshDeformation(x, y, centerX, centerY, openness, side, emotionName, pose, layer, gazeX, gazeY);
	drawDeformedPart(context, white, matrix, deform("white"), 3, 3);
	if (openness / Math.max(.08, pose.blinkOpenness) > .12) drawDeformedPart(context, iris, matrix, deform("iris"), 3, 3);
	drawDeformedPart(context, lash, matrix, deform("lash"), 3, 3);
	context.restore();
}
function drawEmotionEyeAccents(context, matrix, emotionName, pose, openness) {
	if (!pose.active || pose.weight <= .001) return;
	context.save();
	applyMatrix(context, matrix);
	context.globalAlpha = pose.weight * .82;
	context.lineCap = "round";
	context.lineJoin = "round";
	const stroke = (color, width) => { context.strokeStyle = color; context.lineWidth = width; };
	const eye = (cx, upper, lower, tilt = 0) => {
		context.save();
		context.translate(cx, 386);
		context.rotate(tilt * Math.PI / 180);
		context.beginPath();
		context.moveTo(-35, upper);
		context.quadraticCurveTo(0, lower, 35, upper);
		context.stroke();
		context.restore();
	};
	if (emotionName === "angry") {
		stroke("#3e2948", 6.5); eye(552, 1, -13, -7); eye(698, 1, -13, 7);
		stroke("rgba(244,92,112,.86)", 3); eye(552, 13, 18, -4); eye(698, 13, 18, 4);
	} else if (emotionName === "sad" || emotionName === "pout") {
		stroke("#4b3750", 4.5); eye(552, 4, -6, 5); eye(698, 4, -6, -5);
	} else if (emotionName === "shy") {
		stroke("#53384d", 4.8); eye(552, 6, -8, 3); eye(698, 6, -8, -3);
	} else if (emotionName === "sleepy" || emotionName === "relieved") {
		stroke("#4b3750", 5.2); eye(552, 0, 7, 0); eye(698, 0, 7, 0);
	} else if (emotionName === "surprise" || emotionName === "excited" || emotionName === "nervous" || emotionName === "hungry") {
		stroke("rgba(255,255,255,.78)", 2.8); eye(552, -22, -26, 0); eye(698, -22, -26, 0);
	} else if (emotionName === "confused") {
		stroke("#4b3750", 3.8); eye(552, 2, -10, -5); eye(698, 0, 5, 5);
	}
	context.restore();
}
function drawCheekBlush(context, matrix, centerX, centerY, strength) {
	const amount = clamp01(strength);
	if (amount <= .001) return;
	context.save();
	applyMatrix(context, matrix);
	context.globalAlpha = Math.sqrt(amount);
	const glow = context.createRadialGradient(centerX, centerY, 2, centerX, centerY, 34);
	glow.addColorStop(0, "rgba(255,88,126,.78)");
	glow.addColorStop(.58, "rgba(247,103,133,.48)");
	glow.addColorStop(1, "rgba(247,103,133,0)");
	context.fillStyle = glow;
	context.beginPath();
	context.ellipse(centerX, centerY, 34, 12, 0, 0, Math.PI * 2);
	context.fill();
	const streak = smoothstep(.28, .72, amount);
	if (streak > .001) {
		context.globalAlpha = Math.sqrt(amount) * streak * .92;
		context.strokeStyle = "rgba(255,224,232,.92)";
		context.lineWidth = 2.8;
		context.lineCap = "round";
		context.beginPath();
		context.moveTo(centerX - 14, centerY + 5);
		context.lineTo(centerX - 6, centerY - 4);
		context.moveTo(centerX + 1, centerY + 5);
		context.lineTo(centerX + 9, centerY - 4);
		context.stroke();
	}
	context.restore();
}
function drawEmotionBrows(context, matrix, emotionName, pose) {
	if (!pose.active || pose.weight <= .001 || !["love", "shy", "angry", "surprise", "sad", "happy", "confused", "pout", "sleepy", "proud", "excited", "mischievous", "relieved", "determined", "nervous", "hungry"].includes(emotionName)) return;
	context.save();
	applyMatrix(context, matrix);
	context.globalAlpha = pose.weight;
	context.fillStyle = "#ffe8df";
	context.beginPath();
	context.ellipse(555, 311, 39, 14, 0, 0, Math.PI * 2);
	context.fill();
	context.beginPath();
	context.ellipse(696, 310, 39, 14, 0, 0, Math.PI * 2);
	context.fill();
	context.strokeStyle = "#4b3448";
	context.lineWidth = emotionName === "angry" ? 7.5 : emotionName === "sad" ? 7.2 : emotionName === "determined" ? 8.2 : emotionName === "nervous" ? 6.9 : 6.5;
	context.lineCap = "round";
	context.beginPath();
	if (emotionName === "angry") {
		context.moveTo(522, 303);
		context.quadraticCurveTo(553, 307, 585, 327);
		context.moveTo(665, 327);
		context.quadraticCurveTo(697, 307, 730, 303);
	} else if (emotionName === "sad") {
		context.moveTo(521, 322);
		context.quadraticCurveTo(552, 318, 584, 303);
		context.moveTo(666, 303);
		context.quadraticCurveTo(698, 318, 730, 322);
	} else if (emotionName === "shy") {
		context.moveTo(522, 318);
		context.quadraticCurveTo(553, 315, 584, 307);
		context.moveTo(666, 307);
		context.quadraticCurveTo(697, 315, 729, 318);
	} else if (emotionName === "happy") {
		context.moveTo(522, 314);
		context.quadraticCurveTo(553, 300, 584, 311);
		context.moveTo(666, 311);
		context.quadraticCurveTo(697, 300, 729, 314);
	} else if (emotionName === "confused") {
		context.moveTo(522, 321);
		context.quadraticCurveTo(553, 304, 584, 306);
		context.moveTo(666, 305);
		context.quadraticCurveTo(697, 298, 729, 309);
	} else if (emotionName === "pout") {
		context.moveTo(521, 322);
		context.quadraticCurveTo(552, 316, 584, 301);
		context.moveTo(666, 301);
		context.quadraticCurveTo(698, 316, 730, 322);
	} else if (emotionName === "sleepy") {
		context.moveTo(522, 316);
		context.quadraticCurveTo(553, 315, 584, 316);
		context.moveTo(666, 316);
		context.quadraticCurveTo(697, 315, 729, 316);
	} else if (emotionName === "proud") {
		context.moveTo(522, 312);
		context.quadraticCurveTo(553, 299, 584, 306);
		context.moveTo(666, 308);
		context.quadraticCurveTo(697, 305, 729, 318);
	} else if (emotionName === "excited") {
		context.moveTo(522, 311);
		context.quadraticCurveTo(553, 297, 584, 307);
		context.moveTo(666, 307);
		context.quadraticCurveTo(697, 297, 729, 311);
	} else if (emotionName === "mischievous") {
		context.moveTo(522, 312);
		context.quadraticCurveTo(552, 293, 584, 305);
		context.moveTo(666, 313);
		context.quadraticCurveTo(697, 307, 729, 318);
	} else if (emotionName === "relieved") {
		context.moveTo(522, 314);
		context.quadraticCurveTo(553, 294, 584, 314);
		context.moveTo(666, 314);
		context.quadraticCurveTo(697, 294, 729, 314);
	} else if (emotionName === "determined") {
		context.moveTo(522, 302);
		context.lineTo(584, 325);
		context.moveTo(666, 325);
		context.lineTo(729, 302);
	} else if (emotionName === "nervous") {
		context.moveTo(522, 295);
		context.quadraticCurveTo(552, 277, 584, 299);
		context.moveTo(666, 302);
		context.quadraticCurveTo(697, 284, 729, 300);
	} else if (emotionName === "hungry") {
		context.moveTo(522, 307);
		context.quadraticCurveTo(553, 296, 584, 306);
		context.moveTo(666, 306);
		context.quadraticCurveTo(697, 296, 729, 307);
	} else {
		context.moveTo(522, 316);
		context.quadraticCurveTo(553, 304, 584, 313);
		context.moveTo(666, 313);
		context.quadraticCurveTo(697, 304, 729, 316);
	}
	context.stroke();
	context.restore();
}
function drawAttachedTear(context, startX, startY, direction, progress, alpha) {
	const amount = clamp01(progress);
	const length = 26 + 50 * amount;
	const halfWidth = 5.2 + 1.8 * amount;
	const tipX = startX + direction * (2 + 4 * amount);
	const tipY = startY + length;
	context.save();
	context.globalAlpha *= alpha;
	const gradient = context.createLinearGradient(startX, startY, tipX, tipY);
	gradient.addColorStop(0, "rgba(239,253,255,.96)");
	gradient.addColorStop(.28, "rgba(163,230,255,.9)");
	gradient.addColorStop(.74, "rgba(92,201,249,.78)");
	gradient.addColorStop(1, "rgba(67,177,235,.68)");
	context.fillStyle = gradient;
	context.strokeStyle = "rgba(239,253,255,.96)";
	context.lineWidth = 2.2;
	context.beginPath();
	context.moveTo(startX - halfWidth, startY);
	context.bezierCurveTo(startX - halfWidth - 1, startY + 15, tipX - halfWidth * .72, tipY - 13, tipX, tipY);
	context.bezierCurveTo(tipX + halfWidth * .72, tipY - 13, startX + halfWidth + 1, startY + 15, startX + halfWidth, startY);
	context.quadraticCurveTo(startX, startY + 4, startX - halfWidth, startY);
	context.closePath();
	context.fill();
	context.stroke();
	context.globalAlpha *= .72;
	context.strokeStyle = "rgba(255,255,255,.95)";
	context.lineWidth = 1.7;
	context.beginPath();
	context.moveTo(startX - 1.8, startY + 7);
	context.bezierCurveTo(startX - 2.4, startY + 22, tipX - 2.1, tipY - 19, tipX - .8, tipY - 10);
	context.stroke();
	context.restore();
}
function drawEmotionFaceDetails(context, matrix, emotionName, pose) {
	if (!pose.active || pose.weight <= .001 || !["love", "shy", "angry", "surprise", "sad", "happy", "confused", "pout", "sleepy", "proud", "excited", "mischievous", "relieved", "determined", "nervous", "hungry"].includes(emotionName)) return;
	context.save();
	applyMatrix(context, matrix);
	context.globalAlpha = pose.weight;
	// Cover only the neutral cat-mouth pixels.  The patch stays well inside
	// the face color and never touches the chin or hair silhouette.
	context.fillStyle = "#ffe8df";
	context.beginPath();
	context.ellipse(624.5, 441, 28, 14, 0, 0, Math.PI * 2);
	context.fill();
	context.strokeStyle = "#56384a";
	context.fillStyle = "#56384a";
	context.lineWidth = 4.2;
	context.lineCap = "round";
	context.lineJoin = "round";
	let mouthFilled = false;
	context.beginPath();
	if (emotionName === "love") {
		context.moveTo(611, 439);
		context.quadraticCurveTo(624.5, 451, 638, 439);
		context.quadraticCurveTo(635, 457, 624.5, 458);
		context.quadraticCurveTo(614, 457, 611, 439);
		context.closePath();
		context.fill();
		context.fillStyle = "#ef8fa4";
		context.beginPath();
		context.ellipse(624.5, 452.5, 7, 3.5, 0, 0, Math.PI * 2);
		context.fill();
		mouthFilled = true;
	} else if (emotionName === "shy") {
		context.moveTo(611, 442);
		context.quadraticCurveTo(617, 448, 624, 442);
		context.quadraticCurveTo(631, 448, 638, 442);
	} else if (emotionName === "angry") {
		context.moveTo(611, 448);
		context.quadraticCurveTo(624.5, 436, 638, 448);
	} else if (emotionName === "happy" || emotionName === "excited") {
		const width = emotionName === "excited" ? 22 : 19;
		const depth = emotionName === "excited" ? 25 : 21;
		context.moveTo(624.5 - width, 438);
		context.quadraticCurveTo(624.5, 449, 624.5 + width, 438);
		context.quadraticCurveTo(624.5 + width - 4, 438 + depth, 624.5, 461);
		context.quadraticCurveTo(624.5 - width + 4, 438 + depth, 624.5 - width, 438);
		context.closePath();
		context.fill();
		context.fillStyle = "#ef8fa4";
		context.beginPath();
		context.ellipse(624.5, 454.5, emotionName === "excited" ? 11 : 9, 4.5, 0, 0, Math.PI * 2);
		context.fill();
		mouthFilled = true;
	} else if (emotionName === "confused") {
		context.moveTo(615, 442);
		context.quadraticCurveTo(620, 437, 625, 443);
		context.quadraticCurveTo(630, 449, 636, 442);
	} else if (emotionName === "pout") {
		context.moveTo(614, 447);
		context.quadraticCurveTo(619, 440, 624.5, 447);
		context.quadraticCurveTo(630, 440, 635, 447);
	} else if (emotionName === "sleepy") {
		context.ellipse(624.5, 445, 8, 10.5, 0, 0, Math.PI * 2);
	} else if (emotionName === "proud") {
		context.moveTo(610, 443);
		context.quadraticCurveTo(622, 450, 638, 438);
	} else if (emotionName === "mischievous") {
		context.moveTo(609, 444);
		context.quadraticCurveTo(622, 451, 639, 437);
		context.moveTo(633, 437);
		context.lineTo(639, 434);
	} else if (emotionName === "relieved") {
		context.moveTo(611, 444);
		context.quadraticCurveTo(624.5, 457, 638, 444);
		context.moveTo(618, 458);
		context.quadraticCurveTo(624.5, 462, 631, 458);
	} else if (emotionName === "determined") {
		context.moveTo(611, 445);
		context.lineTo(638, 445);
		context.moveTo(615, 450);
		context.lineTo(634, 450);
	} else if (emotionName === "nervous") {
		context.moveTo(610, 443);
		context.quadraticCurveTo(616, 450, 621, 443);
		context.quadraticCurveTo(627, 436, 632, 443);
		context.quadraticCurveTo(636, 449, 640, 442);
	} else if (emotionName === "hungry") {
		context.fillStyle = "#56384a";
		context.beginPath();
		context.ellipse(624.5, 447, 10, 8, 0, 0, Math.PI * 2);
		context.fill();
		context.fillStyle = "#ef8fa4";
		context.beginPath();
		context.ellipse(624.5, 450, 5.5, 2.5, 0, 0, Math.PI * 2);
		context.fill();
		mouthFilled = true;
	} else if (emotionName === "surprise") {
		context.fillStyle = "#56384a";
		context.beginPath();
		context.ellipse(624.5, 446, 8, 11, 0, 0, Math.PI * 2);
		context.fill();
		mouthFilled = true;
	} else {
		context.moveTo(611, 449);
		context.quadraticCurveTo(624.5, 438, 638, 449);
	}
	if (!mouthFilled) context.stroke();
	if (emotionName === "nervous" && pose.weight > .001) {
		// A single sweat bead is intentionally small and anchored to the temple;
		// it differentiates tension from the larger surprise FX.
		context.globalAlpha = pose.weight * .86;
		context.fillStyle = "rgba(105,211,255,.92)";
		context.strokeStyle = "rgba(235,253,255,.96)";
		context.lineWidth = 1.6;
		context.beginPath();
		context.moveTo(754, 346);
		context.bezierCurveTo(747, 355, 748, 365, 755, 368);
		context.bezierCurveTo(762, 364, 762, 355, 754, 346);
		context.closePath();
		context.fill();
		context.stroke();
	}
	if (emotionName === "pout" && pose.tear > .001) {
		context.globalAlpha = pose.tear * .8;
		context.fillStyle = "rgba(194,239,255,.9)";
		context.beginPath();
		context.ellipse(571, 409, 8, 3.2, -.12, 0, Math.PI * 2);
		context.ellipse(680, 409, 8, 3.2, .12, 0, Math.PI * 2);
		context.fill();
	}
	if (emotionName === "hungry" && pose.weight > .001) {
		context.globalAlpha = pose.weight * .82;
		context.fillStyle = "rgba(191,239,255,.92)";
		context.strokeStyle = "rgba(238,253,255,.95)";
		context.lineWidth = 1.6;
		context.beginPath();
		context.moveTo(638, 453);
		context.bezierCurveTo(635, 460, 636, 466, 641, 468);
		context.bezierCurveTo(646, 466, 646, 460, 641, 454);
		context.closePath();
		context.fill();
		context.stroke();
	}
	if (emotionName === "sad" && pose.tearPool > .001) {
		context.lineCap = "round";
		context.globalAlpha = pose.tearPool * .96;
		context.strokeStyle = "rgba(210,245,255,.98)";
		context.lineWidth = 7;
		context.beginPath();
		context.moveTo(527, 408);
		context.quadraticCurveTo(552, 422, 579, 408);
		context.moveTo(672, 408);
		context.quadraticCurveTo(698, 422, 726, 408);
		context.stroke();
		context.globalAlpha = pose.tearPool * .68;
		context.strokeStyle = "rgba(79,184,238,.9)";
		context.lineWidth = 2.2;
		context.beginPath();
		context.moveTo(529, 412);
		context.quadraticCurveTo(552, 424, 577, 412);
		context.moveTo(674, 412);
		context.quadraticCurveTo(698, 424, 724, 412);
		context.stroke();
		if (pose.tearStream > .001) {
			drawAttachedTear(context, 541, 411, -1, pose.tearStream * .86, pose.tearStream * .78);
			drawAttachedTear(context, 570, 411, 1, pose.tearStream, pose.tearStream * .94);
			drawAttachedTear(context, 681, 411, -1, pose.tearStream * .96, pose.tearStream * .9);
			drawAttachedTear(context, 710, 411, 1, pose.tearStream * .84, pose.tearStream * .76);
		}
		if (pose.tearDrop > .001) {
			const dropY = 433 + pose.tearDropPhase * 20;
			context.globalAlpha = pose.tearDrop * .68;
			context.fillStyle = "rgba(104,210,255,.9)";
			context.beginPath();
			context.moveTo(714, dropY - 4);
			context.bezierCurveTo(710, dropY + 1, 711, dropY + 5, 714, dropY + 6);
			context.bezierCurveTo(718, dropY + 5, 718, dropY + 1, 714, dropY - 4);
			context.closePath();
			context.fill();
		}
	}
	context.restore();
}
function transformedPoint(matrix, x, y) {
	return matrix.transformPoint(new DOMPoint(x, y));
}
async function createSeeThroughIdleRig(canvas, options) {
	const parts = await loadParts(options.assetBaseUrl);
	const outputSize = options.outputSize ?? 760;
	canvas.width = outputSize;
	canvas.height = outputSize;
	const context = canvas.getContext("2d");
	let pointerX = 0;
	let pointerY = 0;
	let externalMotionX = 0;
	let externalMotionY = 0;
	let grabPointX = .5;
	let grabPointY = .18;
	let expression = "neutral";
	let expressionFrom = expressionStyles.neutral;
	let expressionTo = expressionStyles.neutral;
	let expressionChangedAt = performance.now();
	let gesture = "none";
	let gestureElapsed = 0;
	let gestureSpeed = 1;
	let petReactionStartedAt = Number.NEGATIVE_INFINITY;
	let petReactionDirection = 0;
	let heldBlushStartedAt = Number.NEGATIVE_INFINITY;
	let heldBlushFrom = 0;
	let heldBlushTarget = 0;
	let heldBlushUntil = Number.NEGATIVE_INFINITY;
	let heldBlushFadeUntil = Number.NEGATIVE_INFINITY;
	let transientEmotion = "neutral";
	let emotionStartedAt = Number.NEGATIVE_INFINITY;
	let emotionHoldUntil = Number.NEGATIVE_INFINITY;
	let emotionFadeUntil = Number.NEGATIVE_INFINITY;
	let emotionElapsed = Number.POSITIVE_INFINITY;
	let emotionDuration = 0;
	let emotionRequestKey = "";
	let emotionDirectRequestKey = "";
	let breathing = true;
	let blinking = true;
	let secondaryMotion = true;
	let reducedMotion = options.reducedMotion ?? false;
	let motionIntensity = 2;
	let debug = false;
	let disposed = false;
	let frame = 0;
	let previousTime = performance.now();
	let performanceWindowStarted = previousTime;
	let performanceFrameCount = 0;
	let performanceRenderTime = 0;
	let nextBlinkAt = previousTime + 1700;
	let blinkStartedAt = Number.NEGATIVE_INFINITY;
	let blink = 1;
	const manualRotations = /* @__PURE__ */ new Map();
	const manualPivotOffsets = /* @__PURE__ */ new Map();
	let layerOrder = [...defaultSeeThroughLayerOrder];
	const layerVisibility = new Map(defaultSeeThroughLayerOrder.map((id) => [id, true]));
	const gazeSpringX = new SpringValue({
		stiffness: 90,
		damping: 18,
		maxOffset: 1
	});
	const gazeSpringY = new SpringValue({
		stiffness: 90,
		damping: 18,
		maxOffset: 1
	});
	const backHairLeftSpring = new SpringValue({
		stiffness: 36,
		damping: 8.4,
		maxOffset: 12
	});
	const backHairRightSpring = new SpringValue({
		stiffness: 39,
		damping: 8.8,
		maxOffset: 12
	});
	const backHairCenterSpring = new SpringValue({
		stiffness: 46,
		damping: 10.2,
		maxOffset: 5
	});
	const backHairOuterLeftSpring = new SpringValue({
		stiffness: 27,
		damping: 7.2,
		maxOffset: 14
	});
	const backHairOuterRightSpring = new SpringValue({
		stiffness: 29,
		damping: 7.5,
		maxOffset: 14
	});
	const torsoBowSpring = new SpringValue({
		stiffness: 42,
		damping: 8.6,
		maxOffset: 4.2
	});
	const frontHairLeftSpring = new SpringValue({
		stiffness: 56,
		damping: 10,
		maxOffset: 7
	});
	const frontHairRightSpring = new SpringValue({
		stiffness: 60,
		damping: 10.4,
		maxOffset: 7
	});
	const ahogeRootSpring = new SpringValue({
		stiffness: 48,
		damping: 8.4,
		maxOffset: 14
	});
	const ahogeTipSpring = new SpringValue({
		stiffness: 38,
		damping: 7.7,
		maxOffset: 18
	});
	const tailRootSpring = new SpringValue({
		stiffness: 38,
		damping: 8.2,
		maxOffset: 8
	});
	const tail1Spring = new SpringValue({
		stiffness: 34,
		damping: 7.6,
		maxOffset: 9
	});
	const tail2Spring = new SpringValue({
		stiffness: 30,
		damping: 7,
		maxOffset: 11
	});
	const tailTipSpring = new SpringValue({
		stiffness: 27,
		damping: 6.5,
		maxOffset: 13
	});
	const skirtSwaySpring = new SpringValue({
		stiffness: 52,
		damping: 10.2,
		maxOffset: 9
	});
	const externalMotionXSpring = new SpringValue({
		stiffness: 72,
		damping: 16,
		maxOffset: 1
	});
	const externalMotionYSpring = new SpringValue({
		stiffness: 72,
		damping: 16,
		maxOffset: 1
	});
	const grabBodySwaySpring = new SpringValue({
		stiffness: 34,
		damping: 8.2,
		maxOffset: 5.5
	});
	const grabBodyLiftSpring = new SpringValue({
		stiffness: 30,
		damping: 8.5,
		maxOffset: 2.6
	});
	const manual = (id) => manualRotations.get(id) ?? 0;
	const scheduleBlink = (now) => {
		nextBlinkAt = now + 2300 + (Math.sin(now * .00131) * .5 + .5) * 1900;
	};
	const expressionStyleAt = (now) => interpolateExpression(expressionFrom, expressionTo, (now - expressionChangedAt) / 250);
	const render = (now) => {
		const rawDelta = Math.max(0, now - previousTime);
		const delta = Math.min(50, rawDelta);
		previousTime = now;
		let emotionResetThisFrame = false;
		const directEmotionRequest = canvas.dataset.emotionCommandReceived;
		if (directEmotionRequest && directEmotionRequest !== emotionDirectRequestKey) {
			emotionDirectRequestKey = directEmotionRequest;
			const [name, duration] = directEmotionRequest.split(":");
			if (transientEmotionStyles[name]) {
				transientEmotion = name;
				emotionElapsed = 0;
				emotionDuration = Math.max(300, Number(duration) || 1800);
				emotionResetThisFrame = true;
			}
		}
		emotionElapsed += emotionResetThisFrame ? 0 : rawDelta;
		const requestedEmotion = canvas.dataset.emotionCommand;
		const requestedUntil = Number(canvas.dataset.emotionCommandUntil);
		const requestKey = `${requestedEmotion}:${requestedUntil}`;
		canvas.dataset.emotionRequest = requestedEmotion ?? "";
		canvas.dataset.emotionRequestRemaining = Number.isFinite(requestedUntil) ? (requestedUntil - now).toFixed(1) : "nan";
		if (requestedEmotion && transientEmotionStyles[requestedEmotion] && requestedUntil > now && requestKey !== emotionRequestKey) {
			emotionRequestKey = requestKey;
			transientEmotion = requestedEmotion;
			emotionStartedAt = now;
			emotionHoldUntil = requestedUntil;
			emotionFadeUntil = requestedUntil + 460;
			emotionElapsed = 0;
			emotionDuration = Math.max(300, requestedUntil - now);
		}
		const petReaction = samplePetReaction(now, petReactionStartedAt, petReactionDirection, reducedMotion);
		const heldBlush = sampleHeldBlush(now, heldBlushStartedAt, heldBlushFrom, heldBlushTarget, heldBlushUntil, heldBlushFadeUntil);
		const emotionPose = sampleTransientEmotion(now, transientEmotion, emotionElapsed, emotionDuration);
		const grabInputX = externalMotionXSpring.step(secondaryMotion && !reducedMotion ? externalMotionX + petReaction.secondaryX : petReaction.secondaryX, delta);
		const grabInputY = externalMotionYSpring.step(secondaryMotion && !reducedMotion ? externalMotionY + petReaction.secondaryY : petReaction.secondaryY, delta);
		const grabBodySway = grabBodySwaySpring.step(-grabInputX * 5.2, delta);
		const grabBodyLift = grabBodyLiftSpring.step(-grabInputY * 2.1, delta);
		const rootLever = grabLeverWeight(.5, .63, grabPointX, grabPointY, .58, .1, .76);
		const pelvisLever = grabLeverWeight(.5, .7, grabPointX, grabPointY, .82, .14, 1.1);
		const waistLever = grabLeverWeight(.5, .59, grabPointX, grabPointY, .78, .14, 1.05);
		const chestLever = grabLeverWeight(.5, .48, grabPointX, grabPointY, .7, .12, .95);
		const headLever = grabLeverWeight(.5, .3, grabPointX, grabPointY, .65, .12, 1);
		const hairLeftLever = grabLeverWeight(.35, .49, grabPointX, grabPointY, 1.16, .2, 1.6);
		const hairRightLever = grabLeverWeight(.65, .49, grabPointX, grabPointY, 1.16, .2, 1.6);
		const skirtLever = grabLeverWeight(.5, .76, grabPointX, grabPointY, 1.1, .2, 1.55);
		const tailLever = grabLeverWeight(.75, .69, grabPointX, grabPointY, 1.18, .2, 1.6);
		const armLeftLever = grabLeverWeight(.31, .57, grabPointX, grabPointY, .92, .16, 1.3);
		const armRightLever = grabLeverWeight(.69, .57, grabPointX, grabPointY, .92, .16, 1.3);
		const legLeftLever = grabLeverWeight(.45, .87, grabPointX, grabPointY, 1.02, .2, 1.45);
		const legRightLever = grabLeverWeight(.55, .87, grabPointX, grabPointY, 1.02, .2, 1.45);
		const gazeX = gazeSpringX.step(reducedMotion ? 0 : pointerX, delta);
		const gazeY = gazeSpringY.step(reducedMotion ? 0 : pointerY, delta);
		const idleMotionEnabled = secondaryMotion && !reducedMotion;
		const accentPeriod = 6500;
		const accentCycle = Math.floor(now / accentPeriod);
		const accentPhase = now % accentPeriod / accentPeriod;
		const accentWindow = accentPhase > .57 ? Math.sin((accentPhase - .57) / .43 * Math.PI) ** 2 : 0;
		const idleAccent = idleMotionEnabled ? (accentCycle % 2 === 0 ? 1 : -1) * accentWindow : 0;
		const pointerActivity = Math.min(1, Math.abs(pointerX) + Math.abs(pointerY));
		const autoGazeScale = idleMotionEnabled ? 1 - pointerActivity : 0;
		const idleGazeX = clampPointer(gazeX + (Math.sin(now / 2600 + .3) * .32 + idleAccent * .24) * autoGazeScale);
		const idleGazeY = clampPointer(gazeY + (Math.sin(now / 3300 + 1.05) * .18 - Math.abs(idleAccent) * .12) * autoGazeScale);
		// Primary body motion is intentionally separated from the later cloth
		// and hair phases.  This creates a readable line of action instead of a
		// collection of independent, barely moving springs.
		const idleBodyWave = idleMotionEnabled ? (Math.sin(now / 1380) + idleAccent * .85) * motionIntensity : 0;
		const idleBodyFollow = idleMotionEnabled ? (Math.sin(now / 1380 - .58) + idleAccent * .98) * motionIntensity : 0;
		const idleClothWave = idleMotionEnabled ? (Math.sin(now / 1050 - .92) + idleAccent * 1.15) * motionIntensity : 0;
		const windEnvelope = idleMotionEnabled ? .78 + Math.sin(now / 2050 + .4) * .22 : 0;
		const windWave = idleMotionEnabled ? (Math.sin(now / 420 + .2) * 1.65 + Math.sin(now / 238 + 1.15) * .48) * windEnvelope * motionIntensity : 0;
		const windFlutter = idleMotionEnabled ? (Math.sin(now / 168 + .65) * .52 + Math.sin(now / 113 + 2.1) * .2) * windEnvelope * motionIntensity : 0;
		if (blinking && !reducedMotion && now >= nextBlinkAt && blinkStartedAt < nextBlinkAt) blinkStartedAt = now;
		blink = blinking && !reducedMotion ? blinkOpenness(now - blinkStartedAt) : 1;
		if (now - blinkStartedAt >= 150 && blinkStartedAt >= nextBlinkAt) scheduleBlink(now);
		const idle = sampleIdleMotion(now, idleGazeX, idleGazeY, breathing && !reducedMotion);
		if (gesture !== "none") {
			gestureElapsed += delta * gestureSpeed;
			if (gestureElapsed >= gestureDurations[gesture]) gesture = "none";
		}
		const gestureProgress = gesture === "none" ? 1 : gestureElapsed / gestureDurations[gesture];
		const gesturePose = sampleGesture(gesture, gestureProgress, reducedMotion ? .35 : 1);
		const expressionStyle = expressionStyleAt(now);
		const renderedGazeX = clampPointer(idleGazeX + gesturePose.gazeX + emotionPose.gazeX);
		const renderedGazeY = clampPointer(idleGazeY + gesturePose.gazeY + emotionPose.gazeY);
		const renderedBlink = Math.min(blink, gesturePose.blinkOpenness, petReaction.blinkOpenness, emotionPose.blinkOpenness);
		const totalHeadRotation = idle.headRotationDeg + gesturePose.headRotation + petReaction.headRotation + emotionPose.headRotation + idleBodyFollow * 1.45;
		const secondaryScale = secondaryMotion && !reducedMotion ? 1 : 0;
		const nodInertia = Math.max(0, gesturePose.headY);
		const backHairLeft = backHairLeftSpring.step((-totalHeadRotation * 1.15 - nodInertia * .11 + (grabBodySway * .78 + grabInputX * -1.4) * hairLeftLever + windWave * .82 + windFlutter * .28) * secondaryScale, delta);
		const backHairRight = backHairRightSpring.step((-totalHeadRotation * 1.05 + nodInertia * .11 + (grabBodySway * .82 + grabInputX * -1.2) * hairRightLever + windWave * .74 - windFlutter * .24) * secondaryScale, delta);
		const backHairCenter = backHairCenterSpring.step(((backHairLeft + backHairRight) * .16 + grabBodySway * .1) * secondaryScale, delta);
		const backHairInnerLeft = backHairLeft * .72;
		const backHairInnerRight = backHairRight * .72;
		const backHairOuterLeft = backHairOuterLeftSpring.step((backHairLeft * 1.16 - grabInputX * .34) * secondaryScale, delta);
		const backHairOuterRight = backHairOuterRightSpring.step((backHairRight * 1.14 - grabInputX * .3) * secondaryScale, delta);
		const torsoBow = torsoBowSpring.step(((grabBodySway * .24 - grabInputX * .42) * chestLever - gesturePose.chestRotation * .12 + idleBodyFollow * .7) * secondaryScale, delta);
		const frontHairLeft = frontHairLeftSpring.step((-totalHeadRotation * .42 - nodInertia * .045 + grabBodySway * .48 + grabInputX * -.75 + windWave * .32 + windFlutter * .2) * secondaryScale, delta);
		const frontHairRight = frontHairRightSpring.step((-totalHeadRotation * .38 + nodInertia * .045 + grabBodySway * .5 + grabInputX * -.68 + windWave * .28 - windFlutter * .18) * secondaryScale, delta);
		const ahogeRoot = ahogeRootSpring.step((-backHairLeft * .74 + grabBodySway * .34 + nodInertia * .12 + windWave * .72 + windFlutter * .52) * secondaryScale, delta);
		const ahogeTip = ahogeTipSpring.step((-ahogeRoot * .72 + windWave * .88 + windFlutter * .72) * secondaryScale, delta);
		const tailRoot = tailRootSpring.step((Math.sin(now / 980) * 2.3 + (grabBodySway * .48 - grabInputX * 1.4) * tailLever - gesturePose.chestRotation * .35) * secondaryScale, delta);
		const tail1 = tail1Spring.step((Math.sin(now / 980 - .32) * 2.7 - tailRoot * .28) * secondaryScale, delta);
		const tail2 = tail2Spring.step((Math.sin(now / 980 - .68) * 3.1 - tail1 * .22) * secondaryScale, delta);
		const tailTip = tailTipSpring.step((Math.sin(now / 980 - 1.02) * 3.5 - tail2 * .18) * secondaryScale, delta);
		const skirtSway = skirtSwaySpring.step((gesturePose.skirtSway * .82 - gesturePose.pelvisRotation * 1.6 - gesturePose.chestRotation * .34 + (grabBodySway * 1.08 - grabInputX * 1.8) * skirtLever + idleClothWave * 2.6) * secondaryScale, delta);
		const stance = idleMotionEnabled ? Math.sin(now / 1520 + .9) * .95 : 0;
		const breathScale = breathing && !reducedMotion ? 1 + idle.breath * .018 : 1;
		const correctedPoses = [
			{
				id: "root",
				parent: null,
				pivotX: 640,
				pivotY: 1e3,
				y: -idle.breath * .55 + grabBodyLift * .25 + petReaction.rootY,
				scaleX: petReaction.scaleX,
				scaleY: petReaction.scaleY,
				rotation: idleBodyWave * .65 + grabBodySway * .42 * rootLever + manual("root")
			},
			{
				id: "pelvis",
				parent: "root",
				pivotX: 640,
				pivotY: 870,
				x: gesturePose.pelvisX + idleBodyWave * 5.2,
				y: -idle.breath * 2.1 + gesturePose.pelvisY + grabBodyLift * .45 + petReaction.pelvisY,
				rotation: gesturePose.pelvisRotation + petReaction.pelvisRotation + idleBodyWave * .95 + grabBodySway * .42 * pelvisLever + manual("pelvis")
			},
			{
				id: "waist",
				parent: "pelvis",
				pivotX: 640,
				pivotY: 750,
				rotation: gesturePose.waistRotation + emotionPose.waistRotation + petReaction.waistRotation - idleBodyFollow * 1.1 + grabBodySway * .5 * waistLever + manual("waist")
			},
			{
				id: "chest",
				parent: "waist",
				pivotX: 640,
				pivotY: 645,
				scaleX: 1 + (breathScale - 1) * .55,
				scaleY: breathScale,
				rotation: gesturePose.chestRotation + emotionPose.chestRotation + petReaction.chestRotation + idleBodyFollow * 1.5 + grabBodySway * .72 * chestLever + manual("chest")
			},
			{
				id: "torsoBow",
				parent: "chest",
				pivotX: 627,
				pivotY: 538,
				rotation: torsoBow + manual("torsoBow")
			},
			{
				id: "neck",
				parent: "chest",
				pivotX: 640,
				pivotY: 525,
				rotation: manual("neck")
			},
			{
				id: "head",
				parent: "neck",
				pivotX: 640,
				pivotY: 500,
				x: idle.headX + gesturePose.headX,
				y: idle.headY + gesturePose.headY + petReaction.headY + emotionPose.headY + expressionStyle.headLift + grabBodyLift * .22,
				rotation: totalHeadRotation + grabBodySway * .2 * headLever + manual("head"),
				scaleX: gesturePose.headScaleX,
				scaleY: gesturePose.headScaleY
			},
			{
				id: "armLeftUpper",
				parent: "chest",
				pivotX: 550,
				pivotY: 548,
				x: gesturePose.shoulderLeftX + emotionPose.shoulderLeftX,
				y: gesturePose.shoulderLeftY + emotionPose.shoulderLeftY,
				rotation: -idle.breath * .65 - idleBodyFollow * .72 + gesturePose.armLeftUpper + grabBodySway * .22 * armLeftLever + manual("armLeftUpper")
			},
			{
				id: "armLeftForearm",
				parent: "armLeftUpper",
				pivotX: committedArmPivots.leftForearm.x,
				pivotY: committedArmPivots.leftForearm.y,
				rotation: gesturePose.armLeftForearm + manual("armLeftForearm")
			},
			{
				id: "handLeft",
				parent: "armLeftForearm",
				pivotX: 426,
				pivotY: 775,
				rotation: gesturePose.handLeft + manual("handLeft")
			},
			{
				id: "armRightUpper",
				parent: "chest",
				pivotX: 706,
				pivotY: 548,
				x: gesturePose.shoulderRightX + emotionPose.shoulderRightX,
				y: gesturePose.shoulderRightY + emotionPose.shoulderRightY,
				rotation: idle.breath * .65 + idleBodyFollow * .72 + gesturePose.armRightUpper + grabBodySway * .22 * armRightLever + manual("armRightUpper")
			},
			{
				id: "armRightForearm",
				parent: "armRightUpper",
				pivotX: committedArmPivots.rightForearm.x,
				pivotY: committedArmPivots.rightForearm.y,
				rotation: gesturePose.armRightForearm + manual("armRightForearm")
			},
			{
				id: "handRight",
				parent: "armRightForearm",
				pivotX: 831,
				pivotY: 775,
				rotation: gesturePose.handRight + manual("handRight")
			},
			{
				id: "legLeft",
				parent: "pelvis",
				pivotX: 575,
				pivotY: 900,
				rotation: gesturePose.legLeftUpper + stance + grabBodySway * .18 * legLeftLever + manual("legLeft")
			},
			{
				id: "legRight",
				parent: "pelvis",
				pivotX: 705,
				pivotY: 900,
				rotation: gesturePose.legRightUpper - stance + grabBodySway * .18 * legRightLever + manual("legRight")
			},
			{
				id: "hairBackRoot",
				parent: "head",
				pivotX: 640,
				pivotY: 235,
				rotation: manual("hairBackRoot")
			},
			{
				id: "hairBackOuterLeft",
				parent: "hairBackRoot",
				pivotX: 561,
				pivotY: 205,
				rotation: manual("hairBackOuterLeft")
			},
			{
				id: "hairBackInnerLeft",
				parent: "hairBackRoot",
				pivotX: 604,
				pivotY: 205,
				rotation: manual("hairBackInnerLeft")
			},
			{
				id: "hairBackCenter",
				parent: "hairBackRoot",
				pivotX: 603,
				pivotY: 205,
				rotation: manual("hairBackCenter")
			},
			{
				id: "hairBackInnerRight",
				parent: "hairBackRoot",
				pivotX: 645,
				pivotY: 205,
				rotation: manual("hairBackInnerRight")
			},
			{
				id: "hairBackOuterRight",
				parent: "hairBackRoot",
				pivotX: 681,
				pivotY: 205,
				rotation: manual("hairBackOuterRight")
			},
			{
				id: "hairFrontLeft",
				parent: "head",
				pivotX: 535,
				pivotY: 310,
				rotation: frontHairLeft + manual("hairFrontLeft")
			},
			{
				id: "hairFrontRight",
				parent: "head",
				pivotX: 745,
				pivotY: 310,
				rotation: frontHairRight + manual("hairFrontRight")
			},
			{
				id: "ahogeRoot",
				parent: "head",
				pivotX: 638,
				pivotY: 151,
				rotation: ahogeRoot + manual("ahogeRoot")
			},
			{
				id: "ahogeTip",
				parent: "ahogeRoot",
				pivotX: 623,
				pivotY: 72,
				rotation: ahogeTip + manual("ahogeTip")
			},
			{
				id: "tailRoot",
				parent: "pelvis",
				pivotX: 805,
				pivotY: 856,
				rotation: tailRoot + manual("tailRoot")
			},
			{
				id: "tail1",
				parent: "tailRoot",
				pivotX: 865,
				pivotY: 892,
				rotation: tail1 + manual("tail1")
			},
			{
				id: "tail2",
				parent: "tail1",
				pivotX: 935,
				pivotY: 838,
				rotation: tail2 + manual("tail2")
			},
			{
				id: "tailTip",
				parent: "tail2",
				pivotX: 980,
				pivotY: 740,
				rotation: tailTip + manual("tailTip")
			}
		].map((pose) => {
			const offset = manualPivotOffsets.get(pose.id);
			if (!offset) return pose;
			return {
				...pose,
				pivotX: pose.pivotX + offset.x,
				pivotY: pose.pivotY + offset.y
			};
		});
		const bones = solveBones(correctedPoses);
		const bone = (id) => bones.get(id) ?? new DOMMatrix();
		const armLeftDeformer = createArmLeftCorrectiveDeformer(gesturePose);
		const armRightDeformer = createArmRightCorrectiveDeformer(gesturePose);
		const headMatrix = bone("head");
		const combinedHeadPitch = gesturePose.headPitch + emotionPose.headPitch;
		const headPitchAt = (x, y) => sampleHeadPitchDeformation(x, y, combinedHeadPitch);
		const featureMatrixAt = (x, y) => {
			const offset = headPitchAt(x, y);
			return headMatrix.translate(offset.x, offset.y);
		};
		context.setTransform(1, 0, 0, 1, 0, 0);
		context.clearRect(0, 0, outputSize, outputSize);
		if (options.transparentBackground !== true) {
			const gradient = context.createLinearGradient(0, 0, 0, outputSize);
			gradient.addColorStop(0, "#edf3f5");
			gradient.addColorStop(1, "#dce8ec");
			context.fillStyle = gradient;
			context.fillRect(0, 0, outputSize, outputSize);
		}
		context.save();
		context.scale(outputSize / DESIGN_SIZE, outputSize / DESIGN_SIZE);
		const drawLayers = {
			tail: () => drawBentPart(context, parts.tail, bone("tailRoot"), (tail1 + tail2 + tailTip) * 1.35, 14, true),
			"hair-back": () => {
				// One authored image, one continuous lattice, five smoothly blended
				// control zones.  The split PSD textures remain available only as a
				// rollback and are intentionally not rendered.
				const rootRotation = manual("hairBackRoot");
				drawContinuousBackHair(context, parts["hair-back"], headMatrix, [
					backHairOuterLeft + manual("hairBackOuterLeft") + rootRotation,
					backHairInnerLeft + manual("hairBackInnerLeft") + rootRotation,
					backHairCenter + manual("hairBackCenter") + rootRotation,
					backHairInnerRight + manual("hairBackInnerRight") + rootRotation,
					backHairOuterRight + manual("hairBackOuterRight") + rootRotation
				]);
			},
			"whale-fins": () => drawPart(context, parts["whale-fins"], headMatrix),
			ears: () => drawPart(context, parts["human-ears"], headMatrix),
			"lower-body": () => {
				drawPart(context, parts["leg-left"], bone("legLeft"));
				drawPart(context, parts["leg-right"], bone("legRight"));
				drawBentPart(context, parts.skirt, bone("pelvis"), skirtSway * .72, 14);
			},
			torso: () => {
				drawPartClippedToDesignRect(context, parts.neck, bone("neck"), 586, 430, 84, 103);
				drawPart(context, parts.torso, bone("chest"));
				drawPart(context, parts["collar-front"], bone("chest"));
				drawNeckVisiblePatch(context, parts.neck, bone("neck"));
				drawPartClippedToDesignRect(context, parts["collar-front"], bone("chest"), 506, 528, 242, 95);
				drawPart(context, parts["torso-bow"], bone("torsoBow"));
			},
			"arms-back": () => {
				drawSkinnedPart(context, parts["arm-left-sleeve"], bones, armLeftWeights, 12, 32, 0, 32, armLeftDeformer);
				drawSkinnedPart(context, parts["arm-right"], bones, armRightWeights, 5, 14, 0, 6, armRightDeformer, true);
			},
			shoes: () => {
				drawPart(context, parts["shoe-left"], bone("legLeft"));
				drawPart(context, parts["shoe-right"], bone("legRight"));
			},
			head: () => {
				drawDeformedPart(context, parts.face, headMatrix, headPitchAt, 6, 8);
				const browLeftMatrix = featureMatrixAt(555, 311).translate(0, gesturePose.browY);
				const browRightMatrix = featureMatrixAt(696, 310).translate(0, gesturePose.browY);
				drawPartRotatedAtPivot(context, parts["brow-left"], browLeftMatrix, 555, 311, gesturePose.browLeftRotation);
				drawPartRotatedAtPivot(context, parts["brow-right"], browRightMatrix, 696, 310, gesturePose.browRightRotation);
				drawEmotionBrows(context, featureMatrixAt(624.5, 311), transientEmotion, emotionPose);
				drawExpressiveEye(context, parts["eye-white-left"], parts["iris-left"], parts["lash-left"], featureMatrixAt(552, 386), 552, 386, renderedBlink, renderedGazeX, renderedGazeY, "left", transientEmotion, emotionPose);
				drawExpressiveEye(context, parts["eye-white-right"], parts["iris-right"], parts["lash-right"], featureMatrixAt(698, 386), 698, 386, renderedBlink, renderedGazeX, renderedGazeY, "right", transientEmotion, emotionPose);
				drawEmotionEyeAccents(context, featureMatrixAt(624.5, 386), transientEmotion, emotionPose, renderedBlink);
				context.save();
				applyMatrix(context, featureMatrixAt(624.5, 440.5));
				const combinedSmile = gesturePose.smile + emotionPose.smile;
				const combinedMouthOpen = Math.max(gesturePose.mouthOpen, emotionPose.mouthOpen);
				const gestureMouthScaleX = 1 + combinedSmile * .1 + petReaction.smile * .08;
				const gestureMouthScaleY = 1 + combinedSmile * .72 + petReaction.smile * .22;
				context.translate(624.5, 440.5);
				context.scale(expressionStyle.mouthScaleX * gestureMouthScaleX, expressionStyle.mouthScaleY * gestureMouthScaleY);
				context.translate(-624.5, -440.5);
				context.globalAlpha = (1 - combinedMouthOpen) * (1 - emotionPose.mouthOverride);
				context.drawImage(parts.mouth.image, parts.mouth.x, parts.mouth.y, parts.mouth.width, parts.mouth.height);
				context.globalAlpha = 1;
				if (combinedMouthOpen > 0) {
					context.save();
					context.globalAlpha = combinedMouthOpen;
					context.translate(624.5, 445);
					context.scale(.92 + combinedSmile * .12, .82 + combinedMouthOpen * .18);
					context.translate(-624.5, -445);
					context.fillStyle = "#532f48";
					context.beginPath();
					context.moveTo(604, 438);
					context.quadraticCurveTo(624, 449, 645, 438);
					context.quadraticCurveTo(640, 466, 624.5, 468);
					context.quadraticCurveTo(609, 466, 604, 438);
					context.fill();
					context.fillStyle = "#ef8fa4";
					context.beginPath();
					context.ellipse(624.5, 458, 11, 5.5, 0, 0, Math.PI * 2);
					context.fill();
					context.restore();
				}
				context.restore();
				if (expressionStyle.blushOpacity > .001 || gesturePose.blush > 0 || petReaction.blush > 0 || heldBlush > 0 || emotionPose.blush > 0) {
					const blushAlpha = Math.max(expressionStyle.blushOpacity, gesturePose.blush, petReaction.blush, heldBlush, emotionPose.blush);
					drawCheekBlush(context, featureMatrixAt(535, 428), 535, 428, blushAlpha);
					drawCheekBlush(context, featureMatrixAt(714, 428), 714, 428, blushAlpha);
				}
				drawEmotionFaceDetails(context, featureMatrixAt(624.5, 440.5), transientEmotion, emotionPose);
				drawPart(context, parts["maid-headband"], headMatrix);
				const frontHairCommon = (frontHairLeft + frontHairRight) * .5;
				const frontHairSplit = (frontHairLeft - frontHairRight) * .5;
				drawDeformedPart(context, parts["hair-front"], headMatrix, (x, y) => sampleFrontHairDynamicDeformation(x, y, combinedHeadPitch, frontHairCommon, frontHairSplit, windFlutter), 12, 16);
				drawPart(context, parts["side-bow"], headMatrix);
				drawBentPart(context, parts.ahoge, bone("ahogeRoot"), ahogeTip * .7, 8, true);
			},
			"collar-ruffles": () => drawCollarSideRuffles(context, parts["collar-front"], bone("chest")),
			hands: () => {
				const palmFlip = Math.cos(gesturePose.wavePalm * Math.PI);
				const clockwiseTurn = 90 * gesturePose.wavePalm;
				const edgeOnScale = .075;
				if (gesturePose.wavePalm <= .5) drawPartScaledAtPivot(context, parts["hand-left-rest-side"], bone("handLeft"), 426, 775, Math.max(edgeOnScale, palmFlip), clockwiseTurn);
				if (gesturePose.wavePalm > .5) drawPartScaledAtPivot(context, parts["hand-left-wave-front"], bone("handLeft"), waveFrontPalmPlacement.targetX, waveFrontPalmPlacement.targetY, Math.max(edgeOnScale, -palmFlip), clockwiseTurn + waveFrontPalmPlacement.rotationOffset, waveFrontPalmPlacement.mirrorAxis, waveFrontPalmPlacement.sourceWristX, waveFrontPalmPlacement.sourceWristY);
			},
			"arms-front": () => {
				drawSkinnedPart(context, parts["arm-left-sleeve"], bones, armLeftWeights, 12, 32, 22, 31, armLeftDeformer);
				drawSkinnedPart(context, parts["arm-right"], bones, armRightWeights, 5, 14, 6, 14, armRightDeformer, true);
			}
		};
		for (const id of layerOrder) if (layerVisibility.get(id) !== false) drawLayers[id]();
		if (debug) {
			context.save();
			context.lineWidth = 3;
			context.font = "16px \"Microsoft YaHei UI\", sans-serif";
			for (const pose of correctedPoses) {
				const point = transformedPoint(bone(pose.id), pose.pivotX, pose.pivotY);
				if (pose.parent) {
					const parentPose = correctedPoses.find((item) => item.id === pose.parent);
					const parentPoint = transformedPoint(bone(pose.parent), parentPose.pivotX, parentPose.pivotY);
					context.strokeStyle = "rgba(14,134,156,.65)";
					context.beginPath();
					context.moveTo(parentPoint.x, parentPoint.y);
					context.lineTo(point.x, point.y);
					context.stroke();
				}
				context.fillStyle = manualRotations.has(pose.id) || manualPivotOffsets.has(pose.id) ? "#ffb84d" : "#16b8c8";
				context.beginPath();
				context.arc(point.x, point.y, 6, 0, Math.PI * 2);
				context.fill();
				context.fillStyle = "#143542";
				context.fillText(boneLabels[pose.id], point.x + 9, point.y - 8);
			}
			context.restore();
		}
		context.restore();
		canvas.dataset.grabPointX = grabPointX.toFixed(3);
		canvas.dataset.grabPointY = grabPointY.toFixed(3);
		canvas.dataset.idleBodyWave = idleBodyWave.toFixed(3);
		canvas.dataset.idleBodyFollow = idleBodyFollow.toFixed(3);
		canvas.dataset.idleClothWave = idleClothWave.toFixed(3);
		canvas.dataset.idleAccent = idleAccent.toFixed(3);
		canvas.dataset.motionIntensity = motionIntensity.toFixed(2);
		canvas.dataset.windWave = windWave.toFixed(3);
		canvas.dataset.windFlutter = windFlutter.toFixed(3);
		canvas.dataset.backHairMode = "continuous-five-zone-mesh";
		canvas.dataset.frontHairCommon = ((frontHairLeft + frontHairRight) * .5).toFixed(3);
		canvas.dataset.frontHairSplit = ((frontHairLeft - frontHairRight) * .5).toFixed(3);
		canvas.dataset.petReaction = petReaction.active ? petReaction.progress.toFixed(3) : "idle";
		canvas.dataset.petBlush = petReaction.blush.toFixed(3);
		canvas.dataset.affectionBlush = heldBlush.toFixed(3);
		canvas.dataset.emotion = emotionPose.active ? transientEmotion : "neutral";
		canvas.dataset.emotionWeight = emotionPose.weight.toFixed(3);
		canvas.dataset.emotionElapsed = Number.isFinite(emotionElapsed) ? emotionElapsed.toFixed(1) : "inf";
		canvas.dataset.blushRenderMode = "gradient-streaks";
		canvas.dataset.grabHeadWeight = headLever.toFixed(3);
		canvas.dataset.grabWaistWeight = waistLever.toFixed(3);
		canvas.dataset.grabSkirtWeight = skirtLever.toFixed(3);
		canvas.dataset.grabTailWeight = tailLever.toFixed(3);
	};
	const animate = (now) => {
		if (disposed) return;
		const renderActive = canvas.dataset.renderActive !== "false" && document.visibilityState !== "hidden";
		if (renderActive) {
			const renderStarted = performance.now();
			render(now);
			performanceRenderTime += performance.now() - renderStarted;
			performanceFrameCount += 1;
		} else previousTime = now;
		const performanceWindow = now - performanceWindowStarted;
		if (performanceWindow >= 1e3) {
			canvas.dataset.renderFps = renderActive ? (performanceFrameCount * 1e3 / performanceWindow).toFixed(1) : "0.0";
			canvas.dataset.renderCostMs = performanceFrameCount > 0 ? (performanceRenderTime / performanceFrameCount).toFixed(2) : "0.00";
			canvas.dataset.renderRunning = String(renderActive);
			performanceWindowStarted = now;
			performanceFrameCount = 0;
			performanceRenderTime = 0;
		}
		frame = requestAnimationFrame(animate);
	};
	frame = requestAnimationFrame(animate);
	return {
		setPointer(x, y) {
			pointerX = clampPointer(x);
			pointerY = clampPointer(y);
		},
		setExternalMotion(x, y) {
			externalMotionX = Math.max(-1, Math.min(1, Number(x) || 0));
			externalMotionY = Math.max(-1, Math.min(1, Number(y) || 0));
		},
		setGrabPoint(x, y) {
			const nextX = Number(x);
			const nextY = Number(y);
			grabPointX = clamp01(Number.isFinite(nextX) ? nextX : .5);
			grabPointY = clamp01(Number.isFinite(nextY) ? nextY : .18);
		},
		setExpression(value) {
			if (value === expression) return;
			const now = performance.now();
			expressionFrom = expressionStyleAt(now);
			expression = value;
			expressionTo = expressionStyles[value];
			expressionChangedAt = now;
		},
		playGesture(value) {
			gesture = value;
			gestureElapsed = 0;
		},
		stopGesture() {
			gesture = "none";
			gestureElapsed = 0;
		},
		setGestureSpeed(value) {
			gestureSpeed = Math.max(.25, Math.min(2, value));
		},
		setBreathing(value) {
			breathing = value;
		},
		setBlinking(value) {
			blinking = value;
		},
		triggerBlink() {
			blinkStartedAt = performance.now();
			nextBlinkAt = blinkStartedAt;
		},
		triggerPetReaction(xRatio = .5) {
			const x = clamp01(Number(xRatio) || .5);
			petReactionDirection = (x - .5) * 2;
			petReactionStartedAt = performance.now();
		},
		setAffectionBlush(level, holdMs = 0) {
			const now = performance.now();
			const current = sampleHeldBlush(now, heldBlushStartedAt, heldBlushFrom, heldBlushTarget, heldBlushUntil, heldBlushFadeUntil);
			heldBlushFrom = current;
			heldBlushTarget = Math.max(current, clamp01(Number(level) || 0));
			heldBlushStartedAt = now;
			heldBlushUntil = now + Math.max(0, Number(holdMs) || 0);
			heldBlushFadeUntil = heldBlushUntil + 2400;
		},
		playEmotion(name, durationMs = 1800) {
			const now = performance.now();
			transientEmotion = transientEmotionStyles[name] ? name : "neutral";
			emotionStartedAt = now;
			emotionHoldUntil = now + Math.max(300, Number(durationMs) || 1800);
			emotionFadeUntil = emotionHoldUntil + 460;
			emotionElapsed = 0;
			emotionDuration = Math.max(300, Number(durationMs) || 1800);
			canvas.dataset.emotionCommandReceived = `${transientEmotion}:${emotionDuration}:${now}`;
		},
		setSecondaryMotion(value) {
			secondaryMotion = value;
		},
		setReducedMotion(value) {
			reducedMotion = value;
		},
		setMotionIntensity(value) {
			motionIntensity = Math.max(.5, Math.min(2.5, Number(value) || 1));
		},
		setDebug(value) {
			debug = value;
		},
		setLayerOrder(order) {
			const valid = order.filter((id, index) => defaultSeeThroughLayerOrder.includes(id) && order.indexOf(id) === index);
			layerOrder = [...valid, ...defaultSeeThroughLayerOrder.filter((id) => !valid.includes(id))];
		},
		setLayerVisible(id, visible) {
			layerVisibility.set(id, visible);
		},
		resetLayerOrder() {
			layerOrder = [...defaultSeeThroughLayerOrder];
			for (const id of defaultSeeThroughLayerOrder) layerVisibility.set(id, true);
		},
		setManualBoneRotation(id, degrees) {
			const value = Math.max(-45, Math.min(45, degrees));
			if (Math.abs(value) < .001) manualRotations.delete(id);
			else manualRotations.set(id, value);
		},
		setManualBonePivotOffset(id, x, y) {
			const offset = {
				x: Math.max(-80, Math.min(80, x)),
				y: Math.max(-80, Math.min(80, y))
			};
			if (Math.abs(offset.x) < .001 && Math.abs(offset.y) < .001) manualPivotOffsets.delete(id);
			else manualPivotOffsets.set(id, offset);
		},
		resetManualPose() {
			manualRotations.clear();
			manualPivotOffsets.clear();
		},
		getState: () => ({
			expression,
			gesture,
			gestureSpeed,
			blink,
			gazeX: gazeSpringX.value,
			gazeY: gazeSpringY.value,
			grabPointX,
			grabPointY
		}),
		dispose() {
			disposed = true;
			cancelAnimationFrame(frame);
		}
	};
}
const seeThroughBoneOptions = Object.entries(boneLabels).map(([id, label]) => ({
	id,
	label
}));

//#endregion

export { createSeeThroughIdleRig, seeThroughBoneOptions }
