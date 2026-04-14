/* ═══════════════ REZTRO — SCRIPT ═══════════════ */

document.addEventListener('DOMContentLoaded', () => {

    // ── Intersection Observer — Animaciones de aparición ──
    const opcionesObservador = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observador = new IntersectionObserver((entradas) => {
        entradas.forEach((entrada, indice) => {
            if (entrada.isIntersecting) {
                setTimeout(() => {
                    entrada.target.classList.add('visible');
                }, indice * 100);
                observador.unobserve(entrada.target);
            }
        });
    }, opcionesObservador);

    document.querySelectorAll('.aparicion').forEach(el => observador.observe(el));

    // ── Comportamiento de la barra de navegación al hacer scroll ──
    const barraNav = document.getElementById('barraNav');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            barraNav.classList.add('desplazado');
        } else {
            barraNav.classList.remove('desplazado');
        }
    });

    // ── Menú móvil ──
    const menuMovil = document.getElementById('menuMovil');
    const navEnlaces = document.getElementById('navEnlaces');

    menuMovil.addEventListener('click', () => {
        navEnlaces.classList.toggle('activo');
        menuMovil.classList.toggle('activo');
    });

    navEnlaces.querySelectorAll('a').forEach(enlace => {
        enlace.addEventListener('click', () => {
            navEnlaces.classList.remove('activo');
            menuMovil.classList.remove('activo');
        });
    });

    // ── Animación del contador de estadísticas ──
    const numerosEstadistica = document.querySelectorAll('.estadistica-numero[data-target]');

    const observadorContador = new IntersectionObserver((entradas) => {
        entradas.forEach(entrada => {
            if (entrada.isIntersecting) {
                animarContador(entrada.target);
                observadorContador.unobserve(entrada.target);
            }
        });
    }, { threshold: 0.5 });

    numerosEstadistica.forEach(el => observadorContador.observe(el));

    function animarContador(elemento) {
        const objetivo = parseInt(elemento.getAttribute('data-target'));
        const duracion = 2000;
        const tiempoInicio = performance.now();

        function easeOutQuart(t) {
            return 1 - Math.pow(1 - t, 4);
        }

        function actualizar(tiempoActual) {
            const transcurrido = tiempoActual - tiempoInicio;
            const progreso = Math.min(transcurrido / duracion, 1);
            const progresoSuavizado = easeOutQuart(progreso);
            const actual = Math.round(progresoSuavizado * objetivo);

            if (objetivo >= 1000) {
                elemento.textContent = actual.toLocaleString('es');
            } else {
                elemento.textContent = actual;
            }

            if (progreso < 1) {
                requestAnimationFrame(actualizar);
            }
        }

        requestAnimationFrame(actualizar);
    }

    // ── Scroll suave para enlaces ancla ──
    document.querySelectorAll('a[href^="#"]').forEach(ancla => {
        ancla.addEventListener('click', function (e) {
            const idObjetivo = this.getAttribute('href');
            if (idObjetivo === '#') return;

            const elementoObjetivo = document.querySelector(idObjetivo);
            if (elementoObjetivo) {
                e.preventDefault();
                elementoObjetivo.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // ── Animación hover en barras del gráfico ──
    document.querySelectorAll('.grafico-barra').forEach(barra => {
        barra.addEventListener('mouseenter', () => {
            barra.style.transition = 'all 0.3s ease';
        });
    });

});
