// Adapted from this1self/govinda-pingali, web/js/index.js.
// Original Necker cube and circle geometry; no analytics or telemetry.
(() => {
    'use strict';
    const cubeCanvas = document.getElementById('cubeCanvas');
    const circleCanvas = document.getElementById('circleCanvas');
    const cubeContext = cubeCanvas.getContext('2d');
    const circleContext = circleCanvas.getContext('2d');
    if (!cubeContext || !circleContext) return;

    const pauseButton = document.getElementById('pauseAnimation');
    const controlsButton = document.getElementById('toggleControls');
    const helpPanel = document.getElementById('animationHelp');
    const speedValue = document.getElementById('speedValue');
    const dimensionsValue = document.getElementById('dimensionsValue');
    const frameRateValue = document.getElementById('frameRateValue');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const frameRates = [60, 30, 15];
    const animationScale = 1.5;
    const dimensions = [[4, 4, 1], [4, 4, 2], [4, 4, 4], [1, 1, 1], [2, 1, 1], [2, 2, 1], [2, 2, 2], [4, 2, 1]];
    let viewportWidth = 0;
    let viewportHeight = 0;
    let pixelRatio = 1;
    let squareSize = 0;
    let depthOffset = 0;
    let depthIncreasing = true;
    let depthDirection = -1;
    let depthDirectionToggle = false;
    let rotation = 0;
    let rotationDirection = 1;
    let cubeOpacity = .8;
    let opacityIncreasing = false;
    let dimensionIndex = 2;
    let manualDimensions = false;
    let animationRate = .025;
    let frameRateIndex = 0;
    let isPaused = reducedMotion.matches;
    let animationFrame = null;
    let previousTimestamp = null;

    function updateControls() {
        pauseButton.textContent = isPaused ? 'Play animation' : 'Pause animation';
        speedValue.textContent = animationRate.toFixed(3);
        dimensionsValue.textContent = dimensions[dimensionIndex].join(' × ');
        frameRateValue.textContent = `${frameRates[frameRateIndex]} fps`;
    }

    function redraw() {
        for (const context of [cubeContext, circleContext]) {
            context.setTransform(1, 0, 0, 1, 0, 0);
            context.clearRect(0, 0, context.canvas.width, context.canvas.height);
            context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
            context.translate(viewportWidth / 2, viewportHeight / 2);
            context.scale(animationScale, animationScale);
            context.rotate(rotation * Math.PI / 180);
            context.translate(-viewportWidth / 2, -viewportHeight / 2);
            context.beginPath();
        }
        const [rowCount, columnCount, pageCount] = dimensions[dimensionIndex];
        const horizontalOrigin = (viewportWidth - columnCount * (squareSize + depthDirection * depthOffset)) / 2;
        const verticalOrigin = (viewportHeight - rowCount * (squareSize + depthOffset)) / 2;
        for (let row = 0; row < rowCount; row += 1) {
            for (let column = 0; column < columnCount; column += 1) {
                for (let page = 0; page < pageCount; page += 1) {
                    drawUnitCube(cubeContext, circleContext,
                        horizontalOrigin + column * squareSize + depthDirection * page * depthOffset,
                        verticalOrigin + row * squareSize + page * depthOffset,
                        squareSize, depthOffset, depthDirection);
                }
            }
        }
        for (const [context, opacity] of [[cubeContext, cubeOpacity], [circleContext, 1 - cubeOpacity]]) {
            context.closePath();
            context.strokeStyle = '#fff';
            context.globalAlpha = opacity;
            context.lineWidth = 1;
            context.stroke();
        }
    }

    function advanceAnimation(frameScale) {
        const maximumDepth = squareSize / 2;
        const previousDepth = depthOffset;
        depthOffset += (depthIncreasing ? 1 : -1) * animationRate * maximumDepth / 45 * frameScale;
        if (depthOffset > maximumDepth) { depthOffset = maximumDepth; depthIncreasing = false; }
        if (depthOffset < -maximumDepth) { depthOffset = -maximumDepth; depthIncreasing = true; }
        if (Math.sign(previousDepth) !== Math.sign(depthOffset)) {
            if (depthDirectionToggle) depthDirection *= -1;
            depthDirectionToggle = !depthDirectionToggle;
            if (!manualDimensions) dimensionIndex = Math.min(2, dimensionIndex + 1);
        }
        rotation += rotationDirection * animationRate * frameScale;
        if (rotation >= 360) { rotation = 360; rotationDirection = -1; }
        if (rotation <= 0) { rotation = 0; rotationDirection = 1; }
        cubeOpacity += (opacityIncreasing ? 1 : -1) * .001 * frameScale;
        if (cubeOpacity >= 1) { cubeOpacity = 1; opacityIncreasing = false; }
        if (cubeOpacity <= 0) { cubeOpacity = 0; opacityIncreasing = true; }
    }

    function tick(timestamp) {
        animationFrame = null;
        if (isPaused || document.hidden) return;
        if (previousTimestamp === null) previousTimestamp = timestamp;
        const elapsedTime = timestamp - previousTimestamp;
        const frameInterval = 1000 / frameRates[frameRateIndex];
        if (elapsedTime >= frameInterval - .1) {
            advanceAnimation(Math.min(elapsedTime, 100) / (1000 / 60));
            previousTimestamp = timestamp;
            redraw();
        }
        animationFrame = requestAnimationFrame(tick);
    }

    function synchronizeAnimation() {
        if (animationFrame !== null) cancelAnimationFrame(animationFrame);
        animationFrame = null;
        previousTimestamp = null;
        if (!isPaused && !document.hidden) animationFrame = requestAnimationFrame(tick);
        updateControls();
    }

    function resize() {
        const previousSquareSize = squareSize;
        viewportWidth = window.innerWidth;
        viewportHeight = window.innerHeight;
        pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        squareSize = Math.min(viewportWidth, viewportHeight) / 6;
        if (previousSquareSize) depthOffset *= squareSize / previousSquareSize;
        for (const canvas of [cubeCanvas, circleCanvas]) {
            canvas.width = Math.round(viewportWidth * pixelRatio);
            canvas.height = Math.round(viewportHeight * pixelRatio);
        }
        redraw();
    }

    function togglePause() { isPaused = !isPaused; synchronizeAnimation(); }
    function toggleHelp() {
        helpPanel.hidden = !helpPanel.hidden;
        controlsButton.setAttribute('aria-expanded', String(!helpPanel.hidden));
        controlsButton.blur();
        updateControls();
    }

    document.addEventListener('keydown', (event) => {
        if (event.key === ' ' && !helpPanel.hidden && !event.ctrlKey && !event.metaKey && !event.altKey && !event.target.closest('input, textarea, select, [contenteditable]')) {
            event.preventDefault();
            if (!event.repeat) togglePause();
            return;
        }
        if (event.ctrlKey || event.metaKey || event.altKey || event.target.closest('input, textarea, select, button, a, [contenteditable]')) return;
        const key = event.key.toLowerCase();
        if (![' ', 'escape', 'x', 'z', 'c', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown', '/'].includes(key)) return;
        event.preventDefault();
        if (event.repeat && !['arrowup', 'arrowdown'].includes(key)) return;
        performAction(key);
    });

    function performAction(key) {
        switch (key) {
            case ' ': togglePause(); break;
            case 'escape': toggleHelp(); break;
            case 'x': rotationDirection *= -1; break;
            case 'z': depthDirection *= -1; break;
            case 'c': depthOffset = 0; rotation = 0; break;
            case 'arrowleft': manualDimensions = true; dimensionIndex = (dimensionIndex + 7) % 8; break;
            case 'arrowright': manualDimensions = true; dimensionIndex = (dimensionIndex + 1) % 8; break;
            case 'arrowup': animationRate = Math.min(1, Math.round((animationRate === .01 ? .025 : animationRate + .025) * 1000) / 1000); break;
            case 'arrowdown': animationRate = Math.max(.01, Math.round((animationRate - .025) * 1000) / 1000); break;
            case '/': frameRateIndex = (frameRateIndex + 1) % 3; break;
        }
        updateControls();
        redraw();
    }

    helpPanel.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-action]');
        if (!button) return;
        performAction(button.dataset.action);
        button.blur();
    });
    pauseButton.addEventListener('click', togglePause);
    controlsButton.addEventListener('click', toggleHelp);
    document.addEventListener('click', (event) => {
        if (!helpPanel.hidden && !helpPanel.contains(event.target) && !controlsButton.contains(event.target)) {
            helpPanel.hidden = true;
            controlsButton.setAttribute('aria-expanded', 'false');
        }
    });
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', synchronizeAnimation);
    reducedMotion.addEventListener('change', () => {
        isPaused = reducedMotion.matches;
        synchronizeAnimation();
    });
    document.querySelector('.animation-controls').hidden = false;
    resize();
    updateControls();
    window.setTimeout(synchronizeAnimation, 2000);

function drawUnitCube(cubeContext, circleContext, xOrigin, yOrigin, size, offset, direction) {
	
	let disableAntialiasing = false;		// Use round number pixels instead of floating-point pixel interpolation

	let drawFrontCircles = true;
	let drawTopCircles = true;
	let drawSideCircles = true;
	
	let offsetScaler = 2 * Math.PI;		// Using 2*PI emperically. Need to figure out why!! :P

	let xOffset, yOffset;

	if (direction == 1) {
		xOffset = yOffset = offset;
	} else if (direction == -1) {
		xOffset = -offset;
		yOffset = offset;
	} 


	if (disableAntialiasing == true) {
		xOrigin = ~~ (xOrigin+0.5);
		yOrigin = ~~ (yOrigin+0.5);
		size = ~~ (size+0.5);
		xOffset = ~~ (xOffset+0.5);
		yOffset = ~~ (yOffset+0.5);
		offsetScaler = ~~ (offsetScaler+0.5);
	}


	// Draw Necker Cube
	cubeContext.rect(xOrigin, yOrigin, size, size);
	cubeContext.rect(xOrigin + xOffset, yOrigin + yOffset, size, size);

	cubeContext.moveTo(xOrigin, yOrigin);
	cubeContext.lineTo(xOrigin + xOffset, yOrigin + yOffset);

	cubeContext.moveTo(xOrigin+ size, yOrigin);
	cubeContext.lineTo(xOrigin + size + xOffset, yOrigin + yOffset);

	cubeContext.moveTo(xOrigin, yOrigin + size);
	cubeContext.lineTo(xOrigin + xOffset, yOrigin + yOffset + size);

	cubeContext.moveTo(xOrigin + size, yOrigin + size);
	cubeContext.lineTo(xOrigin + size + xOffset, yOrigin + size + yOffset);


	// Draw Circles
	if (drawFrontCircles == true) {
		// Back
		circleContext.moveTo(xOrigin + size, yOrigin + size/2.0);
		circleContext.arc(xOrigin + size/2.0, yOrigin + size/2.0, size/2, 0, 2*Math.PI);

		// Front
		circleContext.moveTo(xOrigin + size + xOffset, yOrigin + yOffset + size/2.0);
		circleContext.arc(xOrigin + size/2.0 + xOffset, yOrigin + size/2.0 + yOffset, size/2, 0, 2*Math.PI);
	}

	if (drawTopCircles == true) {
		// Top
		circleContext.moveTo(xOrigin + xOffset/2.0, yOrigin + yOffset/2.0);
		circleContext.bezierCurveTo(xOrigin - xOffset/offsetScaler, yOrigin - yOffset/offsetScaler, xOrigin + size - xOffset/offsetScaler, yOrigin - yOffset/offsetScaler, xOrigin + xOffset/2.0 + size, yOrigin + yOffset/2.0);
		circleContext.bezierCurveTo(xOrigin + xOffset + size + xOffset/offsetScaler, yOrigin + yOffset + yOffset/offsetScaler, xOrigin + xOffset + xOffset/offsetScaler, yOrigin + yOffset + yOffset/offsetScaler, xOrigin + xOffset/2.0, yOrigin + yOffset/2.0);

		// Bottom
		circleContext.moveTo(xOrigin + xOffset/2.0, yOrigin + yOffset/2.0 + size);
		circleContext.bezierCurveTo(xOrigin - xOffset/offsetScaler, yOrigin - yOffset/offsetScaler + size, xOrigin + size - xOffset/offsetScaler, yOrigin - yOffset/offsetScaler + size, xOrigin + xOffset/2.0 + size, yOrigin + yOffset/2.0 + size);
		circleContext.bezierCurveTo(xOrigin + xOffset + size + xOffset/offsetScaler, yOrigin + yOffset + yOffset/offsetScaler + size, xOrigin + xOffset + xOffset/offsetScaler, yOrigin + yOffset + yOffset/offsetScaler + size, xOrigin + xOffset/2.0, yOrigin + yOffset/2.0 + size);
	}

	if (drawSideCircles == true) {
		// Left
		circleContext.moveTo(xOrigin + xOffset/2.0, yOrigin + yOffset/2.0);
		circleContext.bezierCurveTo(xOrigin - xOffset/offsetScaler, yOrigin - yOffset/offsetScaler, xOrigin - xOffset/offsetScaler, yOrigin + size - yOffset/offsetScaler, xOrigin + xOffset/2.0, yOrigin + yOffset/2.0 + size);
		circleContext.bezierCurveTo(xOrigin + xOffset + xOffset/offsetScaler, yOrigin + yOffset + size + yOffset/offsetScaler, xOrigin + xOffset + xOffset/offsetScaler, yOrigin + yOffset + yOffset/offsetScaler, xOrigin + xOffset/2.0, yOrigin + yOffset/2.0);

		// Right
		circleContext.moveTo(xOrigin + xOffset/2.0 + size, yOrigin + yOffset/2.0);
		circleContext.bezierCurveTo(xOrigin - xOffset/offsetScaler + size, yOrigin - yOffset/offsetScaler, xOrigin - xOffset/offsetScaler + size, yOrigin + size - yOffset/offsetScaler, xOrigin + xOffset/2.0 + size, yOrigin + yOffset/2.0 + size);
		circleContext.bezierCurveTo(xOrigin + xOffset + xOffset/offsetScaler + size, yOrigin + yOffset + size + yOffset/offsetScaler, xOrigin + xOffset + xOffset/offsetScaler + size, yOrigin + yOffset + yOffset/offsetScaler, xOrigin + xOffset/2.0 + size, yOrigin + yOffset/2.0);
	}
}


})();
