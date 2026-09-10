import React, { useEffect, useRef } from 'react';

/**
 * AmbientVideoBackground
 * Apple-inspired cinematic fluid motion background.
 * Seamlessly generates slow-motion liquid titanium & sapphire ribbons via GPU-accelerated canvas,
 * with HTML5 video fallback and a calibrated contrast vignette overlay.
 */
export default function AmbientVideoBackground({ videoSrc = null, poster = null }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Multi-harmonic liquid wave parameters
    let step = 0;
    const waves = [
      { color: 'rgba(13, 27, 56, 0.7)', speed: 0.003, amplitude: 55, wavelength: 0.0018, yOffset: 0.72 },
      { color: 'rgba(6, 40, 85, 0.55)', speed: 0.004, amplitude: 45, wavelength: 0.0022, yOffset: 0.78 },
      { color: 'rgba(0, 210, 255, 0.12)', speed: 0.0025, amplitude: 35, wavelength: 0.003, yOffset: 0.83 },
      { color: 'rgba(100, 160, 255, 0.08)', speed: 0.005, amplitude: 25, wavelength: 0.0035, yOffset: 0.88 }
    ];

    const render = () => {
      // If document is hidden, save CPU/battery
      if (document.hidden) {
        animationId = requestAnimationFrame(render);
        return;
      }

      ctx.fillStyle = '#04070E';
      ctx.fillRect(0, 0, width, height);

      step += 1;

      // Draw subtle top ambient studio spotlight
      const radialGlow = ctx.createRadialGradient(
        width * 0.5, height * 0.15, 0,
        width * 0.5, height * 0.25, width * 0.7
      );
      radialGlow.addColorStop(0, 'rgba(14, 38, 77, 0.35)');
      radialGlow.addColorStop(0.5, 'rgba(7, 18, 38, 0.15)');
      radialGlow.addColorStop(1, 'rgba(4, 7, 14, 0)');
      ctx.fillStyle = radialGlow;
      ctx.fillRect(0, 0, width, height);

      // Render layered liquid ribbons
      waves.forEach((wave) => {
        ctx.beginPath();
        ctx.moveTo(0, height);

        const baseY = height * wave.yOffset;
        for (let x = 0; x <= width; x += 8) {
          const y =
            baseY +
            Math.sin(x * wave.wavelength + step * wave.speed) * wave.amplitude +
            Math.cos(x * wave.wavelength * 0.6 + step * wave.speed * 0.7) * (wave.amplitude * 0.5);
          ctx.lineTo(x, y);
        }

        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fillStyle = wave.color;
        ctx.fill();
      });

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* Optional HTML5 video layer */}
      {videoSrc && (
        <video
          autoPlay
          muted
          loop
          playsInline
          disablePictureInPicture
          poster={poster}
          className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-screen"
        >
          <source src={videoSrc} type="video/mp4" />
        </video>
      )}

      {/* 60fps Liquid Wave Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Cinematic Contrast Vignette Overlay for High-Contrast Text Legibility */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 90% 70% at 50% 25%, rgba(4, 7, 14, 0.2) 0%, rgba(4, 7, 14, 0.75) 65%, #04070E 100%)'
        }}
      />
    </div>
  );
}
