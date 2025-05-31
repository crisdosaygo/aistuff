// lsd-effect.js
(function() {
    let lsdOverlay = null;
    const SVG_NS = "http://www.w3.org/2000/svg";

    function injectSvgFilters() {
        if (document.getElementById('lsd-filters-svg-container')) return;

        const svgContainer = document.createElementNS(SVG_NS, "svg");
        svgContainer.id = 'lsd-filters-svg-container';
        // Style directly as it's not a typical displayed element
        svgContainer.style.position = 'absolute';
        svgContainer.style.width = '0';
        svgContainer.style.height = '0';
        svgContainer.style.overflow = 'hidden';


        const defs = document.createElementNS(SVG_NS, "defs");

        // Filter for displacement/warp effect
        const filter = document.createElementNS(SVG_NS, "filter");
        filter.id = 'lsd-displacement-filter';
        filter.setAttribute("x", "-10%"); // Allow effect to go slightly outside bounds
        filter.setAttribute("y", "-10%");
        filter.setAttribute("width", "120%");
        filter.setAttribute("height", "120%");

        // Turbulence for generating noise pattern
        const feTurbulence = document.createElementNS(SVG_NS, "feTurbulence");
        feTurbulence.setAttribute("type", "fractalNoise"); // or 'turbulence'
        feTurbulence.setAttribute("baseFrequency", "0.02 0.05"); // Controls "waviness" - smaller numbers = larger waves
        feTurbulence.setAttribute("numOctaves", "2"); // Simpler noise, less detail, better perf
        feTurbulence.setAttribute("seed", "0"); // Will be animated by JS for roving effect
        feTurbulence.setAttribute("stitchTiles", "stitch");
        feTurbulence.setAttribute("result", "noise");
        filter.appendChild(feTurbulence);

        // Displacement map using the generated noise
        const feDisplacementMap = document.createElementNS(SVG_NS, "feDisplacementMap");
        feDisplacementMap.setAttribute("in2", "noise");
        feDisplacementMap.setAttribute("in", "SourceGraphic"); // Apply to the element itself
        feDisplacementMap.setAttribute("scale", "0"); // Start with no displacement, animate with JS
        feDisplacementMap.setAttribute("xChannelSelector", "R");
        feDisplacementMap.setAttribute("yChannelSelector", "G"); // Use R and G channels from noise for X/Y displacement
        filter.appendChild(feDisplacementMap);
        
        // Optional: feGaussianBlur for patchy blur, can also be animated
        // const feGaussianBlur = document.createElementNS(SVG_NS, "feGaussianBlur");
        // feGaussianBlur.setAttribute("in", "SourceGraphic"); // or apply to the displaced result
        // feGaussianBlur.setAttribute("stdDeviation", "0"); // Start with no blur, animate with JS
        // feGaussianBlur.setAttribute("result", "blur");
        // filter.appendChild(feGaussianBlur);


        defs.appendChild(filter);
        svgContainer.appendChild(defs);
        document.body.insertBefore(svgContainer, document.body.firstChild); // Insert early
    }


    let animationFrameId = null;
    let effectStartTime = 0;

    function animateLsdEffect(duration) {
        const currentTime = performance.now();
        const elapsedTime = currentTime - effectStartTime;
        const progress = Math.min(elapsedTime / duration, 1);

        if (!lsdOverlay) return; // Should not happen if called correctly

        const turbulenceEl = document.querySelector("#lsd-displacement-filter feTurbulence");
        const displacementMapEl = document.querySelector("#lsd-displacement-filter feDisplacementMap");
        // const gaussianBlurEl = document.querySelector("#lsd-displacement-filter feGaussianBlur");


        if (turbulenceEl) {
            // Animate seed for roving noise
            turbulenceEl.setAttribute("seed", Math.floor(elapsedTime / 100)); // Change seed periodically
            // Animate baseFrequency for "breathing" waves
            const freq = 0.01 + Math.sin(elapsedTime / 500) * 0.01; // Small oscillation
            turbulenceEl.setAttribute("baseFrequency", `${freq} ${freq + 0.03}`);
        }

        if (displacementMapEl) {
            // Animate scale of displacement: ramp up then down
            const peakDisplacement = 25; // Max displacement scale
            let scale;
            if (progress < 0.5) { // Ramp up
                scale = progress * 2 * peakDisplacement;
            } else { // Ramp down
                scale = (1 - (progress - 0.5) * 2) * peakDisplacement;
            }
            displacementMapEl.setAttribute("scale", scale);
        }
        
        // if (gaussianBlurEl) {
        //     const peakBlur = 2;
        //     let blurAmount;
        //     if (progress < 0.1) blurAmount = 0; // No blur initially
        //     else if (progress < 0.5) blurAmount = (progress - 0.1) / 0.4 * peakBlur;
        //     else if (progress < 0.9) blurAmount = (1 - ((progress - 0.5) / 0.4)) * peakBlur;
        //     else blurAmount = 0; // No blur at the end
        //     gaussianBlurEl.setAttribute("stdDeviation", Math.max(0, blurAmount));
        // }


        if (progress < 1) {
            animationFrameId = requestAnimationFrame(() => animateLsdEffect(duration));
        } else {
            if (lsdOverlay && document.body.contains(lsdOverlay)) {
                lsdOverlay.remove(); // Final removal after fade-out animation
            }
            lsdOverlay = null;
            animationFrameId = null;
        }
    }


    function triggerLsdEffect(duration = 5000) {
        if (animationFrameId) { // Effect is active or cleaning up
            cancelAnimationFrame(animationFrameId);
             if (lsdOverlay && document.body.contains(lsdOverlay)) {
                lsdOverlay.remove();
            }
        }

        injectSvgFilters(); // Ensure filters are in the DOM

        lsdOverlay = document.createElement('div');
        lsdOverlay.className = 'lsd-effect-overlay';
        // Set animation duration via CSS variable for fade-in/out to match JS duration
        lsdOverlay.style.setProperty('--lsd-duration', `${duration / 1000}s`);
        // Modify the animation in CSS to use this var:
        // animation: lsdOverlayFadeInOut var(--lsd-duration, 5s) ease-in-out forwards;


        document.body.appendChild(lsdOverlay);
        
        effectStartTime = performance.now();
        animationFrameId = requestAnimationFrame(() => animateLsdEffect(duration));

        // CSS handles the fade-out based on animation `forwards` and duration.
        // The JS animateLsdEffect will remove the element after its own logic for filter animation is done.
        // Ensure CSS fade-out is complete or nearly complete by the time JS removes it.
        // For simplicity, the JS timeout for removal can be slightly after the CSS animation.
        setTimeout(() => {
            if (lsdOverlay && document.body.contains(lsdOverlay) && !animationFrameId) { 
                // If animation loop finished but element still there (e.g. animation paused)
                lsdOverlay.remove();
                lsdOverlay = null;
            }
        }, duration + 200); // Remove a bit after CSS animation should end
    }

    if (!window.Win9xDesktopUtils) {
        window.Win9xDesktopUtils = {};
    }
    window.Win9xDesktopUtils.triggerLsdEffect = triggerLsdEffect;

})();
