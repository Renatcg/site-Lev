// Smooth Scroll
const lenis = new Lenis({ duration: 1.2, smooth: true });
function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
requestAnimationFrame(raf);

gsap.registerPlugin(ScrollTrigger);

document.addEventListener("DOMContentLoaded", () => {
    const video = document.getElementById('source-video');
    const canvas = document.getElementById('hero-canvas');
    const ctx = canvas.getContext('2d');
    const loaderText = document.getElementById('loader-text');
    const frames = [];
    
    // OTIMIZAÇÃO: Menos frames por segundo (15fps) = 40% mais rápido para compilar
    // e resolução menor (960x540) = muito mais rápido, sem perda visual crítica devido ao overlay
    const FPS = 15; 
    let isLoaded = false;
    let totalFrames = 0;
    
    video.addEventListener('loadedmetadata', async () => {
        canvas.width = Math.min(960, video.videoWidth);
        canvas.height = Math.min(540, video.videoHeight);
        
        // Canvas invisível apenas para renderizar os frames
        const offCanvas = document.createElement('canvas');
        offCanvas.width = canvas.width;
        offCanvas.height = canvas.height;
        const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
        
        const duration = video.duration || 6;
        totalFrames = Math.floor(duration * FPS);
        let time = 0;

        try {
            // Loop progressivo
            for (let i = 0; i <= totalFrames; i++) {
                video.currentTime = time;
                await new Promise(r => video.addEventListener('seeked', r, { once: true }));
                
                // Desenha no canvas offscreen para não dar "autoplay" visual na página
                offCtx.drawImage(video, 0, 0, offCanvas.width, offCanvas.height);
                const bmp = await createImageBitmap(offCanvas);
                frames.push(bmp);
                
                // OTIMIZAÇÃO MÁXIMA: Libera a tela após carregar apenas os primeiros 3 quadros
                if (i === 3 && !isLoaded) {
                    isLoaded = true;
                    initCanvasScroll();
                }
                
                if (!isLoaded) {
                    const perc = Math.floor((frames.length / totalFrames) * 100);
                    loaderText.innerText = `Renderizando (${Math.min(perc, 100)}%)`;
                }
                
                time += 1 / FPS;
            }
        } catch(e) {
            console.error("Erro na compilação do Canvas", e);
            if (!isLoaded) {
                isLoaded = true;
                initCanvasScroll();
            }
        }
    });

    // Fallback de segurança rápido
    setTimeout(() => {
        if(!isLoaded) {
            isLoaded = true;
            initCanvasScroll();
        }
    }, 3000);

    function initCanvasScroll() {
        // Esconde loader
        gsap.to("#loader", {
            opacity: 0,
            duration: 0.6,
            onComplete: () => {
                document.getElementById('loader').style.display = 'none';
                playIntroAnimations();
            }
        });

        // Desenha primeiro frame se existir
        if (frames.length > 0) {
            ctx.drawImage(frames[0], 0, 0, canvas.width, canvas.height);
        }
        
        const playhead = { frame: 0 };
        
        gsap.to(playhead, {
            frame: totalFrames > 0 ? totalFrames - 1 : 100,
            snap: "frame",
            ease: "none",
            scrollTrigger: {
                trigger: "#hero-section",
                start: "top top",
                end: "bottom bottom",
                scrub: 0.5
            },
            onUpdate: () => {
                // Se o usuário scrolar mais rápido que o background renderiza, usamos o último frame disponível
                let targetFrame = Math.min(playhead.frame, frames.length - 1);
                if(frames[targetFrame]) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(frames[targetFrame], 0, 0, canvas.width, canvas.height);
                }
            }
        });

        gsap.to("#hero-canvas", {
            scale: 1,
            ease: "none",
            scrollTrigger: {
                trigger: "#hero-section",
                start: "top top",
                end: "bottom bottom",
                scrub: true
            }
        });

        // Animação de saída limpa e rápida (Fade Out do texto e overlays quando a pena aparece)
        gsap.to(["#hero-content-wrapper", ".md\\:hidden", ".video-overlay"], {
            opacity: 0,
            y: -40,
            filter: "blur(10px)",
            ease: "power2.inOut",
            scrollTrigger: {
                trigger: "#hero-section",
                start: "15% top", // Inicia exatamente quando a pena entra (aprox 15% a 20% do scroll)
                end: "30% top",   // Finaliza rapidamente o fade out para a tela ficar 100% limpa a partir daqui
                scrub: true
            }
        });
    }

    function playIntroAnimations() {
        const textSplit = new SplitType('#hero-title', { types: 'lines, chars' });
        gsap.set(textSplit.chars, { y: 100, opacity: 0 });
        
        const tl = gsap.timeline();

        tl.to("#video-wrapper", { scale: 1, opacity: 1, duration: 1.5, ease: "power3.out" }, 0);
        tl.to("#header", { y: 0, opacity: 1, duration: 1, ease: "power3.out" }, 0.5);
        tl.to("#hero-badge", { y: 0, opacity: 1, duration: 1, ease: "power3.out" }, 0.7);
        tl.to(textSplit.chars, { y: 0, opacity: 1, stagger: 0.015, duration: 1, ease: "power4.out" }, 0.8);
        tl.to(["#hero-desc", "#hero-ctas"], { y: 0, opacity: 1, stagger: 0.15, duration: 1, ease: "power3.out" }, 1.5);
        tl.to("#hero-editorial", { y: 0, opacity: 1, duration: 1, ease: "power3.out" }, 1.8);
        tl.to("#ed-line", { height: "100px", duration: 1.2, ease: "power3.inOut" }, 2.1);
    }
});
