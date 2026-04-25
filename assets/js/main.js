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

    // --- Animações da Dobra 2 (O Problema Invisível) ---
    function initProblemaAnim() {
        // Prepara textos para animação
        const titleSplit = new SplitType('#problema-title', { types: 'lines, words' });
        
        // Define estados iniciais (para evitar FOUC, setamos via GSAP)
        gsap.set(".invisible-prob-elem", { y: 30, opacity: 0 });
        gsap.set(titleSplit.words, { y: 60, opacity: 0, rotateX: -40, transformOrigin: "0% 50% -50" });
        gsap.set("#problema-text p", { y: 30, opacity: 0 });
        gsap.set(".invisible-prob-btn", { y: 30, opacity: 0 });

        const tlProblema = gsap.timeline({
            scrollTrigger: {
                trigger: "#problema-section",
                start: "top 70%", // Inicia quando a seção entra na tela
                end: "bottom top",
                toggleActions: "play none none reverse" // Repete a animação se o usuário rolar pra cima e pra baixo
            }
        });

        // 1. Tag inicial
        tlProblema.to(".invisible-prob-elem", {
            y: 0,
            opacity: 1,
            duration: 0.8,
            ease: "power3.out"
        }, 0);

        // 2. Título (Palavra por palavra, com efeito 3D sutil)
        tlProblema.to(titleSplit.words, {
            y: 0,
            opacity: 1,
            rotateX: 0,
            stagger: 0.05,
            duration: 0.8,
            ease: "power4.out"
        }, 0.2);

        // 3. Parágrafos entrando sequencialmente
        tlProblema.to("#problema-text p", {
            y: 0,
            opacity: 1,
            stagger: 0.15,
            duration: 0.8,
            ease: "power3.out"
        }, 0.6);

        // 4. Botão
        tlProblema.to(".invisible-prob-btn", {
            y: 0,
            opacity: 1,
            duration: 0.8,
            ease: "power3.out"
        }, 1.0);

        // 5. Card Principal - Entrada Monumental
        tlProblema.to(".invisible-prob-card", {
            y: 0,
            opacity: 1,
            scale: 1,
            rotateX: 0,
            duration: 1.5,
            ease: "power4.out"
        }, 0.4);
        
        // Revela os ícones do grid do card
        tlProblema.fromTo(".invisible-prob-card .grid > div", 
            { opacity: 0, scale: 0.8, y: 20 },
            { opacity: 1, scale: 1, y: 0, stagger: 0.1, duration: 0.6, ease: "back.out(1.5)" },
            0.8
        );

        // 6. Badges - Animação Inicial de Entrada (Pop)
        tlProblema.to(".badge-parallax-1", {
            scale: 1,
            opacity: 1,
            y: 0,
            duration: 1,
            ease: "back.out(1.2)"
        }, 1.2);
        
        tlProblema.to(".badge-parallax-2", {
            scale: 1,
            opacity: 1,
            y: 0,
            duration: 1,
            ease: "back.out(1.2)"
        }, 1.4);

        // --- Efeito Parallax Dinâmico nos Badges ao Rolar (Scrub) ---
        // Cria um movimento assíncrono muito agradável dando profundidade
        gsap.to(".badge-parallax-1", {
            y: -120, // Sobe mais rápido que a página
            ease: "none",
            scrollTrigger: {
                trigger: "#visual-column",
                start: "top bottom",
                end: "bottom top",
                scrub: 1
            }
        });

        gsap.to(".badge-parallax-2", {
            y: 80, // Desce ligeiramente, criando contraste de movimento
            ease: "none",
            scrollTrigger: {
                trigger: "#visual-column",
                start: "top bottom",
                end: "bottom top",
                scrub: 1.5
            }
        });
        
        // --- Animação de Saída Dramática ---
        // Oculta a seção inteira quando o usuário rola além dela
        gsap.to("#problema-section > div", {
            opacity: 0,
            y: -100,
            scale: 0.95,
            ease: "none",
            scrollTrigger: {
                trigger: "#problema-section",
                start: "bottom 85%", // Dispara quando o fim da dobra atinge o fundo da tela
                end: "bottom top",
                scrub: true
            }
        });
    }

    // --- Animações da Dobra 3 (A Nova Lógica) ---
    function initLogicaAnim() {
        const titleSplit = new SplitType('#logica-title', { types: 'lines, words' });
        
        gsap.set(titleSplit.words, { y: 40, opacity: 0, rotateX: 30, transformOrigin: "0% 50% -50" });
        
        const tlLogica = gsap.timeline({
            scrollTrigger: {
                trigger: "#logica-section",
                start: "top 75%",
                end: "bottom top",
                toggleActions: "play none none reverse"
            }
        });

        // 1. Textos e Título da seção (Topo)
        tlLogica.to(".logica-elem", {
            y: 0,
            opacity: 1,
            stagger: 0.15,
            duration: 0.8,
            ease: "power3.out"
        }, 0);

        tlLogica.to(titleSplit.words, {
            y: 0,
            opacity: 1,
            rotateX: 0,
            stagger: 0.05,
            duration: 0.8,
            ease: "power3.out"
        }, 0.2);

        // 2. Coluna dos Vilões (Staggered red-tinted entry)
        tlLogica.to(".vilao-card", {
            x: 0,
            opacity: 1,
            stagger: 0.2,
            duration: 0.8,
            ease: "power3.out"
        }, 0.8);

        // 3. Divisor Central (cresce)
        tlLogica.to(".logica-divider", {
            scaleY: 1,
            opacity: 1,
            duration: 1,
            ease: "power4.inOut"
        }, 1.2);

        // 4. A Solução Lev (Card Monumental da direita)
        tlLogica.to(".lev-solution-card", {
            x: 0,
            scale: 1,
            opacity: 1,
            duration: 1.2,
            ease: "back.out(1.2)"
        }, 1.6);
        
        // --- Animação de Saída da Dobra 3 ---
        gsap.to("#logica-section > div", {
            opacity: 0,
            y: -100,
            scale: 0.95,
            ease: "none",
            scrollTrigger: {
                trigger: "#logica-section",
                start: "bottom 85%",
                end: "bottom top",
                scrub: true
            }
        });
    }

    // --- Animações da Dobra 4 (O Que é a Lev - Minimalista) ---
    function initSobreAnim() {
        const titleSplit = new SplitType('#sobre-title', { types: 'lines, words' });
        
        gsap.set(titleSplit.words, { y: 40, opacity: 0 });
        
        const tlSobre = gsap.timeline({
            scrollTrigger: {
                trigger: "#sobre-lev-section",
                start: "top 75%",
                end: "bottom top",
                toggleActions: "play none none reverse"
            }
        });

        // Textos da esquerda
        tlSobre.to("#sobre-tag", {
            opacity: 1,
            duration: 1,
            ease: "power2.out"
        }, 0);

        tlSobre.to(titleSplit.words, {
            y: 0,
            opacity: 1,
            stagger: 0.04,
            duration: 1,
            ease: "power3.out"
        }, 0.2);

        tlSobre.to("#sobre-text", {
            y: 0,
            opacity: 1,
            duration: 1,
            ease: "power3.out"
        }, 0.6);
        
        // Ativa a física da pluma
        initFeatherInteraction();
    }

    // --- Lógica Interativa da Pluma ("O Sopro 2D Limpo") ---
    function initFeatherInteraction() {
        const section = document.getElementById("sobre-lev-section");
        const feather = document.getElementById("interactive-feather");
        const shadow = document.getElementById("feather-shadow");
        if (!section || !feather || !shadow) return;

        // Estado inicial de repouso no "chão"
        gsap.set(feather, {
            x: 0,
            y: 0, 
            rotation: -15,
            transformOrigin: "center center"
        });

        // Ticker para sincronizar a Sombra Dinâmica em tempo real
        gsap.ticker.add(() => {
            const currentX = gsap.getProperty(feather, "x");
            const currentY = gsap.getProperty(feather, "y"); // 0 = chão, negativo = alto
            
            // Calcula o quão alto a pluma está (limitado a 500px para o cálculo da sombra)
            const heightRatio = Math.max(0, Math.min(1, Math.abs(currentY) / 500));
            
            // Decaimento exponencial
            const shadowOpacity = 0.6 * (1 - Math.pow(heightRatio, 0.3));
            
            gsap.set(shadow, {
                x: currentX + (currentY * 0.05),
                opacity: shadowOpacity, 
                scaleX: 1 + heightRatio * 2.5,
                scaleY: 1 + heightRatio * 2.5
            });
        });

        let lastBlow = 0;
        let idleTimer = null;
        const featherWrapper = document.getElementById("feather-wrapper"); // Usado para a brisa sem cancelar o voo

        // Animação de Brisa Leve (Idle Animation) independente
        function triggerBreeze() {
            // Anima o wrapper, assim não cancela a física de pulo/queda da pluma principal!
            gsap.to(featherWrapper, {
                x: "+=15",
                y: "-=10",
                rotation: "+=4",
                duration: 1.5,
                ease: "sine.inOut",
                yoyo: true,
                repeat: 1,
                onComplete: resetIdleTimer
            });
        }

        function resetIdleTimer() {
            clearTimeout(idleTimer);
            idleTimer = setTimeout(triggerBreeze, 3000); // 3 segundos exatos sem interação
        }

        // Inicia o timer da brisa
        resetIdleTimer();

        section.addEventListener("mousemove", (e) => {
            resetIdleTimer(); // Qualquer movimento adia a brisa
            
            const now = Date.now();
            if (now - lastBlow < 50) return; // Cooldown reduzido para detectar movimentos contínuos

            const rect = feather.getBoundingClientRect();
            const featherX = rect.left + rect.width / 2;
            const featherY = rect.top + rect.height / 2;
            
            const dx = featherX - e.clientX;
            const dy = featherY - e.clientY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Raio de interação reduzido para ser mais intencional
            if (distance < 180) {
                lastBlow = now;
                
                const angle = Math.atan2(dy, dx);
                
                // Força proporcional à proximidade (quanto mais perto/rápido o mouse entra, mais forte)
                const pushFactor = Math.max(0.2, (180 - distance) / 180); 
                
                // Pulo sensível: movimentos na borda geram pulos curtos. 
                const pushStrengthX = Math.cos(angle) * (100 + 200 * pushFactor);
                const pushStrengthY = - (100 + 300 * pushFactor); // Varia de -120 a -400
                
                let targetX = gsap.getProperty(feather, "x") + pushStrengthX;
                
                // Limites da tela
                if (targetX > window.innerWidth / 2 - 150) targetX -= Math.abs(pushStrengthX) * 1.5;
                if (targetX < -window.innerWidth / 2 + 150) targetX += Math.abs(pushStrengthX) * 1.5;

                gsap.killTweensOf(feather);
                const tl = gsap.timeline();

                // 1. O Pulo Sensitivo
                tl.to(feather, {
                    x: targetX,
                    y: pushStrengthY,
                    rotation: `+=${pushStrengthX > 0 ? 15 + 15 * pushFactor : -15 - 15 * pushFactor}`,
                    duration: 0.8 + 0.4 * pushFactor,
                    ease: "power2.out"
                });

                // 2. Queda Suave
                tl.to(feather, {
                    y: 0,
                    duration: 3 + 1.5 * pushFactor,
                    ease: "sine.inOut"
                }, ">");

                // Balanço (Sway) compatível com a altura do pulo
                tl.to(feather, {
                    x: `+=${targetX > 0 ? 50 * pushFactor : -50 * pushFactor}`,
                    rotation: (targetX > 0 ? 15 * pushFactor : -15 * pushFactor),
                    duration: 1.5,
                    yoyo: true,
                    repeat: Math.floor(1 + 2 * pushFactor),
                    ease: "sine.inOut"
                }, "<");

                // 3. Pouso
                tl.to(feather, {
                    rotation: (Math.random() > 0.5 ? -8 : 8),
                    duration: 1.5,
                    ease: "power2.inOut"
                }, "-=1.5");
            }
        });
    }

    // Initialize all scroll animations outside the loader
    initProblemaAnim();
    initLogicaAnim();
    initSobreAnim();
    initEsteiraInteraction();

    // --- A Esteira Lev (Interactive Showcase) ---
    function initEsteiraInteraction() {
        const items = document.querySelectorAll('.esteira-item');
        const video = document.getElementById('esteira-video');
        const flare = document.getElementById('esteira-video-flare');
        if (!items.length || !video) return;

        // Proxy object para animar o currentTime do vídeo de forma ultra-suave
        const videoProxy = { time: 0 };
        let isVideoLoaded = false;
        let duration = 0;

        video.addEventListener('loadedmetadata', () => {
            isVideoLoaded = true;
            duration = video.duration;
        });

        // Parallax sutil no flare quando move o mouse sobre o vídeo
        const videoContainer = video.parentElement;
        videoContainer.addEventListener('mousemove', (e) => {
            const rect = videoContainer.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = (e.clientY - rect.top) / rect.height;
            
            gsap.to(flare, {
                x: (x - 0.5) * 100,
                y: (y - 0.5) * 100,
                duration: 1,
                ease: "power2.out"
            });
        });

        items.forEach((item, index) => {
            const content = item.querySelector('.esteira-content');
            const icon = item.querySelector('iconify-icon');

            item.addEventListener('click', () => {
                const isActive = item.getAttribute('data-active') === 'true';
                if (isActive) return; // Já está ativo

                // 1. Fecha todos
                items.forEach((otherItem) => {
                    otherItem.setAttribute('data-active', 'false');
                    const otherContent = otherItem.querySelector('.esteira-content');
                    const otherIcon = otherItem.querySelector('iconify-icon');

                    // Volta pra Pill
                    gsap.to(otherItem, { borderRadius: "9999px", duration: 0.4, ease: "power2.inOut" });
                    // Gira ícone pra +
                    gsap.to(otherIcon, { rotation: 0, duration: 0.4, ease: "power2.inOut" });
                    // Recolhe conteúdo
                    gsap.to(otherContent, { height: 0, opacity: 0, duration: 0.4, ease: "power2.inOut" });
                });

                // 2. Abre o clicado
                item.setAttribute('data-active', 'true');
                // Vira Card (rounded-3xl)
                gsap.to(item, { borderRadius: "32px", duration: 0.5, ease: "back.out(1.2)" });
                // Gira ícone pra X
                gsap.to(icon, { rotation: 45, duration: 0.5, ease: "back.out(1.2)" });
                // Expande conteúdo
                gsap.to(content, { height: "auto", opacity: 1, duration: 0.5, ease: "power2.inOut" });

                // 3. Scrub do Vídeo Sincronizado
                if (isVideoLoaded && duration > 0) {
                    // Divide o vídeo em 8 partes
                    const targetTime = (duration / items.length) * index;
                    
                    // Anima diretamente a propriedade currentTime do elemento de vídeo
                    // Usamos uma duração menor e um ease mais simples para evitar micro-saltos nas pontas da curva
                    gsap.to(video, {
                        currentTime: targetTime,
                        duration: 0.8,
                        ease: "power1.inOut"
                    });
                }
            });
        });
    }

    // --- Integração de Voz (OpenAI Realtime WebRTC) ---
    function initVoiceAI() {
        const voiceBtn = document.querySelector('a[aria-label="Chat de Voz com IA"]');
        if (!voiceBtn) return;

        // Elemento de áudio invisível para a resposta da IA
        const audioEl = document.createElement("audio");
        audioEl.autoplay = true;
        document.body.appendChild(audioEl);

        let peerConnection = null;
        let isConnecting = false;
        let isConnected = false;

        // UI Updates
        const orbWaves = voiceBtn.querySelectorAll('.animate-orb-wave, .animate-orb-wave-alt');
        const orbIcon = voiceBtn.querySelector('iconify-icon');
        const orbText = voiceBtn.querySelector('span');

        function setUIState(state) {
            if (state === 'connecting') {
                orbText.innerHTML = "Conectando...";
                orbIcon.setAttribute('icon', 'line-md:loading-loop');
                orbWaves.forEach(w => w.style.animationDuration = '1s'); // Pulsa rápido
            } else if (state === 'connected') {
                orbText.innerHTML = "Ouvindo...";
                orbIcon.setAttribute('icon', 'solar:record-circle-bold-duotone');
                orbIcon.classList.add('text-red-500');
                orbIcon.classList.remove('text-accent');
                orbWaves.forEach(w => w.style.animationDuration = '2s'); // Pulsa fluido
            } else {
                // Disconnected
                orbText.innerHTML = "Clique para<br>falar";
                orbIcon.setAttribute('icon', 'solar:microphone-3-bold-duotone');
                orbIcon.classList.remove('text-red-500');
                orbIcon.classList.add('text-accent');
                orbWaves.forEach(w => w.style.animationDuration = ''); // Volta ao normal
            }
        }

        async function initWebRTC() {
            if (isConnecting || isConnected) {
                // Disconnect se clicar de novo
                if (peerConnection) peerConnection.close();
                peerConnection = null;
                isConnected = false;
                setUIState('idle');
                return;
            }

            isConnecting = true;
            setUIState('connecting');

            try {
                // 1. Busca Ephemeral Token no nosso Backend (Vercel API)
                const tokenResponse = await fetch("/api/session");
                if (!tokenResponse.ok) throw new Error("Backend não configurado ou chave inválida");
                const data = await tokenResponse.json();
                const EPHEMERAL_KEY = data.client_secret.value;

                // 2. Cria Conexão WebRTC P2P
                peerConnection = new RTCPeerConnection();

                // 3. Ouve a faixa de áudio da OpenAI
                peerConnection.ontrack = e => {
                    audioEl.srcObject = e.streams[0];
                };

                // 4. Pede microfone local e envia para a OpenAI
                const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
                peerConnection.addTrack(ms.getTracks()[0]);

                // 5. Data Channel obrigatório da API
                peerConnection.createDataChannel("oai-events");

                // 6. Oferta P2P
                const offer = await peerConnection.createOffer();
                await peerConnection.setLocalDescription(offer);

                const baseUrl = "https://api.openai.com/v1/realtime";
                const model = "gpt-4o-realtime-preview-2024-12-17";
                
                // 7. Envia para OpenAI trocar as chaves
                const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
                    method: "POST",
                    body: offer.sdp,
                    headers: {
                        Authorization: `Bearer ${EPHEMERAL_KEY}`,
                        "Content-Type": "application/sdp"
                    },
                });

                if (!sdpResponse.ok) throw new Error("Erro ao conectar WebRTC");

                const answer = {
                    type: "answer",
                    sdp: await sdpResponse.text(),
                };
                await peerConnection.setRemoteDescription(answer);

                isConnecting = false;
                isConnected = true;
                setUIState('connected');

            } catch (err) {
                console.error("Erro Voice AI:", err);
                alert("Para testar a voz, certifique-se de configurar a variável OPENAI_API_KEY no arquivo .env e rodar o 'vercel dev'.");
                isConnecting = false;
                isConnected = false;
                setUIState('idle');
            }
        }

        voiceBtn.addEventListener('click', (e) => {
            e.preventDefault();
            initWebRTC();
        });
    }

    // Inicializa botão Orb Voice AI
    initVoiceAI();
});
